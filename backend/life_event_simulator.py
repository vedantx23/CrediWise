"""
life_event_simulator.py — Life Event Simulator for CrediWise-AI

Events:
  "marriage"     → merge two UserProfiles, re-run joint audit
  "salary_hike"  → unlock premium cards, show radar data
  "emi_purchase" → break-even: EMI interest cost vs cashback earned

All functions return structured dicts ready to be serialised by Flask.
"""

from __future__ import annotations
import math
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_all_cards, get_all_rewards_map, query
from audit_engine import run_audit

# ─── Constants ────────────────────────────────────────────────────────────────

CATEGORIES = ["dining", "fuel", "grocery", "travel", "online",
              "utilities", "international"]

# Annual income thresholds (₹) for card eligibility
INCOME_GATES = {
    "hdfc_infinia":  2_500_000,   # invite-only / ₹25L+
    "amex_platinum": 2_000_000,   # ₹20L+
    "hdfc_regalia":    600_000,   # ₹6L+
    "sbi_elite":       600_000,
    "indusind_legend": 500_000,
    "amex_gold":       500_000,
    "hdfc_millennia":  350_000,
    "icici_amazon":    300_000,
    "axis_ace":        300_000,
    "axis_flipkart":   300_000,
    "sbi_simplyclick": 200_000,
    "kotak_league":    300_000,
    "indusind_platinum": 250_000,
    "kotak_811":             0,   # no minimum
    "au_lit":                0,
    "icici_coral":     200_000,
}

# Default EMI interest rate (monthly %) if not specified per card
DEFAULT_EMI_RATE_MONTHLY = 3.0   # 3% per month = 36% pa (RBI ceiling)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _merge_spend(
    spend_a: dict[str, float],
    spend_b: dict[str, float],
) -> dict[str, float]:
    """Sum two monthly spend dicts category-by-category."""
    merged = {cat: 0.0 for cat in CATEGORIES}
    for cat in CATEGORIES:
        merged[cat] = spend_a.get(cat, 0.0) + spend_b.get(cat, 0.0)
    return merged


def _cards_in_reach(income: float, cibil: int = 700) -> list[str]:
    """
    Return card_ids accessible at the given income + CIBIL.
    Uses INCOME_GATES and the card table's min_income_required / min_cibil.
    """
    all_cards = get_all_cards()
    result = []
    for c in all_cards:
        min_inc   = c.get("min_income_required") or INCOME_GATES.get(c["card_id"], 0)
        min_cibil = c.get("min_cibil") or 650
        if income >= min_inc and cibil >= min_cibil:
            result.append(c["card_id"])
    return result


def _nav_for_card(
    card_id: str,
    monthly_spend: dict[str, float],
    rewards_map: dict,
) -> float:
    """Annual NAV for a single card given monthly spend."""
    rates = rewards_map.get(card_id, {})
    return sum(
        monthly_spend.get(cat, 0.0) * rates.get(cat, 0.0) / 100
        for cat in CATEGORIES
    ) * 12


def _card_radar_data(
    cards: list[dict],
    rewards_map: dict,
    monthly_spend: dict[str, float],
    income: float,
    cibil: int,
) -> list[dict]:
    """
    Build radar/spider chart data for each card.
    Returns list of {card_id, name, bank, in_reach, nav_annual, axes: {cat: rate}}.
    The frontend uses `in_reach` to colour cards grey (locked) vs coloured (unlocked).
    """
    accessible = set(_cards_in_reach(income, cibil))
    result = []
    for c in cards:
        if c.get("is_invite_only") and c["card_id"] not in accessible:
            continue   # skip hard invite-only cards entirely
        rates  = rewards_map.get(c["card_id"], {})
        nav    = _nav_for_card(c["card_id"], monthly_spend, rewards_map)
        result.append({
            "card_id":    c["card_id"],
            "name":       c["name"],
            "bank":       c["bank"],
            "annual_fee": c.get("annual_fee", 0),
            "in_reach":   c["card_id"] in accessible,
            "nav_annual": round(nav, 2),
            "axes": {cat: round(rates.get(cat, 0.0), 2) for cat in CATEGORIES},
        })
    # Sort: in_reach first, then by nav desc
    result.sort(key=lambda x: (-int(x["in_reach"]), -x["nav_annual"]))
    return result


# ─── Event: Marriage ──────────────────────────────────────────────────────────

