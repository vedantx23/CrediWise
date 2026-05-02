"""
persona_engine.py — Persona Classifier for CrediWise-AI

4 output classes:
  0 = "The Stealth Nomad"         (high travel + international)
  1 = "The High-Street Architect" (high dining + online shopping)
  2 = "The Reward Arbitrageur"    (spread spend, max cashback math)
  3 = "The Frugal Zen Master"     (zero-fee, low spend, max efficiency)

Model: Random Forest (scikit-learn)
Saved:  backend/models/persona_rf.pkl
SHAP:   TreeExplainer for feature attribution on every prediction
"""

from __future__ import annotations
import os, sys, json, pickle
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# ─── Persona definitions ──────────────────────────────────────────────────────

PERSONAS = {
    0: {
        "id":          "stealth_nomad",
        "name":        "The Stealth Nomad",
        "emoji":       "✈️",
        "tagline":     "You earn while the world is your office.",
        "description": (
            "You live out of airports and hotel lounges. "
            "Travel and international spends dominate your wallet. "
            "Every flight is a reward-earning opportunity."
        ),
        "traits":      ["Travel-first", "Lounge addict", "Forex savvy", "Miles collector"],
        "card_filters": {
            "preferred_categories": ["travel", "international"],
            "require_lounge":       True,
            "max_forex_markup":     2.5,
        },
        "ideal_cards": ["hdfc_regalia", "indusind_legend", "sbi_elite", "amex_gold"],
    },
    1: {
        "id":          "high_street_architect",
        "name":        "The High-Street Architect",
        "emoji":       "🛍️",
        "tagline":     "Your city is your playground — and your cashback machine.",
        "description": (
            "Restaurants, malls, and online carts are where your money flows. "
            "You want maximum cashback on dining and shopping "
            "without the complexity of points programmes."
        ),
        "traits":      ["Dining enthusiast", "Online shopper", "Cashback lover", "City dweller"],
        "card_filters": {
            "preferred_categories": ["dining", "online", "grocery"],
            "require_lounge":       False,
        },
        "ideal_cards": ["hdfc_millennia", "axis_flipkart", "icici_amazon", "kotak_league"],
    },
    2: {
        "id":          "reward_arbitrageur",
        "name":        "The Reward Arbitrageur",
        "emoji":       "📊",
        "tagline":     "You treat your credit card like a financial instrument.",
        "description": (
            "You have multiple cards and rotate them by category. "
            "You know the exact ERR on every card. "
            "Annual fees are investments, not costs — if the math checks out."
        ),
        "traits":      ["Multi-card optimizer", "ERR calculator", "Points maximizer", "Fee-justified"],
        "card_filters": {
            "preferred_categories": ["online", "dining", "travel", "fuel"],
            "require_lounge":       False,
            "min_rate":             3.0,
        },
        "ideal_cards": ["hdfc_millennia", "axis_ace", "amex_gold", "hdfc_regalia", "kotak_league"],
    },
    3: {
        "id":          "frugal_zen_master",
        "name":        "The Frugal Zen Master",
        "emoji":       "🧘",
        "tagline":     "One card. Zero fees. Maximum clarity.",
        "description": (
            "You believe in simplicity over complexity. "
            "Zero annual fee, one card for everything, "
            "and no juggling multiple reward programmes."
        ),
        "traits":      ["Zero-fee seeker", "Minimalist", "Grocery & utilities focus", "Low complexity"],
        "card_filters": {
            "preferred_categories": ["grocery", "utilities", "fuel"],
            "require_lifetime_free": True,
        },
        "ideal_cards": ["icici_amazon", "kotak_811", "axis_ace", "sbi_simplyclick"],
    },
}

CATEGORIES = ["dining", "fuel", "grocery", "travel", "online", "utilities", "international", "other"]

FEATURES = [
    "dining_pct", "fuel_pct", "grocery_pct", "travel_pct",
    "online_pct", "utilities_pct", "international_pct",
    "log_total_spend", "income_lakh", "cards_count", "spend_entropy",
]

MODEL_PATH = Path(__file__).resolve().parent / "models" / "persona_rf.pkl"


# ─── Feature engineering ─────────────────────────────────────────────────────

def _spend_entropy(fracs: list[float]) -> float:
    """Shannon entropy of spend fractions — high = diversified, low = concentrated."""
    arr = np.array([f for f in fracs if f > 0])
    if len(arr) == 0:
        return 0.0
    arr = arr / arr.sum()
    return float(-np.sum(arr * np.log(arr + 1e-9)))


