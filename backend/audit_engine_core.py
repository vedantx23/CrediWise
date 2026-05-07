"""
audit_engine.py — Shadow Audit Engine for CrediWise-AI

Formula:
  current_nav  = sum(spend[cat] * best_rate_in_current_cards[cat]) * 12
  optimal_nav  = sum(spend[cat] * best_rate_in_all_cards[cat]) * 12
  leakage      = optimal_nav - current_nav
  status       = "pass" (<2000) | "warning" (<5000) | "critical" (>=5000)

SHAP values: marginal annual contribution of each spend category
             to the recommended card's improvement over current wallet.
  shap[cat] = max(0, new_rate[cat] - current_best_rate[cat]) * spend[cat] / 100 * 12
"""

from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import get_all_rewards_map, get_all_caps_map, get_all_cards, query

# Approval predictor is optional — if model is missing or sklearn isn't loaded,
# we silently fall back to "no approval signal" (eligibility filter still applies).
try:
    from approval_predictor import predict_approval as _predict_approval
except Exception:   # pragma: no cover
    _predict_approval = None

# Hard floor below which a card is dropped from recommendations entirely.
APPROVAL_HARD_FLOOR = 0.30

CATEGORIES = ["dining", "fuel", "grocery", "travel", "online", "utilities", "international", "other"]

# Human-readable category labels for reasons
CAT_LABEL = {
    "dining":        "dining & restaurants",
    "fuel":          "fuel & petrol",
    "grocery":       "groceries",
    "travel":        "travel & flights",
    "online":        "online shopping",
    "utilities":     "utility bills",
    "international": "international spends",
    "other":         "general spends",
}


# ─── Core helpers ────────────────────────────────────────────────────────────

def _capped_monthly_reward(monthly_spend: float, rate_pct: float, cap: float | None) -> float:
    """Apply per-category monthly cashback cap (None = no cap)."""
    raw = monthly_spend * rate_pct / 100.0
    if cap is not None and cap > 0:
        return min(raw, cap)
    return raw


def _annual_card_reward(
    spend: dict[str, float],
    rates: dict[str, float],
    caps: dict[str, float | None],
) -> tuple[float, dict[str, float]]:
    """
    Annual reward earned by a single card given the user's spend, honoring
    monthly per-category caps. Returns (annual_total, {cat: annual_per_cat}).
    """
    per_cat: dict[str, float] = {}
    total = 0.0
    for cat in CATEGORIES:
        m = _capped_monthly_reward(
            spend.get(cat, 0.0), rates.get(cat, 0.0), caps.get(cat)
        )
        annual = m * 12
        per_cat[cat] = round(annual, 2)
        total += annual
    return round(total, 2), per_cat


def _best_per_category_in_wallet(
    card_ids: list[str],
    spend: dict[str, float],
    all_rewards: dict,
    all_caps: dict,
) -> dict[str, dict]:
    """
    For each category, find the card in the wallet that yields the highest
    *capped annual reward* for the user's actual spend.
    Returns {cat: {card_id, rate_pct, cap, annual_reward}}.
    """
    out: dict[str, dict] = {}
    for cat in CATEGORIES:
        best = {"card_id": None, "rate_pct": 0.0, "cap": None, "annual_reward": 0.0}
        for cid in card_ids:
            rate = all_rewards.get(cid, {}).get(cat, 0.0)
            cap  = all_caps.get(cid, {}).get(cat)
            reward = _capped_monthly_reward(spend.get(cat, 0.0), rate, cap) * 12
            if reward > best["annual_reward"] or (
                reward == best["annual_reward"] and rate > best["rate_pct"]
            ):
                best = {
                    "card_id": cid, "rate_pct": rate, "cap": cap,
                    "annual_reward": round(reward, 2),
                }
        out[cat] = best
    return out


def _wallet_nav(
    spend: dict[str, float],
    card_ids: list[str],
    all_rewards: dict,
    all_caps: dict,
    card_meta: dict,
) -> tuple[float, float]:
    """
    Best-of-wallet NAV: assume user routes each category to its best card.
    Subtracts annual fee for each card actually held (with waiver credit).
    Returns (gross_annual_reward, net_after_fees).
    """
    per_cat = _best_per_category_in_wallet(card_ids, spend, all_rewards, all_caps)
    gross = sum(b["annual_reward"] for b in per_cat.values())

    annual_total_spend = sum(spend.values()) * 12
    fee_total = 0.0
    for cid in card_ids:
        meta = card_meta.get(cid, {})
        fee = float(meta.get("annual_fee", 0) or 0)
        waiver_threshold = meta.get("fee_waiver_spend")
        if waiver_threshold and annual_total_spend >= float(waiver_threshold):
            fee = 0.0
        fee_total += fee

    return round(gross, 2), round(gross - fee_total, 2)


