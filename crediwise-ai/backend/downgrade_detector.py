"""
downgrade_detector.py — Stealth Downgrade Detector for CrediWise-AI

Pipeline (runs weekly via APScheduler):
  1. Snapshot current reward rates from SQLite (cards + reward_categories)
  2. Compare to most recent snapshot in card_rate_history
  3. Any decrease → write to downgrade_alerts
  4. Return alerts enriched with ₹ extra-loss/year calculation

Competitive moat: card_rate_history accumulates over time — historical rate
data nobody else has, making CrediWise-AI increasingly valuable over years.
"""

from __future__ import annotations
import sys
from pathlib import Path
from datetime import date, datetime
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import query, execute, get_connection, get_all_cards, get_all_rewards_map

# ─── Constants ────────────────────────────────────────────────────────────────

CATEGORIES = ["dining", "fuel", "grocery", "travel", "online",
              "utilities", "international"]

# Default monthly spend assumptions for ₹ loss calculation (used when no user
# context is available — represents a typical urban Indian spender)
DEFAULT_MONTHLY_SPEND: dict[str, float] = {
    "dining":        5000.0,
    "fuel":          3000.0,
    "grocery":       4000.0,
    "travel":        3000.0,
    "online":        6000.0,
    "utilities":     2000.0,
    "international": 1000.0,
}


# ─── Snapshot ─────────────────────────────────────────────────────────────────

def snapshot_current_rates() -> dict[str, dict[str, float]]:
    """
    Read current reward rates from reward_categories table.
    Returns {card_id: {category: rate_percent}}.
    """
    return get_all_rewards_map()


def get_latest_history() -> dict[str, dict[str, float]]:
    """
    Get the most recent scraped rate for each (card_id, category) pair
    from card_rate_history.
    Returns {card_id: {category: rate_percent}}.
    """
    rows = query(
        """SELECT card_id, category, rate_percent
           FROM card_rate_history h1
           WHERE scraped_date = (
               SELECT MAX(scraped_date) FROM card_rate_history h2
               WHERE h2.card_id = h1.card_id AND h2.category = h1.category
           )""",
    )
    result: dict[str, dict[str, float]] = {}
    for row in rows:
        result.setdefault(row["card_id"], {})[row["category"]] = row["rate_percent"]
    return result


def get_rate_history_for_card(
    card_id: str,
    category: str | None = None,
    limit: int = 52,
) -> list[dict]:
    """
    Return chronological rate history for a card (optionally filtered by category).
    Returns up to `limit` rows (1 year of weekly snapshots by default).
    """
    if category:
        return query(
            """SELECT card_id, category, rate_percent, scraped_date
               FROM card_rate_history
               WHERE card_id = ? AND category = ?
               ORDER BY scraped_date ASC
               LIMIT ?""",
            (card_id, category, limit),
        )
    return query(
        """SELECT card_id, category, rate_percent, scraped_date
           FROM card_rate_history
           WHERE card_id = ?
           ORDER BY scraped_date ASC, category ASC
           LIMIT ?""",
        (card_id, limit),
    )


# ─── Write snapshot to history ────────────────────────────────────────────────

def write_snapshot(rates: dict[str, dict[str, float]], snap_date: str | None = None) -> int:
    """
    Persist current rates to card_rate_history.
    Skips duplicates (same card_id + category + date).
    Returns number of rows written.
    """
    today     = snap_date or date.today().isoformat()
    conn      = get_connection()
    written   = 0
    for card_id, categories in rates.items():
        for cat, rate in categories.items():
            try:
                conn.execute(
                    """INSERT OR IGNORE INTO card_rate_history
                       (card_id, category, rate_percent, scraped_date)
                       VALUES (?,?,?,?)""",
                    (card_id, cat, rate, today),
                )
                written += 1
            except Exception:
                pass
    conn.commit()
    return written


# ─── Diff engine ─────────────────────────────────────────────────────────────

