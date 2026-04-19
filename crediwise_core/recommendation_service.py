from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
import shap


@dataclass
class RecommendationArtifacts:
    cards: pd.DataFrame
    model: object
    feature_cols: List[str]
    item_similarity: pd.DataFrame
    cf_columns: List[str]
    user_cluster_model: object
    user_cluster_labels: Dict[int, str]

ARCHETYPE_MAP = {
    "Travel Optimizers": {
        "name": "THE STEALTH NOMAD",
        "color": "#38bdf8",
        "icon": "✈️",
        "desc": "You prioritize global mobility and lounge luxury over raw cashback."
    },
    "Lifestyle Users": {
        "name": "THE HIGH-STREET ARCHITECT",
        "color": "#fb7185",
        "icon": "🛍️",
        "desc": "Your spending is a curated mix of dining and premium retail experiences."
    },
    "Cashback Maximizers": {
        "name": "THE REWARD ARBITRAGEUR",
        "color": "#34d399",
        "icon": "📈",
        "desc": "You treat points like a secondary currency, looking for the highest yield per rupee."
    },
    "Minimal Fee Users": {
        "name": "THE FRUGAL ZEN MASTER",
        "color": "#94a3b8",
        "icon": "🧘",
        "desc": "Efficiency is your mantra. You avoid annual fees like the plague."
    }
}


def load_artifacts(models_dir: str = "models", dataset_path: str = "credit_card_dataset_master.csv") -> RecommendationArtifacts:
    return RecommendationArtifacts(
        cards=pd.read_csv(dataset_path),
        model=joblib.load(f"{models_dir}/nav_model.pkl"),
        feature_cols=joblib.load(f"{models_dir}/nav_features.pkl"),
        item_similarity=joblib.load(f"{models_dir}/card_item_similarity.pkl"),
        cf_columns=joblib.load(f"{models_dir}/card_cf_columns.pkl"),
        user_cluster_model=joblib.load(f"{models_dir}/user_behavior_kmeans.pkl"),
        user_cluster_labels=joblib.load(f"{models_dir}/user_cluster_labels.pkl"),
    )


def _ahp_weights(user_profile: Dict) -> Dict[str, float]:
    weights = {"rewards": 0.30, "fees": 0.15, "travel": 0.25, "lifestyle": 0.15, "eligibility": 0.15}
    prefs = {item.lower() for item in user_profile.get("Lifestyle_Preferences", [])}
    travel_freq = user_profile.get("International_Travel_Frequency", 0)
    opt_pref = user_profile.get("Optimization_Preference", "balanced").lower()

    if "travel" in prefs:
        weights["travel"] += 0.15
    if {"dining", "shopping", "movies"} & prefs:
        weights["lifestyle"] += 0.15
        
    if opt_pref == "low_fees":
        weights["fees"] += 0.50
    elif opt_pref == "rewards":
        weights["rewards"] += 0.30
    elif opt_pref == "travel":
        weights["travel"] += 0.30

    if travel_freq >= 4:
        weights["travel"] += 0.10

    total = sum(weights.values())
    return {key: value / total for key, value in weights.items()}


def _score_card(card: pd.Series, user_profile: Dict) -> Dict[str, float]:
    spend = user_profile["Monthly_Spend"] * 12.0
    dist = user_profile["Spend_Distribution_by_Category"]
    travel_freq = user_profile["International_Travel_Frequency"]

    category_bonus = 1.0
    reward_type = str(card["Reward_Type"]).lower()
    if reward_type == "travel":
        category_bonus += 0.9 * dist.get("travel", 0.0)
    elif reward_type == "dining":
        category_bonus += 0.7 * dist.get("dining", 0.0)
    elif reward_type == "ecommerce":
        category_bonus += 0.7 * dist.get("ecommerce", 0.0)
    elif reward_type == "cashback":
        category_bonus += 0.4

    reward_value = spend * card["ERV"] * category_bonus
    domestic_cap = travel_freq * 3 + 4
    lounge_value = min(card["Lounge_Domestic"], domestic_cap) * 1400 + min(card["Lounge_International"], travel_freq) * 2300
    lifestyle_value = card["Lifestyle_Benefit_Index"] * 1200
    fee_waived = card["Spend_Based_Fee_Waiver_INR"] > 0 and spend >= card["Spend_Based_Fee_Waiver_INR"]
    net_fee = 0.0 if fee_waived else card["Annual_Fee_INR"]
    forex_saving = max(3.5 - card["Forex_Markup"], 0) * travel_freq * 800

    nav = reward_value + card["Milestone_Reward_Value"] + lounge_value + lifestyle_value + forex_saving - net_fee
    return {
        "expected_reward_value": reward_value,
        "expected_nav": nav,
        "travel_value": lounge_value + forex_saving,
        "lifestyle_value": lifestyle_value,
        "net_fee": net_fee,
        "eligible": int(user_profile["Income"] >= card["Min_Income_LPA"]),
        "fee_waived": int(fee_waived),
    }


