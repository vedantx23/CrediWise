import re
from dataclasses import dataclass, field
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.impute import KNNImputer
from sklearn.preprocessing import MultiLabelBinarizer, StandardScaler


MERCHANT_ALIASES: Dict[str, List[str]] = {
    "SWIGGY_CORP": ["swiggy", "swiggy one", "swiggy instamart", "swiggy dineout"],
    "ZOMATO_CORP": ["zomato", "blinkit", "eazydiner"],
    "AMAZON_CORP": ["amazon", "amazon pay", "amzn"],
    "FLIPKART_CORP": ["flipkart", "myntra"],
    "BOOKMYSHOW_CORP": ["bookmyshow", "bms"],
    "MAKEMYTRIP_CORP": ["makemytrip", "mmt"],
    "CLEARTRIP_CORP": ["cleartrip"],
    "RELIANCE_CORP": ["reliance", "jio", "ajio", "smart bazaar"],
    "TATA_CORP": ["tata neu", "tata", "bigbasket", "croma"],
}

CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "travel": ["travel", "flight", "airline", "hotel", "smartbuy", "makemytrip", "cleartrip"],
    "dining": ["dining", "restaurant", "swiggy", "zomato", "eazydiner"],
    "ecommerce": ["online", "shopping", "amazon", "flipkart", "myntra", "ajio"],
    "general": [],
}

GENERIC_NAME_MARKERS = ["product details", "joining fee", "things to know before applying"]
BANK_KEYWORDS = ["hdfc", "axis", "sbi", "icici", "indusind", "american express", "amex", "rbl", "hsbc", "au", "kotak"]


def _clean_text(value) -> str:
    if pd.isna(value):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _to_float(value, default=np.nan) -> float:
    try:
        if pd.isna(value):
            return default
        return float(str(value).replace(",", "").strip())
    except Exception:
        return default


def _parse_indian_amount(text: str) -> float:
    text = _clean_text(text).lower().replace(",", "")
    if not text:
        return np.nan

    match = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|k)?", text)
    if not match:
        return np.nan

    value = float(match.group(1))
    unit = match.group(2) or ""
    if unit in {"crore", "cr"}:
        value *= 10000000
    elif unit in {"lakh", "lac"}:
        value *= 100000
    elif unit == "k":
        value *= 1000
    return value


def _extract_currency_after(label: str, text: str) -> float:
    pattern = rf"{label}\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return float(match.group(1).replace(",", "")) if match else np.nan


def _extract_income_lpa(text: str) -> float:
    text = _clean_text(text).lower()
    if not text:
        return np.nan
    match = re.search(r"(\d+(?:\.\d+)?)\s*lpa", text)
    if match:
        return float(match.group(1))
    amount = _parse_indian_amount(text)
    if pd.notna(amount):
        return amount / 100000
    return np.nan


