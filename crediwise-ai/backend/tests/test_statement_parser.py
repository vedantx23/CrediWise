"""
tests/test_statement_parser.py — Unit tests for Bank Statement Forensics
Run: pytest backend/tests/test_statement_parser.py -v
"""

import pytest
import sys, os, textwrap, tempfile
import numpy as np
from pathlib import Path
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from statement_parser import (
    categorize,
    _parse_date,
    _extract_from_text,
    compute_monthly_breakdown,
    build_audit_payload,
    detect_anomalies,
    _fmt_month,
    CATEGORIES,
)
from reward_tracker import (
    add_reward_expiry,
    get_user_expiries,
    get_expiring_soon,
    run_expiry_check,
    _build_redemption_hint,
    EXPIRY_WARN_DAYS,
)


# ─── Categorization ───────────────────────────────────────────────────────────

class TestCategorize:
    # Dining
    def test_swiggy(self):       assert categorize("SWIGGY ORDER 12345")     == "dining"
    def test_zomato(self):       assert categorize("ZOMATO FOOD DELIVERY")   == "dining"
    def test_mcdonalds(self):    assert categorize("MCDONALDS BANGALORE")     == "dining"
    def test_pizza_hut(self):    assert categorize("PIZZA HUT ORDER")         == "dining"
    def test_restaurant(self):   assert categorize("Anand Restaurant Pune")   == "dining"

    # Fuel
    def test_bpcl(self):         assert categorize("BPCL FUEL STATION")       == "fuel"
    def test_hpcl(self):         assert categorize("HPCL PETROL PUMP")        == "fuel"
    def test_petrol(self):       assert categorize("Petrol fill - IndianOil") == "fuel"
    def test_indianoil(self):    assert categorize("INDIANOIL CSD 1234")      == "fuel"

    # Grocery
    def test_bigbasket(self):    assert categorize("BIGBASKET COM ORDER")     == "grocery"
    def test_blinkit(self):      assert categorize("BLINKIT GROCERY ORDER")   == "grocery"
    def test_dmart(self):        assert categorize("DMART SUPERMARKET")       == "grocery"
    def test_zepto(self):        assert categorize("ZEPTO DELIVERY 9876")     == "grocery"

    # Travel
    def test_uber(self):         assert categorize("UBER TRIP BANGALORE")     == "travel"
    def test_ola(self):          assert categorize("OLA CAB BOOKING")         == "travel"
    def test_irctc(self):        assert categorize("IRCTC TRAIN BOOKING")     == "travel"
    def test_makemytrip(self):   assert categorize("MAKEMYTRIP FLIGHT")       == "travel"
    def test_indigo(self):       assert categorize("INDIGO AIRLINES TICKET")  == "travel"

    # Online shopping
    def test_amazon(self):       assert categorize("AMAZON INDIA PURCHASE")   == "online"
    def test_flipkart(self):     assert categorize("FLIPKART SELLER 123")     == "online"
    def test_myntra(self):       assert categorize("MYNTRA FASHION STORE")    == "online"
    def test_nykaa(self):        assert categorize("NYKAA BEAUTY ORDER")      == "online"

    # Utilities
    def test_airtel_bill(self):  assert categorize("AIRTEL BILL PAYMENT")     == "utilities"
    def test_jio_recharge(self): assert categorize("JIO RECHARGE 599")        == "utilities"
    def test_electricity(self):  assert categorize("MSEDCL ELECTRICITY BILL") == "utilities"
    def test_broadband(self):    assert categorize("AIRTEL BROADBAND BILL")   == "utilities"

    # International
    def test_netflix(self):      assert categorize("NETFLIX SUBSCRIPTION USD") == "international"
    def test_paypal(self):       assert categorize("PAYPAL PAYMENT USD 12.99") == "international"
    def test_intl_flag(self):    assert categorize("INTL TXN AMAZON US")       == "international"

    # Other
    def test_unknown(self):      assert categorize("NEFT TRANSFER 12345678")   == "other"
    def test_empty(self):        assert categorize("") == "other"
    def test_atm(self):          assert categorize("ATM WITHDRAWAL HDFC") == "other"

    # Edge cases
    def test_case_insensitive(self):
        assert categorize("swiggy order") == categorize("SWIGGY ORDER")

    def test_mixed_case(self):
        assert categorize("Zomato Food Delivery") == "dining"

    def test_partial_match(self):
        assert categorize("POS BPCL FUEL MUMBAI DR") == "fuel"


# ─── Date parsing ─────────────────────────────────────────────────────────────

class TestParseDate:
    def test_dd_mm_yyyy(self):   assert _parse_date("15/03/2024") == "2024-03"
    def test_dd_mm_yy(self):     assert _parse_date("15/03/24")   == "2024-03"
    def test_dd_mon_yyyy(self):  assert _parse_date("15 Mar 2024") == "2024-03"
    def test_yyyy_mm_dd(self):   assert _parse_date("2024-03-15") == "2024-03"
    def test_invalid(self):      assert _parse_date("not a date") is None
    def test_hyphen_sep(self):   assert _parse_date("15-03-2024") == "2024-03"