def simulate_marriage(
    profile_a: dict,
    profile_b: dict,
) -> dict:
    """
    Combine two user profiles into a joint household and re-run the audit.

    profile_a / profile_b each contain:
      monthly_spend, current_cards, income_annual, cibil_score

    Returns:
    {
      "event":          "marriage",
      "joint_spend":    {category: combined_monthly},
      "joint_income":   float,
      "joint_cibil":    int (best of the two),
      "audit_before_a": AuditResult,
      "audit_before_b": AuditResult,
      "audit_joint":    AuditResult,
      "leakage_delta":  float,  (joint_optimal - sum of individual optimals)
      "summary":        str,
    }
    """
    spend_a      = {k: float(v) for k, v in profile_a.get("monthly_spend", {}).items()}
    spend_b      = {k: float(v) for k, v in profile_b.get("monthly_spend", {}).items()}
    joint_spend  = _merge_spend(spend_a, spend_b)
    joint_income = float(profile_a.get("income_annual", 0)) + float(profile_b.get("income_annual", 0))
    joint_cibil  = max(int(profile_a.get("cibil_score", 700)),
                       int(profile_b.get("cibil_score", 700)))

    all_cards_a  = list(profile_a.get("current_cards", []))
    all_cards_b  = list(profile_b.get("current_cards", []))
    joint_cards  = list(dict.fromkeys(all_cards_a + all_cards_b))   # deduplicated

    # Run individual audits
    audit_a = run_audit({
        "monthly_spend": spend_a,
        "current_cards": all_cards_a,
        "income_annual": profile_a.get("income_annual", 0),
        "cibil_score":   profile_a.get("cibil_score", 700),
    })
    audit_b = run_audit({
        "monthly_spend": spend_b,
        "current_cards": all_cards_b,
        "income_annual": profile_b.get("income_annual", 0),
        "cibil_score":   profile_b.get("cibil_score", 700),
    })

    # Run joint audit
    audit_joint = run_audit({
        "monthly_spend": joint_spend,
        "current_cards": joint_cards,
        "income_annual": joint_income,
        "cibil_score":   joint_cibil,
    })

    leakage_delta = round(
        audit_joint["leakage_inr"]
        - (audit_a["leakage_inr"] + audit_b["leakage_inr"]),
        2,
    )

    summary = (
        f"As a household, your combined monthly spend is "
        f"₹{int(sum(joint_spend.values())):,}. "
        f"Your joint optimal NAV is ₹{int(audit_joint['optimal_nav_annual']):,}/yr "
        f"vs ₹{int(audit_joint['current_nav_annual']):,}/yr currently — "
        f"a leakage of ₹{int(audit_joint['leakage_inr']):,}/yr."
    )

    return {
        "event":          "marriage",
        "joint_spend":    joint_spend,
        "joint_income":   joint_income,
        "joint_cibil":    joint_cibil,
        "joint_cards":    joint_cards,
        "audit_before_a": audit_a,
        "audit_before_b": audit_b,
        "audit_joint":    audit_joint,
        "leakage_delta":  leakage_delta,
        "summary":        summary,
    }


# ─── Event: Salary Hike ───────────────────────────────────────────────────────

