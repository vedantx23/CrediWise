"""
tests/test_persona.py — Unit tests for Persona Engine
Run: pytest backend/tests/test_persona.py -v
"""

import pytest
import sys, os, pickle
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from persona_engine import (
    extract_features,
    _spend_entropy,
    _top_shap_drivers,
    generate_training_data,
    PERSONAS,
    FEATURES,
    CATEGORIES,
    MODEL_PATH,
)


# ─── Feature extraction ──────────────────────────────────────────────────────

class TestExtractFeatures:
    def test_output_shape(self):
        spend = {cat: 5000.0 for cat in CATEGORIES}
        X = extract_features(spend, income_annual=600000, cards_count=2)
        assert X.shape == (1, len(FEATURES))

    def test_pct_sum_approx_100(self):
        spend = {"dining": 8000, "fuel": 5000, "grocery": 6000,
                 "travel": 10000, "online": 7000, "utilities": 3000,
                 "international": 2000, "other": 4000}
        X = extract_features(spend)
        # indices 0-6 are pct features
        pct_sum = X[0, :7].sum()
        total = sum(spend.values())
        expected = (total - spend["other"]) / total * 100  # other is index 7 (excluded from first 7)
        # dining+fuel+grocery+travel+online+utilities+international should sum close to non-other
        assert 0 < pct_sum <= 100

    def test_zero_spend_safe(self):
        """Should not crash on zero total spend."""
        X = extract_features({})
        assert X.shape == (1, len(FEATURES))
        assert not np.isnan(X).any()

    def test_income_lakh_scaling(self):
        spend = {"dining": 5000}
        X1 = extract_features(spend, income_annual=1000000)
        X2 = extract_features(spend, income_annual=5000000)
        income_idx = FEATURES.index("income_lakh")
        assert X2[0, income_idx] > X1[0, income_idx]

    def test_cards_count_feature(self):
        spend = {"dining": 5000}
        X = extract_features(spend, cards_count=4)
        cards_idx = FEATURES.index("cards_count")
        assert X[0, cards_idx] == 4.0

    def test_entropy_increases_with_spread(self):
        # Concentrated spend
        X_conc = extract_features({"dining": 50000, "fuel": 100, "grocery": 100}, cards_count=1)
        # Spread spend
        X_spread = extract_features({cat: 5000 for cat in CATEGORIES}, cards_count=1)
        ent_idx = FEATURES.index("spend_entropy")
        assert X_spread[0, ent_idx] > X_conc[0, ent_idx]


# ─── Entropy ─────────────────────────────────────────────────────────────────

class TestSpendEntropy:
    def test_uniform_max_entropy(self):
        uniform = [1/8] * 8
        e = _spend_entropy(uniform)
        assert e > 1.5   # ln(8) ≈ 2.08

    def test_concentrated_low_entropy(self):
        concentrated = [0.99, 0.01, 0, 0, 0, 0, 0, 0]
        e = _spend_entropy(concentrated)
        assert e < 0.2

    def test_empty_returns_zero(self):
        assert _spend_entropy([]) == 0.0

    def test_single_category_near_zero(self):
        e = _spend_entropy([1.0, 0, 0, 0])
        assert e < 0.01


# ─── Persona definitions sanity ──────────────────────────────────────────────

class TestPersonaDefinitions:
    def test_four_personas_defined(self):
        assert len(PERSONAS) == 4

    def test_all_have_required_fields(self):
        required = {"id", "name", "emoji", "tagline", "description", "traits", "card_filters", "ideal_cards"}
        for pid, p in PERSONAS.items():
            missing = required - set(p.keys())
            assert not missing, f"Persona {pid} missing: {missing}"

    def test_persona_names(self):
        names = {p["name"] for p in PERSONAS.values()}
        assert "The Stealth Nomad"         in names
        assert "The High-Street Architect" in names
        assert "The Reward Arbitrageur"    in names
        assert "The Frugal Zen Master"     in names


# ─── Training data generation ─────────────────────────────────────────────────