def extract_features(
    monthly_spend: dict[str, float],
    income_annual: float = 0.0,
    cards_count: int = 0,
) -> np.ndarray:
    """Convert raw spend dict → feature vector for the RF classifier."""
    spend = {cat: float(monthly_spend.get(cat, 0.0)) for cat in CATEGORIES}
    total = max(sum(spend.values()), 1.0)

    fracs = [spend[cat] / total for cat in CATEGORIES]
    (dining_pct, fuel_pct, grocery_pct, travel_pct,
     online_pct, utilities_pct, international_pct, _) = [f * 100 for f in fracs]

    log_total  = np.log1p(total)
    income_lkh = income_annual / 100_000.0
    entropy    = _spend_entropy(fracs)

    return np.array([[
        dining_pct, fuel_pct, grocery_pct, travel_pct,
        online_pct, utilities_pct, international_pct,
        log_total, income_lkh, float(cards_count), entropy,
    ]])


# ─── Synthetic training data ─────────────────────────────────────────────────

_RNG = np.random.default_rng(42)

def _sample_spend(means: dict, stds: dict, n: int) -> pd.DataFrame:
    """Generate n random spend profiles around the given means."""
    rows = []
    for _ in range(n):
        spend = {cat: max(0.0, _RNG.normal(means[cat], stds[cat])) for cat in CATEGORIES}
        rows.append(spend)
    return pd.DataFrame(rows)


def generate_training_data(n_per_class: int = 1200) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic spend profiles for 4 personas.
    Returns (X, y) — feature matrix and label vector.
    """
    all_X, all_y = [], []

    # ── Persona 0: Stealth Nomad ──────────────────────────────────────────────
    for _ in range(n_per_class):
        total  = _RNG.uniform(50000, 200000)
        travel = _RNG.uniform(0.30, 0.50)
        intl   = _RNG.uniform(0.12, 0.25)
        dining = _RNG.uniform(0.08, 0.18)
        online = _RNG.uniform(0.05, 0.12)
        fuel   = _RNG.uniform(0.03, 0.08)
        # remainder to grocery + utilities + other
        rem    = max(0.0, 1 - travel - intl - dining - online - fuel)
        groc   = rem * _RNG.uniform(0.4, 0.6)
        util   = rem * _RNG.uniform(0.2, 0.4)
        other  = max(0.0, rem - groc - util)
        spend  = {
            "dining": dining, "fuel": fuel, "grocery": groc, "travel": travel,
            "online": online, "utilities": util, "international": intl, "other": other,
        }
        spend = {k: v * total for k, v in spend.items()}
        income = _RNG.uniform(1200000, 3000000)
        cards  = int(_RNG.integers(2, 5))
        x = extract_features(spend, income, cards)
        all_X.append(x[0])
        all_y.append(0)

    # ── Persona 1: High-Street Architect ─────────────────────────────────────
    for _ in range(n_per_class):
        total  = _RNG.uniform(30000, 100000)
        dining = _RNG.uniform(0.25, 0.40)
        online = _RNG.uniform(0.22, 0.35)
        groc   = _RNG.uniform(0.12, 0.20)
        travel = _RNG.uniform(0.04, 0.12)
        fuel   = _RNG.uniform(0.04, 0.10)
        rem    = max(0.0, 1 - dining - online - groc - travel - fuel)
        util   = rem * _RNG.uniform(0.3, 0.6)
        intl   = rem * _RNG.uniform(0.1, 0.3)
        other  = max(0.0, rem - util - intl)
        spend  = {
            "dining": dining, "fuel": fuel, "grocery": groc, "travel": travel,
            "online": online, "utilities": util, "international": intl, "other": other,
        }
        spend = {k: v * total for k, v in spend.items()}
        income = _RNG.uniform(800000, 2000000)
        cards  = int(_RNG.integers(1, 4))
        x = extract_features(spend, income, cards)
        all_X.append(x[0])
        all_y.append(1)

    # ── Persona 2: Reward Arbitrageur ─────────────────────────────────────────
    for _ in range(n_per_class):
        total  = _RNG.uniform(80000, 300000)
        # Spread evenly across high-reward categories
        online = _RNG.uniform(0.20, 0.28)
        dining = _RNG.uniform(0.15, 0.22)
        groc   = _RNG.uniform(0.12, 0.18)
        travel = _RNG.uniform(0.10, 0.18)
        fuel   = _RNG.uniform(0.08, 0.14)
        util   = _RNG.uniform(0.05, 0.10)
        intl   = _RNG.uniform(0.03, 0.08)
        other  = max(0.0, 1 - online - dining - groc - travel - fuel - util - intl)
        spend  = {
            "dining": dining, "fuel": fuel, "grocery": groc, "travel": travel,
            "online": online, "utilities": util, "international": intl, "other": other,
        }
        spend = {k: v * total for k, v in spend.items()}
        income = _RNG.uniform(1500000, 5000000)
        cards  = int(_RNG.integers(3, 7))
        x = extract_features(spend, income, cards)
        all_X.append(x[0])
        all_y.append(2)

    # ── Persona 3: Frugal Zen Master ──────────────────────────────────────────
    for _ in range(n_per_class):
        total  = _RNG.uniform(5000, 25000)
        groc   = _RNG.uniform(0.30, 0.45)
        util   = _RNG.uniform(0.20, 0.30)
        fuel   = _RNG.uniform(0.10, 0.18)
        dining = _RNG.uniform(0.05, 0.14)
        online = _RNG.uniform(0.04, 0.12)
        rem    = max(0.0, 1 - groc - util - fuel - dining - online)
        travel = rem * _RNG.uniform(0.2, 0.5)
        intl   = rem * _RNG.uniform(0.0, 0.15)
        other  = max(0.0, rem - travel - intl)
        spend  = {
            "dining": dining, "fuel": fuel, "grocery": groc, "travel": travel,
            "online": online, "utilities": util, "international": intl, "other": other,
        }
        spend = {k: v * total for k, v in spend.items()}
        income = _RNG.uniform(300000, 800000)
        cards  = int(_RNG.integers(1, 3))
        x = extract_features(spend, income, cards)
        all_X.append(x[0])
        all_y.append(3)

    X = np.array(all_X)
    y = np.array(all_y)
    # Shuffle
    idx = _RNG.permutation(len(y))
    return X[idx], y[idx]


# ─── Training ─────────────────────────────────────────────────────────────────

def train_and_save(n_per_class: int = 1200) -> dict:
    """Train the Random Forest persona classifier and save as .pkl."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.metrics import classification_report

    print("🌱  Generating synthetic training data…")
    X, y = generate_training_data(n_per_class)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("🌲  Training Random Forest classifier…")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)

    # Evaluate
    cv_scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
    test_acc  = clf.score(X_test, y_test)
    report    = classification_report(y_test, clf.predict(X_test), output_dict=True)

    print(f"  ✓ CV accuracy : {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
    print(f"  ✓ Test accuracy: {test_acc:.3f}")

    # Save
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model":    clf,
        "features": FEATURES,
        "personas": PERSONAS,
        "version":  "1.0",
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)
    print(f"  ✓ Saved → {MODEL_PATH}")

    return {
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std":  round(float(cv_scores.std()), 4),
        "test_accuracy":    round(float(test_acc), 4),
        "classification_report": report,
    }


