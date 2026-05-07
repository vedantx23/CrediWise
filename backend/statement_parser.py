"""
statement_parser.py — Bank Statement Forensics for CrediWise-AI

Pipeline:
  1. PDF → raw text via pdfplumber (table-aware + text fallback)
  2. Raw text → structured transactions (date, description, amount) via regex
  3. Transactions → categories via merchant keyword matching
  4. Category totals → monthly breakdown dict
  5. Isolation Forest on 3-month series → anomalous month alerts
  6. Output → ready-to-feed /api/audit payload + anomaly alerts
"""

from __future__ import annotations
import re
import sys, os
from pathlib import Path
from datetime import date, datetime
from collections import defaultdict

import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

# ─── Category keyword patterns ────────────────────────────────────────────────
# Ordered from most-specific to least-specific. First match wins.

CATEGORY_PATTERNS: dict[str, list[str]] = {
    "international": [
        r"\bintl\b", r"international\s*txn", r"foreign\s*curr",
        r"\busd\b", r"\beur\b", r"\bgbp\b", r"\bsgd\b", r"\baed\b",
        r"\bpaypal\b", r"booking\.com", r"agoda", r"airbnb",
        r"netflix", r"spotify", r"adobe\s*systems", r"apple\.com",
        r"google\s*cloud", r"\baws\b", r"\bazure\b", r"wise\s*transfer",
    ],
    "travel": [
        r"makemytrip", r"\bmmt\b", r"goibibo", r"irctc", r"indigo\s*airlines?",
        r"air\s*india", r"spicejet", r"vistara", r"akasa", r"go\s*first",
        r"air\s*asia", r"\bola\b", r"\buber\b", r"rapido", r"meru\s*cab",
        r"redbus", r"abhibus", r"cleartrip", r"easemytrip", r"yatra",
        r"oyo\s*rooms?", r"treebo", r"fabhotel", r"holiday\s*inn",
        r"airlines?", r"railways?", r"train\s*ticket", r"bus\s*ticket",
        r"flight\s*ticket", r"hotel\s*booking",
    ],
    "fuel": [
        r"\bbpcl\b", r"\bhpcl\b", r"\biocl\b", r"indianoil", r"indian\s*oil",
        r"bharat\s*petroleum", r"hindustan\s*petroleum", r"\bshell\b",
        r"essar\s*fuel", r"reliance\s*petrol",
        r"petrol\s*pump", r"filling\s*station", r"fuel\s*station",
        r"\bpetrol\b", r"\bdiesel\b",
    ],
    "grocery": [
        r"bigbasket", r"big\s*basket", r"grofers", r"blinkit",
        r"d[\s\-]?mart", r"more\s*supermarket", r"reliance\s*fresh",
        r"reliance\s*smart", r"nature[\s']?s\s*basket", r"star\s*bazaar",
        r"spencers?", r"heritage\s*fresh", r"zepto", r"instamart",
        r"dunzo", r"jiomart",
        r"supermart", r"hypermarket", r"supermarket",
        r"kirana", r"grocery\s*store", r"vegeta?bles?", r"provisions",
    ],
    "dining": [
        r"swiggy", r"zomato", r"dominos?", r"pizza\s*hut", r"\bkfc\b",
        r"mcdonalds?", r"burger\s*king", r"subway\s*india", r"wow\s*momo",
        r"barbeque\s*nation", r"haldirams?", r"bikanervala", r"fasoos?",
        r"faasos?", r"box\s*8", r"freshmenu", r"licious",
        r"starbucks", r"cafe\s*coffee\s*day", r"\bccd\b", r"chaayos",
        r"restaurant", r"dining", r"eatery", r"dhaba",
        r"food\s*order", r"meal", r"biryani", r"pizza",
    ],
    "online": [
        r"amazon(?!\s*pay)", r"flipkart", r"myntra", r"ajio", r"nykaa",
        r"meesho", r"snapdeal", r"tata\s*cliq", r"croma", r"vijay\s*sales",
        r"reliance\s*digital", r"shopclues", r"firstcry",
        r"pepperfry", r"urban\s*ladder", r"\bikea\b", r"decathlon",
        r"jio\s*mart",
        r"online\s*purchase", r"ecomm", r"e-commerce",
    ],
    "utilities": [
        r"msedcl", r"\bmseb\b", r"bescom", r"\btpddl\b", r"\bcesc\b",
        r"\bbses\b", r"reliance\s*energy",
        r"electricity\s*bill", r"electric\s*bill",
        r"airtel\s*(?:bill|broadband|dth|recharge)",
        r"\bjio\s*(?:bill|recharge|broadband|fiber)", r"\bbsnl\b",
        r"vodafone\s*(?:bill|recharge)", r"\bvi\s*recharge\b",
        r"broadband\s*bill", r"internet\s*bill",
        r"nmc\s*water", r"\bbmc\b", r"\bbbmp\b", r"municipal\s*tax",
        r"water\s*bill", r"gas\s*bill", r"piped\s*gas",
        r"indane\s*gas", r"bharat\s*gas", r"\blpg\b",
        r"tata\s*sky", r"dish\s*tv", r"\bdth\b",
        r"bill\s*pay(?:ment)?", r"utility\s*bill",
        r"mobile\s*recharge", r"recharge\s*\d",
    ],
}

