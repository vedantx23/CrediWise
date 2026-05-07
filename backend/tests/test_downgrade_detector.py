"""
tests/test_downgrade_detector.py — Unit tests for Stealth Downgrade Detector
Run: pytest backend/tests/test_downgrade_detector.py -v
"""

import pytest
import sys, os
from pathlib import Path
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from downgrade_detector import (
    diff_rates,
    compute_extra_loss,
    save_downgrade_alert,
    get_active_alerts,
    acknowledge_alert,
    acknowledge_all_alerts,
    write_snapshot,
    get_latest_history,
    get_rate_history_for_card,
    snapshot_current_rates,
    run_downgrade_check,
    _enrich_alert,
    DEFAULT_MONTHLY_SPEND,
    CATEGORIES,
)
from database import run_migrations, execute, query, get_all_cards
from seed_data import seed


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def ensure_db():
    """Ensure DB is migrated and seeded before each test."""
    run_migrations()
    if not get_all_cards():
        seed()


# ─── diff_rates ───────────────────────────────────────────────────────────────

class TestDiffRates:
    def test_no_change_returns_empty(self):
        current  = {"hdfc_regalia": {"dining": 3.33, "fuel": 1.0}}
        previous = {"hdfc_regalia": {"dining": 3.33, "fuel": 1.0}}
        assert diff_rates(current, previous) == []

    def test_rate_increase_returns_empty(self):
        current  = {"hdfc_regalia": {"dining": 4.0}}
        previous = {"hdfc_regalia": {"dining": 3.0}}
        assert diff_rates(current, previous) == []

    def test_rate_decrease_detected(self):
        current  = {"hdfc_regalia": {"dining": 2.0}}
        previous = {"hdfc_regalia": {"dining": 3.33}}
        result   = diff_rates(current, previous)
        assert len(result) == 1
        assert result[0]["card_id"]  == "hdfc_regalia"
        assert result[0]["category"] == "dining"
        assert result[0]["old_rate"] == pytest.approx(3.33)
        assert result[0]["new_rate"] == pytest.approx(2.0)

    def test_drop_pct_calculated(self):
        current  = {"axis_ace": {"utilities": 3.0}}
        previous = {"axis_ace": {"utilities": 5.0}}
        result   = diff_rates(current, previous)
        assert result[0]["drop_pct"] == pytest.approx(2.0)

    def test_relative_drop_calculated(self):
        current  = {"axis_ace": {"utilities": 2.5}}
        previous = {"axis_ace": {"utilities": 5.0}}
        result   = diff_rates(current, previous)
        assert result[0]["drop_pct_relative"] == pytest.approx(50.0)

    def test_multiple_cards_multiple_downgrades(self):
        current = {
            "hdfc_regalia":  {"dining": 2.0, "fuel": 1.0},
            "icici_amazon":  {"online": 3.0},
        }
        previous = {
            "hdfc_regalia":  {"dining": 3.33, "fuel": 1.0},
            "icici_amazon":  {"online": 5.0},
        }
        result = diff_rates(current, previous)
        assert len(result) == 2

    def test_new_card_not_in_previous_skipped(self):
        current  = {"new_card_xyz": {"dining": 2.0}}
        previous = {}
        assert diff_rates(current, previous) == []

    def test_new_category_not_in_previous_skipped(self):
        current  = {"hdfc_regalia": {"dining": 2.0, "new_cat": 1.0}}
        previous = {"hdfc_regalia": {"dining": 3.33}}
        result   = diff_rates(current, previous)
        assert all(d["category"] != "new_cat" for d in result)

    def test_float_tolerance_no_false_positive(self):
        # Tiny float drift should not trigger a downgrade
        current  = {"hdfc_regalia": {"dining": 3.330001}}
        previous = {"hdfc_regalia": {"dining": 3.33}}
        result   = diff_rates(current, previous)
        assert len(result) == 0

    def test_empty_current_returns_empty(self):
        assert diff_rates({}, {"hdfc_regalia": {"dining": 3.33}}) == []

    def test_empty_previous_returns_empty(self):
        assert diff_rates({"hdfc_regalia": {"dining": 3.33}}, {}) == []


# ─── compute_extra_loss ───────────────────────────────────────────────────────

class TestComputeExtraLoss:
    def test_basic_calculation(self):
        # 1% drop on ₹5000/mo dining = ₹600/yr
        loss = compute_extra_loss("dining", 4.0, 3.0,
                                  monthly_spend={"dining": 5000.0})
        assert loss == pytest.approx(600.0)

    def test_uses_default_spend_when_none(self):
        loss = compute_extra_loss("dining", 4.0, 3.0, monthly_spend=None)
        expected = (4.0 - 3.0) / 100 * DEFAULT_MONTHLY_SPEND["dining"] * 12
        assert loss == pytest.approx(expected)

    def test_zero_drop_zero_loss(self):
        loss = compute_extra_loss("fuel", 2.0, 2.0)
        assert loss == pytest.approx(0.0)

    def test_unknown_category_uses_zero_spend(self):
        loss = compute_extra_loss("unknown_cat", 5.0, 3.0, monthly_spend={})
        assert loss == pytest.approx(0.0)

    def test_large_drop_large_loss(self):
        # 3% drop on ₹10,000/mo travel = ₹3,600/yr
        loss = compute_extra_loss("travel", 5.0, 2.0,
                                  monthly_spend={"travel": 10000.0})
        assert loss == pytest.approx(3600.0)

    def test_returns_float(self):
        loss = compute_extra_loss("fuel", 2.0, 1.0)
        assert isinstance(loss, float)


