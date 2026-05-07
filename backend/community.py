"""
community.py — Community Intelligence for CrediWise-AI

Features:
  1. Offer votes  — crowdsourced offer validation (upvote/downvote)
  2. Card combos  — user-submitted card stacks with city + persona
  3. Leaderboard  — top combos by city + persona with formatted display strings

All data stored locally in SQLite — no external service required.
"""

from __future__ import annotations
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import query, execute, get_connection, get_all_cards

# ─── Valid values ─────────────────────────────────────────────────────────────

PERSONAS = [
    "The Stealth Nomad",
    "The High-Street Architect",
    "The Reward Arbitrageur",
    "The Frugal Zen Master",
]

INDIAN_CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Chandigarh",
    "Kochi", "Indore", "Bhopal", "Nagpur", "Visakhapatnam", "Coimbatore",
    "Other",
]


# ─── Offer Votes ─────────────────────────────────────────────────────────────

def create_offer(
    card_id:    str,
    offer_text: str,
    offer_rate: float | None = None,
    offer_id:   str | None   = None,
) -> str:
    """
    Create a new offer entry to be voted on.
    Returns offer_id.
    """
    oid = offer_id or f"offer_{uuid.uuid4().hex[:12]}"
    execute(
        """INSERT OR IGNORE INTO offer_votes
           (offer_id, card_id, offer_text, offer_rate)
           VALUES (?,?,?,?)""",
        (oid, card_id, offer_text, offer_rate),
    )
    return oid


def vote_offer(offer_id: str, vote: str) -> dict:
    """
    Cast a vote on an offer.
    vote: "up" | "down"
    Returns updated vote counts + acceptance rate.
    """
    if vote not in ("up", "down"):
        raise ValueError("vote must be 'up' or 'down'")

    col = "upvotes" if vote == "up" else "downvotes"
    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE offer_votes SET {col} = {col} + 1, "
            f"last_updated = datetime('now') WHERE offer_id = ?",
            (offer_id,),
        )
        conn.commit()
    finally:
        conn.close()

    rows = query("SELECT * FROM offer_votes WHERE offer_id = ?", (offer_id,))
    if not rows:
        raise ValueError(f"offer_id '{offer_id}' not found.")
    return _enrich_offer(rows[0])


def get_offer(offer_id: str) -> dict | None:
    rows = query(
        """SELECT ov.*, c.name AS card_name, c.bank
           FROM offer_votes ov
           LEFT JOIN cards c ON ov.card_id = c.card_id
           WHERE ov.offer_id = ?""",
        (offer_id,),
    )
    return _enrich_offer(rows[0]) if rows else None


def get_offers_for_card(card_id: str) -> list[dict]:
    rows = query(
        """SELECT ov.*, c.name AS card_name, c.bank
           FROM offer_votes ov
           LEFT JOIN cards c ON ov.card_id = c.card_id
           WHERE ov.card_id = ?
           ORDER BY (ov.upvotes + ov.downvotes) DESC, ov.upvotes DESC""",
        (card_id,),
    )
    return [_enrich_offer(r) for r in rows]


def get_all_offers(min_votes: int = 0) -> list[dict]:
    """Return all offers, optionally filtered by minimum total votes."""
    rows = query(
        """SELECT ov.*, c.name AS card_name, c.bank
           FROM offer_votes ov
           LEFT JOIN cards c ON ov.card_id = c.card_id
           WHERE (ov.upvotes + ov.downvotes) >= ?
           ORDER BY ov.upvotes DESC, (ov.upvotes + ov.downvotes) DESC""",
        (min_votes,),
    )
    return [_enrich_offer(r) for r in rows]


def _acceptance_rate(upvotes: int, downvotes: int) -> float | None:
    """Return acceptance rate as a percentage, or None if no votes."""
    total = upvotes + downvotes
    if total == 0:
        return None
    return round(upvotes / total * 100, 1)


def _enrich_offer(row: dict) -> dict:
    """Add acceptance_rate + human-readable label to an offer row."""
    up    = row.get("upvotes", 0)
    down  = row.get("downvotes", 0)
    rate  = _acceptance_rate(up, down)
    total = up + down

    label = (
        f"{int(rate)}% of users confirmed this works"
        if rate is not None
        else "No votes yet — be the first!"
    )
    return {
        **row,
        "acceptance_rate": rate,
        "total_votes":     total,
        "label":           label,
    }


# ─── Card Combos ─────────────────────────────────────────────────────────────