CATEGORIES = ["dining", "fuel", "grocery", "travel", "online",
              "utilities", "international", "other"]


def _compile_patterns() -> dict[str, re.Pattern]:
    """Pre-compile all category patterns for performance."""
    return {
        cat: re.compile("|".join(patterns), re.IGNORECASE)
        for cat, patterns in CATEGORY_PATTERNS.items()
    }


_COMPILED = _compile_patterns()


def categorize(description: str) -> str:
    """Return the first matching category for a transaction description."""
    desc = str(description).lower()
    for cat, pattern in _COMPILED.items():
        if pattern.search(desc):
            return cat
    return "other"


# ─── PDF Transaction Extractor ────────────────────────────────────────────────

# Regex patterns for common Indian bank statement transaction rows
_DATE_PATTERNS = [
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",           # DD/MM/YYYY or DD-MM-YYYY
    r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|"
    r"Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})",  # DD Mon YYYY
    r"(\d{4}[/-]\d{2}[/-]\d{2})",                  # YYYY-MM-DD
]
_DATE_RE   = re.compile("|".join(_DATE_PATTERNS), re.IGNORECASE)
_AMOUNT_RE = re.compile(r"[\d,]+\.\d{2}")          # e.g. 1,250.00


def _parse_date(raw: str) -> str | None:
    """Normalise various date strings to YYYY-MM."""
    raw = raw.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
        "%d %b %Y", "%d %B %Y", "%Y-%m-%d", "%Y/%m/%d",
        "%d %b %y", "%d %B %y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m")
        except ValueError:
            continue
    return None


def _extract_from_table(page) -> list[dict]:
    """Try to extract transactions from a pdfplumber table."""
    rows = []
    for table in (page.extract_tables() or []):
        for row in table:
            if not row:
                continue
            row_text = " ".join(str(c or "") for c in row)
            date_m   = _DATE_RE.search(row_text)
            amounts  = _AMOUNT_RE.findall(row_text)
            if not date_m or not amounts:
                continue
            raw_date = date_m.group(0)
            month    = _parse_date(raw_date)
            if not month:
                continue
            # Use last numeric amount in row as transaction amount (debit/withdrawal)
            amount = float(amounts[-1].replace(",", ""))
            # Description is the non-date, non-amount text
            desc = re.sub(_DATE_RE.pattern, "", row_text, flags=re.IGNORECASE)
            desc = re.sub(r"[\d,]+\.\d{2}", "", desc)
            desc = re.sub(r"\s+", " ", desc).strip()
            rows.append({"month": month, "description": desc, "amount": amount})
    return rows