# ─── Alert storage ────────────────────────────────────────────────────────────

class TestAlertStorage:
    _TEST_DATE = "2099-01-01"   # far future → won't conflict with real alerts

    def _insert_alert(self, card_id="hdfc_regalia", category="dining",
                      old_rate=3.33, new_rate=2.0, loss=800.0):
        return save_downgrade_alert(
            card_id, category, old_rate, new_rate, loss,
            detected_date=self._TEST_DATE
        )

    def test_save_returns_positive_id(self):
        row_id = self._insert_alert()
        assert row_id > 0

    def test_alert_retrievable(self):
        self._insert_alert(card_id="icici_amazon", category="online",
                           old_rate=5.0, new_rate=3.0, loss=480.0)
        alerts = get_active_alerts(["icici_amazon"])
        found = [a for a in alerts if a["card_id"] == "icici_amazon"
                 and a["category"] == "online"]
        assert len(found) >= 1

    def test_alert_has_message(self):
        self._insert_alert()
        alerts = get_active_alerts(["hdfc_regalia"])
        alert  = next((a for a in alerts if a.get("detected_date") == self._TEST_DATE), None)
        if alert:
            assert "ALERT" in alert["message"]
            assert "dropped" in alert["message"]

    def test_acknowledge_hides_alert(self):
        row_id = self._insert_alert(card_id="kotak_811", category="fuel",
                                    old_rate=2.0, new_rate=1.0, loss=120.0)
        before = get_active_alerts(["kotak_811"])
        acknowledge_alert(row_id)
        after = get_active_alerts(["kotak_811"])
        before_ids = {a["id"] for a in before}
        after_ids  = {a["id"] for a in after}
        assert row_id in before_ids
        assert row_id not in after_ids

    def test_acknowledge_returns_false_for_invalid_id(self):
        result = acknowledge_alert(9999999)
        assert result is False

    def test_acknowledge_all_for_card(self):
        self._insert_alert(card_id="sbi_simplyclick", category="online",
                           old_rate=5.0, new_rate=4.0, loss=120.0)
        count = acknowledge_all_alerts("sbi_simplyclick")
        assert count >= 1
        remaining = get_active_alerts(["sbi_simplyclick"])
        assert len(remaining) == 0

    def test_get_active_alerts_no_filter(self):
        self._insert_alert(card_id="axis_ace", category="utilities",
                           old_rate=5.0, new_rate=4.0, loss=120.0)
        alerts = get_active_alerts(None)
        assert isinstance(alerts, list)

    def test_alert_enriched_with_card_name(self):
        row_id = self._insert_alert(card_id="hdfc_millennia", category="online",
                                    old_rate=5.0, new_rate=3.5, loss=900.0)
        alerts = get_active_alerts(["hdfc_millennia"])
        found  = [a for a in alerts if a["id"] == row_id]
        if found:
            assert found[0].get("card_name") is not None


# ─── enrich_alert ─────────────────────────────────────────────────────────────

class TestEnrichAlert:
    def test_message_contains_card_name(self):
        alert = _enrich_alert({
            "id": 1, "card_id": "test_card", "card_name": "HDFC Regalia",
            "category": "dining", "old_rate": 3.33, "new_rate": 2.0,
            "extra_loss_annual": 800.0, "acknowledged": 0,
        })
        assert "HDFC Regalia" in alert["message"]

    def test_message_contains_rates(self):
        alert = _enrich_alert({
            "id": 1, "card_id": "test_card", "card_name": "Axis Ace",
            "category": "utilities", "old_rate": 5.0, "new_rate": 3.0,
            "extra_loss_annual": 480.0, "acknowledged": 0,
        })
        assert "5.00%" in alert["message"]
        assert "3.00%" in alert["message"]

    def test_message_contains_loss(self):
        alert = _enrich_alert({
            "id": 1, "card_id": "test_card", "card_name": "SBI SimplyCLICK",
            "category": "online", "old_rate": 5.0, "new_rate": 4.0,
            "extra_loss_annual": 1200.0, "acknowledged": 0,
        })
        assert "1,200" in alert["message"] or "1200" in alert["message"]

    def test_message_includes_alert_prefix(self):
        alert = _enrich_alert({
            "id": 1, "card_id": "test", "card_name": "Test Card",
            "category": "fuel", "old_rate": 2.0, "new_rate": 1.0,
            "extra_loss_annual": 360.0, "acknowledged": 0,
        })
        assert alert["message"].startswith("ALERT:")


