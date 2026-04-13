import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import matplotlib
import numpy as np
import optuna
import pandas as pd
import seaborn as sns
from sklearn.cluster import AgglomerativeClustering, KMeans
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import KFold, train_test_split
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from data_pipeline import get_data_pipeline

matplotlib.use("Agg")
import matplotlib.pyplot as plt


RAW_DATASET = Path("credit_card_dataset_engineered.csv")
MODELS_DIR = Path("models")
ARTIFACTS_DIR = Path("artifacts")
VIZ_DIR = ARTIFACTS_DIR / "visualizations"
EVAL_PATH = ARTIFACTS_DIR / "evaluation_report.json"
SUMMARY_PATH = ARTIFACTS_DIR / "evaluation_report.md"


def ensure_dirs() -> None:
    MODELS_DIR.mkdir(exist_ok=True)
    ARTIFACTS_DIR.mkdir(exist_ok=True)
    VIZ_DIR.mkdir(exist_ok=True)


def label_card_segments(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[int, str]]:
    features = ["Annual_Fee_INR", "Min_Income_LPA", "Net_Annual_Value", "Travel_Benefit_Index", "Lifestyle_Benefit_Index"]
    x = df[features].fillna(0)
    scaler = StandardScaler()
    scaled = scaler.fit_transform(x)

    kmeans = KMeans(n_clusters=4, random_state=42, n_init=20)
    clusters = kmeans.fit_predict(scaled)
    df["Card_Segment_Cluster"] = clusters

    hierarchy = AgglomerativeClustering(n_clusters=4)
    df["Card_Segment_Hierarchy"] = hierarchy.fit_predict(scaled)

    medians = (
        df.groupby("Card_Segment_Cluster")[["Annual_Fee_INR", "Min_Income_LPA", "Net_Annual_Value"]]
        .median()
        .sum(axis=1)
        .sort_values()
    )
    labels = ["Entry_Level", "Mid_Tier", "Premium", "Super_Premium"]
    cluster_label_map = {cluster: labels[idx] for idx, cluster in enumerate(medians.index.tolist())}
    df["Card_Segment"] = df["Card_Segment_Cluster"].map(cluster_label_map)

    joblib.dump(kmeans, MODELS_DIR / "card_tier_kmeans.pkl")
    joblib.dump(scaler, MODELS_DIR / "card_tier_scaler.pkl")
    joblib.dump(features, MODELS_DIR / "card_tier_features.pkl")
    joblib.dump(cluster_label_map, MODELS_DIR / "card_segment_labels.pkl")
    return df, cluster_label_map


def generate_user_profiles(n_profiles: int = 250, random_state: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)
    profiles: List[Dict] = []
    preferences = ["rewards", "fees", "travel", "lifestyle", "balanced"]
    lifestyle_buckets = ["dining", "movies", "shopping", "none"]

    for user_id in range(n_profiles):
        income = float(rng.uniform(3.0, 60.0))
        monthly_spend = float(rng.uniform(15000, 250000))
        shares = rng.dirichlet([2.5, 2.0, 2.0, 2.0])
        profiles.append(
            {
                "user_id": user_id,
                "Income": income,
                "Monthly_Spend": monthly_spend,
                "spend_travel": shares[0],
                "spend_dining": shares[1],
                "spend_ecommerce": shares[2],
                "spend_general": shares[3],
                "International_Travel_Frequency": int(rng.integers(0, 7)),
                "Lifestyle_Preference": rng.choice(lifestyle_buckets),
                "Optimization_Preference": rng.choice(preferences),
            }
        )
    return pd.DataFrame(profiles)


def ahp_weights_from_profile(profile: Dict) -> Dict[str, float]:
    weights = {"rewards": 0.3, "fees": 0.15, "travel": 0.25, "lifestyle": 0.15, "eligibility": 0.15}
    preference = profile["Optimization_Preference"]
    
    if preference == "low_fees":
        weights["fees"] += 0.50
    elif preference == "rewards":
        weights["rewards"] += 0.30
    elif preference == "travel":
        weights["travel"] += 0.30

    if profile["International_Travel_Frequency"] >= 4:
        weights["travel"] += 0.10
    if profile.get("Lifestyle_Preference") in {"dining", "movies", "shopping"}:
        weights["lifestyle"] += 0.15

    total = sum(weights.values())
    return {key: value / total for key, value in weights.items()}


