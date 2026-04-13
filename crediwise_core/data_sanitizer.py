"""
crediwise_core/data_sanitizer.py
=================================
Production-grade data preprocessing and sanitization pipeline for the
CrediWise credit card recommendation engine.

Three-layer defence:
  Step 1 – Heuristic / Keyword-Based Filtering   (fast O(n) pass)
  Step 2 – Financial Sanity / Anomaly Detection   (rule-based constraints)
  Step 3 – NLP Product Classifier                 (TF-IDF + Logistic Regression)
  Step 4 – DataSanitizer pipeline class           (orchestrator)

Usage:
    from crediwise_core.data_sanitizer import DataSanitizer
    sanitizer = DataSanitizer()
    clean_df  = sanitizer.clean(raw_df)
"""

import re
import logging
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score

logger = logging.getLogger("CrediWise.DataSanitizer")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

# ─────────────────────────────────────────────────────────────
# Shared constants
# ─────────────────────────────────────────────────────────────

#: Regex patterns that indicate editorial / blog content, NOT a card product.
BLOG_PATTERNS: list[str] = [
    r"\bvs\.?\b",                   # "Credit Card vs. Debit Card"
    r"\bversus\b",
    r"\bwhat\s+is\b",               # "What is a Credit Card"
    r"\bhow\s+to\b",                # "How to Apply"
    r"\bdifference\b",              # "Difference between..."
    r"\bbenefits?\s+of\b",          # "Benefits of Credit Cards"
    r"\bguide\b",                   # "Complete Guide to..."
    r"\btips?\b",                   # "5 Tips for..."
    r"\bfaq\b",
    r"\?$",                         # ends with a question mark
    r"\bwhy\b",                     # "Why you should..."
    r"\bshould\s+you\b",
    r"\byou\s+need\b",
    r"\bdo\s+you\b",
    r"\beligibility\b",
    r"\bcustomer\s+care\b",
    r"\bbill\s+payment\b",
    r"\binterest\s+rate\s+\d{4}",   # "Interest Rates 2026"
    r"\bin\s+india\s+\d{4}$",       # "Best cards in India 2026" (list pages)
    r"^best\s+\w+\s+credit\s+cards",# "Best Travel Credit Cards in India"
    r"^top\s+\d+",                  # "Top 10 Credit Cards"
    r"\bsecured\s+credit\s+cards?$",# Pure category page
    r"\bapply\s+(for|online)\b",
    r"\bhow\s+credit\s+cards?\s+work\b",
]

#: Valid known Indian bank / issuer identifiers (lowercase)
KNOWN_ISSUERS: set[str] = {
    "hdfc", "sbi", "icici", "axis", "kotak", "indusind", "yes", "yesbank",
    "rbl", "hsbc", "federal", "federalbank", "au", "aubank", "idfc", "idfcfirst",
    "standard", "standardchartered", "amex", "american", "citi", "citibank",
    "canara", "pnb", "union", "baroda", "idbi", "bajaj", "paytm", "onecard",
    "slice", "scapia", "fi", "kreditbee",
}

# ─────────────────────────────────────────────────────────────
# STEP 1 – Heuristic / Keyword Filter
# ─────────────────────────────────────────────────────────────