def diff_rates(
    current: dict[str, dict[str, float]],
    previous: dict[str, dict[str, float]],
) -> list[dict]:
    """
    Compare current rates vs previous snapshot.
    Returns list of downgrade dicts for any rate that decreased.

    Each downgrade dict:
    {
      "card_id":   str,
      "category":  str,
      "old_rate":  float,
      "new_rate":  float,
      "drop_pct":  float,   # absolute drop in percentage points
      "drop_pct_relative": float,  # relative drop %
    }
    """
    downgrades = []
    for card_id, current_cats in current.items():
        prev_cats = previous.get(card_id, {})
        for cat, new_rate in current_cats.items():
            old_rate = prev_cats.get(cat)
            if old_rate is None:
                continue    # no prior data for this card+category — skip
            if new_rate < old_rate - 0.001:   # tolerance for float drift
                drop_abs = round(old_rate - new_rate, 4)
                drop_rel = round((drop_abs / old_rate) * 100, 1) if old_rate > 0 else 0
                downgrades.append({
                    "card_id":           card_id,
                    "category":          cat,
                    "old_rate":          old_rate,
                    "new_rate":          new_rate,
                    "drop_pct":          drop_abs,
                    "drop_pct_relative": drop_rel,
                })
    return downgrades


# ─── Extra loss calculation ───────────────────────────────────────────────────

def compute_extra_loss(
    category: str,
    old_rate: float,
    new_rate: float,
    monthly_spend: dict[str, float] | None = None,
) -> float:
    """
    Calculate annual ₹ extra loss due to a rate downgrade.
    extra_loss = (old_rate - new_rate) / 100 * monthly_spend * 12
    """
    spend_map = monthly_spend or DEFAULT_MONTHLY_SPEND
    monthly   = spend_map.get(category, DEFAULT_MONTHLY_SPEND.get(category, 0.0))
    return round((old_rate - new_rate) / 100 * monthly * 12, 2)


# ─── Alert storage ────────────────────────────────────────────────────────────

def save_downgrade_alert(
    card_id:       str,
    category:      str,
    old_rate:      float,
    new_rate:      float,
    extra_loss:    float,
    detected_date: str | None = None,
) -> int:
    """Insert a downgrade alert into downgrade_alerts. Returns row id."""
    today = detected_date or date.today().isoformat()
    return execute(
        """INSERT INTO downgrade_alerts
           (card_id, category, old_rate, new_rate, extra_loss_annual, detected_date)
           VALUES (?,?,?,?,?,?)""",
        (card_id, category, old_rate, new_rate, extra_loss, today),
    )


def get_active_alerts(card_ids: list[str] | None = None) -> list[dict]:
    """
    Return unacknowledged downgrade alerts, optionally filtered by card_ids.
    Enriched with card name + bank.
    """
    if card_ids:
        placeholders = ",".join("?" * len(card_ids))
        rows = query(
            f"""SELECT da.*, c.name AS card_name, c.bank
                FROM downgrade_alerts da
                LEFT JOIN cards c ON da.card_id = c.card_id
                WHERE da.acknowledged = 0
                  AND da.card_id IN ({placeholders})
                ORDER BY da.detected_date DESC, da.extra_loss_annual DESC""",
            tuple(card_ids),
        )
    else:
        rows = query(
            """SELECT da.*, c.name AS card_name, c.bank
               FROM downgrade_alerts da
               LEFT JOIN cards c ON da.card_id = c.card_id
               WHERE da.acknowledged = 0
               ORDER BY da.detected_date DESC, da.extra_loss_annual DESC""",
        )
    return [_enrich_alert(r) for r in rows]