def score_card_for_user(card: pd.Series, profile: Dict) -> Dict[str, float]:
    annual_spend = profile["Monthly_Spend"] * 12.0
    category_bonus = 1.0
    if card["Reward_Type"] == "travel":
        category_bonus = 1.0 + (0.8 * profile["spend_travel"])
    elif card["Reward_Type"] in {"dining", "cashback"}:
        category_bonus = 1.0 + (0.6 * profile["spend_dining"])
    elif card["Reward_Type"] == "ecommerce":
        category_bonus = 1.0 + (0.6 * profile["spend_ecommerce"])

    reward_value = annual_spend * card["ERV"] * category_bonus
    milestone_value = card["Milestone_Reward_Value"]
    domestic_cap = profile["International_Travel_Frequency"] * 3 + 4
    lounge_value = (
        min(card["Lounge_Domestic"], domestic_cap) * 1400
        + min(card["Lounge_International"], profile["International_Travel_Frequency"]) * 2300
    )
    lifestyle_multiplier = 1.0
    if profile["Lifestyle_Preference"] == "dining":
        lifestyle_multiplier += float(card.get("is_swiggy_corp_partner", 0) + card.get("is_zomato_corp_partner", 0)) * 0.5
    elif profile["Lifestyle_Preference"] == "shopping":
        lifestyle_multiplier += float(card.get("is_amazon_corp_partner", 0) + card.get("is_flipkart_corp_partner", 0)) * 0.5
    elif profile["Lifestyle_Preference"] == "movies":
        lifestyle_multiplier += float(card.get("is_bookmyshow_corp_partner", 0)) * 0.7

    lifestyle_value = card["Lifestyle_Benefit_Index"] * 1200 * lifestyle_multiplier
    fee_waived = card["Spend_Based_Fee_Waiver_INR"] > 0 and annual_spend >= card["Spend_Based_Fee_Waiver_INR"]
    net_fee = 0.0 if fee_waived else card["Annual_Fee_INR"]
    forex_saving = max(3.5 - card["Forex_Markup"], 0) * profile["International_Travel_Frequency"] * 800

    nav = reward_value + milestone_value + lounge_value + lifestyle_value + forex_saving - net_fee
    return {
        "expected_reward_value": reward_value,
        "expected_nav": nav,
        "travel_value": lounge_value,
        "lifestyle_value": lifestyle_value,
        "net_fee": net_fee,
        "fee_waived": int(fee_waived),
        "eligible": int(profile["Income"] >= card["Min_Income_LPA"]),
    }


def build_training_frame(cards_df: pd.DataFrame, users_df: pd.DataFrame) -> pd.DataFrame:
    records: List[Dict] = []
    for profile in users_df.to_dict(orient="records"):
        weights = ahp_weights_from_profile(profile)
        for _, card in cards_df.iterrows():
            scored = score_card_for_user(card, profile)
            records.append(
                {
                    "user_id": profile["user_id"],
                    "Card_Name": card["Card_Name"],
                    "Income": profile["Income"],
                    "Monthly_Spend": profile["Monthly_Spend"],
                    "spend_travel": profile["spend_travel"],
                    "spend_dining": profile["spend_dining"],
                    "spend_ecommerce": profile["spend_ecommerce"],
                    "spend_general": profile["spend_general"],
                    "International_Travel_Frequency": profile["International_Travel_Frequency"],
                    "Optimization_Preference": profile["Optimization_Preference"],
                    "Lifestyle_Preference": profile["Lifestyle_Preference"],
                    "AHP_rewards": weights["rewards"],
                    "AHP_fees": weights["fees"],
                    "AHP_travel": weights["travel"],
                    "AHP_lifestyle": weights["lifestyle"],
                    "AHP_eligibility": weights["eligibility"],
                    "Annual_Fee_INR": card["Annual_Fee_INR"],
                    "Min_Income_LPA": card["Min_Income_LPA"],
                    "ERV": card["ERV"],
                    "Travel_Benefit_Index": card["Travel_Benefit_Index"],
                    "Lifestyle_Benefit_Index": card["Lifestyle_Benefit_Index"],
                    "Effective_Reward_Rate_Index": card["Effective_Reward_Rate_Index"],
                    "Net_Value_Index": card["Net_Value_Index"],
                    "Fee_to_Value_Ratio": card["Fee_to_Value_Ratio"],
                    "International_Usage": card["International_Usage"],
                    "Merchant_Partner_Count": card["Merchant_Partner_Count"],
                    "Card_Segment": card["Card_Segment"],
                    "Reward_Type": card["Reward_Type"],
                    **scored,
                }
            )
    return pd.DataFrame(records)


