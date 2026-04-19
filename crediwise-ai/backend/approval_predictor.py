"""
approval_predictor.py — Card Approval Predictor

Trains a Random Forest on (cibil_score, income_annual, existing_cards_count)
→ approval_probability for each card.

Training data uses public CIBIL thresholds as priors:
  CIBIL > 750 + income > threshold → high probability
  CIBIL 700-750                    → medium
  Below 700                        → low

Model saved at: backend/models/approval_rf.pkl
"""

from __future__ import annotations
import sys, os, pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_all_cards

MODELS_DIR  = Path(__file__).resolve().parent / "models"
MODEL_PATH  = MODELS_DIR / "approval_rf.pkl"

# ─── Card approval thresholds (public knowledge / RBI guidelines) ─────────────
# (min_cibil, min_income_annual_inr, typical_approval_rate_pct)
CARD_THRESHOLDS: dict[str, tuple[int, float, float]] = {
    "hdfc_infinia":      (780, 2_500_000, 0.35),
    "hdfc_regalia":      (750,   600_000, 0.65),
    "hdfc_millennia":    (700,   350_000, 0.72),
    "icici_amazon":      (680,   300_000, 0.78),
    "icici_coral":       (650,   200_000, 0.75),
    "axis_ace":          (700,   300_000, 0.74),
    "axis_flipkart":     (700,   300_000, 0.73),
    "sbi_simplyclick":   (650,   200_000, 0.76),
    "sbi_elite":         (740,   600_000, 0.62),
    "amex_gold":         (750,   500_000, 0.55),
    "amex_platinum":     (780,  2_000_000, 0.30),
    "kotak_league":      (700,   300_000, 0.70),
    "kotak_811":         (600,         0, 0.90),
    "indusind_platinum": (700,   250_000, 0.68),
    "indusind_legend":   (720,   500_000, 0.60),
    "au_lit":            (650,   180_000, 0.80),
}


def _generate_training_data(n_per_card: int = 500) -> pd.DataFrame:
    """
    Generate synthetic training data for card approval.
    Features: cibil_score, income_annual, existing_cards_count
    Target:   approved (0/1) per card_id
    """
    rng    = np.random.default_rng(42)
    rows   = []

    for card_id, (min_cibil, min_income, base_rate) in CARD_THRESHOLDS.items():
        for _ in range(n_per_card):
            # Sample a realistic profile
            cibil  = int(rng.integers(550, 850))
            income = float(rng.integers(100_000, 5_000_000))
            n_cards = int(rng.integers(0, 7))

            # Approval probability modulated by distance from thresholds
            cibil_gap  = (cibil  - min_cibil)  / 200   # normalised
            income_gap = (income - min_income)  / max(min_income, 100_000)
            prob = base_rate + 0.3 * np.tanh(cibil_gap) + 0.1 * np.tanh(income_gap)
            # Too many cards slightly reduces approval (hard inquiry / utilisation risk)
            prob -= 0.02 * max(0, n_cards - 3)
            prob  = float(np.clip(prob, 0.02, 0.97))

            approved = int(rng.random() < prob)
            rows.append({
                "card_id":             card_id,
                "cibil_score":         cibil,
                "income_annual":       income,
                "existing_cards_count": n_cards,
                "approved":            approved,
            })

    return pd.DataFrame(rows)


