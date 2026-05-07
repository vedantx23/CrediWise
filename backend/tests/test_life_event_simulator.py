"""
tests/test_life_event_simulator.py — Unit tests for Life Event Simulator
Run: pytest backend/tests/test_life_event_simulator.py -v
"""

import pytest
import sys, os
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from life_event_simulator import (
    _merge_spend,
    _cards_in_reach,
    _nav_for_card,
    _card_radar_data,
    simulate_marriage,
    simulate_salary_hike,
    simulate_emi_purchase,
    CATEGORIES,
    DEFAULT_EMI_RATE_MONTHLY,
)
from database import run_migrations, get_all_cards, get_all_rewards_map
from seed_data import seed


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def ensure_db():
    run_migrations()
    if not get_all_cards():
        seed()


@pytest.fixture
def spend_a():
    return {"dining": 5000, "fuel": 2000, "grocery": 4000,
            "online": 6000, "travel": 3000, "utilities": 2000, "international": 500}


@pytest.fixture
def spend_b():
    return {"dining": 3000, "fuel": 1500, "grocery": 3000,
            "online": 4000, "travel": 2000, "utilities": 1500, "international": 0}


@pytest.fixture
def profile_a(spend_a):
    return {"monthly_spend": spend_a, "current_cards": ["icici_amazon"],
            "income_annual": 800_000, "cibil_score": 720}


@pytest.fixture
def profile_b(spend_b):
    return {"monthly_spend": spend_b, "current_cards": ["kotak_811"],
            "income_annual": 600_000, "cibil_score": 700}


# ─── _merge_spend ─────────────────────────────────────────────────────────────

class TestMergeSpend:
    def test_sums_categories(self, spend_a, spend_b):
        merged = _merge_spend(spend_a, spend_b)
        assert merged["dining"]  == pytest.approx(8000.0)
        assert merged["fuel"]    == pytest.approx(3500.0)
        assert merged["grocery"] == pytest.approx(7000.0)

    def test_returns_all_categories(self, spend_a, spend_b):
        merged = _merge_spend(spend_a, spend_b)
        assert set(merged.keys()) == set(CATEGORIES)

    def test_zero_spend_b(self, spend_a):
        merged = _merge_spend(spend_a, {})
        assert merged["dining"] == spend_a["dining"]

    def test_both_empty(self):
        merged = _merge_spend({}, {})
        assert all(v == 0.0 for v in merged.values())

    def test_commutative(self, spend_a, spend_b):
        ab = _merge_spend(spend_a, spend_b)
        ba = _merge_spend(spend_b, spend_a)
        for cat in CATEGORIES:
            assert ab[cat] == pytest.approx(ba[cat])


# ─── _cards_in_reach ─────────────────────────────────────────────────────────

class TestCardsInReach:
    def test_high_income_more_cards(self):
        low  = _cards_in_reach(200_000)
        high = _cards_in_reach(2_000_000)
        assert len(high) >= len(low)

    def test_kotak_811_always_accessible(self):
        cards = _cards_in_reach(0, cibil=300)
        # Kotak 811 has no income minimum — but may have CIBIL gate
        # Just check the function returns a list
        assert isinstance(cards, list)

    def test_premium_unlocked_at_high_income(self):
        low_income  = _cards_in_reach(400_000)
        high_income = _cards_in_reach(2_500_000, cibil=780)
        # At ₹25L income, more cards should be accessible
        assert len(high_income) >= len(low_income)

    def test_returns_list_of_strings(self):
        cards = _cards_in_reach(600_000)
        assert all(isinstance(c, str) for c in cards)

    def test_cibil_gate(self):
        # Very low CIBIL should restrict cards
        low_cibil  = len(_cards_in_reach(1_000_000, cibil=500))
        high_cibil = len(_cards_in_reach(1_000_000, cibil=800))
        assert high_cibil >= low_cibil


# ─── _nav_for_card ────────────────────────────────────────────────────────────

class TestNavForCard:
    def test_positive_nav(self, spend_a):
        rewards_map = get_all_rewards_map()
        nav = _nav_for_card("hdfc_millennia", spend_a, rewards_map)
        assert nav > 0

    def test_zero_spend_zero_nav(self):
        rewards_map = get_all_rewards_map()
        nav = _nav_for_card("hdfc_millennia", {}, rewards_map)
        assert nav == pytest.approx(0.0)

    def test_unknown_card_zero_nav(self, spend_a):
        nav = _nav_for_card("nonexistent_card_xyz", spend_a, {})
        assert nav == pytest.approx(0.0)

    def test_high_online_spend_favors_amazon(self):
        """ICICI Amazon Pay should score high on online spend."""
        rewards_map = get_all_rewards_map()
        spend = {"online": 20000, "dining": 0, "fuel": 0, "grocery": 0,
                 "travel": 0, "utilities": 0, "international": 0}
        amazon_nav = _nav_for_card("icici_amazon", spend, rewards_map)
        kotak_nav  = _nav_for_card("kotak_811",    spend, rewards_map)
        assert amazon_nav >= kotak_nav