def encode_training_frame(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    encoded = pd.get_dummies(
        df,
        columns=["Optimization_Preference", "Lifestyle_Preference", "Card_Segment", "Reward_Type"],
        dummy_na=False,
    )
    feature_cols = [col for col in encoded.columns if col not in {"expected_nav", "Card_Name", "user_id"}]
    return encoded, feature_cols


def tune_and_train_regressor(x_train: pd.DataFrame, y_train: pd.Series) -> Tuple[Pipeline, Dict]:
    def objective(trial: optuna.Trial) -> float:
        model_name = trial.suggest_categorical("model_name", ["rf", "extra"])
        if model_name == "rf":
            estimator = RandomForestRegressor(
                n_estimators=trial.suggest_int("n_estimators", 120, 280),
                max_depth=trial.suggest_int("max_depth", 6, 18),
                min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 5),
                random_state=42,
                n_jobs=-1,
            )
        else:
            estimator = ExtraTreesRegressor(
                n_estimators=trial.suggest_int("n_estimators", 120, 280),
                max_depth=trial.suggest_int("max_depth", 6, 18),
                min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 5),
                random_state=42,
                n_jobs=-1,
            )

        pipeline = Pipeline([("model", estimator)])
        cv = KFold(n_splits=3, shuffle=True, random_state=42)
        scores = []
        for train_idx, valid_idx in cv.split(x_train):
            x_tr = x_train.iloc[train_idx]
            x_val = x_train.iloc[valid_idx]
            y_tr = y_train.iloc[train_idx]
            y_val = y_train.iloc[valid_idx]
            pipeline.fit(x_tr, y_tr)
            preds = pipeline.predict(x_val)
            scores.append(np.sqrt(mean_squared_error(y_val, preds)))
        return float(np.mean(scores))

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=4, show_progress_bar=False)
    best = study.best_params

    if best["model_name"] == "rf":
        estimator = RandomForestRegressor(
            n_estimators=best["n_estimators"],
            max_depth=best["max_depth"],
            min_samples_leaf=best["min_samples_leaf"],
            random_state=42,
            n_jobs=-1,
        )
    else:
        estimator = ExtraTreesRegressor(
            n_estimators=best["n_estimators"],
            max_depth=best["max_depth"],
            min_samples_leaf=best["min_samples_leaf"],
            random_state=42,
            n_jobs=-1,
        )
    pipeline = Pipeline([("model", estimator)])
    pipeline.fit(x_train, y_train)
    return pipeline, study.best_params


def ndcg_at_k(relevances: List[float], k: int = 3) -> float:
    rel = np.array(relevances[:k], dtype=float)
    if rel.size == 0:
        return 0.0
    discounts = 1 / np.log2(np.arange(2, rel.size + 2))
    dcg = np.sum((2 ** rel - 1) * discounts)
    ideal = np.sort(rel)[::-1]
    idcg = np.sum((2 ** ideal - 1) * discounts)
    return float(dcg / idcg) if idcg > 0 else 0.0


def precision_at_k(actual_top: List[str], predicted_top: List[str], k: int = 3) -> float:
    if k == 0:
        return 0.0
    return len(set(actual_top[:k]).intersection(predicted_top[:k])) / k