def _compute_shap(
    spend: dict[str, float],
    current_best_reward: dict[str, float],
    card_rates: dict[str, float],
    card_caps: dict[str, float | None] | None = None,
) -> dict[str, float]:
    """
    Per-category annual ₹ improvement (capped) of THIS card over the user's
    current best per-category reward. Always >= 0.

    Backwards-compat: pre-Phase-1 callers passed (spend, current_best_RATES,
    card_rates) where current_best_RATES was a {cat: rate%} map. We detect
    and adapt: if the values look like rates (≤ 50), interpret as legacy.
    """
    caps = card_caps or {}
    # Detect legacy 3-arg call where current_best_reward holds rates not ₹
    legacy = current_best_reward and max(current_best_reward.values(), default=0) <= 50
    out: dict[str, float] = {}
    for cat in CATEGORIES:
        new_reward = _capped_monthly_reward(
            spend.get(cat, 0.0), card_rates.get(cat, 0.0), caps.get(cat)
        ) * 12
        if legacy:
            base = spend.get(cat, 0.0) * current_best_reward.get(cat, 0.0) / 100.0 * 12
        else:
            base = current_best_reward.get(cat, 0.0)
        delta = max(0.0, new_reward - base)
        out[cat] = round(delta, 2)
    return out


# ─── Backward-compatible shims (Phase 1 refactor) ───────────────────────────

def _best_rates_for_wallet(card_ids: list[str], all_rewards: dict) -> dict[str, float]:
    """Legacy uncapped rate map. Kept for backwards compatibility / tests."""
    best: dict[str, float] = {cat: 0.0 for cat in CATEGORIES}
    for cid in card_ids:
        rates = all_rewards.get(cid, {})
        for cat in CATEGORIES:
            r = rates.get(cat, 0.0)
            if r > best[cat]:
                best[cat] = r
    return best


def _compute_nav(spend: dict[str, float], rates: dict[str, float]) -> float:
    """Legacy uncapped annual NAV. Kept for backwards compatibility / tests."""
    monthly = sum(spend.get(cat, 0.0) * rates.get(cat, 0.0) / 100.0 for cat in CATEGORIES)
    return round(monthly * 12, 2)


def _build_reason(
    card_name: str,
    shap: dict[str, float],
    marginal_nav: float,
    fee_waived: bool = False,
    annual_fee: float = 0,
) -> str:
    """Single-line summary reason (kept for backward compat)."""
    top = sorted(
        [(cat, val) for cat, val in shap.items() if val > 0],
        key=lambda x: x[1], reverse=True,
    )[:2]
    if not top:
        return f"{card_name} adds marginal improvement to your wallet."
    parts = [f"{CAT_LABEL[cat]} (+₹{int(val):,}/yr)" for cat, val in top]
    reason = f"Best for {' and '.join(parts)}."
    reason += f" Net gain after fees: ₹{int(marginal_nav):,}/year."
    if fee_waived and annual_fee > 0:
        reason += f" Annual fee ₹{int(annual_fee):,} waived at your spend level."
    return reason


def _build_top_reasons(
    spend: dict[str, float],
    shap: dict[str, float],
    rates: dict[str, float],
    caps: dict[str, float | None],
    meta: dict,
    fee_waived: bool,
    annual_fee: float,
    max_reasons: int = 4,
) -> list[str]:
    """
    Build a list of structured, user-specific reasons. Each reason references
    the user's actual spend and the card's actual benefit. Skips reasons that
    don't apply to this user.
    """
    reasons: list[str] = []

    # 1. Top earning category(ies) — quantified
    top = sorted(
        [(cat, val) for cat, val in shap.items() if val > 0],
        key=lambda x: x[1], reverse=True,
    )[:2]
    for cat, val in top:
        monthly = spend.get(cat, 0.0)
        rate = rates.get(cat, 0.0)
        cap  = caps.get(cat)
        capped = cap is not None and monthly * rate / 100.0 > cap
        cap_note = f" (capped at ₹{int(cap):,}/month)" if capped else ""
        reasons.append(
            f"Your ₹{int(monthly):,}/month on {CAT_LABEL[cat]} earns "
            f"{rate:.1f}%{cap_note} = ₹{int(val):,}/year extra"
        )

    # 2. Lounge benefit — only if user travels
    travel_monthly = spend.get("travel", 0.0) + spend.get("international", 0.0)
    lounge_dom = int(meta.get("lounge_domestic", 0) or 0)
    lounge_intl = int(meta.get("lounge_intl", 0) or 0)
    if travel_monthly >= 5000 and (lounge_dom or lounge_intl):
        bits = []
        if lounge_dom: bits.append(f"{lounge_dom} domestic")
        if lounge_intl: bits.append(f"{lounge_intl} international")
        reasons.append(f"{' + '.join(bits)} lounge visits/year — useful at your travel volume")

    # 3. Fee waiver
    if fee_waived and annual_fee > 0:
        reasons.append(f"Annual fee ₹{int(annual_fee):,} waived — you qualify based on your spend")
    elif annual_fee == 0:
        reasons.append("Lifetime free — no annual fee")

    # 4. Forex savings — only for international spenders
    forex = float(meta.get("forex_markup_pct", 3.5) or 3.5)
    intl_monthly = spend.get("international", 0.0)
    if intl_monthly > 0 and forex < 2.5:
        savings = intl_monthly * 12 * (3.5 - forex) / 100.0
        reasons.append(
            f"Low forex markup {forex:.1f}% saves ~₹{int(savings):,}/year on international spend"
        )

    return reasons[:max_reasons]