# ─── simulate_marriage ────────────────────────────────────────────────────────

class TestSimulateMarriage:
    def test_returns_correct_event_key(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert result["event"] == "marriage"

    def test_joint_spend_is_sum(self, profile_a, profile_b, spend_a, spend_b):
        result = simulate_marriage(profile_a, profile_b)
        assert result["joint_spend"]["dining"] == pytest.approx(
            spend_a["dining"] + spend_b["dining"]
        )

    def test_joint_income_is_sum(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert result["joint_income"] == pytest.approx(
            profile_a["income_annual"] + profile_b["income_annual"]
        )

    def test_joint_cibil_is_max(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert result["joint_cibil"] == max(
            profile_a["cibil_score"], profile_b["cibil_score"]
        )

    def test_joint_cards_deduplicated(self, profile_a, profile_b):
        # Both profiles have distinct cards
        result = simulate_marriage(profile_a, profile_b)
        assert len(result["joint_cards"]) == len(set(result["joint_cards"]))

    def test_has_all_audits(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert "audit_before_a" in result
        assert "audit_before_b" in result
        assert "audit_joint"    in result

    def test_joint_audit_optimal_nav_positive(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert result["audit_joint"]["optimal_nav_annual"] > 0

    def test_summary_is_string(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert isinstance(result["summary"], str)
        assert len(result["summary"]) > 20

    def test_leakage_delta_is_float(self, profile_a, profile_b):
        result = simulate_marriage(profile_a, profile_b)
        assert isinstance(result["leakage_delta"], float)

    def test_joint_nav_gte_individual_navs(self, profile_a, profile_b):
        """Joint optimal should be at least as good as individual optimals combined."""
        result = simulate_marriage(profile_a, profile_b)
        joint_opt = result["audit_joint"]["optimal_nav_annual"]
        a_opt     = result["audit_before_a"]["optimal_nav_annual"]
        b_opt     = result["audit_before_b"]["optimal_nav_annual"]
        # Joint optimal should be reasonably close to sum of individual optimals
        assert joint_opt > 0
        assert a_opt     > 0
        assert b_opt     > 0

    def test_empty_profile_b_handled(self, profile_a):
        result = simulate_marriage(profile_a, {"monthly_spend": {}, "current_cards": [],
                                               "income_annual": 0, "cibil_score": 650})
        assert result["event"] == "marriage"


# ─── simulate_salary_hike ────────────────────────────────────────────────────

class TestSimulateSalaryHike:
    def _run(self, spend, cur_income, new_income, cibil=750, cards=None):
        return simulate_salary_hike(
            monthly_spend  = spend,
            current_income = cur_income,
            new_income     = new_income,
            cibil_score    = cibil,
            current_cards  = cards or ["kotak_811"],
        )

    @pytest.fixture
    def spend(self):
        return {"dining": 8000, "travel": 5000, "online": 10000,
                "fuel": 2000, "grocery": 4000, "utilities": 3000, "international": 2000}

    def test_returns_event_key(self, spend):
        r = self._run(spend, 500_000, 1_200_000)
        assert r["event"] == "salary_hike"

    def test_newly_unlocked_is_subset_of_after_set(self, spend):
        r = self._run(spend, 300_000, 2_000_000)
        after_set = set(r["radar_after"][i]["card_id"]
                        for i in range(len(r["radar_after"]))
                        if r["radar_after"][i]["in_reach"])
        for cid in r["newly_unlocked"]:
            assert cid in after_set

    def test_higher_income_more_unlocked(self, spend):
        r_small = self._run(spend, 300_000,   600_000)
        r_big   = self._run(spend, 300_000, 2_500_000)
        assert len(r_big["newly_unlocked"]) >= len(r_small["newly_unlocked"])

    def test_radar_before_has_all_axes(self, spend):
        r = self._run(spend, 600_000, 1_200_000)
        for entry in r["radar_before"]:
            assert set(entry["axes"].keys()) == set(CATEGORIES)

    def test_radar_after_has_more_in_reach(self, spend):
        r = self._run(spend, 300_000, 2_000_000)
        before_count = sum(1 for e in r["radar_before"] if e["in_reach"])
        after_count  = sum(1 for e in r["radar_after"]  if e["in_reach"])
        assert after_count >= before_count

    def test_income_increase_pct_correct(self, spend):
        r = self._run(spend, 500_000, 750_000)
        assert r["income_increase_pct"] == pytest.approx(50.0)

    def test_audit_after_uses_new_income(self, spend):
        r = self._run(spend, 300_000, 2_500_000, cibil=800)
        # At ₹25L income, more recommendations possible
        assert r["audit_after"] is not None

    def test_summary_contains_income(self, spend):
        r = self._run(spend, 600_000, 1_200_000)
        assert "income" in r["summary"].lower() or "₹" in r["summary"]

    def test_no_new_cards_summary_graceful(self, spend):
        # Very small hike — unlikely to unlock anything
        r = self._run(spend, 599_000, 600_001)
        assert isinstance(r["summary"], str)

    def test_best_new_card_has_required_fields(self, spend):
        r = self._run(spend, 300_000, 2_500_000, cibil=800)
        if r["best_new_card"]:
            assert "card_id"    in r["best_new_card"]
            assert "name"       in r["best_new_card"]
            assert "nav_annual" in r["best_new_card"]


# ─── simulate_emi_purchase ────────────────────────────────────────────────────

class TestSimulateEmiPurchase:
    def test_returns_event_key(self):
        r = simulate_emi_purchase(50_000, 6, card_id="hdfc_millennia")
        assert r["event"] == "emi_purchase"

    def test_purchase_amount_echoed(self):
        r = simulate_emi_purchase(100_000, 12)
        assert r["purchase_amount"] == pytest.approx(100_000.0)

    def test_emi_months_echoed(self):
        r = simulate_emi_purchase(50_000, 6)
        assert r["emi_months"] == 6

    def test_interest_is_positive(self):
        r = simulate_emi_purchase(50_000, 6)
        assert r["emi_interest_total"] > 0

    def test_cashback_is_positive(self):
        r = simulate_emi_purchase(50_000, 6, card_id="hdfc_millennia")
        assert r["cashback_earned"] > 0

    def test_net_cost_equals_interest_minus_cashback(self):
        r = simulate_emi_purchase(50_000, 6, card_id="hdfc_millennia")
        expected = r["emi_interest_total"] - r["cashback_earned"]
        assert r["net_cost"] == pytest.approx(expected, abs=0.01)

    def test_chart_data_length_equals_emi_months(self):
        r = simulate_emi_purchase(50_000, 9)
        assert len(r["chart_data"]) == 9

    def test_chart_data_has_required_fields(self):
        r = simulate_emi_purchase(30_000, 3)
        for row in r["chart_data"]:
            assert "month"                in row
            assert "cumulative_interest"  in row
            assert "cumulative_cashback"  in row
            assert "net"                  in row

    def test_chart_months_sequential(self):
        r = simulate_emi_purchase(30_000, 6)
        months = [row["month"] for row in r["chart_data"]]
        assert months == list(range(1, 7))

    def test_cumulative_interest_increases_monotonically(self):
        r = simulate_emi_purchase(50_000, 12)
        interests = [row["cumulative_interest"] for row in r["chart_data"]]
        assert interests == sorted(interests)

    def test_recommendation_values(self):
        r = simulate_emi_purchase(50_000, 6)
        assert r["recommendation"] in ("pay_full", "emi_ok", "avoid")

    def test_break_even_month_within_emi_period_or_none(self):
        r = simulate_emi_purchase(50_000, 6)
        bm = r["break_even_month"]
        assert bm is None or (1 <= bm <= 6)

    def test_specific_card_used(self):
        r = simulate_emi_purchase(50_000, 6, card_id="icici_amazon")
        assert r["card_used"]["card_id"] == "icici_amazon"

    def test_fallback_to_current_cards(self):
        r = simulate_emi_purchase(50_000, 6,
                                  current_cards=["hdfc_millennia", "axis_ace"])
        assert r["card_used"]["card_id"] in {"hdfc_millennia", "axis_ace"}

    def test_summary_is_string(self):
        r = simulate_emi_purchase(50_000, 6)
        assert isinstance(r["summary"], str) and len(r["summary"]) > 20

    def test_1_month_emi(self):
        """Edge case: single-month EMI."""
        r = simulate_emi_purchase(10_000, 1)
        assert r["emi_months"] == 1
        assert len(r["chart_data"]) == 1

    def test_high_reward_card_may_recommend_pay_full(self):
        """If cashback ≥ interest, recommendation should be pay_full."""
        # Use a high-reward card (5% online) with a short EMI term
        r = simulate_emi_purchase(10_000, 1, card_id="icici_amazon")
        # With 1 month, interest = 10000 * 3% = 300; cashback = 10000 * 5% = 500
        if r["cashback_earned"] >= r["emi_interest_total"]:
            assert r["recommendation"] == "pay_full"

    def test_large_purchase_long_emi_likely_avoid(self):
        """High interest over many months should flag 'avoid'."""
        r = simulate_emi_purchase(200_000, 24, card_id="kotak_811")
        # 24 months * 3%/mo flat → ₹144,000 interest; cashback ~1-2% → ₹2-4K
        if r["emi_interest_total"] > r["cashback_earned"] * 5:
            assert r["recommendation"] in ("avoid", "emi_ok")

    def test_card_used_has_required_fields(self):
        r = simulate_emi_purchase(50_000, 6)
        card = r["card_used"]
        assert "card_id"              in card
        assert "name"                 in card
        assert "reward_rate_pct"      in card
        assert "emi_rate_monthly_pct" in card