def simulate_salary_hike(
    monthly_spend:    dict[str, float],
    current_income:   float,
    new_income:       float,
    cibil_score:      int = 700,
    current_cards:    list[str] | None = None,
) -> dict:
    """
    Show which premium cards become accessible after a salary hike.

    Returns radar chart data for all cards, annotated with:
      - previously_locked: cards unlocked by the salary hike
      - nav_gain:          extra NAV from switching to best newly-unlocked card

    {
      "event":              "salary_hike",
      "current_income":     float,
      "new_income":         float,
      "income_increase_pct": float,
      "previously_locked":  [card_id, ...],
      "newly_unlocked":     [card_id, ...],
      "radar_before":       [{card_id, name, in_reach, nav_annual, axes}, ...],
      "radar_after":        [{card_id, name, in_reach, nav_annual, axes}, ...],
      "best_new_card":      {card_id, name, nav_annual} | None,
      "nav_gain":           float,
      "audit_after":        AuditResult,
      "summary":            str,
    }
    """
    monthly_spend  = {k: float(v) for k, v in monthly_spend.items()}
    current_cards  = list(current_cards or [])
    rewards_map    = get_all_rewards_map()
    all_cards      = get_all_cards()

    before_set = set(_cards_in_reach(current_income, cibil_score))
    after_set  = set(_cards_in_reach(new_income,     cibil_score))

    newly_unlocked    = sorted(after_set - before_set)
    previously_locked = sorted(before_set - after_set)   # shouldn't happen, but safe

    radar_before = _card_radar_data(all_cards, rewards_map, monthly_spend,
                                    current_income, cibil_score)
    radar_after  = _card_radar_data(all_cards, rewards_map, monthly_spend,
                                    new_income, cibil_score)

    # Find best newly-unlocked card by NAV
    best_new_card = None
    best_nav_gain = 0.0
    if newly_unlocked:
        navs = [(cid, _nav_for_card(cid, monthly_spend, rewards_map))
                for cid in newly_unlocked]
        navs.sort(key=lambda x: -x[1])
        best_cid, best_nav = navs[0]
        card_info = next((c for c in all_cards if c["card_id"] == best_cid), {})

        # NAV gain = best_new_nav - best_current_nav
        current_navs = [_nav_for_card(cid, monthly_spend, rewards_map)
                        for cid in current_cards] or [0.0]
        best_nav_gain = round(best_nav - max(current_navs), 2)
        best_new_card = {
            "card_id":    best_cid,
            "name":       card_info.get("name", best_cid),
            "bank":       card_info.get("bank", ""),
            "nav_annual": round(best_nav, 2),
            "annual_fee": card_info.get("annual_fee", 0),
        }

    # Re-run audit with new income (unlocks new recommendations)
    audit_after = run_audit({
        "monthly_spend": monthly_spend,
        "current_cards": current_cards,
        "income_annual": new_income,
        "cibil_score":   cibil_score,
    })

    inc_pct = round(((new_income - current_income) / current_income) * 100, 1) \
              if current_income > 0 else 0

    unlock_names = []
    card_map = {c["card_id"]: c["name"] for c in all_cards}
    for cid in newly_unlocked[:3]:
        unlock_names.append(card_map.get(cid, cid))

    summary = (
        f"Your income increased by {inc_pct}% to ₹{int(new_income):,}/yr. "
        + (
            f"You now qualify for {len(newly_unlocked)} new card(s): "
            f"{', '.join(unlock_names)}. "
            + (
                f"Switching to {best_new_card['name']} could earn you "
                f"₹{int(max(best_nav_gain, 0)):,} extra/yr."
                if best_new_card else ""
            )
            if newly_unlocked else
            "No new cards unlocked yet — keep building that income! 💪"
        )
    )

    return {
        "event":               "salary_hike",
        "current_income":      current_income,
        "new_income":          new_income,
        "income_increase_pct": inc_pct,
        "previously_locked":   previously_locked,
        "newly_unlocked":      newly_unlocked,
        "newly_unlocked_names": [card_map.get(c, c) for c in newly_unlocked],
        "radar_before":        radar_before,
        "radar_after":         radar_after,
        "best_new_card":       best_new_card,
        "nav_gain":            best_nav_gain,
        "audit_after":         audit_after,
        "summary":             summary,
    }


# ─── Event: EMI Purchase ──────────────────────────────────────────────────────