def _build_model_frame(cards: pd.DataFrame, user_profile: Dict) -> pd.DataFrame:
    rows = []
    weights = _ahp_weights(user_profile)
    for _, card in cards.iterrows():
        score = _score_card(card, user_profile)
        rows.append(
            {
                "Income": user_profile["Income"],
                "Monthly_Spend": user_profile["Monthly_Spend"],
                "spend_travel": user_profile["Spend_Distribution_by_Category"].get("travel", 0.0),
                "spend_dining": user_profile["Spend_Distribution_by_Category"].get("dining", 0.0),
                "spend_ecommerce": user_profile["Spend_Distribution_by_Category"].get("ecommerce", 0.0),
                "spend_general": user_profile["Spend_Distribution_by_Category"].get("general", 0.0),
                "International_Travel_Frequency": user_profile["International_Travel_Frequency"],
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
                "Optimization_Preference": user_profile.get("Optimization_Preference", "balanced"),
                "Lifestyle_Preference": user_profile.get("Primary_Lifestyle_Preference", "none"),
                "Card_Segment": card["Card_Segment"],
                "Reward_Type": card["Reward_Type"],
                "Card_Name": card["Card_Name"],
                **score,
            }
        )
    model_df = pd.DataFrame(rows)
    model_df = pd.get_dummies(
        model_df,
        columns=["Optimization_Preference", "Lifestyle_Preference", "Card_Segment", "Reward_Type"],
        dummy_na=False,
    )
    return model_df


def _align_model_features(df: pd.DataFrame, feature_cols: List[str]) -> pd.DataFrame:
    aligned = df.copy()
    for col in feature_cols:
        if col not in aligned.columns:
            aligned[col] = 0
    return aligned[feature_cols]


def _topsis(scored_df: pd.DataFrame, weights: Dict[str, float]) -> np.ndarray:
    matrix = scored_df[
        ["expected_reward_value", "Annual_Fee_INR", "travel_value", "lifestyle_value", "eligible"]
    ].astype(float)
    norm = np.sqrt((matrix ** 2).sum(axis=0))
    norm[norm == 0] = 1.0
    matrix = matrix / norm
    matrix["expected_reward_value"] *= weights["rewards"]
    matrix["Annual_Fee_INR"] *= weights["fees"]
    matrix["travel_value"] *= weights["travel"]
    matrix["lifestyle_value"] *= weights["lifestyle"]
    matrix["eligible"] *= weights["eligibility"]

    pis = pd.Series(
        {
            "expected_reward_value": matrix["expected_reward_value"].max(),
            "Annual_Fee_INR": matrix["Annual_Fee_INR"].min(),
            "travel_value": matrix["travel_value"].max(),
            "lifestyle_value": matrix["lifestyle_value"].max(),
            "eligible": matrix["eligible"].max(),
        }
    )
    nis = pd.Series(
        {
            "expected_reward_value": matrix["expected_reward_value"].min(),
            "Annual_Fee_INR": matrix["Annual_Fee_INR"].max(),
            "travel_value": matrix["travel_value"].min(),
            "lifestyle_value": matrix["lifestyle_value"].min(),
            "eligible": matrix["eligible"].min(),
        }
    )
    s_plus = np.sqrt(((matrix - pis) ** 2).sum(axis=1))
    s_minus = np.sqrt(((matrix - nis) ** 2).sum(axis=1))
    return (s_minus / (s_plus + s_minus + 1e-9)).to_numpy()


