"""
build_import_csvs.py — Transform credit_card_dataset_master.csv into
                      cards_import.csv + rewards_import.csv for csv_loader.py.

Run:  python3 build_import_csvs.py
Out:  cards_import.csv, rewards_import.csv  (in cwd)
"""
from __future__ import annotations
import re
import sys
from pathlib import Path
import pandas as pd
import numpy as np

SRC = Path(__file__).with_name("credit_card_dataset_master.csv")
OUT_CARDS   = Path(__file__).with_name("cards_import.csv")
OUT_REWARDS = Path(__file__).with_name("rewards_import.csv")

CATEGORIES = ["dining", "fuel", "grocery", "travel",
              "online", "utilities", "international", "other"]

# ── Keyword → category map (longest match wins) ───────────────────────────────
KEYWORDS = [
    # online / e-commerce
    ("online",        ["amazon", "flipkart", "myntra", "ajio", "cleartrip",
                       "lenskart", "tata neu", "tata cliq", "online", "e-commerce",
                       "ecommerce", "paytm mall", "reliance digital"]),
    # dining
    ("dining",        ["dining", "restaurant", "zomato", "swiggy", "food",
                       "eatout", "eat out"]),
    # grocery
    ("grocery",       ["grocery", "groceries", "bigbasket", "blinkit", "instamart",
                       "departmental", "reliance smart", "supermarket", "smart bazaar"]),
    # fuel
    ("fuel",          ["fuel", "petrol", "diesel", "iocl", "hpcl", "bpcl"]),
    # travel
    ("travel",        ["travel", "flight", "hotel", "makemytrip", "yatra", "ixigo",
                       "goibibo", "airline", "irctc", "booking.com"]),
    # utilities
    ("utilities",     ["utilit", "bill payment", "bills", "electricity",
                       "telecom", "mobile bill", "broadband", "gas bill", "water bill"]),
    # international / forex
    ("international", ["international", "foreign currency", "overseas",
                       "abroad", "forex spend"]),
]

# ── Regex helpers ─────────────────────────────────────────────────────────────
# “5% on Amazon, Flipkart …”
RE_PCT_ON   = re.compile(r"(\d+(?:\.\d+)?)\s*%\s*(?:cashback\s*)?on\s+([^.]+?)(?=[.;]|$)",
                         flags=re.IGNORECASE)
# “10X reward points on dining, movies”
RE_NX_ON    = re.compile(r"(\d+(?:\.\d+)?)\s*[xX]\s*(?:reward\s*points?|cashpoints?|"
                         r"points?|rewards?|neucoins?)\s*on\s+([^.]+?)(?=[.;]|$)",
                         flags=re.IGNORECASE)
# “2 cashpoints per Rs.150” → base earn-rate
RE_PER_RS   = re.compile(r"(\d+(?:\.\d+)?)\s*(?:reward\s*points?|cashpoints?|"
                         r"points?|neucoins?)\s*per\s*Rs\.?\s*(\d+(?:\.\d+)?)",
                         flags=re.IGNORECASE)


def slugify(name: str) -> str:
    """'HDFC Regalia Gold Credit Card' -> 'hdfc_regalia_gold_credit_card'"""
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def categories_in(text: str) -> list[str]:
    """Return the categories whose keywords appear in `text`."""
    text_l = text.lower()
    found = []
    for cat, kws in KEYWORDS:
        if any(kw in text_l for kw in kws):
            found.append(cat)
    return found


def parse_rewards(
    desc: str,
    base_rate: float,
    point_value_inr: float,
    base_pts_per_150: float | None,
) -> dict[str, float]:
    """
    Parse the Reward_Description into {category: rate_percent}.

    Rules:
      • "X% on <thing>"             → rate X for any category matched in <thing>
      • "NX points on <thing>"      → rate (N × base_rate) for matched categories
                                       (or N × point_value × 100/150 fallback)
      • "N points per Rs.150"       → other = (N × point_value × 100 / 150)
      • If still no 'other' rate    → use base_rate column as 'other'
      • Take MAX when a category appears in multiple clauses.
    """
    rates: dict[str, float] = {}
    text = (desc or "").strip()
    if not text:
        return {"other": base_rate} if base_rate > 0 else {}

    # ── 1. "X% on <merchants>" patterns ────────────────────────────────────
    for pct, target in RE_PCT_ON.findall(text):
        rate = float(pct)
        cats = categories_in(target)
        if not cats:
            cats = ["other"]
        for c in cats:
            rates[c] = max(rates.get(c, 0.0), rate)

    # ── 2. "NX points on <merchants>" patterns (multiplier on base rate) ──
    base_for_mult = base_rate if base_rate > 0 else (
        (point_value_inr * 100 / 150) if point_value_inr > 0 else 0.0
    )
    for n, target in RE_NX_ON.findall(text):
        rate = float(n) * base_for_mult
        cats = categories_in(target)
        if not cats:
            cats = ["other"]
        for c in cats:
            rates[c] = max(rates.get(c, 0.0), rate)

    # ── 3. "N points per Rs.X" → base earn rate goes to 'other' ────────────
    if "other" not in rates:
        m = RE_PER_RS.search(text)
        if m and point_value_inr > 0:
            n_pts = float(m.group(1)); per_rs = float(m.group(2))
            rate = (n_pts * point_value_inr / per_rs) * 100
            rates["other"] = round(rate, 3)

    # ── 4. Fallback: 'other' uses base reward-rate column ──────────────────
    if "other" not in rates and base_rate > 0:
        rates["other"] = base_rate

    # Round + clamp
    return {c: round(min(r, 50.0), 3) for c, r in rates.items() if r > 0}