def simulate_emi_purchase(
    purchase_amount:    float,
    emi_months:         int,
    card_id:            str | None = None,
    monthly_spend:      dict[str, float] | None = None,
    current_cards:      list[str] | None = None,
) -> dict:
    """
    Calculate the break-even between EMI interest cost and cashback earned.

    Formula:
      monthly_emi      = purchase_amount / emi_months  (0% EMI approximation)
      emi_interest     = purchase_amount * (rate/100) * emi_months  (flat rate)
      cashback_earned  = purchase_amount * (reward_rate/100)
      break_even_month = first month where cumulative_cashback >= cumulative_interest

    Returns:
    {
      "event":               "emi_purchase",
      "purchase_amount":     float,
      "emi_months":          int,
      "card_used":           {card_id, name, reward_rate, emi_rate_monthly},
      "emi_interest_total":  float,
      "cashback_earned":     float,
      "net_cost":            float,      (interest - cashback)
      "break_even_month":    int | None,
      "recommendation":      str,        ("pay_full" | "emi_ok" | "avoid")
      "chart_data":          [{month, cumulative_interest, cumulative_cashback}],
      "summary":             str,
    }
    """
    purchase_amount = float(purchase_amount)
    emi_months      = int(emi_months)
    monthly_spend   = {k: float(v) for k, v in (monthly_spend or {}).items()}
    current_cards   = list(current_cards or [])

    all_cards    = {c["card_id"]: c for c in get_all_cards()}
    rewards_map  = get_all_rewards_map()

    # Select card to use
    if card_id and card_id in all_cards:
        chosen_card = all_cards[card_id]
    elif current_cards:
        # Pick best card for "online" (typical large purchase category)
        best_cid = max(
            current_cards,
            key=lambda cid: rewards_map.get(cid, {}).get("online", 0),
        )
        chosen_card = all_cards.get(best_cid, list(all_cards.values())[0])
    else:
        # Fall back to highest overall NAV card
        best_cid = max(
            rewards_map,
            key=lambda cid: sum(rewards_map[cid].values()),
        )
        chosen_card = all_cards.get(best_cid, {})

    cid         = chosen_card.get("card_id", "unknown")
    card_name   = chosen_card.get("name", cid)
    emi_rate    = float(chosen_card.get("interest_rate_monthly") or DEFAULT_EMI_RATE_MONTHLY)
    reward_rate = rewards_map.get(cid, {}).get("online", 1.0)   # use online rate for purchases

    # ── Core calculations ──────────────────────────────────────────────────────
    # Flat-rate EMI interest (how Indian banks charge it)
    emi_interest_total = round(purchase_amount * (emi_rate / 100) * emi_months, 2)
    cashback_earned    = round(purchase_amount * reward_rate / 100, 2)
    net_cost           = round(emi_interest_total - cashback_earned, 2)

    monthly_emi_principal = purchase_amount / emi_months
    monthly_interest      = purchase_amount * (emi_rate / 100)   # flat rate per month
    monthly_cashback      = cashback_earned   # earned upfront on purchase

    # ── Break-even chart data ──────────────────────────────────────────────────
    chart_data = []
    cumulative_interest  = 0.0
    cumulative_cashback  = cashback_earned   # earned at month 0
    break_even_month     = None

    for month in range(1, emi_months + 1):
        cumulative_interest = round(monthly_interest * month, 2)
        chart_data.append({
            "month":                  month,
            "cumulative_interest":    cumulative_interest,
            "cumulative_cashback":    round(cumulative_cashback, 2),
            "net":                    round(cumulative_cashback - cumulative_interest, 2),
        })
        if break_even_month is None and cumulative_cashback >= cumulative_interest:
            break_even_month = month

    # ── Recommendation ────────────────────────────────────────────────────────
    if net_cost <= 0:
        recommendation = "pay_full"   # cashback > interest — use EMI if needed
        rec_text = (
            f"You earn ₹{int(cashback_earned):,} cashback vs "
            f"₹{int(emi_interest_total):,} interest — "
            f"cashback covers the cost! EMI is fine on {card_name}."
        )
    elif net_cost <= purchase_amount * 0.02:
        recommendation = "emi_ok"
        rec_text = (
            f"Net cost after cashback: ₹{int(net_cost):,} "
            f"({net_cost/purchase_amount*100:.1f}% of purchase). Acceptable for large purchases."
        )
    else:
        recommendation = "avoid"
        rec_text = (
            f"EMI interest ₹{int(emi_interest_total):,} far exceeds "
            f"cashback ₹{int(cashback_earned):,}. "
            f"Save up or pay in full to avoid ₹{int(net_cost):,} net cost."
        )

    summary = (
        f"₹{int(purchase_amount):,} over {emi_months} months on {card_name} "
        f"({emi_rate:.1f}%/mo flat): "
        f"interest=₹{int(emi_interest_total):,}, "
        f"cashback=₹{int(cashback_earned):,} ({reward_rate:.1f}%). "
        f"{rec_text}"
    )

    return {
        "event":               "emi_purchase",
        "purchase_amount":     purchase_amount,
        "emi_months":          emi_months,
        "card_used": {
            "card_id":              cid,
            "name":                 card_name,
            "reward_rate_pct":      reward_rate,
            "emi_rate_monthly_pct": emi_rate,
        },
        "emi_interest_total":  emi_interest_total,
        "cashback_earned":     cashback_earned,
        "net_cost":            net_cost,
        "break_even_month":    break_even_month,
        "recommendation":      recommendation,
        "chart_data":          chart_data,
        "summary":             summary,
    }