def _cluster_label(artifacts: RecommendationArtifacts, user_profile: Dict) -> str:
    frame = pd.DataFrame(
        [
            {
                "spend_travel": user_profile["Spend_Distribution_by_Category"].get("travel", 0.0),
                "spend_dining": user_profile["Spend_Distribution_by_Category"].get("dining", 0.0),
                "spend_ecommerce": user_profile["Spend_Distribution_by_Category"].get("ecommerce", 0.0),
                "spend_general": user_profile["Spend_Distribution_by_Category"].get("general", 0.0),
                "Monthly_Spend": user_profile["Monthly_Spend"],
            }
        ]
    )
    cluster_id = int(artifacts.user_cluster_model.predict(frame)[0])
    return artifacts.user_cluster_labels.get(cluster_id, f"Cluster {cluster_id}")


def optimize_portfolio(candidates: pd.DataFrame, user_profile: Dict, best_single_nav: float, best_single_card: str) -> Dict:
    annual_spend = user_profile.get("Monthly_Spend", 0) * 12.0
    dist = user_profile.get("Spend_Distribution_by_Category", {})
    
    strategy = {}
    unique_selected_cards = {}
    total_rewards = 0.0
    
    for category, percent in dist.items():
        cat_spend = annual_spend * percent
        if cat_spend <= 0 or category == "general":
            continue
            
        best_cat_reward = -1.0
        best_cat_card = None
        best_cat_card_row = None
        
        for _, card in candidates.iterrows():
            reward_type = str(card.get("Reward_Type", "general")).lower()
            bonus = 1.0
            
            if category == "travel" and reward_type == "travel":
                bonus = 1.9
            elif category == "dining" and reward_type == "dining":
                bonus = 1.7
            elif category == "ecommerce" and reward_type == "ecommerce":
                bonus = 1.7
            elif reward_type == "cashback":
                bonus = 1.4
                
            expected_cat_reward = cat_spend * float(card.get("ERV", 0.0)) * bonus
            if expected_cat_reward > best_cat_reward:
                best_cat_reward = expected_cat_reward
                best_cat_card = card["Card_Name"]
                best_cat_card_row = card
                
        if best_cat_card:
            strategy[category] = str(best_cat_card)
            total_rewards += best_cat_reward
            unique_selected_cards[best_cat_card] = best_cat_card_row

    general_spend = annual_spend * dist.get("general", 0.0)
    if general_spend > 0 and best_single_card:
        strategy["general"] = best_single_card
        c_rows = candidates[candidates["Card_Name"] == best_single_card]
        if not c_rows.empty:
            c_row = c_rows.iloc[0]
            total_rewards += general_spend * float(c_row.get("ERV", 0.0))
            unique_selected_cards[best_single_card] = c_row

    card_spend_allocation = {}
    for cat, c_name in strategy.items():
        if c_name not in card_spend_allocation:
            card_spend_allocation[c_name] = 0.0
        card_spend_allocation[c_name] += annual_spend * dist.get(cat, 0.0)

    total_fees = 0.0
    total_benefits = 0.0
    for c_name, c_row in unique_selected_cards.items():
        allocated_spend = card_spend_allocation[c_name]
        fee_waived = float(c_row.get("Spend_Based_Fee_Waiver_INR", 0.0)) > 0 and allocated_spend >= float(c_row.get("Spend_Based_Fee_Waiver_INR", 0.0))
        if not fee_waived:
            total_fees += float(c_row.get("Annual_Fee_INR", 0.0))
            
        milestone = float(c_row.get("Milestone_Reward_Value", 0.0)) if float(c_row.get("Reward_Spend_Required", 0.0)) > 0 and allocated_spend >= float(c_row.get("Reward_Spend_Required", 0.0)) else 0.0
        lifestyle = float(c_row.get("Lifestyle_Benefit_Index", 0.0)) * 1200
        l_cap = user_profile.get("International_Travel_Frequency", 0)
        lounge_val = min(float(c_row.get("Lounge_Domestic", 0.0)), l_cap * 3 + 4) * 1400 + min(float(c_row.get("Lounge_International", 0.0)), l_cap) * 2300
        forex_saving = max(3.5 - float(c_row.get("Forex_Markup", 3.5)), 0) * l_cap * 800
        total_benefits += milestone + lifestyle + lounge_val + forex_saving
        
    portfolio_nav = total_rewards + total_benefits - total_fees
    
    single_nav_fair = 0.0
    if best_single_card:
        c_rows = candidates[candidates["Card_Name"] == best_single_card]
        if not c_rows.empty:
            c_row = c_rows.iloc[0]
            for cat, pct in dist.items():
                cat_spend = annual_spend * pct
                if cat_spend > 0:
                    r_type = str(c_row.get("Reward_Type", "general")).lower()
                    bns = 1.0
                    if cat == "travel" and r_type == "travel": bns = 1.9
                    elif cat == "dining" and r_type == "dining": bns = 1.7
                    elif cat == "ecommerce" and r_type == "ecommerce": bns = 1.7
                    elif r_type == "cashback": bns = 1.4
                    single_nav_fair += cat_spend * float(c_row.get("ERV", 0.0)) * bns
            fw = float(c_row.get("Spend_Based_Fee_Waiver_INR", 0.0)) > 0 and annual_spend >= float(c_row.get("Spend_Based_Fee_Waiver_INR", 0.0))
            single_nav_fair -= 0.0 if fw else float(c_row.get("Annual_Fee_INR", 0.0))
            ms = float(c_row.get("Milestone_Reward_Value", 0.0)) if float(c_row.get("Reward_Spend_Required", 0.0)) > 0 and annual_spend >= float(c_row.get("Reward_Spend_Required", 0.0)) else 0.0
            ls = float(c_row.get("Lifestyle_Benefit_Index", 0.0)) * 1200
            l_cap = user_profile.get("International_Travel_Frequency", 0)
            lv = min(float(c_row.get("Lounge_Domestic", 0.0)), l_cap * 3 + 4) * 1400 + min(float(c_row.get("Lounge_International", 0.0)), l_cap) * 2300
            fs = max(3.5 - float(c_row.get("Forex_Markup", 3.5)), 0) * l_cap * 800
            single_nav_fair += ms + ls + lv + fs
            
    if portfolio_nav < single_nav_fair or len(unique_selected_cards) <= 1:
        strategy = {cat: best_single_card for cat, pct in dist.items() if pct > 0 and cat != "general"}
        portfolio_nav = single_nav_fair
        
    return {
        "strategy": strategy,
        "total_projected_value": round(portfolio_nav, 2)
    }

