"""
test_data_pipeline.py — CSV loader + feature engineering tests
"""
from __future__ import annotations
import sys, os, csv, tempfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from data_pipeline import (
    load_cards_from_csv, load_rewards_from_csv,
    build_card_features, reward_rate_index, travel_index,
    fee_waiver_threshold_band,
)
from database import get_all_cards, get_all_rewards_map


# ── pure-function tests ──────────────────────────────────────────────────────

def test_reward_rate_index_bounded():
    rates = {"dining": 5, "fuel": 1, "grocery": 2, "travel": 3,
             "online": 4, "utilities": 1, "international": 0, "other": 1}
    rri = reward_rate_index(rates)
    assert 0 <= rri <= 1
    # average = 17/8 = 2.125%, normalised by /10 → 0.2125
    assert abs(rri - 0.2125) < 1e-3


def test_reward_rate_index_caps_at_one():
    rates = {c: 50.0 for c in ["dining","fuel","grocery","travel",
                                "online","utilities","international","other"]}
    assert reward_rate_index(rates) == 1.0


def test_travel_index_high_for_premium():
    rates = {"travel": 8.0, "international": 6.0}
    meta  = {"lounge_domestic": 12, "lounge_intl": 8, "forex_markup_pct": 0.0}
    ti = travel_index(rates, meta)
    assert ti > 0.7   # premium travel card scores high


def test_travel_index_low_for_basic():
    ti = travel_index({"travel": 0.0}, {"lounge_domestic": 0, "lounge_intl": 0,
                                         "forex_markup_pct": 3.5})
    assert ti < 0.2


def test_fee_waiver_band_lifetime_free():
    assert fee_waiver_threshold_band({"annual_fee": 0,    "is_lifetime_free": 1}) == "none"
    assert fee_waiver_threshold_band({"annual_fee": 500,  "fee_waiver_spend": 200_000}) == "easy"
    assert fee_waiver_threshold_band({"annual_fee": 1500, "fee_waiver_spend": 500_000}) == "medium"
    assert fee_waiver_threshold_band({"annual_fee": 5000, "fee_waiver_spend": 1_500_000}) == "hard"
    assert fee_waiver_threshold_band({"annual_fee": 5000, "fee_waiver_spend": None}) == "hard"


# ── DB integration ───────────────────────────────────────────────────────────

def test_build_card_features_persists():
    rows = build_card_features()
    assert len(rows) > 0
    for r in rows:
        assert 0 <= r["reward_rate_index"] <= 1
        assert 0 <= r["travel_index"]      <= 1
        assert r["fee_waiver_threshold_band"] in {"none", "easy", "medium", "hard"}


def test_csv_loader_roundtrip():
    """Write a small CSV, load it, read back via existing DB helpers."""
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    )
    try:
        w = csv.DictWriter(tmp, fieldnames=[
            "card_id", "bank", "name", "annual_fee",
            "min_income_annual", "min_cibil",
        ])
        w.writeheader()
        w.writerow({
            "card_id": "_test_card_xyz", "bank": "TestBank",
            "name": "Test Card", "annual_fee": "999",
            "min_income_annual": "300000", "min_cibil": "700",
        })
        tmp.close()
        n = load_cards_from_csv(tmp.name)
        assert n == 1
        cards = {c["card_id"]: c for c in get_all_cards()}
        assert "_test_card_xyz" in cards
        assert cards["_test_card_xyz"]["annual_fee"] == 999
    finally:
        os.unlink(tmp.name)
        # cleanup the test card from DB so other tests aren't affected
        from database import get_connection
        conn = get_connection()
        conn.execute("DELETE FROM cards WHERE card_id = '_test_card_xyz'")
        conn.commit()
