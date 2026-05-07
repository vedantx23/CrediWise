"""
tests/test_reward_calc.py — Unit tests for core reward calculation formulas.
Run: pytest backend/tests/ -v
"""

import pytest
import sys
import os

# Make backend importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─── Formula under test ──────────────────────────────────────────────────────
def compute_err(points_per_unit: float, point_value_paise: float, spend_unit_paise: float) -> float:
    """Effective Reward Rate = (points_per_unit * point_value_paise / spend_unit_paise) * 100"""
    return round((points_per_unit * point_value_paise / spend_unit_paise) * 100, 4)


def compute_nav(spend: dict, rates: dict) -> float:
    """
    Annual Net Annual Value.
    spend  = {category: monthly_spend_inr}
    rates  = {category: reward_rate_percent}
    Returns annual reward value in INR.
    """
    monthly = sum(spend.get(cat, 0) * rates.get(cat, 0) / 100 for cat in spend)
    return round(monthly * 12, 2)


def compute_leakage(current_nav: float, optimal_nav: float) -> float:
    return round(max(0.0, optimal_nav - current_nav), 2)


def audit_status(leakage: float) -> str:
    if leakage < 2000:
        return "pass"
    elif leakage < 5000:
        return "warning"
    return "critical"


# ─── ERR Tests ───────────────────────────────────────────────────────────────

class TestEffectiveRewardRate:
    def test_hdfc_regalia_base(self):
        # 4pts per ₹150, 1pt=₹0.50=50 paise; spend unit=15000 paise
        err = compute_err(4, 50, 15000)
        assert err == pytest.approx(1.3333, rel=1e-3)

    def test_hdfc_millennia_cashback(self):
        # 5% direct cashback → ERR = 5.0
        err = compute_err(5, 100, 10000)   # 5 paise per 100 paise → 5%
        assert err == pytest.approx(5.0, rel=1e-3)

    def test_hdfc_infinia_smartbuy(self):
        # 10x pts per ₹150, 1pt=₹1=100 paise; spend unit=15000 paise
        err = compute_err(10, 100, 15000)
        assert err == pytest.approx(6.6667, rel=1e-3)

    def test_sbi_simplyclick_base(self):
        # 1pt per ₹100, 1pt=25 paise; spend unit=10000 paise
        err = compute_err(1, 25, 10000)
        assert err == pytest.approx(0.25, rel=1e-3)

    def test_sbi_simplyclick_10x(self):
        # 10x on Amazon: 10pts per ₹100, 1pt=25 paise
        err = compute_err(10, 25, 10000)
        assert err == pytest.approx(2.5, rel=1e-3)

    def test_axis_ace_google_pay(self):
        # Direct 5% cashback
        err = compute_err(5, 100, 10000)
        assert err == pytest.approx(5.0, rel=1e-3)

    def test_zero_rate(self):
        err = compute_err(0, 50, 10000)
        assert err == 0.0

    def test_lifetime_free_kotak_811(self):
        # 2% online cashback
        err = compute_err(2, 100, 10000)
        assert err == pytest.approx(2.0, rel=1e-3)


# ─── NAV Tests ───────────────────────────────────────────────────────────────

class TestNAVCalculation:
    def test_single_category(self):
        spend = {"dining": 10000}
        rates = {"dining": 5.0}
        nav = compute_nav(spend, rates)
        # 10000 * 5% = 500/month * 12 = 6000
        assert nav == pytest.approx(6000.0)

    def test_multi_category(self):
        spend = {"dining": 5000, "online": 10000, "fuel": 3000, "other": 5000}
        rates = {"dining": 4.0, "online": 5.0, "fuel": 2.0, "other": 1.33}
        nav = compute_nav(spend, rates)
        # monthly: 200 + 500 + 60 + 66.5 = 826.5 → *12 = 9918
        assert nav == pytest.approx(9918.0, rel=1e-2)

    def test_missing_category_defaults_to_zero(self):
        spend = {"dining": 5000, "travel": 8000}
        rates = {"dining": 2.0}   # no travel rate
        nav = compute_nav(spend, rates)
        # Only dining counts: 5000*0.02*12 = 1200
        assert nav == pytest.approx(1200.0)

    def test_zero_spend(self):
        spend = {"dining": 0, "fuel": 0}
        rates = {"dining": 5.0, "fuel": 2.0}
        assert compute_nav(spend, rates) == 0.0

    def test_hdfc_regalia_example(self):
        """Full example: mid-income user with HDFC Regalia."""
        spend = {
            "dining": 8000, "fuel": 5000, "grocery": 6000,
            "travel": 10000, "online": 7000, "utilities": 3000,
            "international": 2000, "other": 4000,
        }
        rates = {
            "dining": 1.67, "fuel": 1.33, "grocery": 1.33,
            "travel": 1.67, "online": 1.33, "utilities": 1.33,
            "international": 2.00, "other": 1.33,
        }
        nav = compute_nav(spend, rates)
        assert nav > 5000  # reasonable lower bound for this spend


# ─── Leakage & Status Tests ──────────────────────────────────────────────────

class TestLeakageAndStatus:
    def test_pass_status(self):
        assert audit_status(0) == "pass"
        assert audit_status(1999.99) == "pass"

    def test_warning_status(self):
        assert audit_status(2000) == "warning"
        assert audit_status(4999.99) == "warning"

    def test_critical_status(self):
        assert audit_status(5000) == "critical"
        assert audit_status(50000) == "critical"

    def test_leakage_positive(self):
        assert compute_leakage(5000, 8000) == pytest.approx(3000.0)

    def test_leakage_zero_when_optimal_is_worse(self):
        # Current is better → no leakage (shouldn't happen but handled)
        assert compute_leakage(10000, 8000) == 0.0

    def test_leakage_exact(self):
        assert compute_leakage(12000, 18400) == pytest.approx(6400.0)


# ─── Integration: Full Audit Scenario ────────────────────────────────────────

class TestAuditScenario:
    def test_user_with_single_card_vs_optimal(self):
        spend = {"dining": 15000, "online": 20000, "fuel": 5000, "other": 10000}

        # Current: ICICI Coral (low rates)
        current_rates = {"dining": 1.00, "online": 0.50, "fuel": 0.50, "other": 0.50}
        current_nav = compute_nav(spend, current_rates)

        # Optimal: axis_ace + hdfc_millennia
        optimal_rates = {"dining": 4.00, "online": 5.00, "fuel": 2.00, "other": 2.00}
        optimal_nav = compute_nav(spend, optimal_rates)

        leakage = compute_leakage(current_nav, optimal_nav)
        status  = audit_status(leakage)

        assert leakage > 0
        assert status in ("warning", "critical")
        assert current_nav < optimal_nav

    def test_well_optimised_user_passes(self):
        spend = {"dining": 5000, "online": 5000, "other": 5000}

        # User already has near-optimal card
        current_rates = {"dining": 4.0, "online": 5.0, "other": 2.0}
        optimal_rates = {"dining": 4.0, "online": 5.0, "other": 2.0}

        current_nav = compute_nav(spend, current_rates)
        optimal_nav = compute_nav(spend, optimal_rates)
        leakage     = compute_leakage(current_nav, optimal_nav)
        assert leakage == 0.0
        assert audit_status(leakage) == "pass"