# ─── Recommendation finder ───────────────────────────────────────────────────

def _find_recommendations(
    spend: dict[str, float],
    current_cards: list[str],
    all_rewards: dict,
    current_best_reward: dict[str, float],
    card_meta: dict[str, dict],
    all_caps: dict | None = None,
    income_annual: float = 0,
    cibil_score: int = 900,
    top_n: int = 3,
) -> list[dict]:
    """Score every card not in current wallet and return top_n with SHAP.

    Hard rules:
      - Skip invite-only cards.
      - Eligibility (income + cibil) is a HARD filter — ineligible cards
        are dropped, not just sorted lower. (If NO cards remain eligible,
        we relax CIBIL to allow no-history users to see starter cards.)
      - marginal_nav is NET of annual fee (with waiver credit if the user's
        annual spend clears fee_waiver_spend).
    """
    annual_total_spend = sum(spend.values()) * 12
    caps_map = all_caps or {}
    eligible_pool: list[dict] = []
    relaxed_pool:  list[dict] = []

    for card_id, rates in all_rewards.items():
        if card_id in current_cards:
            continue

        meta = card_meta.get(card_id, {})
        if meta.get("is_invite_only"):
            continue

        caps = caps_map.get(card_id, {})
        shap = _compute_shap(spend, current_best_reward, rates, caps)
        gross_marginal = sum(shap.values())
        if gross_marginal <= 0:
            continue

        annual_fee = float(meta.get("annual_fee", 0) or 0)
        waiver_threshold = meta.get("fee_waiver_spend")
        fee_waived = bool(waiver_threshold) and annual_total_spend >= float(waiver_threshold)
        effective_fee = 0.0 if fee_waived else annual_fee

        # Net marginal NAV = gross uplift - effective fee
        marginal_nav = gross_marginal - effective_fee
        if marginal_nav <= 0:
            continue

        income_ok = income_annual >= float(meta.get("min_income_annual", 0) or 0)
        cibil_ok  = cibil_score   >= int(meta.get("min_cibil", 0) or 0)

        name = meta.get("name", card_id)
        rec = {
            "card_id":       card_id,
            "card_name":     name,
            "bank":          meta.get("bank", ""),
            "annual_fee":    annual_fee,
            "fee_waived":    fee_waived,
            "marginal_nav":  round(marginal_nav, 2),
            "gross_reward":  round(gross_marginal, 2),
            "shap_values":   shap,
            "reason":        _build_reason(name, shap, marginal_nav, fee_waived, annual_fee),
            "top_reasons":   _build_top_reasons(
                spend, shap, rates, caps, meta, fee_waived, annual_fee
            ),
            "eligible":      income_ok and cibil_ok,
            "lounge_domestic": int(meta.get("lounge_domestic", 0) or 0),
            "lounge_intl":     int(meta.get("lounge_intl", 0) or 0),
            "forex_markup_pct": float(meta.get("forex_markup_pct", 0) or 0),
        }
        if income_ok and cibil_ok:
            eligible_pool.append(rec)
        elif income_ok:
            # Relaxed pool: income matches but CIBIL low / unknown → starter cards
            relaxed_pool.append(rec)

    pool = eligible_pool or relaxed_pool

    # ── Approval probability layer ──────────────────────────────────────────
    # Attach P(approval) to every candidate, drop those below the hard floor,
    # and rerank by approval-adjusted score:  marginal_nav * (0.5 + 0.5 * p)
    # so a high-NAV card with 50% approval ranks below a slightly lower-NAV
    # card with 95% approval.
    if pool and _predict_approval is not None:
        try:
            preds = _predict_approval(
                cibil_score          = int(cibil_score or 0),
                income_annual        = float(income_annual or 0),
                existing_cards_count = len(current_cards),
                card_ids             = [r["card_id"] for r in pool],
            )
            prob_by_id = {p["card_id"]: p["approval_probability_percent"] / 100.0
                          for p in preds}
        except Exception:
            prob_by_id = {}

        filtered = []
        for r in pool:
            p = prob_by_id.get(r["card_id"])
            if p is None:
                r["approval_probability"] = None
                r["adjusted_score"]       = r["marginal_nav"]
                filtered.append(r)
                continue
            if p < APPROVAL_HARD_FLOOR:
                continue   # too unlikely to be approved
            r["approval_probability"] = round(p, 3)
            r["adjusted_score"]       = round(r["marginal_nav"] * (0.5 + 0.5 * p), 2)
            filtered.append(r)
        pool = filtered or pool   # never return empty just because of approval

    pool.sort(key=lambda x: -x.get("adjusted_score", x["marginal_nav"]))
    return pool[:top_n]