# ─── Inference ────────────────────────────────────────────────────────────────

def _load_model() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Persona model not found at {MODEL_PATH}. "
            "Run: python backend/persona_engine.py"
        )
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def _shap_explain(clf, X: np.ndarray, predicted_class: int) -> dict[str, float]:
    """
    Compute SHAP TreeExplainer values for the predicted class.
    Returns {feature_name: shap_value} for the top drivers.
    """
    try:
        import shap
        explainer  = shap.TreeExplainer(clf)
        shap_vals  = explainer.shap_values(X)          # list of arrays, one per class
        class_shap = shap_vals[predicted_class][0]     # shape (n_features,)
        return {
            feat: round(float(val), 4)
            for feat, val in zip(FEATURES, class_shap)
        }
    except Exception:
        # Fall back to feature importances if SHAP fails
        importances = clf.feature_importances_
        return {feat: round(float(v), 4) for feat, v in zip(FEATURES, importances)}


def _top_shap_drivers(shap_map: dict[str, float], n: int = 3) -> list[str]:
    """Return top N feature names by absolute SHAP value."""
    sorted_feats = sorted(shap_map.items(), key=lambda x: abs(x[1]), reverse=True)
    return [f for f, _ in sorted_feats[:n]]


def _persona_card_recs(
    persona_id: int,
    user_profile: dict,
    top_n: int = 3,
) -> list[dict]:
    """
    Return top-N card recommendations appropriate for the persona.
    Uses the audit engine marginal NAV + persona-specific filters.
    """
    from audit_engine import run_audit
    from database import get_all_cards, get_all_rewards_map

    # Run full audit to get ranked cards
    audit_result = run_audit(user_profile)
    recs = audit_result.get("recommendations", [])

    persona = PERSONAS[persona_id]
    preferred = set(persona["card_filters"].get("preferred_categories", []))
    ideal_ids  = set(persona.get("ideal_cards", []))
    req_lounge  = persona["card_filters"].get("require_lounge", False)
    req_free    = persona["card_filters"].get("require_lifetime_free", False)

    # Load card meta for lounge / fee checks
    cards_meta = {c["card_id"]: c for c in get_all_cards()}
    all_rewards = get_all_rewards_map()

    # Score each recommendation by persona fit
    scored = []
    for rec in recs:
        cid  = rec["card_id"]
        meta = cards_meta.get(cid, {})

        # Persona-fit bonus
        bonus = 0
        if cid in ideal_ids:
            bonus += 30
        if req_lounge and (meta.get("lounge_domestic", 0) or meta.get("lounge_intl", 0)):
            bonus += 20
        if req_free and meta.get("is_lifetime_free", 0):
            bonus += 25

        # Bonus for performing well in persona's preferred categories
        shap = rec.get("shap_values", {})
        pref_shap = sum(shap.get(cat, 0) for cat in preferred)
        bonus += pref_shap / 1000.0   # scale down for mixing

        scored.append({**rec, "persona_score": rec["marginal_nav"] + bonus})

    scored.sort(key=lambda x: x["persona_score"], reverse=True)

    # If audit didn't return enough, pull from ideal_ids
    result_ids = {r["card_id"] for r in scored[:top_n]}
    if len(scored) < top_n:
        owned = set(user_profile.get("current_cards", []))
        for cid in ideal_ids:
            if cid not in result_ids and cid not in owned:
                meta = cards_meta.get(cid, {})
                if meta.get("is_invite_only"):
                    continue
                scored.append({
                    "card_id":      cid,
                    "card_name":    meta.get("name", cid),
                    "bank":         meta.get("bank", ""),
                    "annual_fee":   meta.get("annual_fee", 0),
                    "marginal_nav": 0,
                    "shap_values":  {},
                    "reason":       f"Ideal card for {persona['name']}.",
                    "eligible":     True,
                    "persona_score": 10,
                })

    return scored[:top_n]


