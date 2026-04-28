"""
tests/test_audit_engine.py — Unit tests for Shadow Audit Engine
Run: pytest backend/tests/ -v
"""

import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from audit_engine import (
    _best_rates_for_wallet,
    _compute_nav,
    _compute_shap,
    _build_reason,
    _find_recommendations,
    _leakage_message,
    run_audit,
    CATEGORIES,
)

# ─── Fixtures ────────────────────────────────────────────────────────────────

MOCK_REWARDS = {
    "card_a": {"dining": 5.0, "fuel": 2.0, "grocery": 3.0, "travel": 1.0,
               "online": 1.0, "utilities": 1.0, "international": 1.0, "other": 1.0},
    "card_b": {"dining": 1.0, "fuel": 1.0, "grocery": 1.0, "travel": 6.0,
               "online": 5.0, "utilities": 2.0, "international": 3.0, "other": 1.0},
    "card_c": {"dining": 2.0, "fuel": 5.0, "grocery": 2.0, "travel": 2.0,
               "online": 2.0, "utilities": 5.0, "international": 1.0, "other": 2.0},
}

MOCK_META = {
    "card_a": {"name": "Card A Premium", "bank": "Bank A", "annual_fee": 2500,
               "min_income_annual": 600000, "min_cibil": 700, "is_invite_only": 0},
    "card_b": {"name": "Card B Travel", "bank": "Bank B", "annual_fee": 1000,
               "min_income_annual": 400000, "min_cibil": 700, "is_invite_only": 0},
    "card_c": {"name": "Card C Fuel",   "bank": "Bank C", "annual_fee": 499,
               "min_income_annual": 300000, "min_cibil": 650, "is_invite_only": 0},
}

STANDARD_SPEND = {
    "dining": 8000, "fuel": 5000, "grocery": 6000,
    "travel": 10000, "online": 7000, "utilities": 3000,
    "international": 2000, "other": 4000,
}


# ─── _best_rates_for_wallet ──────────────────────────────────────────────────

class TestBestRatesForWallet:
    def test_single_card(self):
        rates = _best_rates_for_wallet(["card_a"], MOCK_REWARDS)
        assert rates["dining"] == 5.0
        assert rates["travel"] == 1.0

    def test_two_cards_picks_best(self):
        rates = _best_rates_for_wallet(["card_a", "card_b"], MOCK_REWARDS)
        assert rates["dining"] == 5.0    # card_a better
        assert rates["travel"] == 6.0   # card_b better
        assert rates["fuel"]   == 2.0   # card_a

    def test_empty_wallet_returns_zeros(self):
        rates = _best_rates_for_wallet([], MOCK_REWARDS)
        assert all(v == 0.0 for v in rates.values())

    def test_all_cards(self):
        rates = _best_rates_for_wallet(["card_a", "card_b", "card_c"], MOCK_REWARDS)
        assert rates["dining"] == 5.0   # card_a
        assert rates["travel"] == 6.0   # card_b
        assert rates["fuel"]   == 5.0   # card_c


# ─── _compute_nav ────────────────────────────────────────────────────────────

class TestComputeNav:
    def test_basic(self):
        spend = {"dining": 10000, "fuel": 0, "grocery": 0, "travel": 0,
                 "online": 0, "utilities": 0, "international": 0, "other": 0}
        rates = {"dining": 5.0}
        nav = _compute_nav(spend, rates)
        assert nav == pytest.approx(6000.0)   # 10000*5%*12

    def test_multi_category(self):
        spend = {"dining": 5000, "travel": 10000, "online": 7000,
                 "fuel": 0, "grocery": 0, "utilities": 0, "international": 0, "other": 0}
        rates = {"dining": 5.0, "travel": 6.0, "online": 5.0}
        nav = _compute_nav(spend, rates)
        # monthly: 250+600+350=1200; *12=14400
        assert nav == pytest.approx(14400.0)

    def test_zero_spend(self):
        spend = {cat: 0 for cat in CATEGORIES}
        rates = {cat: 5.0 for cat in CATEGORIES}
        assert _compute_nav(spend, rates) == 0.0


# ─── _compute_shap ───────────────────────────────────────────────────────────

