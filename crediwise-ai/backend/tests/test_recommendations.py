"""
test_recommendations.py — Phase 6 Validation Tests

End-to-end validation that the recommendation pipeline produces sensible output
for the 5 canonical user profiles defined in the audit spec.

Run: pytest backend/tests/test_recommendations.py -v
"""

import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from audit_engine import run_audit
from persona_engine import predict_persona


def _audit(spend, income, cibil, owned=()):
    return run_audit({
        "monthly_spend": spend,
        "income_annual": income,
        "cibil_score":   cibil,
        "current_cards": list(owned),
    })


# ─── TEST 1 — The Amazon Shopper ──────────────────────────────────────────────

def test_amazon_shopper_picks_amazon_friendly_card():
    """User with heavy online spend should NOT get Axis-Millennia / SBI SimplyCLICK
    as #1. Should be ICICI Amazon Pay or Axis Flipkart (both 5% on online)."""
    res = _audit(
        spend={"online": 20000, "dining": 3000, "fuel": 2000, "grocery": 2000},
        income=400000, cibil=720,
    )
    assert res["recommendations"], "should have recommendations"
    top = res["recommendations"][0]
    assert top["card_id"] in {"icici_amazon", "axis_flipkart"}, \
        f"Top card was {top['card_id']!r} — should be ICICI Amazon Pay or Axis Flipkart"
    assert top["card_id"] != "sbi_simplyclick"
    # ICICI Amazon Pay must be in top 3
    top_ids = {r["card_id"] for r in res["recommendations"]}
    assert "icici_amazon" in top_ids, "ICICI Amazon Pay must appear in top 3 for Amazon shopper"


# ─── TEST 2 — The Frequent Flyer ──────────────────────────────────────────────

def test_frequent_flyer_persona_is_stealth_nomad():
    """Heavy travel + international spend → Stealth Nomad persona."""
    body = {
        "monthly_spend": {"travel": 25000, "international": 10000, "dining": 5000, "online": 3000},
        "income_annual": 1500000, "cibil_score": 780, "current_cards": [],
    }
    p = predict_persona(
        monthly_spend = body["monthly_spend"],
        income_annual = body["income_annual"],
        cards_count   = 0,
        current_cards = [],
        cibil_score   = body["cibil_score"],
    )
    assert p["persona_id"] == 0, f"Expected Stealth Nomad (0), got {p['persona_name']}"
    assert p["confidence"] >= 0.5


def test_frequent_flyer_recs_include_lounge():
    """Recommendations for traveler should include at least one card with lounge access."""
    res = _audit(
        spend={"travel": 25000, "international": 10000, "dining": 5000, "online": 3000},
        income=1500000, cibil=780,
    )
    has_lounge = any(r["lounge_domestic"] > 0 for r in res["recommendations"])
    assert has_lounge, "At least one recommendation should offer lounge access"


# ─── TEST 3 — The College Student ─────────────────────────────────────────────

def test_college_student_only_eligible_for_no_income_card():
    """Student (income=0, cibil=0) must only see Kotak 811 (no min-income card).
    HDFC Millennia (₹350k income) must NOT appear."""
    res = _audit(
        spend={"online": 3000, "dining": 1500, "fuel": 500, "grocery": 1000},
        income=0, cibil=0,
    )
    assert res["recommendations"], "should still have recommendations via fallback"
    top_ids = {r["card_id"] for r in res["recommendations"]}
    assert "hdfc_millennia" not in top_ids, "HDFC Millennia requires income — must not appear"
    assert "kotak_811" in top_ids, "Kotak 811 must appear (only no-income card)"
    assert res["recommendations"][0]["card_id"] == "kotak_811"


# ─── TEST 4 — The High Earner With Bad Cards ─────────────────────────────────

def test_high_earner_bad_cards_critical_status():
    """SBI SimplyCLICK + Kotak 811 are weak for ₹48k/mo of mixed spend."""
    res = _audit(
        spend={"dining": 15000, "online": 20000, "travel": 10000, "fuel": 3000},
        income=2000000, cibil=800,
        owned=["sbi_simplyclick", "kotak_811"],
    )
    assert res["status"] == "critical", f"Expected CRITICAL, got {res['status']}"
    assert res["leakage_inr"] >= 5000
    # Should output split-plays
    assert res["split_plays"], "Should suggest split-play strategy"


# ─── TEST 5 — The Optimal User ────────────────────────────────────────────────

def test_optimal_user_passes_audit():
    """ICICI Amazon Pay + Axis Ace already cover online/dining/utilities well."""
    res = _audit(
        spend={"dining": 5000, "online": 8000, "travel": 2000},
        income=500000, cibil=750,
        owned=["icici_amazon", "axis_ace"],
    )
    assert res["status"] in {"pass", "warning"}, \
        f"Expected pass/warning, got {res['status']} (leakage ₹{res['leakage_inr']})"
    assert res["leakage_inr"] < 5000


# ─── BONUS — Engine invariants ────────────────────────────────────────────────

def test_empty_wallet_status_is_unaudited():
    """Spec says empty wallet must NOT be CRITICAL — should be 'unaudited'."""
    res = _audit(
        spend={"dining": 5000, "online": 8000},
        income=500000, cibil=750,
        owned=[],
    )
    assert res["status"] == "unaudited"
    assert res["leakage_inr"] >= 0  # not negative


def test_zero_spend_is_unaudited():
    """No spend entered should be unaudited, not divide-by-zero."""
    res = _audit(spend={}, income=500000, cibil=750)
    assert res["status"] == "unaudited"
    assert res["recommendations"] == []


def test_monthly_cap_is_enforced():
    """HDFC Millennia caps online cashback at ₹1000/month. Heavy online spend
    must not earn ₹3000/mo (5% of ₹60k); should be capped at ₹1000."""
    res = _audit(
        spend={"online": 60000},
        income=500000, cibil=750,
        owned=["hdfc_millennia"],
    )
    annual_reward = res["current_cards"][0]["annual_reward"]
    # Without cap: 60000 * 5% * 12 = ₹36,000
    # With cap:    1000 * 12 = ₹12,000
    assert annual_reward <= 12500, \
        f"HDFC Millennia online cap not enforced: earned ₹{annual_reward}"
    assert annual_reward >= 11500


def test_fee_waiver_credit():
    """User crossing fee_waiver_spend should see fee_waived=True on
    HDFC Regalia (waiver at ₹4L annual = ~₹33k/mo)."""
    res = _audit(
        spend={"dining": 15000, "travel": 15000, "online": 8000, "grocery": 5000},
        income=800000, cibil=750,
        owned=["hdfc_regalia"],
    )
    cur = res["current_cards"][0]
    assert cur["fee_waived"] is True, "Annual ₹516k spend should waive Regalia's fee"


def test_invite_only_card_never_recommended():
    """HDFC Infinia must never appear in auto-recommendations."""
    res = _audit(
        spend={"dining": 25000, "travel": 50000, "online": 30000},
        income=5000000, cibil=850,
    )
    top_ids = {r["card_id"] for r in res["recommendations"]}
    assert "hdfc_infinia" not in top_ids