def _build_split_plays(
    spend: dict[str, float],
    current_best_per_cat: dict[str, dict],
    optimal_best_per_cat: dict[str, dict],
    card_meta: dict[str, dict],
) -> list[dict]:
    """
    For each category where the optimal card differs from the user's current
    best card AND the uplift is non-trivial (>₹250/yr), emit a split-play.
    Grouped by recommended card.
    """
    by_card: dict[str, dict] = {}
    for cat in CATEGORIES:
        if spend.get(cat, 0.0) <= 0:
            continue
        opt = optimal_best_per_cat[cat]
        cur = current_best_per_cat[cat]
        if not opt["card_id"]:
            continue
        if opt["card_id"] == cur["card_id"]:
            continue
        extra = opt["annual_reward"] - cur["annual_reward"]
        if extra < 250:
            continue
        cid = opt["card_id"]
        meta = card_meta.get(cid, {})
        slot = by_card.setdefault(cid, {
            "card_id":   cid,
            "card_name": meta.get("name", cid),
            "bank":      meta.get("bank", ""),
            "categories": [],
            "extra_annual_inr": 0.0,
        })
        slot["categories"].append({
            "category":         cat,
            "current_rate_pct": cur["rate_pct"],
            "optimal_rate_pct": opt["rate_pct"],
            "current_reward":   cur["annual_reward"],
            "optimal_reward":   opt["annual_reward"],
            "extra_inr":        round(extra, 2),
        })
        slot["extra_annual_inr"] += extra

    plays = list(by_card.values())
    for p in plays:
        p["extra_annual_inr"] = round(p["extra_annual_inr"], 2)
    plays.sort(key=lambda x: -x["extra_annual_inr"])
    return plays


# ─── Public API ──────────────────────────────────────────────────────────────