def _extract_from_text(text: str) -> list[dict]:
    """Fallback: scan raw text line-by-line for transaction patterns."""
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        date_m   = _DATE_RE.search(line)
        amounts  = _AMOUNT_RE.findall(line)
        if not date_m or not amounts:
            continue
        month = _parse_date(date_m.group(0))
        if not month:
            continue
        # Last amount = debit amount
        amount = float(amounts[-1].replace(",", ""))
        # Strip dates and amounts from description
        desc = re.sub(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", "", line)
        desc = re.sub(r"\d{1,2}\s+\w{3}\w*\s+\d{2,4}", "", desc, flags=re.IGNORECASE)
        desc = re.sub(r"[\d,]+\.\d{2}", "", desc)
        desc = re.sub(r"\s+", " ", desc).strip()
        if len(desc) < 3 or amount <= 0:
            continue
        rows.append({"month": month, "description": desc, "amount": amount})
    return rows


def extract_transactions_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extract all debit transactions from a bank statement PDF.

    Returns list of dicts:
      [{"month": "YYYY-MM", "description": str, "amount": float, "category": str}]
    """
    import pdfplumber

    transactions = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Try table extraction first
                table_txns = _extract_from_table(page)
                if table_txns:
                    transactions.extend(table_txns)
                else:
                    # Fallback to raw text
                    text = page.extract_text() or ""
                    transactions.extend(_extract_from_text(text))
    except Exception as e:
        raise RuntimeError(f"Failed to parse PDF: {e}") from e

    # Deduplicate (same month + desc + amount)
    seen  = set()
    clean = []
    for t in transactions:
        key = (t["month"], t["description"][:30], round(t["amount"], 2))
        if key not in seen:
            seen.add(key)
            t["category"] = categorize(t["description"])
            clean.append(t)

    return clean


# ─── Monthly breakdown ────────────────────────────────────────────────────────

def compute_monthly_breakdown(transactions: list[dict]) -> dict[str, dict[str, float]]:
    """
    Group transactions by month and category.

    Returns: {
      "2024-01": {"dining": 5200.0, "fuel": 3000.0, ...},
      "2024-02": {...},
      ...
    }
    """
    breakdown: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for t in transactions:
        month = t.get("month", "unknown")
        cat   = t.get("category", "other")
        breakdown[month][cat] += t.get("amount", 0.0)
    return {m: dict(cats) for m, cats in sorted(breakdown.items())}


def build_audit_payload(monthly_breakdown: dict) -> dict:
    """
    Average the monthly breakdown over all months → ready-to-use /api/audit payload.
    Returns the monthly_spend dict used by run_audit().
    """
    if not monthly_breakdown:
        return {cat: 0.0 for cat in CATEGORIES}

    n = len(monthly_breakdown)
    totals: dict[str, float] = defaultdict(float)
    for month_data in monthly_breakdown.values():
        for cat, amt in month_data.items():
            totals[cat] += amt

    return {cat: round(totals.get(cat, 0.0) / n, 2) for cat in CATEGORIES}


# ─── Isolation Forest anomaly detection ──────────────────────────────────────

def detect_anomalies(
    monthly_breakdown: dict[str, dict[str, float]],
    card_rewards: dict | None = None,   # {card_id: {category: rate_pct}} for recovery hint
) -> list[dict]:
    """
    Run Isolation Forest per category over the monthly time-series.
    Returns a list of anomaly alert dicts.

    Requires at least 3 months of data per category.
    """
    from sklearn.ensemble import IsolationForest

    months = sorted(monthly_breakdown.keys())
    if len(months) < 3:
        return []

    alerts = []
    for cat in CATEGORIES:
        series = [monthly_breakdown[m].get(cat, 0.0) for m in months]
        if sum(series) == 0:
            continue

        arr = np.array(series).reshape(-1, 1)
        mean_val = np.mean(series)
        if mean_val <= 0:
            continue

        model = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=42,
        )
        labels = model.fit_predict(arr)   # -1 = anomaly, 1 = normal

        for i, (month, label) in enumerate(zip(months, labels)):
            if label == -1:
                actual   = series[i]
                ratio    = round(actual / mean_val, 1) if mean_val > 0 else 0
                extra    = actual - mean_val
                if extra <= 0 or ratio < 1.3:
                    continue   # Only flag spend spikes, not drops

                # Find best card + recovery hint
                recovery_card, recovery_amt = _best_recovery(cat, extra, card_rewards)

                alerts.append({
                    "category":   cat,
                    "month":      month,
                    "actual_inr": round(actual, 2),
                    "normal_inr": round(mean_val, 2),
                    "spike_ratio": ratio,
                    "recovery_card":   recovery_card,
                    "recovery_inr":    round(recovery_amt, 2),
                    "message": (
                        f"Your {cat} spend in {_fmt_month(month)} was "
                        f"{ratio}x your normal"
                        + (
                            f" — activate your {recovery_card} offer to recover "
                            f"₹{int(recovery_amt):,}."
                            if recovery_card
                            else "."
                        )
                    ),
                })

    return alerts


def _best_recovery(
    category: str,
    extra_spend: float,
    card_rewards: dict | None,
) -> tuple[str, float]:
    """Return (card_name, recovery_amount) for a spend spike in a category."""
    if not card_rewards:
        try:
            from database import get_all_rewards_map, get_all_cards
            rmap  = get_all_rewards_map()
            cards = {c["card_id"]: c["name"] for c in get_all_cards()}
            # Find best card for this category
            best_rate, best_cid = 0.0, None
            for cid, rates in rmap.items():
                r = rates.get(category, 0.0)
                if r > best_rate:
                    best_rate, best_cid = r, cid
            if best_cid:
                return cards.get(best_cid, best_cid), round(extra_spend * best_rate / 100, 2)
        except Exception:
            pass
        return "", 0.0

    best_rate, best_name = 0.0, ""
    for cid, rates in card_rewards.items():
        r = rates.get(category, 0.0)
        if r > best_rate:
            best_rate = r
            best_name = cid
    return best_name, round(extra_spend * best_rate / 100, 2)


def _fmt_month(ym: str) -> str:
    """Convert '2024-03' → 'March 2024'."""
    try:
        return datetime.strptime(ym, "%Y-%m").strftime("%B %Y")
    except ValueError:
        return ym


# ─── Top-level pipeline ───────────────────────────────────────────────────────

def parse_statement(pdf_path: str) -> dict:
    """
    Full pipeline: PDF → transactions → breakdown → anomalies → audit payload.

    Returns:
    {
      "transaction_count": int,
      "months_parsed":     [str],
      "monthly_breakdown": {month: {category: amount}},
      "audit_payload":     {category: avg_monthly_amount},
      "anomaly_alerts":    [{category, month, message, ...}],
      "transactions":      [{month, description, amount, category}]
    }
    """
    transactions     = extract_transactions_from_pdf(pdf_path)
    monthly          = compute_monthly_breakdown(transactions)
    audit_payload    = build_audit_payload(monthly)
    anomaly_alerts   = detect_anomalies(monthly)

    return {
        "transaction_count": len(transactions),
        "months_parsed":     sorted(monthly.keys()),
        "monthly_breakdown": monthly,
        "audit_payload":     audit_payload,
        "anomaly_alerts":    anomaly_alerts,
        "transactions":      transactions,
    }