def recommend_cards(artifacts: RecommendationArtifacts, user_profile: Dict, top_k: int = 3, owned_cards: List[str] = None) -> Dict:
    cards = artifacts.cards.copy()
    weights = _ahp_weights(user_profile)
    profile_label = _cluster_label(artifacts, user_profile)
    archetype = ARCHETYPE_MAP.get(profile_label, {
        "name": "THE UNDEFINED DATASET",
        "color": "#fff",
        "icon": "❔",
        "desc": "Your spending pattern is unique and defies standard classification."
    })

    candidates = cards[cards["Min_Income_LPA"] <= user_profile["Income"]].copy()
    if candidates.empty:
        candidates = cards.nsmallest(10, "Min_Income_LPA").copy()

    model_frame = _build_model_frame(candidates, user_profile)
    model_x = _align_model_features(model_frame, artifacts.feature_cols)
    model_frame["ml_predicted_nav"] = artifacts.model.predict(model_x)
    model_frame["topsis_score"] = _topsis(model_frame, weights)

    normalized_nav = (model_frame["ml_predicted_nav"] - model_frame["ml_predicted_nav"].min()) / (
        model_frame["ml_predicted_nav"].max() - model_frame["ml_predicted_nav"].min() + 1e-9
    )
    collaborative_scores = []
    for card_name in model_frame["Card_Name"]:
        if card_name not in artifacts.item_similarity.index:
            collaborative_scores.append(0.0)
            continue
        peers = artifacts.item_similarity.loc[card_name].drop(card_name, errors="ignore").nlargest(5)
        collaborative_scores.append(float(peers.mean()))
    model_frame["collaborative_score"] = collaborative_scores

    model_frame["final_score"] = (
        0.45 * model_frame["topsis_score"]
        + 0.45 * normalized_nav
        + 0.10 * model_frame["collaborative_score"]
    )
    model_frame["confidence_score"] = np.clip(
        0.55 * model_frame["topsis_score"] + 0.25 * normalized_nav + 0.20 * model_frame["eligible"],
        0,
        1,
    )

    ranked = model_frame.sort_values("final_score", ascending=False).copy()
    
    # SHADOW AUDIT LOGIC
    shadow_audit = None
    if owned_cards:
        owned_lower = [c.lower() for c in owned_cards]
        # Find best owned card value
        # We need to score ALL cards first to find the value of the owned one
        owned_matches = model_frame[model_frame["Card_Name"].str.lower().apply(lambda x: any(o in x for o in owned_lower))]
        if not owned_matches.empty:
            best_owned_nav = owned_matches["ml_predicted_nav"].max()
            best_recommended_nav = model_frame["ml_predicted_nav"].max()
            leakage = best_recommended_nav - best_owned_nav
            
            status = "PASS"
            if leakage > 15000: status = "CRITICAL"
            elif leakage > 5000: status = "WARNING"
            
            shadow_audit = {
                "current_best_nav": round(float(best_owned_nav), 2),
                "potential_nav": round(float(best_recommended_nav), 2),
                "reward_leakage": round(float(max(leakage, 0)), 2),
                "status": status
            }

    top_indices = []
    seen_families = set()
    for idx, row in ranked.iterrows():
        family = str(row["Card_Name"])
        family = family.split(" Variation ")[0].strip().lower()
        if family not in seen_families:
            seen_families.add(family)
            top_indices.append(idx)
        if len(top_indices) >= top_k:
            break
    top = ranked.loc[top_indices].copy()
    top_x = model_x.loc[top.index]
    explainer = shap.TreeExplainer(artifacts.model.named_steps["model"])
    shap_values = explainer.shap_values(top_x)
    results = []
    for _, row in top.iterrows():
        idx = top.index.get_loc(row.name)
        contrib = np.array(shap_values[idx])
        top_features = np.argsort(np.abs(contrib))[-3:][::-1]
        
        card_data = candidates[candidates["Card_Name"] == row["Card_Name"]].iloc[0].fillna(0)
        c_type = str(card_data.get("Reward_Type", "general")).lower()
        
        primary_spend = "general"
        max_spend = 0
        for cat, val in user_profile.get("Spend_Distribution_by_Category", {}).items():
            if val > max_spend:
                max_spend = val
                primary_spend = cat

        reasons_for_selection = []
        if c_type == primary_spend and primary_spend != "general":
            reasons_for_selection.append(f"Strong alignment with your primary {primary_spend} spending")
            
        annual_spend = user_profile.get("Monthly_Spend", 0) * 12
        if float(card_data.get("Spend_Based_Fee_Waiver_INR", 0)) > 0 and annual_spend >= float(card_data.get("Spend_Based_Fee_Waiver_INR", 0)):
            reasons_for_selection.append("Annual spending easily unlocks the fee waiver")
            
        if float(card_data.get("Annual_Fee_INR", 0)) == 0:
            reasons_for_selection.append("Zero annual fee makes it highly efficient")
            
        if len(reasons_for_selection) < 3:
            for feature_idx in top_features:
                feature_name = artifacts.feature_cols[feature_idx]
                contribution = float(contrib[feature_idx])
                if abs(contribution) < 1:
                    continue
                name_clean = feature_name.replace("_", " ").title()
                reasons_for_selection.append(f"Strong comparative value from {name_clean} (+₹{contribution:.0f})")
                
                if len(reasons_for_selection) >= 3:
                    break
                    
        reasons_for_selection = reasons_for_selection[:3]
        if not reasons_for_selection:
            reasons_for_selection.append("Calculated as optimal mathematically based on profile")

        results.append(
            {
                "card": str(row["Card_Name"]),
                "bank_name": card_data["Bank_Name"],
                "card_segment": card_data["Card_Segment"],
                "expected_annual_reward_value": round(float(row["expected_reward_value"]), 2),
                "expected_net_annual_value": round(float(row["ml_predicted_nav"]), 2),
                "annual_fee_inr": round(float(card_data["Annual_Fee_INR"]), 2),
                "confidence_score": round(float(row["confidence_score"]), 4),
                "topsis_closeness_score": round(float(row["topsis_score"]), 4),
                "reason_selected": reasons_for_selection,
            }
        )


    best_single_card = results[0]["card"] if results else ""
    best_single_nav = results[0]["expected_net_annual_value"] if results else 0.0
    portfolio = optimize_portfolio(candidates, user_profile, best_single_nav, best_single_card)

    return {
        "user_segment": profile_label,
        "archetype": archetype,
        "shadow_audit": shadow_audit,
        "ahp_weights": weights,
        "results": results,
        "portfolio_optimization": portfolio
    }