def run_audit(user_profile: dict) -> dict:
    """Main entry point for the Shadow Audit Engine."""
    spend         = user_profile.get("monthly_spend", {})
    current_cards = user_profile.get("current_cards", [])
    income        = float(user_profile.get("income_annual", 0))
    cibil         = int(user_profile.get("cibil_score", 700))

    # Normalise spend keys to lowercase + numeric
    spend = {k.lower(): float(v) for k, v in spend.items()}
    total_monthly = sum(spend.values())

    # Load DB data
    all_rewards = get_all_rewards_map()
    all_caps    = get_all_caps_map()
    cards_list  = get_all_cards()
    card_meta   = {c["card_id"]: dict(c) for c in cards_list}

    # ── No-spend short-circuit ────────────────────────────────────────────────
    if total_monthly <= 0:
        return {
            "current_nav_annual":  0.0,
            "optimal_nav_annual":  0.0,
            "leakage_inr":         0.0,
            "status":              "unaudited",
            "message":             "Please enter your monthly spending to get a recommendation.",
            "spend_breakdown":     {},
            "current_cards":       [],
            "recommendations":     [],
            "split_plays":         [],
        }

    # ── Per-category best card analysis (capped) ─────────────────────────────
    eligible_card_ids = [
        cid for cid, m in card_meta.items()
        if not m.get("is_invite_only")
        and income >= float(m.get("min_income_annual", 0) or 0)
        and cibil >= int(m.get("min_cibil", 0) or 0)
    ]
    # If nothing is eligible, fall back to the full pool (still excluding invite-only)
    if not eligible_card_ids:
        eligible_card_ids = [
            cid for cid, m in card_meta.items() if not m.get("is_invite_only")
        ]

    optimal_per_cat = _best_per_category_in_wallet(
        eligible_card_ids, spend, all_rewards, all_caps
    )
    current_per_cat = _best_per_category_in_wallet(
        current_cards, spend, all_rewards, all_caps
    )

    # NAVs (gross + net of fees)
    current_gross, current_net = _wallet_nav(
        spend, current_cards, all_rewards, all_caps, card_meta
    )
    optimal_gross = sum(b["annual_reward"] for b in optimal_per_cat.values())

    leakage = round(max(0.0, optimal_gross - current_gross), 2)

    # ── Status ───────────────────────────────────────────────────────────────
    if not current_cards:
        status = "unaudited"
        message = (
            "Add the cards you currently use to see your reward leakage. "
            f"Optimal annual reward across all available cards is ₹{int(optimal_gross):,}."
        )
    else:
        if leakage < 2000:
            status = "pass"
            message = (
                f"Great job! Your wallet is well-optimised. "
                f"You are leaving at most ₹{int(leakage):,} on the table per year."
            )
        elif leakage < 5000:
            status = "warning"
            message = (
                f"You are losing ₹{int(leakage):,} per year in unrealised rewards. "
                "A card swap can fix this."
            )
        else:
            status = "critical"
            message = (
                f"You are losing ₹{int(leakage):,} per year in unrealised rewards. "
                "Immediate action recommended."
            )

    # ── Spend breakdown (for frontend dial/chart) ────────────────────────────
    current_best_reward = {cat: current_per_cat[cat]["annual_reward"] for cat in CATEGORIES}
    spend_breakdown = {}
    for cat in CATEGORIES:
        monthly = spend.get(cat, 0.0)
        if monthly > 0:
            spend_breakdown[cat] = {
                "monthly_inr":       monthly,
                "annual_inr":        monthly * 12,
                "current_rate_pct":  current_per_cat[cat]["rate_pct"],
                "optimal_rate_pct":  optimal_per_cat[cat]["rate_pct"],
                "current_reward":    current_per_cat[cat]["annual_reward"],
                "optimal_reward":    optimal_per_cat[cat]["annual_reward"],
                "best_card_id":      optimal_per_cat[cat]["card_id"],
            }

    # ── Recommendations + split plays ────────────────────────────────────────
    recs = _find_recommendations(
        spend, current_cards, all_rewards, current_best_reward, card_meta,
        all_caps=all_caps, income_annual=income, cibil_score=cibil,
    )
    split_plays = _build_split_plays(spend, current_per_cat, optimal_per_cat, card_meta)

    # ── Current card breakdown (annual reward honors caps + fees) ───────────
    current_card_details = []
    annual_total_spend = total_monthly * 12
    for cid in current_cards:
        meta  = card_meta.get(cid, {})
        rates = all_rewards.get(cid, {})
        caps  = all_caps.get(cid, {})
        annual_reward, _ = _annual_card_reward(spend, rates, caps)
        fee = float(meta.get("annual_fee", 0) or 0)
        waiver = meta.get("fee_waiver_spend")
        fee_waived = bool(waiver) and annual_total_spend >= float(waiver)
        effective_fee = 0.0 if fee_waived else fee
        current_card_details.append({
            "card_id":       cid,
            "card_name":     meta.get("name", cid),
            "bank":          meta.get("bank", ""),
            "annual_fee":    fee,
            "fee_waived":    fee_waived,
            "annual_reward": annual_reward,
            "net_value":     round(annual_reward - effective_fee, 2),
        })

    return {
        "current_nav_annual":  round(current_gross, 2),
        "optimal_nav_annual":  round(optimal_gross, 2),
        "leakage_inr":         leakage,
        "status":              status,
        "message":             message,
        "spend_breakdown":     spend_breakdown,
        "current_cards":       current_card_details,
        "recommendations":     recs,
        "split_plays":         split_plays,
    }


def _leakage_message(leakage: float, status: str) -> str:
    """Legacy helper retained for backwards compatibility."""
    if status == "pass":
        return f"Great job! Your wallet is well-optimised. You are leaving at most ₹{int(leakage):,} on the table per year."
    elif status == "warning":
        return f"You are losing ₹{int(leakage):,} per year in unrealised rewards. A card swap can fix this."
    else:
        return f"You are losing ₹{int(leakage):,} per year in unrealised rewards. Immediate action recommended."