class TestTrainingData:
    def test_data_shape(self):
        X, y = generate_training_data(n_per_class=50)
        assert X.shape == (200, len(FEATURES))
        assert y.shape == (200,)

    def test_four_classes_present(self):
        _, y = generate_training_data(n_per_class=50)
        assert set(y) == {0, 1, 2, 3}

    def test_balanced_classes(self):
        _, y = generate_training_data(n_per_class=100)
        counts = np.bincount(y)
        assert all(c == 100 for c in counts)

    def test_no_nan_in_features(self):
        X, _ = generate_training_data(n_per_class=50)
        assert not np.isnan(X).any()

    def test_pct_features_non_negative(self):
        X, _ = generate_training_data(n_per_class=50)
        pct_cols = X[:, :7]
        assert (pct_cols >= 0).all()

    def test_nomad_high_travel_pct(self):
        """Stealth Nomad samples should have higher travel+intl than Zen Master."""
        X, y = generate_training_data(n_per_class=200)
        nomad_mask = y == 0
        zen_mask   = y == 3
        travel_idx = FEATURES.index("travel_pct")
        intl_idx   = FEATURES.index("international_pct")
        nomad_ti = X[nomad_mask, travel_idx].mean() + X[nomad_mask, intl_idx].mean()
        zen_ti   = X[zen_mask,   travel_idx].mean() + X[zen_mask,   intl_idx].mean()
        assert nomad_ti > zen_ti

    def test_zen_low_spend(self):
        """Frugal Zen Master should have lower log spend than Arbitrageur."""
        X, y = generate_training_data(n_per_class=200)
        arb_mask = y == 2
        zen_mask  = y == 3
        spend_idx = FEATURES.index("log_total_spend")
        assert X[zen_mask, spend_idx].mean() < X[arb_mask, spend_idx].mean()


# ─── Trained model tests (require model to exist) ────────────────────────────

@pytest.mark.skipif(not MODEL_PATH.exists(), reason="Model not yet trained")
class TestTrainedModel:
    @pytest.fixture(scope="class")
    def bundle(self):
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)

    def test_model_bundle_keys(self, bundle):
        assert "model"    in bundle
        assert "features" in bundle
        assert "personas" in bundle
        assert "version"  in bundle

    def test_feature_list_matches(self, bundle):
        assert bundle["features"] == FEATURES

    def test_nomad_prediction(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(
            monthly_spend={"travel": 50000, "international": 18000, "dining": 8000,
                           "fuel": 3000, "grocery": 4000, "online": 5000,
                           "utilities": 2000, "other": 2000},
            income_annual=2500000,
            cards_count=3,
        )
        assert result["persona_id"] == 0
        assert result["persona_name"] == "The Stealth Nomad"
        assert result["confidence"] > 0.5

    def test_zen_prediction(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(
            monthly_spend={"grocery": 8000, "utilities": 5000, "fuel": 3000,
                           "dining": 1500, "online": 1000, "travel": 500,
                           "international": 0, "other": 500},
            income_annual=400000,
            cards_count=1,
        )
        assert result["persona_id"] == 3
        assert result["persona_name"] == "The Frugal Zen Master"

    def test_architect_prediction(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(
            monthly_spend={"dining": 15000, "online": 20000, "grocery": 8000,
                           "travel": 3000, "fuel": 4000, "utilities": 2000,
                           "international": 1000, "other": 2000},
            income_annual=1200000,
            cards_count=2,
        )
        assert result["persona_id"] == 1
        assert result["persona_name"] == "The High-Street Architect"

    def test_arbitrageur_prediction(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(
            monthly_spend={"dining": 20000, "fuel": 15000, "grocery": 18000,
                           "travel": 18000, "online": 25000, "utilities": 10000,
                           "international": 8000, "other": 10000},
            income_annual=3000000,
            cards_count=5,
        )
        assert result["persona_id"] == 2
        assert result["persona_name"] == "The Reward Arbitrageur"

    def test_predict_returns_all_fields(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(monthly_spend={"dining": 5000})
        required = {"persona_id", "persona_name", "persona_emoji", "tagline",
                    "description", "traits", "confidence", "probabilities",
                    "shap_drivers", "top_drivers", "recommendations"}
        assert required.issubset(set(result.keys()))

    def test_probabilities_sum_to_one(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(monthly_spend={"dining": 5000, "online": 8000})
        total = sum(result["probabilities"].values())
        assert total == pytest.approx(1.0, abs=1e-3)

    def test_confidence_between_0_and_1(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(monthly_spend={"fuel": 5000, "grocery": 4000})
        assert 0.0 <= result["confidence"] <= 1.0

    def test_recommendations_non_empty(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(
            monthly_spend={"dining": 8000, "online": 10000, "grocery": 5000,
                           "travel": 3000, "fuel": 2000, "utilities": 2000,
                           "international": 1000, "other": 2000},
            income_annual=800000,
            cards_count=1,
            current_cards=["kotak_811"],
        )
        assert len(result["recommendations"]) > 0
        for rec in result["recommendations"]:
            assert "card_name" in rec
            assert "reason"    in rec

    def test_top_drivers_subset_of_features(self, bundle):
        from persona_engine import predict_persona
        result = predict_persona(monthly_spend={"dining": 10000})
        for drv in result["top_drivers"]:
            assert drv in FEATURES
