"""
test_approval_predictor.py — Unit tests for the Card Approval Predictor.
Tests cover training, prediction, rule-based fallback, and reason generation.
"""

import sys, pickle
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from approval_predictor import (
    _generate_training_data,
    train_and_save,
    predict_approval,
    _approval_reason,
    CARD_THRESHOLDS,
    MODEL_PATH,
)


# ─── Training data generation ─────────────────────────────────────────────────

class TestGenerateTrainingData:
    def test_returns_dataframe(self):
        df = _generate_training_data(n_per_card=10)
        import pandas as pd
        assert isinstance(df, pd.DataFrame)

    def test_expected_columns(self):
        df = _generate_training_data(n_per_card=10)
        for col in ["card_id", "cibil_score", "income_annual",
                    "existing_cards_count", "approved"]:
            assert col in df.columns

    def test_all_cards_present(self):
        df = _generate_training_data(n_per_card=10)
        for card_id in CARD_THRESHOLDS:
            assert card_id in df["card_id"].values

    def test_row_count(self):
        df = _generate_training_data(n_per_card=50)
        assert len(df) == len(CARD_THRESHOLDS) * 50

    def test_cibil_range(self):
        df = _generate_training_data(n_per_card=100)
        assert df["cibil_score"].min() >= 550
        assert df["cibil_score"].max() <= 850

    def test_income_range(self):
        df = _generate_training_data(n_per_card=100)
        assert df["income_annual"].min() >= 100_000

    def test_binary_target(self):
        df = _generate_training_data(n_per_card=50)
        assert set(df["approved"].unique()).issubset({0, 1})

    def test_both_classes_present(self):
        df = _generate_training_data(n_per_card=200)
        assert 0 in df["approved"].values
        assert 1 in df["approved"].values


# ─── Train and save ───────────────────────────────────────────────────────────

class TestTrainAndSave:
    def test_returns_dict(self):
        results = train_and_save(n_per_card=50)
        assert isinstance(results, dict)

    def test_all_cards_in_results(self):
        results = train_and_save(n_per_card=50)
        for card_id in CARD_THRESHOLDS:
            assert card_id in results

    def test_auc_values_plausible(self):
        results = train_and_save(n_per_card=200)
        for card_id, auc in results.items():
            # Some cards may have very skewed labels → AUC can be low; just check it's a number
            assert isinstance(auc, float), f"{card_id} AUC is not a float"
            assert 0.0 <= auc <= 1.0, f"{card_id} AUC={auc} out of [0,1]"

    def test_model_file_created(self):
        train_and_save(n_per_card=50)
        assert MODEL_PATH.exists()

    def test_model_file_loadable(self):
        train_and_save(n_per_card=50)
        with open(MODEL_PATH, "rb") as f:
            payload = pickle.load(f)
        assert "models" in payload
        assert "features" in payload
        assert "card_ids" in payload

    def test_model_count_correct(self):
        train_and_save(n_per_card=50)
        with open(MODEL_PATH, "rb") as f:
            payload = pickle.load(f)
        assert len(payload["models"]) == len(CARD_THRESHOLDS)

    def test_features_list(self):
        train_and_save(n_per_card=50)
        with open(MODEL_PATH, "rb") as f:
            payload = pickle.load(f)
        assert payload["features"] == ["cibil_score", "income_annual", "existing_cards_count"]


# ─── predict_approval ─────────────────────────────────────────────────────────