def evaluate_ranking(test_df: pd.DataFrame, predictions: np.ndarray) -> Dict[str, float]:
    scored = test_df[["user_id", "Card_Name", "expected_nav"]].copy()
    scored["predicted_nav"] = predictions
    ndcg_scores = []
    precision_scores = []

    for _, group in scored.groupby("user_id"):
        actual = group.sort_values("expected_nav", ascending=False)
        predicted = group.sort_values("predicted_nav", ascending=False)
        actual_top = actual["Card_Name"].tolist()
        predicted_top = predicted["Card_Name"].tolist()
        relevance_map = {name: rank for rank, name in enumerate(reversed(actual_top), start=1)}
        predicted_relevances = [relevance_map[name] for name in predicted_top]
        ndcg_scores.append(ndcg_at_k(predicted_relevances, k=3))
        precision_scores.append(precision_at_k(actual_top, predicted_top, k=3))

    return {
        "ndcg_at_3": float(np.mean(ndcg_scores)),
        "precision_at_3": float(np.mean(precision_scores)),
    }


def fit_user_clustering(users_df: pd.DataFrame) -> Tuple[Pipeline, Dict[int, str]]:
    features = ["spend_travel", "spend_dining", "spend_ecommerce", "spend_general", "Monthly_Spend"]
    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("kmeans", KMeans(n_clusters=4, random_state=42, n_init=20)),
        ]
    )
    pipeline.fit(users_df[features])
    clusters = pipeline.predict(users_df[features])
    users_df = users_df.copy()
    users_df["Behavior_Cluster"] = clusters

    names = {}
    cluster_profiles = users_df.groupby("Behavior_Cluster")[features].mean()
    for cluster, row in cluster_profiles.iterrows():
        dominant = row[["spend_travel", "spend_dining", "spend_ecommerce", "spend_general"]].idxmax()
        mapping = {
            "spend_travel": "Travel Optimizers",
            "spend_dining": "Lifestyle Users",
            "spend_ecommerce": "Cashback Maximizers",
            "spend_general": "Minimal Fee Users",
        }
        names[int(cluster)] = mapping[dominant]

    joblib.dump(pipeline, MODELS_DIR / "user_behavior_kmeans.pkl")
    joblib.dump(names, MODELS_DIR / "user_cluster_labels.pkl")
    return pipeline, names


def build_collaborative_filter(train_df: pd.DataFrame) -> None:
    utility = train_df.pivot_table(index="user_id", columns="Card_Name", values="expected_nav", fill_value=0)
    item_similarity = pd.DataFrame(
        cosine_similarity(utility.T),
        index=utility.columns,
        columns=utility.columns,
    )
    knn = NearestNeighbors(metric="cosine", n_neighbors=8)
    knn.fit(utility.T)
    joblib.dump(item_similarity, MODELS_DIR / "card_item_similarity.pkl")
    joblib.dump(knn, MODELS_DIR / "card_cf_knn.pkl")
    joblib.dump(list(utility.columns), MODELS_DIR / "card_cf_columns.pkl")


def create_visualizations(cards_df: pd.DataFrame, users_df: pd.DataFrame) -> None:
    sns.set_theme(style="whitegrid")

    plt.figure(figsize=(9, 6))
    sns.scatterplot(data=cards_df, x="Annual_Fee_INR", y="Net_Annual_Value", hue="Card_Segment", s=80)
    plt.title("Net Annual Value vs Annual Fee")
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "net_value_vs_annual_fee.png")
    plt.close()

    radar_columns = [
        "Effective_Reward_Rate_Index",
        "Net_Value_Index",
        "Travel_Benefit_Index",
        "Lifestyle_Benefit_Index",
    ]
    top_cards = cards_df.nlargest(3, "Net_Annual_Value")[["Card_Name"] + radar_columns]
    angles = np.linspace(0, 2 * np.pi, len(radar_columns), endpoint=False).tolist()
    angles += angles[:1]
    fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))
    for _, row in top_cards.iterrows():
        values = row[radar_columns].tolist()
        values += values[:1]
        ax.plot(angles, values, linewidth=2, label=row["Card_Name"][:28])
        ax.fill(angles, values, alpha=0.1)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(radar_columns)
    ax.set_title("Reward Category Radar")
    ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1))
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "reward_radar.png")
    plt.close()

    plt.figure(figsize=(9, 6))
    sns.scatterplot(
        data=users_df,
        x="spend_travel",
        y="spend_dining",
        hue="Behavior_Cluster",
        size="Monthly_Spend",
        palette="viridis",
    )
    plt.title("User Spend Clustering")
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "user_segment_clustering.png")
    plt.close()

    breakdown = cards_df.nlargest(8, "Net_Annual_Value")[
        ["Card_Name", "Annual_Reward_Value_Estimate", "Milestone_Reward_Value", "Experiential_Benefits"]
    ].set_index("Card_Name")
    breakdown.plot(kind="bar", stacked=True, figsize=(10, 6), colormap="Set2")
    plt.title("Reward Breakdown for Top Cards")
    plt.ylabel("INR")
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "reward_breakdown_stacked.png")
    plt.close()