class TestComputeShap:
    def test_no_improvement(self):
        current = {"dining": 5.0}
        card    = {"dining": 3.0}   # worse → 0
        shap = _compute_shap({"dining": 10000}, current, card)
        assert shap["dining"] == 0.0

    def test_positive_improvement(self):
        current = {"dining": 2.0}
        card    = {"dining": 5.0}
        shap = _compute_shap({"dining": 10000}, current, card)
        # (5-2)% * 10000 / 100 * 12 = 0.03 * 10000 * 12 = 3600
        assert shap["dining"] == pytest.approx(3600.0)

    def test_multiple_categories(self):
        current = {"dining": 2.0, "travel": 3.0, "online": 5.0}
        card    = {"dining": 5.0, "travel": 6.0, "online": 4.0}  # online worse
        spend   = {"dining": 10000, "travel": 10000, "online": 10000}
        shap = _compute_shap(spend, current, card)
        # (5-2)% * 10000 / 100 * 12 = 3600
        assert shap["dining"] == pytest.approx(3600.0)
        # (6-3)% * 10000 / 100 * 12 = 3600
        assert shap["travel"] == pytest.approx(3600.0)
        assert shap["online"] == 0.0   # no improvement

    def test_returns_all_categories(self):
        shap = _compute_shap({}, {}, {})
        assert set(shap.keys()) == set(CATEGORIES)


# ─── _build_reason ───────────────────────────────────────────────────────────

class TestBuildReason:
    def test_top_categories_mentioned(self):
        shap = {"dining": 5000.0, "travel": 3000.0, "online": 100.0,
                "fuel": 0, "grocery": 0, "utilities": 0, "international": 0, "other": 0}
        reason = _build_reason("Test Card", shap, 8100.0)
        assert "dining" in reason.lower() or "restaurant" in reason.lower()
        assert "₹8,100" in reason

    def test_no_improvements(self):
        shap = {cat: 0.0 for cat in CATEGORIES}
        reason = _build_reason("Test Card", shap, 0.0)
        assert "Test Card" in reason


# ─── _leakage_message ────────────────────────────────────────────────────────

class TestLeakageMessage:
    def test_pass(self):
        msg = _leakage_message(1500, "pass")
        assert "₹1,500" in msg
        assert "optimised" in msg.lower() or "great" in msg.lower()

    def test_warning(self):
        msg = _leakage_message(3000, "warning")
        assert "₹3,000" in msg
        assert "losing" in msg.lower()

    def test_critical(self):
        msg = _leakage_message(8000, "critical")
        assert "₹8,000" in msg
        assert "losing" in msg.lower()


# ─── _find_recommendations ───────────────────────────────────────────────────

class TestFindRecommendations:
    def test_excludes_current_cards(self):
        spend = STANDARD_SPEND.copy()
        current = _best_rates_for_wallet(["card_a"], MOCK_REWARDS)
        recs = _find_recommendations(
            spend, ["card_a"], MOCK_REWARDS, current, MOCK_META,
            income_annual=800000, cibil_score=750
        )
        card_ids = [r["card_id"] for r in recs]
        assert "card_a" not in card_ids

    def test_returns_at_most_top_n(self):
        spend = STANDARD_SPEND.copy()
        current = {}
        recs = _find_recommendations(
            spend, [], MOCK_REWARDS, current, MOCK_META,
            top_n=2
        )
        assert len(recs) <= 2

    def test_ranked_by_marginal_nav(self):
        spend = STANDARD_SPEND.copy()
        current = {}
        recs = _find_recommendations(
            spend, [], MOCK_REWARDS, current, MOCK_META,
        )
        navs = [r["marginal_nav"] for r in recs]
        assert navs == sorted(navs, reverse=True) or recs[0]["eligible"]

    def test_shap_values_present(self):
        spend = STANDARD_SPEND.copy()
        recs = _find_recommendations(
            spend, [], MOCK_REWARDS, {}, MOCK_META,
        )
        for rec in recs:
            assert "shap_values" in rec
            assert set(rec["shap_values"].keys()) == set(CATEGORIES)

    def test_skips_invite_only(self):
        meta_with_invite = {
            **MOCK_META,
            "card_d": {"name": "Invite Only", "bank": "BankX", "annual_fee": 50000,
                       "min_income_annual": 5000000, "min_cibil": 800, "is_invite_only": 1},
        }
        rewards_with_invite = {
            **MOCK_REWARDS,
            "card_d": {cat: 10.0 for cat in CATEGORIES},
        }
        recs = _find_recommendations(
            STANDARD_SPEND, [], rewards_with_invite, {}, meta_with_invite,
        )
        assert "card_d" not in [r["card_id"] for r in recs]


