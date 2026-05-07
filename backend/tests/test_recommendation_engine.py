"""
test_recommendation_engine.py — Tests for the unified RecommendationEngine

Verifies:
  - returns 'unaudited' on zero spend
  - attaches approval_probability + expected_annual_value to every rec
  - top-k cap is respected
  - persona alignment flag is set
  - approval-floor filter actually drops very-low-CIBIL candidates
"""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from recommendation_engine import RecommendationEngine, recommend


@pytest.fixture
def engine():
    return RecommendationEngine()


def test_unaudited_on_zero_spend(engine):
    out = engine.recommend({
        "monthly_spend": {},
        "current_cards": [],
        "income_annual": 1_000_000,
        "cibil_score":   780,
    })
    assert out["status"] == "unaudited"
    assert out["recommendations"] == []


def test_recommendations_have_approval_and_ev(engine):
    out = engine.recommend({
        "monthly_spend": {
            "dining": 8000, "fuel": 4000, "grocery": 6000, "travel": 5000,
            "online": 7000, "utilities": 3000, "international": 0, "other": 4000,
        },
        "current_cards": ["hdfc_millennia"],
        "income_annual": 1_200_000,
        "cibil_score":   780,
    }, k=3)

    assert out["status"] in {"pass", "warning", "critical"}
    assert len(out["recommendations"]) <= 3
    assert len(out["recommendations"]) > 0
    for r in out["recommendations"]:
        assert "marginal_nav" in r
        assert "expected_annual_value" in r
        # approval_probability should be set OR explicitly None (no model)
        assert "approval_probability" in r
        # EV must never exceed gross marginal
        if r.get("approval_probability") is not None:
            assert r["expected_annual_value"] <= r["marginal_nav"] + 0.01


def test_persona_alignment_flagged(engine):
    out = engine.recommend({
        "monthly_spend": {
            "dining": 5000, "online": 15000, "grocery": 3000,
            "fuel": 1000, "travel": 1000, "utilities": 2000,
            "international": 0, "other": 2000,
        },
        "current_cards": [],
        "income_annual": 800_000,
        "cibil_score":   750,
    }, k=5)
    assert out["persona"] is not None
    # at least one rec should have persona_aligned set (True or False, never missing)
    for r in out["recommendations"]:
        assert "persona_aligned" in r


def test_top_k_respected(engine):
    out = engine.recommend({
        "monthly_spend": {
            "dining": 3000, "online": 5000, "grocery": 4000, "fuel": 2000,
            "travel": 2000, "utilities": 1500, "international": 0, "other": 2000,
        },
        "current_cards": [],
        "income_annual": 1_500_000,
        "cibil_score":   800,
    }, k=2)
    assert len(out["recommendations"]) <= 2


def test_low_cibil_drops_premium_cards():
    """User with cibil=600 should NOT see hdfc_infinia (min_cibil=780)."""
    out = recommend({
        "monthly_spend": {
            "dining": 4000, "online": 6000, "grocery": 5000, "fuel": 2000,
            "travel": 3000, "utilities": 2000, "international": 0, "other": 3000,
        },
        "current_cards": [],
        "income_annual": 400_000,
        "cibil_score":   600,
    }, k=10)
    rec_ids = {r["card_id"] for r in out["recommendations"]}
    assert "hdfc_infinia"  not in rec_ids
    assert "amex_platinum" not in rec_ids


def test_module_level_recommend_function():
    out = recommend({
        "monthly_spend": {"dining": 5000, "online": 5000, "fuel": 2000,
                          "grocery": 4000, "travel": 2000, "utilities": 2000,
                          "international": 0, "other": 2000},
        "current_cards": [],
        "income_annual": 900_000,
        "cibil_score":   760,
    })
    assert "recommendations" in out
    assert "audit" in out