def predict_persona(
    monthly_spend: dict[str, float],
    income_annual: float = 0.0,
    cards_count: int = 0,
    current_cards: list[str] | None = None,
    cibil_score: int = 700,
) -> dict:
    """
    Predict persona from spend profile.

    Returns:
    {
      "persona_id":    int,
      "persona_name":  str,
      "persona_emoji": str,
      "tagline":       str,
      "description":   str,
      "traits":        [str],
      "confidence":    float,          # 0–1
      "probabilities": {name: prob},
      "shap_drivers":  {feature: value},
      "top_drivers":   [feature_name],
      "recommendations": [...]
    }
    """
    bundle = _load_model()
    clf    = bundle["model"]

    X          = extract_features(monthly_spend, income_annual, cards_count)
    pred       = int(clf.predict(X)[0])
    proba      = clf.predict_proba(X)[0]

    persona    = PERSONAS[pred]
    confidence = float(proba[pred])

    # SHAP explanation
    shap_map  = _shap_explain(clf, X, pred)
    top_drv   = _top_shap_drivers(shap_map)

    # Card recommendations
    user_profile = {
        "monthly_spend":  monthly_spend,
        "current_cards":  current_cards or [],
        "income_annual":  income_annual,
        "cibil_score":    cibil_score,
    }
    recs = _persona_card_recs(pred, user_profile)

    return {
        "persona_id":    pred,
        "persona_name":  persona["name"],
        "persona_emoji": persona["emoji"],
        "tagline":       persona["tagline"],
        "description":   persona["description"],
        "traits":        persona["traits"],
        "confidence":    round(confidence, 4),
        "probabilities": {
            PERSONAS[i]["name"]: round(float(p), 4)
            for i, p in enumerate(proba)
        },
        "shap_drivers":  shap_map,
        "top_drivers":   top_drv,
        "recommendations": recs,
    }


# ─── CLI entry ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    metrics = train_and_save()
    print(f"\n📊 Training complete:")
    print(f"   CV  accuracy: {metrics['cv_accuracy_mean']:.1%} ± {metrics['cv_accuracy_std']:.1%}")
    print(f"   Test accuracy: {metrics['test_accuracy']:.1%}")

    # Quick smoke test
    print("\n🔍 Smoke test — Stealth Nomad profile:")
    result = predict_persona(
        monthly_spend={"travel": 50000, "international": 20000, "dining": 10000,
                       "fuel": 5000, "grocery": 5000, "online": 5000, "utilities": 2000, "other": 3000},
        income_annual=2500000,
        cards_count=3,
    )
    print(f"   Predicted: {result['persona_emoji']} {result['persona_name']} "
          f"({result['confidence']:.1%} confidence)")
    print(f"   Top drivers: {result['top_drivers']}")
    print(f"   Recommendations: {[r['card_name'] for r in result['recommendations']]}")