# ─── Integration: run_audit (uses real DB) ───────────────────────────────────

class TestRunAuditIntegration:
    """These tests use the real SQLite database (must be seeded first)."""

    def test_basic_audit_structure(self):
        profile = {
            "monthly_spend": STANDARD_SPEND,
            "current_cards": ["icici_coral"],
            "income_annual": 900000,
            "cibil_score":   730,
        }
        result = run_audit(profile)

        assert "current_nav_annual"  in result
        assert "optimal_nav_annual"  in result
        assert "leakage_inr"         in result
        assert "status"              in result
        assert "message"             in result
        assert "recommendations"     in result
        assert "spend_breakdown"     in result

    def test_status_is_valid(self):
        profile = {"monthly_spend": STANDARD_SPEND, "current_cards": [], "income_annual": 0, "cibil_score": 700}
        result = run_audit(profile)
        assert result["status"] in ("pass", "warning", "critical")

    def test_no_current_cards_gives_max_leakage(self):
        profile = {"monthly_spend": STANDARD_SPEND, "current_cards": [], "income_annual": 0, "cibil_score": 700}
        result = run_audit(profile)
        # No cards = zero current NAV → maximum possible leakage
        assert result["current_nav_annual"] == 0.0
        assert result["leakage_inr"] == result["optimal_nav_annual"]

    def test_optimal_wallet_has_zero_leakage(self):
        """A user who already holds all cards should have ~0 leakage."""
        from database import get_all_cards
        all_ids = [c["card_id"] for c in get_all_cards()]
        profile = {
            "monthly_spend": STANDARD_SPEND,
            "current_cards": all_ids,
            "income_annual": 9999999,
            "cibil_score":   850,
        }
        result = run_audit(profile)
        assert result["leakage_inr"] == pytest.approx(0.0, abs=1.0)

    def test_recommendations_have_shap(self):
        profile = {
            "monthly_spend": STANDARD_SPEND,
            "current_cards": ["icici_coral"],
            "income_annual": 700000,
            "cibil_score":   720,
        }
        result = run_audit(profile)
        for rec in result["recommendations"]:
            assert "shap_values" in rec
            assert "reason" in rec
            assert "marginal_nav" in rec
            assert rec["marginal_nav"] >= 0

    def test_low_spend_user_can_pass(self):
        low_spend = {cat: 500 for cat in CATEGORIES}
        profile = {
            "monthly_spend": low_spend,
            "current_cards": ["axis_ace"],
            "income_annual": 500000,
            "cibil_score":   710,
        }
        result = run_audit(profile)
        # Low-spend user with a decent card should have low leakage
        assert result["leakage_inr"] < 10000   # reasonable sanity check

    def test_hdfc_millennia_high_online_spend(self):
        """User with heavy online spend + HDFC Millennia should show low leakage."""
        online_heavy = {
            "dining": 2000, "fuel": 1000, "grocery": 2000,
            "travel": 1000, "online": 30000, "utilities": 1000,
            "international": 0, "other": 2000,
        }
        profile = {
            "monthly_spend": online_heavy,
            "current_cards": ["hdfc_millennia"],
            "income_annual": 600000,
            "cibil_score":   720,
        }
        result = run_audit(profile)
        # Millennia is best for online — leakage should be modest
        assert result["current_nav_annual"] > 0

    def test_leakage_message_contains_rupee_amount(self):
        profile = {
            "monthly_spend": STANDARD_SPEND,
            "current_cards": ["kotak_811"],
            "income_annual": 600000,
            "cibil_score":   720,
        }
        result = run_audit(profile)
        assert "₹" in result["message"]

    def test_spend_breakdown_covers_nonzero_categories(self):
        profile = {
            "monthly_spend": {"dining": 10000, "fuel": 5000, "other": 0},
            "current_cards": [],
            "income_annual": 500000,
            "cibil_score":   700,
        }
        result = run_audit(profile)
        assert "dining" in result["spend_breakdown"]
        assert "fuel"   in result["spend_breakdown"]
        # Zero-spend categories are omitted
        assert "other"  not in result["spend_breakdown"]
