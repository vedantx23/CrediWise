"""
csv_loader.py — CSV → SQLite ingestion for the card catalogue.

Two CSV shapes are supported:

1. cards.csv
   Required columns:
     card_id, bank, name, annual_fee
   Optional columns (any subset):
     fee_waiver_spend, lounge_domestic, lounge_intl, forex_markup_pct,
     interest_rate_monthly, min_income_annual, min_cibil, is_invite_only,
     is_lifetime_free, is_customizable, joining_fee, card_network

2. rewards.csv
   Required columns:
     card_id, category, rate_percent
   Optional columns:
     monthly_cap_inr, notes

Usage:
    from data_pipeline import load_cards_from_csv, load_rewards_from_csv
    n_cards   = load_cards_from_csv("cards.csv")
    n_rewards = load_rewards_from_csv("rewards.csv")
"""
from __future__ import annotations

import csv
import sys
import os
from pathlib import Path
from typing import Iterable

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database import get_connection   # noqa: E402

CARD_COLS = [
    "card_id", "bank", "name", "annual_fee", "fee_waiver_spend",
    "lounge_domestic", "lounge_intl", "forex_markup_pct",
    "interest_rate_monthly", "min_income_annual", "min_cibil",
    "is_invite_only", "is_lifetime_free", "is_customizable",
    "joining_fee", "card_network",
]
REWARD_COLS = ["card_id", "category", "rate_percent", "monthly_cap_inr", "notes"]

NUMERIC = {
    "annual_fee", "fee_waiver_spend", "lounge_domestic", "lounge_intl",
    "forex_markup_pct", "interest_rate_monthly", "min_income_annual",
    "min_cibil", "is_invite_only", "is_lifetime_free", "is_customizable",
    "joining_fee", "rate_percent", "monthly_cap_inr",
}


def _coerce(col: str, value: str):
    """Cast CSV string to numeric where appropriate; '' → None."""
    if value is None or value == "":
        return None
    if col in NUMERIC:
        try:
            f = float(value)
            return int(f) if col in {
                "lounge_domestic", "lounge_intl", "min_cibil",
                "is_invite_only", "is_lifetime_free", "is_customizable",
            } else f
        except ValueError:
            return None
    return value


def _read_csv(path: str | Path) -> list[dict]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"CSV not found: {p}")
    with p.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_cards_from_csv(csv_path: str | Path) -> int:
    """Upsert each row from cards.csv into the cards table. Returns count."""
    rows = _read_csv(csv_path)
    if not rows:
        return 0

    conn = get_connection()
    cur  = conn.cursor()
    n    = 0
    for raw in rows:
        if not raw.get("card_id"):
            continue
        present = [c for c in CARD_COLS if c in raw]
        values  = [_coerce(c, raw.get(c, "")) for c in present]
        placeholders = ", ".join("?" for _ in present)
        cols_sql     = ", ".join(present)
        cur.execute(
            f"INSERT OR REPLACE INTO cards ({cols_sql}) VALUES ({placeholders})",
            values,
        )
        n += 1
    conn.commit()
    return n


def load_rewards_from_csv(csv_path: str | Path) -> int:
    """Upsert reward_categories rows. Returns count."""
    rows = _read_csv(csv_path)
    if not rows:
        return 0

    conn = get_connection()
    cur  = conn.cursor()
    n    = 0
    for raw in rows:
        if not raw.get("card_id") or not raw.get("category"):
            continue
        present = [c for c in REWARD_COLS if c in raw]
        values  = [_coerce(c, raw.get(c, "")) for c in present]

        # Use UNIQUE(card_id,category) to upsert
        cur.execute(
            "DELETE FROM reward_categories WHERE card_id = ? AND category = ?",
            (raw["card_id"], raw["category"]),
        )
        placeholders = ", ".join("?" for _ in present)
        cols_sql     = ", ".join(present)
        cur.execute(
            f"INSERT INTO reward_categories ({cols_sql}) VALUES ({placeholders})",
            values,
        )
        n += 1
    conn.commit()
    return n


# ──  CLI entrypoint:  python -m data_pipeline.csv_loader cards.csv rewards.csv
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m data_pipeline.csv_loader <cards.csv> [rewards.csv]")
        sys.exit(1)
    nc = load_cards_from_csv(sys.argv[1])
    print(f"  ✓ Loaded {nc} cards")
    if len(sys.argv) >= 3:
        nr = load_rewards_from_csv(sys.argv[2])
        print(f"  ✓ Loaded {nr} reward rows")