def _combo_key(cards: list[str], city: str, persona: str) -> str:
    """Deterministic combo identifier: sorted card IDs + city + persona."""
    sorted_cards = sorted(cards)
    raw = f"{','.join(sorted_cards)}|{city.lower()}|{persona.lower()}"
    # Use first 16 chars of hex uuid derived from the string for readability
    import hashlib
    return "combo_" + hashlib.md5(raw.encode()).hexdigest()[:16]


def submit_combo(
    cards:     list[str],
    city:      str,
    persona:   str,
    nav_score: float,
) -> dict:
    """
    Submit or increment a card combo entry.
    If the same combo (same cards + city + persona) already exists,
    increment submissions and update nav_score to a running average.

    Returns the upserted combo dict.
    """
    if not cards:
        raise ValueError("At least one card is required.")

    combo_id   = _combo_key(cards, city, persona)
    cards_json = json.dumps(sorted(cards))

    existing = query(
        "SELECT * FROM card_combos WHERE combo_id = ?", (combo_id,)
    )
    conn = get_connection()
    try:
        if existing:
            row  = existing[0]
            n    = row["submissions"]
            # Running average nav_score
            new_nav = round((row["nav_score"] * n + nav_score) / (n + 1), 2)
            conn.execute(
                """UPDATE card_combos
                   SET submissions = submissions + 1,
                       nav_score   = ?,
                       updated_at  = datetime('now')
                   WHERE combo_id  = ?""",
                (new_nav, combo_id),
            )
        else:
            conn.execute(
                """INSERT INTO card_combos
                   (combo_id, cards_json, city, persona, nav_score)
                   VALUES (?,?,?,?,?)""",
                (combo_id, cards_json, city, persona, round(nav_score, 2)),
            )
        conn.commit()
    finally:
        conn.close()

    rows = query("SELECT * FROM card_combos WHERE combo_id = ?", (combo_id,))
    return _enrich_combo(rows[0]) if rows else {}


def get_leaderboard(
    city:    str | None = None,
    persona: str | None = None,
    top_n:   int = 5,
) -> list[dict]:
    """
    Return top combos by nav_score, optionally filtered by city and/or persona.
    Results are enriched with card names and a formatted display string.
    """
    params: list = []
    filters: list[str] = []

    if city:
        filters.append("LOWER(city) = LOWER(?)")
        params.append(city)
    if persona:
        filters.append("LOWER(persona) = LOWER(?)")
        params.append(persona)

    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    rows  = query(
        f"""SELECT * FROM card_combos
            {where}
            ORDER BY nav_score DESC, submissions DESC
            LIMIT ?""",
        tuple(params) + (top_n,),
    )
    return [_enrich_combo(r) for r in rows]


def get_all_combos_for_city(city: str) -> list[dict]:
    rows = query(
        "SELECT * FROM card_combos WHERE LOWER(city) = LOWER(?) ORDER BY nav_score DESC",
        (city,),
    )
    return [_enrich_combo(r) for r in rows]


def _enrich_combo(row: dict) -> dict:
    """Add card names, formatted display string, and submission metadata."""
    all_cards = {c["card_id"]: c["name"] for c in get_all_cards()}
    try:
        card_ids = json.loads(row.get("cards_json", "[]"))
    except (json.JSONDecodeError, TypeError):
        card_ids = []

    card_names = [all_cards.get(cid, cid) for cid in card_ids]
    combo_str  = " + ".join(card_names) if card_names else "Unknown combo"
    nav        = row.get("nav_score", 0)
    city       = row.get("city", "India")
    persona    = row.get("persona", "")

    # Format: "The Mumbai Optimal Stack for Reward Arbitrageurs: HDFC Regalia +
    #          Axis Ace + SBI SimplyCLICK — avg NAV ₹18,400/year"
    display = (
        f"The {city} Optimal Stack"
        + (f" for {persona}s" if persona else "")
        + f": {combo_str}"
        + (f" — avg NAV ₹{int(nav):,}/year" if nav else "")
    )

    return {
        **row,
        "card_ids":   card_ids,
        "card_names": card_names,
        "combo_str":  combo_str,
        "display":    display,
    }


def get_combo(combo_id: str) -> dict | None:
    rows = query("SELECT * FROM card_combos WHERE combo_id = ?", (combo_id,))
    return _enrich_combo(rows[0]) if rows else None


def delete_combo(combo_id: str) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute(
            "DELETE FROM card_combos WHERE combo_id = ?", (combo_id,)
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
