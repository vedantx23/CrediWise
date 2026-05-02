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

from database import get_all_rewards_map, get_all_cards, query

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

def _best_rates_for_wallet(card_ids: list[str], all_rewards: dict) -> dict[str, float]:
    """Return {category: best_rate_percent} across the given cards."""
    best: dict[str, float] = {cat: 0.0 for cat in CATEGORIES}
    for cid in card_ids:
        rates = all_rewards.get(cid, {})
        for cat in CATEGORIES:
            r = rates.get(cat, 0.0)
            if r > best[cat]:
                best[cat] = r
    return best


def _compute_nav(spend: dict[str, float], rates: dict[str, float]) -> float:
    """Annual NAV = sum(monthly_spend[cat] * rate[cat] / 100) * 12."""
    monthly = sum(spend.get(cat, 0.0) * rates.get(cat, 0.0) / 100.0 for cat in CATEGORIES)
    return round(monthly * 12, 2)


def _compute_shap(
    spend: dict[str, float],
    current_best: dict[str, float],
    card_rates: dict[str, float],
) -> dict[str, float]:
    """
    SHAP attribution: annual ₹ improvement per category for this card
    over the user's current best rate.
    shap[cat] = max(0, card_rate[cat] - current_best[cat]) * spend[cat] / 100 * 12
    """
    return {
        cat: round(
            max(0.0, card_rates.get(cat, 0.0) - current_best.get(cat, 0.0))
            * spend.get(cat, 0.0) / 100.0 * 12,
            2,
        )
        for cat in CATEGORIES
    }


def _build_reason(card_name: str, shap: dict[str, float], marginal_nav: float) -> str:
    """Generate a plain-English recommendation reason from SHAP values."""
    # Top 2 contributing categories
    top = sorted(
        [(cat, val) for cat, val in shap.items() if val > 0],
        key=lambda x: x[1],
        reverse=True,
    )[:2]

    if not top:
        return f"{card_name} adds marginal improvement to your wallet."

    parts = []
    for cat, val in top:
        parts.append(f"{CAT_LABEL[cat]} (+₹{int(val):,}/yr)")

    reason = f"Best for {' and '.join(parts)}."
    reason += f" Adds ₹{int(marginal_nav):,}/year to your wallet."
    return reason


# ─── Recommendation finder ───────────────────────────────────────────────────

def _find_recommendations(
    spend: dict[str, float],
    current_cards: list[str],
    all_rewards: dict,
    current_best: dict[str, float],
    card_meta: dict[str, dict],         # card_id → {name, annual_fee, min_income, min_cibil, ...}
    income_annual: float = 0,
    cibil_score: int = 900,
    top_n: int = 3,
) -> list[dict]:
    """Score every card not in current wallet and return top_n with SHAP."""
    candidates = []

    for card_id, rates in all_rewards.items():
        if card_id in current_cards:
            continue

        meta = card_meta.get(card_id, {})

        # Eligibility gate (soft filter — still show but flag)
        eligible = (
            income_annual >= meta.get("min_income_annual", 0)
            and cibil_score >= meta.get("min_cibil", 0)
        )
        # Invite-only cards are never recommended automatically
        if meta.get("is_invite_only"):
            continue

        shap = _compute_shap(spend, current_best, rates)
        marginal_nav = sum(shap.values())

        if marginal_nav <= 0:
            continue

        name = meta.get("name", card_id)
        candidates.append({
            "card_id":       card_id,
            "card_name":     name,
            "bank":          meta.get("bank", ""),
            "annual_fee":    meta.get("annual_fee", 0),
            "reward_rates":  rates,
            "marginal_nav":  round(marginal_nav, 2),
            "shap_values":   shap,
            "reason":        _build_reason(name, shap, marginal_nav),
            "eligible":      eligible,
        })

    # Sort: eligible first, then by marginal NAV descending
    candidates.sort(key=lambda x: (0 if x["eligible"] else 1, -x["marginal_nav"]))
    return candidates[:top_n]


# ─── Public API ──────────────────────────────────────────────────────────────