def heuristic_filter(df: pd.DataFrame, name_col: str = "Card_Name") -> pd.DataFrame:
    """
    Fast O(n) keyword purge.

    Removes rows whose *name_col* matches any pattern in ``BLOG_PATTERNS``,
    or whose name exceeds a maximum character length (page titles tend to be
    verbose), or that are missing a name entirely.

    Parameters
    ----------
    df       : Raw input dataframe.
    name_col : Column that holds the card / product name.

    Returns
    -------
    pd.DataFrame with flagged rows removed and a ``_heuristic_drop`` audit
    column attached for downstream logging.
    """
    df = df.copy()
    name_series = df[name_col].fillna("").astype(str)

    # --- build a single compiled OR-regex for speed ---
    combined_re = re.compile(
        "|".join(BLOG_PATTERNS),
        flags=re.IGNORECASE,
    )

    flag_blog   = name_series.str.contains(combined_re, na=False)
    flag_length = name_series.str.len() > 80          # real card names are concise
    flag_empty  = name_series.str.strip().eq("")

    drop_mask = flag_blog | flag_length | flag_empty
    dropped   = drop_mask.sum()

    if dropped:
        logger.warning(
            "Step 1 – Heuristic filter dropped %d/%d rows. Examples: %s",
            dropped,
            len(df),
            df.loc[drop_mask, name_col].head(5).tolist(),
        )

    df["_heuristic_drop"] = drop_mask
    return df[~drop_mask].drop(columns=["_heuristic_drop"]).reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# STEP 2 – Financial Sanity / Anomaly Detection
# ─────────────────────────────────────────────────────────────

# Rule schema: (column, min_valid, max_valid)
FINANCIAL_BOUNDS: dict[str, tuple[float, float]] = {
    "Annual_Fee":               (0,       100_000),
    "Joining_Fee":              (0,       100_000),
    "Reward_Rate":              (0,       50),          # % — no card gives >50%
    "Lounge_Access":            (0,       2_000),       # 2000 = "unlimited" sentinel
    "Forex_Markup":             (0,       5),           # % — max realistic is ~5%
    "Minimum_Income_LPA":       (0,       200),
    "Reward_Value_Per_Point_INR": (0,     10),
    "Spend_Based_Fee_Waiver":   (0,       100_000_000),
    "Milestone_Rewards":        (0,       500_000),
}


