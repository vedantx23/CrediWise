"""
database.py — SQLite connection manager + migration runner for CrediWise-AI
"""

import sqlite3
import os
import json
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
DB_PATH    = BASE_DIR / "data" / "cards.db"
MIGRATIONS = BASE_DIR.parent / "migrations"


def get_connection() -> sqlite3.Connection:
    """Return a thread-safe SQLite connection with row_factory enabled."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def run_migrations() -> None:
    """Apply any unapplied migration SQL files in order."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    cur  = conn.cursor()

    # Bootstrap schema_migrations table if missing
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()

    applied = {row[0] for row in cur.execute("SELECT version FROM schema_migrations")}

    migration_files = sorted(MIGRATIONS.glob("*.sql"))
    for mf in migration_files:
        # Extract version number from filename prefix, e.g. "001_" → 1
        try:
            version = int(mf.name.split("_")[0])
        except ValueError:
            continue

        if version in applied:
            continue

        print(f"  ↳ Applying migration {mf.name} …")
        sql_text = mf.read_text(encoding="utf-8")

        # Execute each statement separately (sqlite3 doesn't support executescript in WAL mode cleanly)
        statements = [s.strip() for s in sql_text.split(";") if s.strip()]
        for stmt in statements:
            try:
                cur.execute(stmt)
            except sqlite3.Error as e:
                # Skip harmless "already exists" / duplicate key errors
                if "already exists" in str(e) or "UNIQUE constraint" in str(e):
                    continue
                print(f"    ⚠ Warning in {mf.name}: {e}\n    SQL: {stmt[:80]}")
        conn.commit()

        # Record this migration (might already be inserted by the SQL itself)
        cur.execute("INSERT OR IGNORE INTO schema_migrations(version) VALUES (?)", (version,))
        conn.commit()
        print(f"  ✓ Migration {version} applied.")

    conn.close()


def dict_from_row(row: sqlite3.Row) -> dict:
    """Convert a sqlite3.Row to a plain dict."""
    return dict(row)


def query(sql: str, params: tuple = ()) -> list[dict]:
    """Run a SELECT query and return list of dicts."""
    conn = get_connection()
    try:
        cur = conn.execute(sql, params)
        return [dict_from_row(r) for r in cur.fetchall()]
    finally:
        conn.close()


def execute(sql: str, params: tuple = ()) -> int:
    """Run an INSERT/UPDATE/DELETE; returns lastrowid."""
    conn = get_connection()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def execute_many(sql: str, params_list: list[tuple]) -> None:
    """Run executemany for batch inserts."""
    conn = get_connection()
    try:
        conn.executemany(sql, params_list)
        conn.commit()
    finally:
        conn.close()


# ── Convenience helpers ──────────────────────────────────────────────────────

def get_all_cards() -> list[dict]:
    return query("SELECT * FROM cards ORDER BY bank, name")


def get_card_rewards(card_id: str) -> list[dict]:
    return query(
        "SELECT * FROM reward_categories WHERE card_id = ? ORDER BY category",
        (card_id,)
    )


def get_all_rewards_map() -> dict[str, dict[str, float]]:
    """
    Returns {card_id: {category: rate_percent}} for fast lookup.
    Used by the Shadow Audit engine.
    """
    rows = query("SELECT card_id, category, rate_percent FROM reward_categories")
    result: dict[str, dict[str, float]] = {}
    for row in rows:
        result.setdefault(row["card_id"], {})[row["category"]] = row["rate_percent"]
    return result


def get_user(user_id: str) -> dict | None:
    rows = query("SELECT * FROM users WHERE user_id = ?", (user_id,))
    return rows[0] if rows else None


def get_user_cards(user_id: str) -> list[str]:
    rows = query("SELECT card_id FROM user_cards WHERE user_id = ?", (user_id,))
    return [r["card_id"] for r in rows]


def upsert_user_spend(user_id: str, month: str, spend: dict) -> None:
    cols = ["dining", "fuel", "grocery", "travel", "online", "utilities", "international", "other"]
    vals = [spend.get(c, 0) for c in cols]
    execute(
        f"""INSERT INTO user_spend (user_id, month, {', '.join(cols)})
            VALUES (?, ?, {', '.join('?' * len(cols))})
            ON CONFLICT(user_id, month) DO UPDATE SET
            {', '.join(f'{c}=excluded.{c}' for c in cols)}""",
        (user_id, month, *vals),
    )


if __name__ == "__main__":
    print("🔧 Running CrediWise-AI database migrations…")
    run_migrations()
    print("\n✅ Database ready at:", DB_PATH)

    # Quick sanity check
    cards = get_all_cards()
    print(f"\n📊 Cards seeded: {len(cards)}")
    for c in cards:
        print(f"   {c['card_id']:25s} {c['bank']:20s} {c['name']}")

    rewards = get_all_rewards_map()
    total_rates = sum(len(v) for v in rewards.values())
    print(f"\n🎯 Reward rate entries: {total_rates}")