def save_reports(metrics: Dict) -> None:
    with open(EVAL_PATH, "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)

    lines = [
        "# CrediWise Evaluation Report",
        "",
        f"- Regression RMSE: {metrics['regression']['rmse']:.2f}",
        f"- Regression MAE: {metrics['regression']['mae']:.2f}",
        f"- Regression R2: {metrics['regression']['r2']:.4f}",
        f"- Ranking NDCG@3: {metrics['ranking']['ndcg_at_3']:.4f}",
        f"- Ranking Precision@3: {metrics['ranking']['precision_at_3']:.4f}",
        f"- Best model: {metrics['model_selection']['model_name']}",
        "",
        "Generated artifacts:",
        "- `credit_card_dataset_cleaned.csv`",
        "- `credit_card_dataset_master.csv`",
        "- `models/nav_model.pkl`",
        "- `artifacts/visualizations/*.png`",
    ]
    SUMMARY_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    ensure_dirs()
    raw_df = pd.read_csv(RAW_DATASET)

    pipeline = get_data_pipeline()
    cleaned_df = pipeline.fit_transform(raw_df)
    cleaned_df.to_csv("credit_card_dataset_cleaned.csv", index=False)
    joblib.dump(pipeline, MODELS_DIR / "data_pipeline.pkl")

    cards_df, segment_labels = label_card_segments(cleaned_df)
    cards_df.to_csv("credit_card_dataset_master.csv", index=False)

    users_df = generate_user_profiles()
    user_cluster_model, cluster_names = fit_user_clustering(users_df)
    users_df["Behavior_Cluster"] = user_cluster_model.predict(
        users_df[["spend_travel", "spend_dining", "spend_ecommerce", "spend_general", "Monthly_Spend"]]
    )
    users_df.to_csv(ARTIFACTS_DIR / "synthetic_user_profiles.csv", index=False)

    training_df = build_training_frame(cards_df, users_df)
    training_df.to_csv(ARTIFACTS_DIR / "user_card_training_frame.csv", index=False)

    encoded_df, feature_cols = encode_training_frame(training_df)
    x = encoded_df[feature_cols]
    y = encoded_df["expected_nav"]
    x_train, x_test, y_train, y_test, train_meta, test_meta = train_test_split(
        x, y, training_df[["user_id", "Card_Name", "expected_nav"]], test_size=0.2, random_state=42
    )

    model, best_params = tune_and_train_regressor(x_train, y_train)
    preds = model.predict(x_test)
    regression_metrics = {
        "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
        "mae": float(mean_absolute_error(y_test, preds)),
        "r2": float(r2_score(y_test, preds)),
    }
    ranking_metrics = evaluate_ranking(test_meta.reset_index(drop=True), preds)

    build_collaborative_filter(training_df)
    create_visualizations(cards_df, users_df)

    metrics = {
        "regression": regression_metrics,
        "ranking": ranking_metrics,
        "model_selection": best_params,
        "card_segments": segment_labels,
        "user_clusters": cluster_names,
    }
    save_reports(metrics)

    joblib.dump(model, MODELS_DIR / "nav_model.pkl")
    joblib.dump(feature_cols, MODELS_DIR / "nav_features.pkl")
    joblib.dump(list(pd.get_dummies(training_df[["Optimization_Preference", "Lifestyle_Preference", "Card_Segment", "Reward_Type"]]).columns), MODELS_DIR / "categorical_feature_columns.pkl")


if __name__ == "__main__":
    main()