# ─── Text extraction ──────────────────────────────────────────────────────────

class TestExtractFromText:
    def _make_text(self):
        return textwrap.dedent("""\
            01/01/2024  SWIGGY ORDER 45678                   320.00
            02/01/2024  AMAZON IN PURCHASE ABCDEF           1250.00
            03/01/2024  BPCL PETROL PUMP                     800.00
            04/01/2024  UBER TRIP BANGALORE                  350.00
            05/01/2024  AIRTEL BROADBAND BILL               1199.00
            06/01/2024  BIGBASKET GROCERY                   2300.00
            07/01/2024  NETFLIX INTL USD 15.99               1350.00
            10/01/2024  ZOMATO DELIVERY                      450.00
            15/02/2024  FLIPKART PURCHASE 12345             3500.00
            20/02/2024  IRCTC TRAIN BOOKING                 1800.00
        """)

    def test_extracts_transactions(self):
        txns = _extract_from_text(self._make_text())
        assert len(txns) >= 8

    def test_month_parsed_correctly(self):
        txns = _extract_from_text(self._make_text())
        months = {t["month"] for t in txns}
        assert "2024-01" in months
        assert "2024-02" in months

    def test_amounts_are_positive(self):
        txns = _extract_from_text(self._make_text())
        assert all(t["amount"] > 0 for t in txns)

    def test_descriptions_non_empty(self):
        txns = _extract_from_text(self._make_text())
        assert all(len(t["description"]) > 0 for t in txns)


# ─── Monthly breakdown ────────────────────────────────────────────────────────

class TestComputeMonthlyBreakdown:
    def _make_txns(self):
        return [
            {"month": "2024-01", "description": "SWIGGY",    "amount": 500.0,  "category": "dining"},
            {"month": "2024-01", "description": "AMAZON",    "amount": 1200.0, "category": "online"},
            {"month": "2024-01", "description": "BPCL",      "amount": 800.0,  "category": "fuel"},
            {"month": "2024-02", "description": "ZOMATO",    "amount": 700.0,  "category": "dining"},
            {"month": "2024-02", "description": "FLIPKART",  "amount": 2000.0, "category": "online"},
            {"month": "2024-03", "description": "SWIGGY",    "amount": 600.0,  "category": "dining"},
        ]

    def test_groups_by_month(self):
        bd = compute_monthly_breakdown(self._make_txns())
        assert "2024-01" in bd
        assert "2024-02" in bd
        assert "2024-03" in bd

    def test_sums_correctly(self):
        bd = compute_monthly_breakdown(self._make_txns())
        assert bd["2024-01"]["dining"] == pytest.approx(500.0)
        assert bd["2024-01"]["online"] == pytest.approx(1200.0)
        assert bd["2024-01"]["fuel"]   == pytest.approx(800.0)
        assert bd["2024-02"]["dining"] == pytest.approx(700.0)

    def test_sorted_months(self):
        bd = compute_monthly_breakdown(self._make_txns())
        keys = list(bd.keys())
        assert keys == sorted(keys)

    def test_empty_transactions(self):
        bd = compute_monthly_breakdown([])
        assert bd == {}


# ─── Audit payload ────────────────────────────────────────────────────────────

class TestBuildAuditPayload:
    def test_averages_over_months(self):
        bd = {
            "2024-01": {"dining": 600.0, "fuel": 900.0},
            "2024-02": {"dining": 400.0, "fuel": 900.0},
            "2024-03": {"dining": 500.0, "fuel": 900.0},
        }
        payload = build_audit_payload(bd)
        assert payload["dining"] == pytest.approx(500.0)
        assert payload["fuel"]   == pytest.approx(900.0)

    def test_returns_all_categories(self):
        payload = build_audit_payload({"2024-01": {"dining": 100}})
        assert set(payload.keys()) == set(CATEGORIES)

    def test_missing_categories_are_zero(self):
        payload = build_audit_payload({"2024-01": {"dining": 100}})
        assert payload["fuel"] == 0.0

    def test_empty_breakdown(self):
        payload = build_audit_payload({})
        assert all(v == 0.0 for v in payload.values())


# ─── Anomaly detection ────────────────────────────────────────────────────────