def financial_sanity_check(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detects and removes rows with impossible or wildly inconsistent financial
    values that indicate the row is not a real credit card product.

    Checks:
    * Numeric columns fall within ``FINANCIAL_BOUNDS``.
    * ``Bank_Name`` column resolves to a known Indian issuer.
    * Rows whose ``Annual_Fee`` is 0 but ``Minimum_Income_LPA`` > 50 are
      flagged (free cards don't require super-HNI income).
    * Rows where ``Reward_Rate`` > 0 but ``Reward_Value_Per_Point_INR`` == 0
      are flagged (inconsistent definition missing a core field).

    Parameters
    ----------
    df : Dataframe that has already passed the heuristic filter.

    Returns
    -------
    Cleaned pd.DataFrame with anomalous rows removed.
    """
    df      = df.copy()
    n_start = len(df)
    anomaly_flags = pd.Series(False, index=df.index)

    # --- 2a. Numeric bounds ---
    for col, (lo, hi) in FINANCIAL_BOUNDS.items():
        if col not in df.columns:
            continue
        numeric  = pd.to_numeric(df[col], errors="coerce")
        out_flag = numeric.isna() | (numeric < lo) | (numeric > hi)
        if out_flag.any():
            logger.debug(
                "  Anomaly – column '%s' out of [%s, %s]: %d rows",
                col, lo, hi, out_flag.sum(),
            )
        anomaly_flags |= out_flag

    # --- 2b. Bank / Issuer presence ---
    if "Bank_Name" in df.columns:
        bank_series = df["Bank_Name"].fillna("").astype(str).str.lower()
        # A row is valid if at least one known issuer token appears in the bank name
        known_issuer_re = re.compile(
            "|".join(re.escape(k) for k in KNOWN_ISSUERS),
            flags=re.IGNORECASE,
        )
        missing_issuer = ~bank_series.str.contains(known_issuer_re, na=False)
        if missing_issuer.any():
            logger.warning(
                "Step 2 – Unknown bank names flagged: %s",
                df.loc[missing_issuer, "Bank_Name"].unique().tolist()[:10],
            )
        anomaly_flags |= missing_issuer

    # --- 2c. Cross-field logic check ---
    if "Annual_Fee" in df.columns and "Minimum_Income_LPA" in df.columns:
        fee     = pd.to_numeric(df["Annual_Fee"], errors="coerce").fillna(0)
        inc     = pd.to_numeric(df["Minimum_Income_LPA"], errors="coerce").fillna(0)
        paradox = (fee == 0) & (inc > 50)
        if paradox.any():
            logger.debug("  Anomaly – free card requires HNI income: %d rows", paradox.sum())
        anomaly_flags |= paradox

    if "Reward_Rate" in df.columns and "Reward_Value_Per_Point_INR" in df.columns:
        rate  = pd.to_numeric(df["Reward_Rate"], errors="coerce").fillna(0)
        value = pd.to_numeric(df["Reward_Value_Per_Point_INR"], errors="coerce").fillna(0)
        inconsistent = (rate > 0) & (value == 0)
        if inconsistent.any():
            logger.debug("  Anomaly – non-zero reward rate but zero point value: %d rows",
                         inconsistent.sum())
        anomaly_flags |= inconsistent

    dropped = anomaly_flags.sum()
    if dropped:
        logger.warning(
            "Step 2 – Financial sanity check removed %d/%d anomalous rows.",
            dropped, n_start,
        )

    return df[~anomaly_flags].reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# STEP 3 – NLP Product Classifier
# ─────────────────────────────────────────────────────────────

# Training corpus — balanced binary dataset with real card names and blog titles.
# Extend this list whenever new injection patterns are discovered.
_TRAINING_DATA: list[tuple[str, int]] = [
    # is_product = 1  (genuine credit card products)
    ("HDFC Regalia Gold Credit Card", 1),
    ("SBI Cashback Credit Card", 1),
    ("Axis Bank Magnus Credit Card", 1),
    ("Amazon Pay ICICI Credit Card", 1),
    ("Kotak 811 Dream Different Credit Card", 1),
    ("IndusInd Bank Pinnacle Credit Card", 1),
    ("American Express Platinum Card", 1),
    ("YES Bank Marquee Credit Card", 1),
    ("RBL Bank Edition Credit Card", 1),
    ("HSBC Premier Credit Card", 1),
    ("Federal Bank Signet Credit Card", 1),
    ("AU Bank LIT Credit Card", 1),
    ("IDFC First Bank Wealth Credit Card", 1),
    ("Citi PremierMiles Credit Card", 1),
    ("Standard Chartered Ultimate Credit Card", 1),
    ("HDFC Millennia Credit Card", 1),
    ("SBI Prime Credit Card", 1),
    ("Axis Bank Ace Credit Card", 1),
    ("ICICI Sapphiro Credit Card", 1),
    ("OneCard Credit Card", 1),
    ("Scapia Federal Bank Credit Card", 1),
    ("HDFC Diners Club Black Credit Card", 1),
    ("Paytm SBI Credit Card", 1),
    ("IDBI Bank Royale Signature Credit Card", 1),
    ("Canara Bank RuPay Platinum Credit Card", 1),
    ("PNB RuPay Select Credit Card", 1),
    ("IndusInd EazyDiner Credit Card", 1),
    ("Kotak White Reserve Credit Card", 1),
    ("Bajaj Finserv RBL Bank SuperCard", 1),
    ("Axis Bank Airtel Credit Card", 1),
    ("HDFC Infinia Credit Card", 1),
    ("SBI Aurum Credit Card", 1),
    ("Fi Money Federal Bank Credit Card", 1),
    ("HSBC Visa Platinum Credit Card", 1),
    ("Bank of Baroda Eterna Credit Card", 1),

    # is_product = 0  (editorial / article / FAQ content)
    ("Credit Card vs. Debit Card: What's the Difference?", 0),
    ("Best Cashback Credit Cards in India 2026", 0),
    ("How to Apply for Lost Credit Card", 0),
    ("Secured Credit Cards — A Complete Guide", 0),
    ("Top 10 Credit Cards in India for 2025", 0),
    ("What is a Credit Card and How Does It Work?", 0),
    ("Benefits of Using a Credit Card vs Cash", 0),
    ("Credit Card Eligibility Criteria in India", 0),
    ("How to Improve Your CIBIL Score for Credit Cards", 0),
    ("Credit Card Interest Rate Comparison 2026", 0),
    ("Best Travel Credit Cards in India", 0),
    ("What is a Reward Point and How to Redeem It?", 0),
    ("Should You Get a Lifetime Free Credit Card?", 0),
    ("Credit Card Customer Care Number — All Banks", 0),
    ("How to Manage Multiple Credit Cards Wisely", 0),
    ("Do You Really Need a Credit Card?", 0),
    ("Credit Card vs Personal Loan: Which is Better?", 0),
    ("How Credit Card Bill Payment Works", 0),
    ("Best Credit Cards for Students in India 2026", 0),
    ("Airport Lounge Access — Complete Guide India", 0),
    ("Fuel Surcharge Waiver — Everything You Need to Know", 0),
    ("Tips for Responsible Credit Card Usage", 0),
    ("How to Avoid Credit Card Debt Traps", 0),
    ("FAQ: Credit Card Charges and Fees Explained", 0),
    ("Why You Should Pay More Than the Minimum Due", 0),
    ("Best Co-branded Credit Cards in India", 0),
    ("Reasons Your Credit Card Application Was Rejected", 0),
    ("Advantages and Disadvantages of Credit Cards", 0),
    ("How to Check Your Credit Card Application Status", 0),
    ("NRI Credit Cards — Features and Eligibility", 0),
]


class NLPProductClassifier:
    """
    Lightweight TF-IDF + Logistic Regression binary classifier.

    Classifies a card name / description text as:
      - ``1`` → genuine credit card product
      - ``0`` → article, guide, FAQ, or list page

    The model is intentionally kept lightweight (TF-IDF char n-grams +
    L2-penalised LogReg) so it can be retrained at pipeline startup in
    milliseconds without a GPU.
    """

    def __init__(self):
        self.pipeline: Optional[Pipeline] = None
        self._trained: bool = False

    def _build_pipeline(self) -> Pipeline:
        return Pipeline([
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="char_wb",     # character n-grams — robust to typos
                    ngram_range=(3, 5),     # 3-to-5-char shingles
                    min_df=1,
                    max_features=8_000,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    C=1.0,
                    solver="lbfgs",
                    max_iter=500,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ])

    def train(self, extra_samples: Optional[list[tuple[str, int]]] = None) -> "NLPProductClassifier":
        """
        Train the classifier. Merges built-in corpus with any *extra_samples*.

        Parameters
        ----------
        extra_samples : Additional ``(text, label)`` pairs to augment training.

        Returns
        -------
        self (for chaining)
        """
        corpus = list(_TRAINING_DATA)
        if extra_samples:
            corpus.extend(extra_samples)

        texts  = [t for t, _ in corpus]
        labels = [l for _, l in corpus]

        self.pipeline = self._build_pipeline()
        self.pipeline.fit(texts, labels)
        self._trained = True

        # Quick cross-validation report for operators
        try:
            scores = cross_val_score(self.pipeline, texts, labels, cv=5, scoring="f1")
            logger.info(
                "Step 3 – NLP classifier trained on %d samples. "
                "5-fold F1: %.3f ± %.3f",
                len(corpus), scores.mean(), scores.std(),
            )
        except Exception:
            logger.info("Step 3 – NLP classifier trained on %d samples.", len(corpus))

        return self

    def predict(self, texts: pd.Series) -> np.ndarray:
        """
        Returns a boolean array: ``True`` = is a real credit card product.

        Parameters
        ----------
        texts : Series of card name / description strings.
        """
        if not self._trained or self.pipeline is None:
            raise RuntimeError(
                "NLPProductClassifier.train() must be called before predict()."
            )
        preds = self.pipeline.predict(texts.fillna("").astype(str).tolist())
        return preds.astype(bool)

    def predict_proba(self, texts: pd.Series) -> np.ndarray:
        """Returns probability of being a genuine product (class=1)."""
        if not self._trained or self.pipeline is None:
            raise RuntimeError("Classifier not trained.")
        return self.pipeline.predict_proba(
            texts.fillna("").astype(str).tolist()
        )[:, 1]


def apply_nlp_filter(
    df: pd.DataFrame,
    classifier: NLPProductClassifier,
    name_col: str = "Card_Name",
    prob_threshold: float = 0.35,
) -> pd.DataFrame:
    """
    Applies the NLP classifier to the dataframe, dropping rows classified as
    non-product content.

    Parameters
    ----------
    df             : Input dataframe.
    classifier     : A trained ``NLPProductClassifier`` instance.
    name_col       : Column containing the card name / title text.
    prob_threshold : Rows with product-probability below this value are removed.
                     Lower = stricter. Default 0.35 gives good recall on edge cases.

    Returns
    -------
    Filtered pd.DataFrame.
    """
    probs = classifier.predict_proba(df[name_col])
    is_product = probs >= prob_threshold

    dropped = (~is_product).sum()
    if dropped:
        logger.warning(
            "Step 3 – NLP classifier removed %d/%d non-product rows. Examples: %s",
            dropped,
            len(df),
            df.loc[~is_product, name_col].head(5).tolist(),
        )

    return df[is_product].copy().reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# STEP 4 – Pipeline Orchestrator
# ─────────────────────────────────────────────────────────────

class DataSanitizer:
    """
    CrediWise data sanitization pipeline.

    Wraps all three cleaning layers into a single callable that takes
    a raw scraped dataframe and returns a product-only dataframe ready
    for TOPSIS / AHP scoring.

    Parameters
    ----------
    name_col        : Column holding the card / product name.
    bank_col        : Column holding the issuing bank name.
    nlp_threshold   : Probability cut-off for the NLP classifier (0–1).
    extra_training  : Additional ``(text, label)`` pairs to boost the NLP model.

    Example
    -------
    >>> from crediwise_core.data_sanitizer import DataSanitizer
    >>> sanitizer = DataSanitizer()
    >>> clean_df  = sanitizer.clean(raw_df)
    """

    def __init__(
        self,
        name_col: str = "Card_Name",
        bank_col: str = "Bank_Name",
        nlp_threshold: float = 0.35,
        extra_training: Optional[list[tuple[str, int]]] = None,
    ):
        self.name_col      = name_col
        self.bank_col      = bank_col
        self.nlp_threshold = nlp_threshold

        logger.info("DataSanitizer – training NLP classifier …")
        self._classifier = NLPProductClassifier().train(extra_samples=extra_training)
        logger.info("DataSanitizer – ready.")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Run all sanitization steps in sequence.

        Pipeline order:
          1. Heuristic keyword filter  (fast regex pass)
          2. Financial sanity check    (bounds + cross-field logic)
          3. NLP product classifier    (TF-IDF + Logistic Regression)
          4. Final deduplication       (drop exact ``name_col`` duplicates)

        Parameters
        ----------
        df : Raw input dataframe (e.g. directly from the web scraper).

        Returns
        -------
        Sanitized pd.DataFrame with only genuine credit card products.
        """
        n_raw = len(df)
        logger.info("DataSanitizer.clean() – received %d rows", n_raw)

        # 1. Heuristic filter
        df = heuristic_filter(df, name_col=self.name_col)
        logger.info("  After heuristic filter : %d rows", len(df))

        # 2. Financial sanity
        df = financial_sanity_check(df)
        logger.info("  After financial sanity : %d rows", len(df))

        # 3. NLP classifier
        df = apply_nlp_filter(
            df,
            classifier=self._classifier,
            name_col=self.name_col,
            prob_threshold=self.nlp_threshold,
        )
        logger.info("  After NLP classifier   : %d rows", len(df))

        # 4. Deduplication (keep first occurrence)
        before_dedup = len(df)
        df = df.drop_duplicates(subset=[self.name_col]).reset_index(drop=True)
        dupes = before_dedup - len(df)
        if dupes:
            logger.info("  After deduplication    : %d rows (-%d dupes)", len(df), dupes)

        logger.info(
            "DataSanitizer complete – %d raw → %d clean (%.1f%% retained)",
            n_raw, len(df), 100 * len(df) / max(n_raw, 1),
        )
        return df

    def clean_card_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Alias for :meth:`clean` — matches the function signature in the spec."""
        return self.clean(df)


# ─────────────────────────────────────────────────────────────
# Convenience function (functional API)
# ─────────────────────────────────────────────────────────────

def clean_card_dataset(
    df: pd.DataFrame,
    name_col: str = "Card_Name",
    bank_col: str = "Bank_Name",
    nlp_threshold: float = 0.35,
) -> pd.DataFrame:
    """
    Top-level convenience wrapper.  Instantiates a ``DataSanitizer`` and runs
    the full pipeline in one call.

    Parameters
    ----------
    df            : Raw scraped dataframe.
    name_col      : Column with product name / title.
    bank_col      : Column with issuing bank name.
    nlp_threshold : NLP cut-off probability.

    Returns
    -------
    Clean pd.DataFrame ready for the TOPSIS recommendation engine.
    """
    sanitizer = DataSanitizer(
        name_col=name_col,
        bank_col=bank_col,
        nlp_threshold=nlp_threshold,
    )
    return sanitizer.clean(df)


# ─────────────────────────────────────────────────────────────
# Self-test / smoke test
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pandas as pd

    # Simulate a dirty incoming dataframe (mix of real cards + junk)
    test_data = [
        # Real cards
        {"Card_Name": "HDFC Regalia Gold Credit Card",           "Bank_Name": "HDFC",  "Annual_Fee": 2500, "Joining_Fee": 2500, "Reward_Rate": 4.0, "Lounge_Access": 12, "Forex_Markup": 2.0, "Minimum_Income_LPA": 10.0, "Reward_Value_Per_Point_INR": 0.5,  "Spend_Based_Fee_Waiver": 300000, "Milestone_Rewards": 2500},
        {"Card_Name": "SBI Cashback Credit Card",                 "Bank_Name": "SBI",   "Annual_Fee": 999,  "Joining_Fee": 999,  "Reward_Rate": 5.0, "Lounge_Access": 0,  "Forex_Markup": 3.5, "Minimum_Income_LPA": 3.0,  "Reward_Value_Per_Point_INR": 1.0,  "Spend_Based_Fee_Waiver": 200000, "Milestone_Rewards": 0},
        {"Card_Name": "Axis Bank Ace Credit Card",                "Bank_Name": "Axis",  "Annual_Fee": 499,  "Joining_Fee": 499,  "Reward_Rate": 2.0, "Lounge_Access": 4,  "Forex_Markup": 3.5, "Minimum_Income_LPA": 2.5,  "Reward_Value_Per_Point_INR": 1.0,  "Spend_Based_Fee_Waiver": 200000, "Milestone_Rewards": 0},
        {"Card_Name": "Amazon Pay ICICI Credit Card",             "Bank_Name": "ICICI", "Annual_Fee": 0,    "Joining_Fee": 0,    "Reward_Rate": 5.0, "Lounge_Access": 0,  "Forex_Markup": 3.5, "Minimum_Income_LPA": 2.0,  "Reward_Value_Per_Point_INR": 1.0,  "Spend_Based_Fee_Waiver": 0,      "Milestone_Rewards": 0},
        {"Card_Name": "Scapia Federal Bank Credit Card",          "Bank_Name": "FederalBank", "Annual_Fee": 0,  "Joining_Fee": 0,  "Reward_Rate": 10.0, "Lounge_Access": 2000, "Forex_Markup": 0.0, "Minimum_Income_LPA": 3.0, "Reward_Value_Per_Point_INR": 1.0, "Spend_Based_Fee_Waiver": 0, "Milestone_Rewards": 0},

        # JUNK 1 – blog article
        {"Card_Name": "Credit Card vs. Debit Card: What's the Difference?", "Bank_Name": "Unknown", "Annual_Fee": 500, "Joining_Fee": 500, "Reward_Rate": 1.5, "Lounge_Access": 0, "Forex_Markup": 3.5, "Minimum_Income_LPA": 3.0, "Reward_Value_Per_Point_INR": 0.25, "Spend_Based_Fee_Waiver": 50000, "Milestone_Rewards": 0},
        # JUNK 2 – list page
        {"Card_Name": "Best Cashback Credit Cards in India 2026",  "Bank_Name": "Various", "Annual_Fee": 0,   "Joining_Fee": 0,   "Reward_Rate": 5.0, "Lounge_Access": 0,  "Forex_Markup": 3.5, "Minimum_Income_LPA": 3.0,  "Reward_Value_Per_Point_INR": 0.25, "Spend_Based_Fee_Waiver": 0, "Milestone_Rewards": 0},
        # JUNK 3 – how-to article
        {"Card_Name": "How to Apply for Lost Credit Card",         "Bank_Name": "NA",    "Annual_Fee": 0,   "Joining_Fee": 0,   "Reward_Rate": 0.0, "Lounge_Access": 0,  "Forex_Markup": 0.0, "Minimum_Income_LPA": 0.0,  "Reward_Value_Per_Point_INR": 0.0,  "Spend_Based_Fee_Waiver": 0, "Milestone_Rewards": 0},
        # JUNK 4 – impossible financials (reward_rate=500% is absurd)
        {"Card_Name": "XYZ Mystery SuperCard",                     "Bank_Name": "HDFC",  "Annual_Fee": 100,  "Joining_Fee": 100,  "Reward_Rate": 500.0, "Lounge_Access": 0, "Forex_Markup": 3.5, "Minimum_Income_LPA": 2.0, "Reward_Value_Per_Point_INR": 1.0, "Spend_Based_Fee_Waiver": 50000, "Milestone_Rewards": 0},
        # JUNK 5 – FAQ
        {"Card_Name": "Do You Need a Credit Card? FAQ",            "Bank_Name": "None",  "Annual_Fee": 0,   "Joining_Fee": 0,   "Reward_Rate": 0.0, "Lounge_Access": 0,  "Forex_Markup": 0.0, "Minimum_Income_LPA": 0.0,  "Reward_Value_Per_Point_INR": 0.0,  "Spend_Based_Fee_Waiver": 0, "Milestone_Rewards": 0},
    ]

    raw_df = pd.DataFrame(test_data)
    print(f"\n{'─'*60}")
    print(f"  INPUT  : {len(raw_df)} rows")
    print(f"{'─'*60}")
    for name in raw_df["Card_Name"]:
        print(f"  • {name}")

    clean_df = clean_card_dataset(raw_df)

    print(f"\n{'─'*60}")
    print(f"  OUTPUT : {len(clean_df)} rows (expected 5)")
    print(f"{'─'*60}")
    for name in clean_df["Card_Name"]:
        print(f"  ✅ {name}")

    junk_removed = set(raw_df["Card_Name"]) - set(clean_df["Card_Name"])
    print(f"\n  Removed {len(junk_removed)} junk entries:")
    for name in junk_removed:
        print(f"  ❌ {name}")