def train_and_save(n_per_card: int = 500) -> dict:
    """Train one RF per card and save as a dict of models. Returns accuracy summary."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_score

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    df       = _generate_training_data(n_per_card)
    features = ["cibil_score", "income_annual", "existing_cards_count"]

    models  = {}
    results = {}
    for card_id in CARD_THRESHOLDS:
        sub = df[df["card_id"] == card_id]
        X   = sub[features].values
        y   = sub["approved"].values

        clf = RandomForestClassifier(
            n_estimators=100, max_depth=6, min_samples_leaf=5,
            random_state=42, n_jobs=-1,
        )
        cv_scores = cross_val_score(clf, X, y, cv=5, scoring="roc_auc")
        clf.fit(X, y)
        models[card_id]  = clf
        results[card_id] = round(cv_scores.mean(), 3)

    payload = {"models": models, "features": features, "card_ids": list(models.keys())}
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(payload, f)

    avg_auc = round(sum(results.values()) / len(results), 3)
    print(f"[ApprovalPredictor] Trained {len(models)} models — avg ROC-AUC: {avg_auc}")
    return results


def _load_models() -> dict:
    if not MODEL_PATH.exists():
        train_and_save()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def _approval_reason(
    card_id:      str,
    cibil:        int,
    income:       float,
    n_cards:      int,
    probability:  float,
) -> str:
    min_cibil, min_income, _ = CARD_THRESHOLDS.get(card_id, (700, 300_000, 0.6))
    parts = []

    if cibil < min_cibil:
        gap = min_cibil - cibil
        parts.append(
            f"Applying with your current profile may result in a hard inquiry rejection. "
            f"Improve CIBIL by {gap} points first."
        )
    elif cibil < min_cibil + 30:
        parts.append(f"CIBIL {cibil} is borderline — a few points higher improves odds significantly.")

    if income < min_income:
        parts.append(f"Income ₹{int(income):,} is below the recommended ₹{int(min_income):,} minimum.")

    if n_cards >= 5:
        parts.append("Having 5+ existing cards may signal high credit utilisation to the issuer.")

    if not parts:
        if probability >= 0.75:
            parts.append("Strong profile — high approval likelihood.")
        elif probability >= 0.50:
            parts.append("Good profile — moderate approval likelihood.")
        else:
            parts.append("Consider building CIBIL / income before applying.")

    return " ".join(parts)


def predict_approval(
    cibil_score:          int,
    income_annual:        float,
    existing_cards_count: int,
    card_ids:             list[str] | None = None,
) -> list[dict]:
    """
    Predict approval probability for each card.

    Returns list sorted by approval probability desc:
    [{
      "card_id":                    str,
      "card_name":                  str,
      "bank":                       str,
      "approval_probability_percent": float,
      "tier":                       "high" | "medium" | "low",
      "reason":                     str,
      "min_cibil_required":         int,
      "min_income_required":        float,
    }]
    """
    payload  = _load_models()
    models   = payload["models"]
    features = payload["features"]

    all_cards = {c["card_id"]: c for c in get_all_cards()}
    target_ids = card_ids or list(CARD_THRESHOLDS.keys())

    X = np.array([[cibil_score, income_annual, existing_cards_count]])
    results = []

    for card_id in target_ids:
        clf  = models.get(card_id)
        card = all_cards.get(card_id, {})

        if clf is not None:
            proba = clf.predict_proba(X)[0]
            # Handle single-class RF (all training samples had same label)
            if len(clf.classes_) == 1:
                prob = float(clf.classes_[0])   # 1.0 or 0.0
            else:
                # classes_ may be [0,1] or [1] — find index of class 1
                cls_list = list(clf.classes_)
                idx1 = cls_list.index(1) if 1 in cls_list else -1
                prob = float(proba[idx1]) if idx1 >= 0 else float(proba[0])
        else:
            # Fallback: rule-based estimate
            min_c, min_i, base = CARD_THRESHOLDS.get(card_id, (700, 300_000, 0.5))
            prob = base
            if cibil_score < min_c:
                prob *= max(0.1, 1 - (min_c - cibil_score) / 200)
            if income_annual < min_i and min_i > 0:
                prob *= max(0.1, 1 - (min_i - income_annual) / min_i)

        prob_pct = round(prob * 100, 1)
        tier     = "high" if prob_pct >= 70 else ("medium" if prob_pct >= 40 else "low")
        reason   = _approval_reason(card_id, cibil_score, income_annual,
                                    existing_cards_count, prob)

        min_c, min_i, _ = CARD_THRESHOLDS.get(card_id, (700, 300_000, 0.5))
        results.append({
            "card_id":                    card_id,
            "card_name":                  card.get("name", card_id),
            "bank":                       card.get("bank", ""),
            "annual_fee":                 card.get("annual_fee", 0),
            "approval_probability_percent": prob_pct,
            "tier":                       tier,
            "reason":                     reason,
            "min_cibil_required":         min_c,
            "min_income_required":        min_i,
        })

    results.sort(key=lambda x: -x["approval_probability_percent"])
    return results
