"""
feature_engineering.py — Per-card derived features.

Computes:
  - reward_rate_index:        weighted average reward % across categories
                              (capped, normalised to a 0–1 score).
  - travel_index:             composite of lounge access, travel rate,
                              forex markup → 0–1 score.
  - fee_waiver_threshold_band: 'easy' (<3 L) | 'medium' (<8 L) |
                              'hard' (>=8 L) | 'none'.

Output is persisted to a `card_features` table so the recommender / UI
can query it without recomputing.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database import get_connection, get_all_cards, get_all_rewards_map, get_all_caps_map  # noqa: E402

# Equal weights across the 8 spec categories (overridable by caller)
DEFAULT_WEIGHTS = {
    "dining": 1.0, "fuel": 1.0, "grocery": 1.0, "travel": 1.0,
    "online": 1.0, "utilities": 1.0, "international": 1.0, "other": 1.0,
}
TRAVEL_CATS = ("travel", "international")


def _ensure_table() -> None:
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS card_features (
            card_id                  TEXT PRIMARY KEY REFERENCES cards(card_id),
            reward_rate_index        REAL,
            travel_index             REAL,
            fee_waiver_threshold_band TEXT,
            updated_at               TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()


def reward_rate_index(rates: dict[str, float],
                      weights: dict[str, float] | None = None) -> float:
    """Weighted-average reward rate, normalised to 0–1 (rate=10% ⇒ 1.0)."""
    w = weights or DEFAULT_WEIGHTS
    num = sum(rates.get(c, 0.0) * w.get(c, 1.0) for c in w)
    den = sum(w.values()) or 1.0
    avg_pct = num / den
    return round(min(1.0, avg_pct / 10.0), 4)


def travel_index(rates: dict[str, float], meta: dict) -> float:
    """0–1 composite: travel reward rates + lounges − forex markup."""
    travel_rate = max(rates.get(c, 0.0) for c in TRAVEL_CATS) if rates else 0.0
    rate_score  = min(1.0, travel_rate / 10.0)            # 10% caps at 1.0
    lounge      = int(meta.get("lounge_domestic") or 0) + 2 * int(meta.get("lounge_intl") or 0)
    lounge_score = min(1.0, lounge / 30.0)                # 30 lounge units = full
    forex       = float(meta.get("forex_markup_pct") or 3.5)
    forex_score = max(0.0, 1.0 - forex / 5.0)             # 0% markup = 1.0, 5% = 0
    return round(0.45 * rate_score + 0.4 * lounge_score + 0.15 * forex_score, 4)


def fee_waiver_threshold_band(card: dict) -> str:
    if int(card.get("annual_fee") or 0) == 0 or int(card.get("is_lifetime_free") or 0) == 1:
        return "none"
    spend = card.get("fee_waiver_spend")
    if spend is None:
        return "hard"
    spend = float(spend)
    if spend < 300_000:    return "easy"
    if spend < 800_000:    return "medium"
    return "hard"


def build_card_features() -> list[dict]:
    """Compute features for every card and upsert into `card_features`."""
    _ensure_table()
    conn = get_connection()
    cur  = conn.cursor()

    cards   = get_all_cards()
    rewards = get_all_rewards_map()       # {card_id: {cat: rate%}}
    out: list[dict] = []
    for c in cards:
        cid   = c["card_id"]
        rates = rewards.get(cid, {})
        rri   = reward_rate_index(rates)
        ti    = travel_index(rates, c)
        band  = fee_waiver_threshold_band(c)
        cur.execute(
            "INSERT OR REPLACE INTO card_features "
            "(card_id, reward_rate_index, travel_index, fee_waiver_threshold_band) "
            "VALUES (?, ?, ?, ?)",
            (cid, rri, ti, band),
        )
        out.append({
            "card_id": cid,
            "reward_rate_index": rri,
            "travel_index": ti,
            "fee_waiver_threshold_band": band,
        })
    conn.commit()
    return out


if __name__ == "__main__":
    rows = build_card_features()
    print(f"✓ Built features for {len(rows)} cards")
    for r in rows[:5]:
        print(f"  {r}")