def run_audit(user_profile: dict, top_n: int = 3) -> dict:
    """
    Main entry point for the Shadow Audit Engine.

    Args:
        user_profile = {
            "monthly_spend": {
                "dining": float, "fuel": float, "grocery": float,
                "travel": float, "online": float, "utilities": float,
                "international": float, "other": float
            },
            "current_cards": [card_id, ...],   # card IDs the user already has
            "income_annual": float,
            "cibil_score":   int,
        }

    Returns: AuditResult dict matching the AuditResult data model.
    """
    spend         = user_profile.get("monthly_spend", {})
    current_cards = user_profile.get("current_cards", [])
    income        = float(user_profile.get("income_annual", 0))
    cibil         = int(user_profile.get("cibil_score", 700))

    # Normalise spend keys to lowercase
    spend = {k.lower(): float(v) for k, v in spend.items()}

    # Load DB data
    all_rewards = get_all_rewards_map()   # {card_id: {category: rate%}}
    cards_list  = get_all_cards()
    card_meta   = {c["card_id"]: dict(c) for c in cards_list}

    # ── NAV calculations ─────────────────────────────────────────────────────
    current_best = _best_rates_for_wallet(current_cards, all_rewards)
    optimal_best = _best_rates_for_wallet(list(all_rewards.keys()), all_rewards)

    # Which card is best-in-class per category
    optimal_card_per_cat: dict[str, str] = {}
    for cat in CATEGORIES:
        best_rate = 0.0
        best_card = None
        for cid, rates in all_rewards.items():
            r = rates.get(cat, 0.0)
            if r > best_rate:
                best_rate = r
                best_card = cid
        optimal_card_per_cat[cat] = best_card or ""

    current_nav = _compute_nav(spend, current_best)
    optimal_nav = _compute_nav(spend, optimal_best)
    leakage     = round(max(0.0, optimal_nav - current_nav), 2)

    status = (
        "pass"     if leakage < 2000 else
        "warning"  if leakage < 5000 else
        "critical"
    )

    # ── Spend breakdown (for frontend dial/chart) ────────────────────────────
    spend_breakdown = {}
    for cat in CATEGORIES:
        monthly = spend.get(cat, 0.0)
        if monthly > 0:
            spend_breakdown[cat] = {
                "monthly_inr":       monthly,
                "annual_inr":        monthly * 12,
                "current_rate_pct":  current_best[cat],
                "optimal_rate_pct":  optimal_best[cat],
                "current_reward":    round(monthly * current_best[cat] / 100 * 12, 2),
                "optimal_reward":    round(monthly * optimal_best[cat] / 100 * 12, 2),
                "best_card_id":      optimal_card_per_cat.get(cat),
            }

    # ── Recommendations ──────────────────────────────────────────────────────
    recs = _find_recommendations(
        spend, current_cards, all_rewards, current_best, card_meta,
        income_annual=income, cibil_score=cibil, top_n=top_n
    )

    # ── Current card breakdown ───────────────────────────────────────────────
    current_card_details = []
    for cid in current_cards:
        meta  = card_meta.get(cid, {})
        rates = all_rewards.get(cid, {})
        annual_reward = _compute_nav(spend, rates)
        current_card_details.append({
            "card_id":       cid,
            "card_name":     meta.get("name", cid),
            "bank":          meta.get("bank", ""),
            "annual_fee":    meta.get("annual_fee", 0),
            "annual_reward": annual_reward,
            "net_value":     round(annual_reward - meta.get("annual_fee", 0), 2),
        })

    return {
        "current_nav_annual":  current_nav,
        "optimal_nav_annual":  optimal_nav,
        "leakage_inr":         leakage,
        "status":              status,
        "message":             _leakage_message(leakage, status),
        "spend_breakdown":     spend_breakdown,
        "current_cards":       current_card_details,
        "recommendations":     recs,
    }


def _leakage_message(leakage: float, status: str) -> str:
    if status == "pass":
        return f"Great job! Your wallet is well-optimised. You are leaving at most ₹{int(leakage):,} on the table per year."
    elif status == "warning":
        return f"You are losing ₹{int(leakage):,} per year in unrealised rewards. A card swap can fix this."
    else:
        return f"You are losing ₹{int(leakage):,} per year in unrealised rewards. Immediate action recommended."