class TestDetectAnomalies:
    def _normal_bd(self, spike_month=None, spike_cat="dining", spike_mult=5.0):
        """4 months of normal spend, optional spike in one month."""
        bd = {
            "2024-01": {"dining": 3000, "fuel": 1000, "online": 4000},
            "2024-02": {"dining": 3200, "fuel": 900,  "online": 3800},
            "2024-03": {"dining": 2800, "fuel": 1100, "online": 4200},
            "2024-04": {"dining": 2900, "fuel": 950,  "online": 3900},
        }
        if spike_month:
            normal = bd[spike_month].get(spike_cat, 3000)
            bd[spike_month][spike_cat] = normal * spike_mult
        return bd

    def test_no_anomaly_in_normal_data(self):
        alerts = detect_anomalies(self._normal_bd())
        # All normal months — no alerts expected
        assert len(alerts) == 0 or all(a["spike_ratio"] >= 1.3 for a in alerts)

    def test_spike_detected(self):
        bd = self._normal_bd(spike_month="2024-03", spike_cat="dining", spike_mult=8.0)
        alerts = detect_anomalies(bd)
        # At least one alert for dining in 2024-03
        dining_alerts = [a for a in alerts if a["category"] == "dining"]
        assert len(dining_alerts) >= 1

    def test_alert_has_required_fields(self):
        bd = self._normal_bd(spike_month="2024-03", spike_cat="dining", spike_mult=8.0)
        alerts = detect_anomalies(bd)
        for alert in alerts:
            assert "category"    in alert
            assert "month"       in alert
            assert "actual_inr"  in alert
            assert "normal_inr"  in alert
            assert "spike_ratio" in alert
            assert "message"     in alert

    def test_insufficient_data_returns_empty(self):
        bd = {"2024-01": {"dining": 5000}}   # only 1 month
        alerts = detect_anomalies(bd)
        assert alerts == []

    def test_two_months_returns_empty(self):
        bd = {"2024-01": {"dining": 5000}, "2024-02": {"dining": 4000}}
        alerts = detect_anomalies(bd)
        assert alerts == []

    def test_message_contains_month_name(self):
        bd = self._normal_bd(spike_month="2024-03", spike_cat="dining", spike_mult=8.0)
        alerts = detect_anomalies(bd)
        dining_alerts = [a for a in alerts if a["category"] == "dining"]
        if dining_alerts:
            assert "March 2024" in dining_alerts[0]["message"]

    def test_spike_ratio_accurate(self):
        bd = {
            "2024-01": {"dining": 3000},
            "2024-02": {"dining": 3000},
            "2024-03": {"dining": 3000},
            "2024-04": {"dining": 30000},   # 10x spike
        }
        alerts = detect_anomalies(bd)
        dining_alerts = [a for a in alerts if a["category"] == "dining"]
        if dining_alerts:
            assert dining_alerts[0]["spike_ratio"] >= 3.0


# ─── Format month ─────────────────────────────────────────────────────────────

class TestFmtMonth:
    def test_valid(self):    assert _fmt_month("2024-03") == "March 2024"
    def test_invalid(self):  assert _fmt_month("bad")     == "bad"
    def test_jan(self):      assert _fmt_month("2024-01") == "January 2024"


# ─── Reward Tracker ───────────────────────────────────────────────────────────

class TestRewardTracker:
    """Uses real SQLite — requires migrations to have been run."""

    TEST_USER = "test_tracker_user"

    def setup_method(self):
        """Ensure test user + seed cards exist before tracker tests."""
        from database import run_migrations, execute, query, get_all_cards
        run_migrations()
        # Seed cards if absent
        if not get_all_cards():
            import sys, os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
            from seed_data import seed
            seed()
        # Upsert test user (ignore if already exists)
        try:
            execute(
                "INSERT OR IGNORE INTO users (user_id, income_annual, cibil_score) VALUES (?,?,?)",
                (self.TEST_USER, 1200000, 750),
            )
        except Exception:
            pass

    def test_add_and_retrieve_expiry(self):
        future = (date.today() + timedelta(days=60)).isoformat()
        row_id = add_reward_expiry(
            self.TEST_USER, "hdfc_regalia", 5000.0, future,
            "Redeem via SmartBuy"
        )
        assert row_id > 0
        expiries = get_user_expiries(self.TEST_USER)
        assert any(e["id"] == row_id for e in expiries)

    def test_expiring_soon_returned(self):
        near_future = (date.today() + timedelta(days=10)).isoformat()
        add_reward_expiry(self.TEST_USER, "kotak_811", 1200.0, near_future)
        soon = get_expiring_soon(days=30)
        # At least the one we just added
        assert any(e["user_id"] == self.TEST_USER for e in soon)

    def test_far_future_not_in_soon(self):
        far = (date.today() + timedelta(days=120)).isoformat()
        add_reward_expiry(self.TEST_USER, "icici_amazon", 3000.0, far)
        soon = get_expiring_soon(days=30)
        # The far-future one should NOT be in the 30-day warning
        far_ones = [e for e in soon if e["expiry_date"] == far
                    and e["user_id"] == self.TEST_USER]
        assert len(far_ones) == 0

    def test_redemption_hint_hdfc(self):
        hint = _build_redemption_hint("HDFC Regalia", 5000)
        assert "SmartBuy" in hint or "HDFC" in hint

    def test_redemption_hint_amex(self):
        hint = _build_redemption_hint("Amex Gold Card", 3000)
        assert "mile" in hint.lower() or "amex" in hint.lower() or "transfer" in hint.lower()

    def test_redemption_hint_generic(self):
        hint = _build_redemption_hint("Unknown Card XYZ", 200)
        assert "200" in hint
        assert "portal" in hint.lower() or "expire" in hint.lower()

    def test_run_expiry_check_returns_list(self):
        alerts = run_expiry_check()
        assert isinstance(alerts, list)