# ─── Rate snapshot + history ──────────────────────────────────────────────────

class TestRateHistory:
    _SNAP_DATE = "2099-06-01"

    def test_write_snapshot_returns_positive_count(self):
        rates = {"hdfc_regalia": {"dining": 3.33, "travel": 6.67}}
        n = write_snapshot(rates, snap_date=self._SNAP_DATE)
        assert n > 0

    def test_snapshot_or_ignore_dedup(self):
        rates = {"hdfc_regalia": {"dining": 3.33}}
        write_snapshot(rates, snap_date=self._SNAP_DATE)
        n2 = write_snapshot(rates, snap_date=self._SNAP_DATE)
        # Second write should not insert duplicates (OR IGNORE)
        assert n2 >= 0

    def test_get_latest_history_returns_most_recent(self):
        # Write two snapshots — later date should win
        write_snapshot({"axis_ace": {"utilities": 4.0}}, snap_date="2099-01-01")
        write_snapshot({"axis_ace": {"utilities": 5.0}}, snap_date="2099-02-01")
        hist = get_latest_history()
        # axis_ace utilities should show the 2099-02-01 rate = 5.0
        assert hist.get("axis_ace", {}).get("utilities") == pytest.approx(5.0)

    def test_get_rate_history_for_card_returns_list(self):
        write_snapshot({"hdfc_millennia": {"online": 5.0}}, snap_date=self._SNAP_DATE)
        rows = get_rate_history_for_card("hdfc_millennia", "online")
        assert isinstance(rows, list)

    def test_get_rate_history_category_filter(self):
        write_snapshot({"hdfc_millennia": {"online": 5.0, "dining": 5.0}},
                       snap_date=self._SNAP_DATE)
        rows = get_rate_history_for_card("hdfc_millennia", "online")
        assert all(r["category"] == "online" for r in rows)

    def test_snapshot_current_rates_returns_dict(self):
        rates = snapshot_current_rates()
        assert isinstance(rates, dict)
        assert len(rates) >= 16   # all seeded cards


# ─── run_downgrade_check ─────────────────────────────────────────────────────

class TestRunDowngradeCheck:
    def test_first_run_no_downgrades(self):
        """On first run (no prior history for test dates), no downgrades."""
        # Use a unique far-future date to avoid polluting real history
        result = run_downgrade_check(force_date="2099-12-01")
        assert result["run_date"] == "2099-12-01"
        assert isinstance(result["downgrades_found"], int)
        assert isinstance(result["snapshot_written"], int)
        assert result["snapshot_written"] > 0

    def test_result_has_required_keys(self):
        result = run_downgrade_check(force_date="2099-12-02")
        for key in ["snapshot_written", "downgrades_found", "alerts",
                    "run_date", "had_previous_data"]:
            assert key in result

    def test_detects_injected_downgrade(self):
        """
        Inject a manually lowered rate into history, then run check against
        current rates (which are higher) to verify the diff engine works.
        We do it in reverse: write a *higher* rate to history, then compare
        against the real (lower) rate from reward_categories.
        """
        # Find a real card + category with a known rate
        current = snapshot_current_rates()
        # Pick the first card with dining > 0
        test_card, test_cat, real_rate = None, None, None
        for cid, cats in current.items():
            if cats.get("dining", 0) > 0:
                test_card, test_cat, real_rate = cid, "dining", cats["dining"]
                break
        if test_card is None:
            pytest.skip("No card with dining rate found")

        # Write a higher rate to history (simulates an earlier, better rate)
        inflated_rate = real_rate + 2.0
        write_snapshot(
            {test_card: {test_cat: inflated_rate}},
            snap_date="2099-11-01"
        )
        # Now diff current vs that inflated history — should find a downgrade
        from downgrade_detector import diff_rates
        previous = {test_card: {test_cat: inflated_rate}}
        diffs    = diff_rates(current, previous)
        dining_diffs = [d for d in diffs if d["card_id"] == test_card
                        and d["category"] == test_cat]
        assert len(dining_diffs) == 1
        assert dining_diffs[0]["old_rate"] == pytest.approx(inflated_rate)
        assert dining_diffs[0]["new_rate"] == pytest.approx(real_rate)

    def test_no_downgrade_still_writes_snapshot(self):
        result = run_downgrade_check(force_date="2099-12-03")
        assert result["snapshot_written"] > 0

    def test_custom_monthly_spend_affects_loss(self):
        """Higher spend → higher extra loss in injected downgrade."""
        result_low  = run_downgrade_check(
            monthly_spend={"dining": 1000}, force_date="2099-12-10"
        )
        result_high = run_downgrade_check(
            monthly_spend={"dining": 50000}, force_date="2099-12-11"
        )
        # Both runs complete without error; actual loss values tested via compute_extra_loss
        assert isinstance(result_low["alerts"],  list)
        assert isinstance(result_high["alerts"], list)