def _extract_reward_components(text: str) -> Dict[str, float]:
    text = _clean_text(text).lower()
    result = {
        "reward_points": np.nan,
        "spend_required": np.nan,
        "reward_rate_per_rupee": np.nan,
        "cashback_percent": np.nan,
    }

    match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:reward\s*points?|points?|rp)\s*(?:for|per)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)",
        text,
    )
    if match:
        pts = float(match.group(1))
        spend = float(match.group(2))
        if spend > 0:
            result["reward_points"] = pts
            result["spend_required"] = spend
            result["reward_rate_per_rupee"] = pts / spend
            return result

    pct_matches = [float(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s*%", text)]
    if pct_matches:
        pct = max(pct_matches)
        result["cashback_percent"] = pct
        result["reward_points"] = pct
        result["spend_required"] = 100.0
        result["reward_rate_per_rupee"] = pct / 100.0
    return result


def _extract_fee_waiver_threshold(text: str) -> float:
    text = _clean_text(text).lower()
    if not text:
        return 0.0
    if not any(keyword in text for keyword in ["waived", "waiver", "reversed", "renewal fee reversed", "annual fee waived"]):
        return 0.0
    patterns = [
        r"(?:annual|renewal) fee (?:waived|waiver|reversed).*?(?:spend|spending|spends).*?(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|k)?",
        r"(?:waived|waiver|reversed) on (?:annual )?spend(?:ing)?(?:s)?(?: of| at least| above| over| exceeding)?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|k)?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            value = float(match.group(1))
            unit = match.group(2) or ""
            if unit in {"lakh", "lac"}:
                value *= 100000
            elif unit in {"crore", "cr"}:
                value *= 10000000
            elif unit == "k":
                value *= 1000
            return value
    return 0.0


def _extract_milestone_value(text: str) -> float:
    text = _clean_text(text).lower()
    if not text:
        return 0.0
    milestone_context = re.findall(
        r"(\d[\d,]*(?:\.\d+)?)\s*(points?|cashpoints?|miles?|voucher|vouchers?)?.{0,40}(?:spend|annual spends|quarter)",
        text,
    )
    values: List[float] = []
    for raw_value, unit in milestone_context:
        amount = float(raw_value.replace(",", ""))
        unit = unit or ""
        if "point" in unit or "mile" in unit:
            values.append(amount * 0.25)
        else:
            values.append(amount)
    return max(values) if values else 0.0


def _extract_lounge_counts(text: str) -> Dict[str, float]:
    text = _clean_text(text).lower()
    domestic = 0.0
    international = 0.0
    if not text:
        return {"domestic": domestic, "international": international}

    if "unlimited lounge" in text:
        domestic = max(domestic, 12.0)
        if "international" in text or "priority pass" in text:
            international = max(international, 6.0)

    int_matches = [float(v) for v in re.findall(r"(\d+)\s*(?:complimentary )?(?:international )?lounge", text)]
    if int_matches:
        domestic = max(domestic, max(int_matches))

    if "priority pass" in text or "international lounge" in text:
        international = max(international, 4.0)

    if "domestic lounge" in text:
        domestic = max(domestic, 4.0)

    return {"domestic": domestic, "international": international}


def _detect_reward_category(text: str) -> str:
    text = _clean_text(text).lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    if "cashback" in text:
        return "cashback"
    return "general"


def _strip_variation_suffix(name: str) -> str:
    return re.sub(r"\s+variation\s+\d+$", "", _clean_text(name), flags=re.IGNORECASE).strip()


def _looks_generic_name(name: str) -> bool:
    lowered = _strip_variation_suffix(name).lower()
    return any(marker in lowered for marker in GENERIC_NAME_MARKERS)


def _infer_card_family(text: str, category: str) -> str:
    text = _clean_text(text).lower()
    known_patterns = {
        "axis atlas": "Axis Atlas Credit Card",
        "regalia gold": "HDFC Regalia Gold Credit Card",
        "millennia": "HDFC Millennia Credit Card",
        "diners club black": "HDFC Diners Club Black Credit Card",
        "cashback sbi": "Cashback SBI Card",
        "tata neu": "Tata Neu Rewards Card",
        "eazydiner": "EazyDiner Dining Credit Card",
        "indianoil": "IndianOil Fuel Credit Card",
        "swiggy one": "Travel Lifestyle Membership Card",
        "fashion week": "Luxury Lifestyle Travel Card",
        "wimbledon": "Luxury Lifestyle Travel Card",
        "online spends with no merchant restriction": "Online Cashback Credit Card",
        "6% cashback on travel and dining": "Travel Dining Cashback Card",
        "up to 7% value back on tata neu": "Tata Neu Rewards Card",
    }
    for pattern, family in known_patterns.items():
        if pattern in text:
            return family
    if category == "travel":
        return "Travel Rewards Credit Card"
    if category == "dining":
        return "Dining Rewards Credit Card"
    if category == "ecommerce":
        return "Online Shopping Credit Card"
    if category == "cashback":
        return "Cashback Credit Card"
    return "General Rewards Credit Card"


def _normalize_bank_name(bank_name: str, card_name: str, text: str) -> str:
    bank_name = _clean_text(bank_name)
    if bank_name and bank_name.lower() not in {
        "product",
        "joining",
        "things",
        "unknown",
        "cashback",
        "american",
        "eazydiner",
        "indianoil",
    }:
        return bank_name
    text = f"{card_name} {text}".lower()
    mapping = {
        "american express": "American Express",
        "amex": "American Express",
        "hdfc": "HDFC",
        "axis": "Axis",
        "sbi": "SBI",
        "icici": "ICICI",
        "indusind": "IndusInd",
        "rbl": "RBL",
        "hsbc": "HSBC",
        "au": "AU",
        "kotak": "Kotak",
        "tata": "Tata",
    }
    for key, canonical in mapping.items():
        if key in text:
            return canonical
    return "Unknown"


@dataclass
class CrediWiseDataPipeline:
    merchant_aliases: Dict[str, List[str]] = field(default_factory=lambda: MERCHANT_ALIASES)
    mlb: MultiLabelBinarizer = field(default_factory=MultiLabelBinarizer)
    scaler: StandardScaler = field(default_factory=StandardScaler)
    imputer: KNNImputer = field(default_factory=lambda: KNNImputer(n_neighbors=5))
    merchant_columns_: List[str] = field(default_factory=list)
    scale_columns_: List[str] = field(default_factory=list)

    def fit(self, raw_df: pd.DataFrame, y=None):
        cleaned = self._clean(raw_df, fit_stage=True)
        impute_cols = [
            "Min_Income_LPA",
            "Annual_Fee_INR",
            "Reward_Rate_Per_Rupee",
            "Reward_Value_Per_Point_INR",
            "Lounge_Domestic",
            "Lounge_International",
            "Forex_Markup",
        ]
        self.imputer.fit(cleaned[impute_cols])
        self.scale_columns_ = [
            "Annual_Fee_INR",
            "Joining_Fee_INR",
            "Min_Income_LPA",
            "Reward_Rate_Per_Rupee",
            "Reward_Value_Per_Point_INR",
            "ERV",
            "Annual_Reward_Value_Estimate",
            "Net_Annual_Value",
            "Travel_Benefit_Index",
            "Lifestyle_Benefit_Index",
            "Effective_Reward_Rate_Index",
            "Net_Value_Index",
            "Fee_to_Value_Ratio",
            "Forex_Markup",
        ]
        self.scaler.fit(cleaned[self.scale_columns_].fillna(0))
        return self

    def transform(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        cleaned = self._clean(raw_df, fit_stage=False)
        impute_cols = [
            "Min_Income_LPA",
            "Annual_Fee_INR",
            "Reward_Rate_Per_Rupee",
            "Reward_Value_Per_Point_INR",
            "Lounge_Domestic",
            "Lounge_International",
            "Forex_Markup",
        ]
        imputed = self.imputer.transform(cleaned[impute_cols])
        cleaned.loc[:, impute_cols] = imputed
        cleaned["Min_Income_LPA"] = cleaned["Min_Income_LPA"].clip(lower=1.5)
        cleaned["Annual_Fee_INR"] = cleaned["Annual_Fee_INR"].clip(lower=0)
        cleaned["Joining_Fee_INR"] = cleaned["Joining_Fee_INR"].clip(lower=0)
        cleaned["Reward_Rate_Per_Rupee"] = cleaned["Reward_Rate_Per_Rupee"].clip(lower=0)
        cleaned["Reward_Value_Per_Point_INR"] = cleaned["Reward_Value_Per_Point_INR"].clip(lower=0.1)
        cleaned = self._engineer_features(cleaned)

        scaled = self.scaler.transform(cleaned[self.scale_columns_].fillna(0))
        for idx, col in enumerate(self.scale_columns_):
            cleaned[f"{col}_scaled"] = scaled[:, idx]
        return cleaned

    def fit_transform(self, raw_df: pd.DataFrame, y=None) -> pd.DataFrame:
        return self.fit(raw_df).transform(raw_df)

    def _clean(self, raw_df: pd.DataFrame, fit_stage: bool) -> pd.DataFrame:
        df = raw_df.copy()
        if "Bank" not in df.columns:
            df["Bank"] = df.get("Bank_Name", "Unknown")

        df["Reward_Description_Clean"] = df.get("Reward_Description", "").map(_clean_text)
        df["Card_Name"] = df.get("Card_Name", "Unknown").fillna("Unknown")
        df["Bank_Name"] = df.get("Bank_Name", df["Bank"]).fillna("Unknown")
        df["Third_Party_Tieups"] = df.get("Third_Party_Tieups", "").fillna("")

        df["Annual_Fee_INR"] = df.apply(self._parse_annual_fee, axis=1)
        df["Joining_Fee_INR"] = df.apply(self._parse_joining_fee, axis=1)
        df["Min_Income_LPA"] = df.apply(self._parse_income, axis=1)
        df["Spend_Based_Fee_Waiver_INR"] = df.apply(self._parse_fee_waiver, axis=1)
        df["Reward_Value_Per_Point_INR"] = (
            pd.to_numeric(df.get("Reward_Value_Per_Point_INR", 0.25), errors="coerce").fillna(0.25)
        )
        reward_components = df["Reward_Description_Clean"].map(_extract_reward_components).apply(pd.Series)
        df["Reward_Points"] = reward_components["reward_points"]
        df["Reward_Spend_Required"] = reward_components["spend_required"]

        raw_reward_rate = pd.to_numeric(df.get("Reward_Rate"), errors="coerce")
        df["Reward_Rate_Per_Rupee"] = reward_components["reward_rate_per_rupee"].fillna(raw_reward_rate)
        df["Reward_Cashback_Percent"] = reward_components["cashback_percent"].fillna(raw_reward_rate * 100.0)
        df["Milestone_Reward_Value"] = (
            pd.to_numeric(df.get("Milestone_Rewards"), errors="coerce")
            .fillna(0)
            .clip(lower=0)
        )
        parsed_milestone = df["Reward_Description_Clean"].map(_extract_milestone_value)
        df["Milestone_Reward_Value"] = np.where(
            df["Milestone_Reward_Value"] > 0,
            df["Milestone_Reward_Value"],
            parsed_milestone,
        )

        lounge_parsed = df["Reward_Description_Clean"].map(_extract_lounge_counts).apply(pd.Series)
        df["Lounge_Domestic"] = np.maximum(
            pd.to_numeric(df.get("Lounge_Access"), errors="coerce").fillna(0),
            lounge_parsed["domestic"].fillna(0),
        )
        df["Lounge_International"] = lounge_parsed["international"].fillna(0)
        df["Lounge_Access"] = df["Lounge_Domestic"] + df["Lounge_International"]

        df["Forex_Markup"] = pd.to_numeric(df.get("Forex_Markup"), errors="coerce")
        df.loc[df["Forex_Markup"].between(0, 0.1, inclusive="both"), "Forex_Markup"] *= 100
        df.loc[df["Forex_Markup"].isna(), "Forex_Markup"] = np.where(
            df["Reward_Description_Clean"].str.contains("forex", case=False, na=False), 2.0, 3.5
        )

        df["International_Usage"] = (
            (df["Forex_Markup"] <= 2.5)
            | df["Reward_Description_Clean"].str.contains("international|priority pass|forex", case=False, na=False)
        ).astype(int)
        df["Reward_Type"] = df["Reward_Description_Clean"].map(_detect_reward_category)
        df["Card_Name"] = df.apply(
            lambda row: (
                _infer_card_family(row["Reward_Description_Clean"], row["Reward_Type"])
                if _looks_generic_name(row["Card_Name"])
                else _strip_variation_suffix(row["Card_Name"])
            ),
            axis=1,
        )
        df["Bank_Name"] = df.apply(
            lambda row: _normalize_bank_name(row["Bank_Name"], row["Card_Name"], row["Reward_Description_Clean"]),
            axis=1,
        )

        merchant_lists = df.apply(self._resolve_merchants, axis=1)
        if fit_stage:
            self.mlb.fit(merchant_lists)
            self.merchant_columns_ = [f"is_{name.lower()}_partner" for name in self.mlb.classes_]
        merchant_matrix = self.mlb.transform(merchant_lists)
        merchant_df = pd.DataFrame(merchant_matrix, columns=self.merchant_columns_, index=df.index)
        df = df.drop(columns=[col for col in self.merchant_columns_ if col in df.columns], errors="ignore")
        df = pd.concat([df, merchant_df], axis=1)
        df["Merchant_Partner_Count"] = merchant_df.sum(axis=1)

        df["Milestone_Reward"] = df["Milestone_Reward_Value"].fillna(0)
        return self._engineer_features(df)

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["Reward_Value_Per_Point_INR"] = df["Reward_Value_Per_Point_INR"].fillna(0.25)
        df["ERV"] = df["Reward_Rate_Per_Rupee"].fillna(0) * df["Reward_Value_Per_Point_INR"]

        default_annual_spend = 400000.0
        category_share = {
            "travel": 0.25,
            "dining": 0.30,
            "ecommerce": 0.25,
            "general": 0.20,
        }
        category_multiplier = {
            "travel": 1.35,
            "dining": 1.20,
            "ecommerce": 1.15,
            "general": 1.00,
        }

        estimated_reward = 0.0
        for category, share in category_share.items():
            bonus = np.where(df["Reward_Type"].eq(category), category_multiplier[category], 1.0)
            estimated_reward += default_annual_spend * share * df["ERV"] * bonus

        lounge_value = (df["Lounge_Domestic"] * 1400) + (df["Lounge_International"] * 2300)
        lifestyle_value = df["Merchant_Partner_Count"] * 1200
        fee_waived = (df["Spend_Based_Fee_Waiver_INR"] > 0) & (df["Spend_Based_Fee_Waiver_INR"] <= default_annual_spend)
        net_fee = np.where(fee_waived, 0.0, df["Annual_Fee_INR"])

        df["Annual_Reward_Value_Estimate"] = estimated_reward
        df["Experiential_Benefits"] = lounge_value + lifestyle_value
        df["Net_Fee"] = net_fee
        df["Net_Annual_Value"] = estimated_reward + df["Milestone_Reward_Value"] + df["Experiential_Benefits"] - net_fee
        df["Effective_Reward_Rate_Index"] = df["ERV"] * 10000
        df["Net_Value_Index"] = df["Net_Annual_Value"] / np.maximum(default_annual_spend, 1)
        df["Travel_Benefit_Index"] = (
            df["Lounge_International"] * 2
            + df["Lounge_Domestic"] * 1
            + df["International_Usage"] * 2
            + df.filter(like="makemytrip").sum(axis=1)
            + df.filter(like="cleartrip").sum(axis=1)
        )
        df["Lifestyle_Benefit_Index"] = (
            df.filter(like="swiggy").sum(axis=1)
            + df.filter(like="zomato").sum(axis=1)
            + df.filter(like="bookmyshow").sum(axis=1)
            + df.filter(like="amazon").sum(axis=1)
            + df.filter(like="flipkart").sum(axis=1)
        )
        df["Fee_to_Value_Ratio"] = df["Annual_Fee_INR"] / np.maximum(df["Net_Annual_Value"], 1.0)
        return df

    def _parse_annual_fee(self, row: pd.Series) -> float:
        description = row.get("Reward_Description_Clean", "")
        raw_value = _to_float(row.get("Annual_Fee"))
        parsed = _extract_currency_after("annual(?:/renewal)? fee", description)
        if pd.notna(parsed):
            return parsed
        if pd.notna(raw_value) and raw_value >= 100:
            return raw_value
        return 0.0

    def _parse_joining_fee(self, row: pd.Series) -> float:
        description = row.get("Reward_Description_Clean", "")
        raw_value = _to_float(row.get("Joining_Fee"))
        parsed = _extract_currency_after("joining fee", description)
        if pd.notna(parsed):
            return parsed
        if pd.notna(raw_value) and raw_value >= 100:
            return raw_value
        return 0.0

    def _parse_income(self, row: pd.Series) -> float:
        raw_value = _to_float(row.get("Minimum_Income_LPA"))
        if pd.notna(raw_value) and raw_value >= 1.0:
            return raw_value
        parsed = _extract_income_lpa(row.get("Reward_Description_Clean", ""))
        if pd.notna(parsed):
            return parsed
        return np.nan

    def _parse_fee_waiver(self, row: pd.Series) -> float:
        raw_value = _to_float(row.get("Spend_Based_Fee_Waiver"))
        if pd.notna(raw_value) and raw_value > 1000:
            return raw_value
        return _extract_fee_waiver_threshold(row.get("Reward_Description_Clean", ""))

    def _resolve_merchants(self, row: pd.Series) -> List[str]:
        text = f"{row.get('Third_Party_Tieups', '')} {row.get('Reward_Description_Clean', '')} {row.get('Card_Name', '')}".lower()
        hits = []
        for canonical, aliases in self.merchant_aliases.items():
            if any(alias in text for alias in aliases) or canonical.lower() in text:
                hits.append(canonical)
        return sorted(set(hits))


def get_data_pipeline() -> CrediWiseDataPipeline:
    return CrediWiseDataPipeline()