class TestPredictApproval:
    def setup_method(self):
        # Ensure model is trained before prediction tests
        if not MODEL_PATH.exists():
            train_and_save(n_per_card=100)

    def test_returns_list(self):
        results = predict_approval(740, 1_200_000, 2)
        assert isinstance(results, list)

    def test_all_cards_returned(self):
        results = predict_approval(740, 1_200_000, 2)
        card_ids = [r["card_id"] for r in results]
        for cid in CARD_THRESHOLDS:
            assert cid in card_ids

    def test_expected_keys(self):
        results = predict_approval(740, 1_200_000, 2)
        for r in results:
            assert "card_id" in r
            assert "card_name" in r
            assert "approval_probability_percent" in r
            assert "tier" in r
            assert "reason" in r

    def test_sorted_descending(self):
        results = predict_approval(740, 1_200_000, 2)
        probs = [r["approval_probability_percent"] for r in results]
        assert probs == sorted(probs, reverse=True)

    def test_probability_in_range(self):
        results = predict_approval(740, 1_200_000, 2)
        for r in results:
            assert 0 <= r["approval_probability_percent"] <= 100

    def test_tier_values(self):
        results = predict_approval(740, 1_200_000, 2)
        for r in results:
            assert r["tier"] in ("high", "medium", "low")

    def test_high_cibil_high_income(self):
        """Excellent profile should get high tier for most cards."""
        results = predict_approval(800, 3_000_000, 1)
        high_count = sum(1 for r in results if r["tier"] == "high")
        assert high_count >= 5, f"Expected ≥5 high-tier cards, got {high_count}"

    def test_low_cibil_mostly_low(self):
        """Poor profile should mostly be low/medium tier."""
        results = predict_approval(580, 200_000, 0)
        low_or_med = sum(1 for r in results if r["tier"] in ("low", "medium"))
        assert low_or_med >= 8

    def test_filter_by_card_ids(self):
        card_ids = ["hdfc_regalia", "axis_ace", "kotak_811"]
        results  = predict_approval(700, 500_000, 2, card_ids=card_ids)
        returned = [r["card_id"] for r in results]
        assert set(returned) == set(card_ids)

    def test_filter_single_card(self):
        results = predict_approval(750, 1_000_000, 1, card_ids=["hdfc_millennia"])
        assert len(results) == 1
        assert results[0]["card_id"] == "hdfc_millennia"

    def test_kotak_811_accessible(self):
        """Kotak 811 should be approvable even for low cibil."""
        results  = predict_approval(620, 180_000, 0, card_ids=["kotak_811"])
        assert results[0]["approval_probability_percent"] >= 40

    def test_infinia_hard_to_get(self):
        """Infinia is invite-only / very restrictive."""
        results = predict_approval(700, 500_000, 2, card_ids=["hdfc_infinia"])
        assert results[0]["approval_probability_percent"] < 60

    def test_reason_non_empty(self):
        results = predict_approval(700, 600_000, 2)
        for r in results:
            assert isinstance(r["reason"], str) and len(r["reason"]) > 5

    def test_min_cibil_in_result(self):
        results = predict_approval(740, 1_200_000, 2)
        for r in results:
            assert "min_cibil_required" in r
            assert isinstance(r["min_cibil_required"], int)

    def test_many_existing_cards_penalised(self):
        """7 cards should score lower than 1 card for the same profile."""
        r_few  = predict_approval(750, 1_000_000, 1,  card_ids=["hdfc_regalia"])[0]
        r_many = predict_approval(750, 1_000_000, 7,  card_ids=["hdfc_regalia"])[0]
        assert r_few["approval_probability_percent"] >= r_many["approval_probability_percent"]

    def test_bank_field_populated(self):
        results = predict_approval(740, 1_200_000, 2)
        banks = [r["bank"] for r in results if r["bank"]]
        assert len(banks) > 5


# ─── _approval_reason ─────────────────────────────────────────────────────────

class TestApprovalReason:
    def test_cibil_too_low(self):
        reason = _approval_reason("hdfc_regalia", 680, 800_000, 1, 0.30)
        assert "CIBIL" in reason or "hard inquiry" in reason.lower() or "Improve" in reason

    def test_income_too_low(self):
        reason = _approval_reason("hdfc_regalia", 780, 200_000, 1, 0.40)
        assert "Income" in reason or "income" in reason

    def test_many_cards_warning(self):
        reason = _approval_reason("axis_ace", 750, 800_000, 6, 0.45)
        assert "5+" in reason or "card" in reason.lower()

    def test_strong_profile_positive(self):
        reason = _approval_reason("kotak_811", 780, 1_200_000, 1, 0.90)
        assert "strong" in reason.lower() or "high" in reason.lower()

    def test_moderate_probability(self):
        reason = _approval_reason("axis_ace", 720, 600_000, 2, 0.55)
        assert isinstance(reason, str) and len(reason) > 5

    def test_low_probability_advice(self):
        reason = _approval_reason("hdfc_infinia", 650, 200_000, 0, 0.15)
        assert isinstance(reason, str) and len(reason) > 5

    def test_borderline_cibil(self):
        # Just below threshold + 30 window
        reason = _approval_reason("hdfc_regalia", 760, 800_000, 1, 0.62)
        assert isinstance(reason, str)


# ─── CARD_THRESHOLDS sanity ───────────────────────────────────────────────────

class TestCardThresholds:
    def test_all_16_cards(self):
        assert len(CARD_THRESHOLDS) == 16

    def test_cibil_in_range(self):
        for cid, (min_c, _, _) in CARD_THRESHOLDS.items():
            assert 500 <= min_c <= 850, f"{cid} min_cibil={min_c}"

    def test_base_rate_in_range(self):
        for cid, (_, _, rate) in CARD_THRESHOLDS.items():
            assert 0.1 <= rate <= 1.0, f"{cid} base_rate={rate}"

    def test_infinia_highest_cibil(self):
        assert CARD_THRESHOLDS["hdfc_infinia"][0] >= 760

    def test_kotak_811_lowest_cibil(self):
        min_cibils = {cid: t[0] for cid, t in CARD_THRESHOLDS.items()}
        assert min_cibils["kotak_811"] == min(min_cibils.values())