def acknowledge_alert(alert_id: int) -> bool:
    """Mark a single alert as acknowledged."""
    conn = get_connection()
    try:
        cur = conn.execute(
            "UPDATE downgrade_alerts SET acknowledged = 1 WHERE id = ?",
            (alert_id,),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def acknowledge_all_alerts(card_id: str | None = None) -> int:
    """Acknowledge all (or all alerts for a specific card). Returns count."""
    conn = get_connection()
    try:
        if card_id:
            cur = conn.execute(
                "UPDATE downgrade_alerts SET acknowledged = 1 WHERE card_id = ? AND acknowledged = 0",
                (card_id,),
            )
        else:
            cur = conn.execute(
                "UPDATE downgrade_alerts SET acknowledged = 1 WHERE acknowledged = 0",
            )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def _enrich_alert(row: dict) -> dict:
    """Add human-readable message + banner text to an alert row."""
    card_name = row.get("card_name") or row["card_id"]
    cat       = row["category"]
    old_r     = row["old_rate"]
    new_r     = row["new_rate"]
    loss      = row.get("extra_loss_annual") or 0

    message = (
        f"ALERT: Your {card_name} reward rate on {cat} dropped "
        f"from {old_r:.2f}% to {new_r:.2f}% — "
        f"you are now losing ₹{int(loss):,} extra per year."
    )
    return {**row, "message": message}


# ─── Full weekly pipeline ─────────────────────────────────────────────────────

def run_downgrade_check(
    monthly_spend: dict[str, float] | None = None,
    force_date: str | None = None,
) -> dict:
    """
    Full downgrade detection pipeline:
      1. Snapshot current rates
      2. Compare to last stored snapshot
      3. Save any downgrades as alerts
      4. Persist current rates to history

    Returns:
    {
      "snapshot_written":  int,
      "downgrades_found":  int,
      "alerts":            [alert_dict, ...],
      "run_date":          str,
      "had_previous_data": bool,
    }
    """
    run_date = force_date or date.today().isoformat()

    current  = snapshot_current_rates()
    previous = get_latest_history()
    had_prev = bool(previous)

    downgrades = diff_rates(current, previous) if had_prev else []

    alerts = []
    for dg in downgrades:
        loss = compute_extra_loss(
            dg["category"], dg["old_rate"], dg["new_rate"], monthly_spend
        )
        alert_id = save_downgrade_alert(
            card_id       = dg["card_id"],
            category      = dg["category"],
            old_rate      = dg["old_rate"],
            new_rate      = dg["new_rate"],
            extra_loss    = loss,
            detected_date = run_date,
        )
        alert_row = {
            "id":               alert_id,
            "card_id":          dg["card_id"],
            "category":         dg["category"],
            "old_rate":         dg["old_rate"],
            "new_rate":         dg["new_rate"],
            "drop_pct":         dg["drop_pct"],
            "extra_loss_annual": loss,
            "detected_date":    run_date,
        }
        alerts.append(_enrich_alert({
            **alert_row,
            "card_name": None,   # will be filled by get_active_alerts on next fetch
        }))

    written = write_snapshot(current, snap_date=run_date)

    if downgrades:
        print(f"[DowngradeDetector] ⚠️  {len(downgrades)} downgrade(s) detected on {run_date}:")
        for dg in downgrades:
            print(f"   {dg['card_id']} / {dg['category']}: "
                  f"{dg['old_rate']}% → {dg['new_rate']}% "
                  f"(−{dg['drop_pct']}pp)")
    else:
        print(f"[DowngradeDetector] ✅ No downgrades detected on {run_date}. "
              f"Snapshot: {written} rates stored.")

    return {
        "snapshot_written":  written,
        "downgrades_found":  len(downgrades),
        "alerts":            alerts,
        "run_date":          run_date,
        "had_previous_data": had_prev,
    }


# ─── APScheduler job ─────────────────────────────────────────────────────────

_dd_scheduler_started = False


def init_downgrade_scheduler(app=None) -> None:
    """
    Register weekly downgrade check with the APScheduler instance.
    Called once from app.py alongside init_scheduler().
    Runs every Sunday at 02:00 IST.
    """
    global _dd_scheduler_started
    import os

    if os.environ.get("WERKZEUG_RUN_MAIN") == "false":
        return
    if _dd_scheduler_started:
        return

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
        scheduler.add_job(
            run_downgrade_check,
            trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
            id="downgrade_check_weekly",
            replace_existing=True,
            misfire_grace_time=7200,
        )
        scheduler.start()
        _dd_scheduler_started = True
        print("[DowngradeDetector] Scheduler started — weekly check every Sunday 02:00 IST.")
    except Exception as e:
        print(f"[DowngradeDetector] Scheduler failed to start: {e}")