# ─── Main ─────────────────────────────────────────────────────────────────────
def main() -> None:
    if not SRC.exists():
        sys.exit(f"❌ source CSV not found: {SRC}")

    df = pd.read_csv(SRC)
    print(f"📄 loaded {len(df)} rows from {SRC.name}")

    # ── Cards ────────────────────────────────────────────────────────────────
    cards = pd.DataFrame()
    cards["card_id"]            = df["Card_Name"].fillna("unknown").apply(slugify)
    cards["bank"]               = df["Bank_Name"].fillna(df.get("Bank", "")).fillna("")
    cards["name"]               = df["Card_Name"].fillna("Unknown")
    cards["annual_fee"]         = pd.to_numeric(df["Annual_Fee"], errors="coerce").fillna(0)
    cards["joining_fee"]        = pd.to_numeric(df.get("Joining_Fee"), errors="coerce").fillna(0)
    cards["fee_waiver_spend"]   = pd.to_numeric(df.get("Spend_Based_Fee_Waiver"),
                                                errors="coerce").fillna(0)
    cards["lounge_domestic"]    = pd.to_numeric(df["Lounge_Domestic"],
                                                errors="coerce").fillna(0).astype(int)
    cards["lounge_intl"]        = pd.to_numeric(df["Lounge_International"],
                                                errors="coerce").fillna(0).astype(int)
    cards["forex_markup_pct"]   = pd.to_numeric(df["Forex_Markup"], errors="coerce").fillna(0)
    # min_income_annual: Min_Income_LPA × 100 000 (LPA → ₹/yr)
    min_lpa = pd.to_numeric(df.get("Min_Income_LPA",
                                   df.get("Minimum_Income_LPA")),
                            errors="coerce").fillna(0)
    cards["min_income_annual"] = (min_lpa * 100_000).astype(int)
    cards["is_lifetime_free"]  = (cards["annual_fee"] == 0).astype(int)

    # De-duplicate card_id (keep first occurrence)
    before = len(cards)
    cards = cards.drop_duplicates(subset=["card_id"], keep="first").reset_index(drop=True)
    if len(cards) < before:
        print(f"⚠️  dropped {before - len(cards)} duplicate card_id rows")

    cards.to_csv(OUT_CARDS, index=False)
    print(f"✅ wrote {OUT_CARDS.name}  ({len(cards)} cards)")

    # ── Rewards ──────────────────────────────────────────────────────────────
    valid_ids = set(cards["card_id"])
    reward_rows: list[dict] = []
    parsed_count, no_data_count = 0, 0
    cat_counter = {c: 0 for c in CATEGORIES}

    for _, row in df.iterrows():
        cid = slugify(str(row.get("Card_Name") or "unknown"))
        if cid not in valid_ids:
            continue
        desc      = str(row.get("Reward_Description") or "")
        base_rate = float(pd.to_numeric(row.get("Reward_Rate"), errors="coerce") or 0)
        pt_value  = float(pd.to_numeric(row.get("Reward_Value_Per_Point_INR"),
                                        errors="coerce") or 0)
        rates = parse_rewards(desc, base_rate, pt_value, None)
        if not rates:
            no_data_count += 1
            continue
        parsed_count += 1
        for cat, rate in rates.items():
            reward_rows.append({"card_id": cid, "category": cat,
                                "rate_percent": rate})
            cat_counter[cat] += 1

    rewards = pd.DataFrame(reward_rows)
    # Dedup (card_id, category) — keep MAX rate per pair
    rewards = (rewards.groupby(["card_id", "category"], as_index=False)["rate_percent"]
                      .max())
    rewards.to_csv(OUT_REWARDS, index=False)
    print(f"✅ wrote {OUT_REWARDS.name}  ({len(rewards)} reward rows)")

    print()
    print(f"   parsed rewards for: {parsed_count}/{len(cards)} cards "
          f"({no_data_count} had no usable description)")
    print(f"   per-category counts: "
          + ", ".join(f"{c}={cat_counter[c]}" for c in CATEGORIES))

    # Sanity: every reward card_id must exist in cards
    orphan = set(rewards["card_id"]) - valid_ids
    if orphan:
        sys.exit(f"❌ orphan card_ids in rewards: {orphan}")
    print("🔗 referential integrity: OK (all reward.card_id ∈ cards.card_id)")


if __name__ == "__main__":
    main()
