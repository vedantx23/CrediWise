"""
reward_tracker.py — Reward expiry tracker + APScheduler nightly job

Stores reward expiry dates in SQLite.
Nightly cron checks for rewards expiring within 30 days.
Flags user with redemption suggestion.
"""

from __future__ import annotations
import sys, os
from pathlib import Path
from datetime import date, timedelta, datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_connection, query, execute

EXPIRY_WARN_DAYS = 30   # flag this many days before expiry


# ─── Storage ─────────────────────────────────────────────────────────────────

def add_reward_expiry(
    user_id:      str,
    card_id:      str,
    points_amount: float,
    expiry_date:  str,           # ISO date: YYYY-MM-DD
    redemption_suggestion: str = "",
) -> int:
    """Insert or update a reward expiry record. Returns row id."""
    return execute(
        """INSERT INTO reward_expiry
           (user_id, card_id, points_amount, expiry_date, redemption_suggestion)
           VALUES (?,?,?,?,?)""",
        (user_id, card_id, points_amount, expiry_date, redemption_suggestion),
    )


def get_user_expiries(user_id: str) -> list[dict]:
    """Return all reward expiry rows for a user, ordered by expiry date."""
    return query(
        """SELECT re.*, c.name AS card_name, c.bank
           FROM reward_expiry re
           LEFT JOIN cards c ON re.card_id = c.card_id
           WHERE re.user_id = ?
           ORDER BY re.expiry_date ASC""",
        (user_id,),
    )


def get_expiring_soon(days: int = EXPIRY_WARN_DAYS) -> list[dict]:
    """Return all reward_expiry rows expiring within `days` days (all users)."""
    cutoff = (date.today() + timedelta(days=days)).isoformat()
    today  = date.today().isoformat()
    return query(
        """SELECT re.*, c.name AS card_name, c.bank
           FROM reward_expiry re
           LEFT JOIN cards c ON re.card_id = c.card_id
           WHERE re.expiry_date <= ?
             AND re.expiry_date >= ?
             AND re.flagged = 0
           ORDER BY re.expiry_date ASC""",
        (cutoff, today),
    )


# ─── Nightly check job ────────────────────────────────────────────────────────

def _build_redemption_hint(card_name: str, points: float) -> str:
    """Generate a redemption suggestion based on card type."""
    pts = int(points)
    hints = {
        "hdfc":     f"Redeem {pts:,} pts via HDFC SmartBuy (flights/vouchers) for max value.",
        "icici":    f"Redeem {pts:,} PAYBACK pts via iShop/partner merchants.",
        "axis":     f"Redeem {pts:,} EDGE pts via Axis Mobile app → vouchers.",
        "sbi":      f"Redeem {pts:,} pts via SBI Card portal → movie vouchers / Amazon.",
        "amex":     f"Transfer {pts:,} MR pts to airline miles (1:1 ratio) before expiry.",
        "kotak":    f"Redeem {pts:,} pts via Kotak rewards portal → cashback.",
        "indusind": f"Redeem {pts:,} pts via IndusMoments → Amazon / Flipkart vouchers.",
        "au":       f"Redeem {pts:,} pts via AU rewards catalogue.",
    }
    name_lower = card_name.lower()
    for key, hint in hints.items():
        if key in name_lower:
            return hint
    return f"Redeem {pts:,} reward points before they expire — log in to your card portal."


def run_expiry_check() -> list[dict]:
    """
    Nightly job: scan for rewards expiring within 30 days,
    flag them, and return alert records.
    """
    expiring = get_expiring_soon(EXPIRY_WARN_DAYS)
    alerts   = []

    for row in expiring:
        exp_date    = row["expiry_date"]
        card_name   = row.get("card_name", row["card_id"])
        days_left   = (
            datetime.strptime(exp_date, "%Y-%m-%d").date() - date.today()
        ).days

        suggestion = (
            row.get("redemption_suggestion")
            or _build_redemption_hint(card_name, row["points_amount"])
        )

        alert = {
            "user_id":      row["user_id"],
            "card_id":      row["card_id"],
            "card_name":    card_name,
            "points":       row["points_amount"],
            "expiry_date":  exp_date,
            "days_left":    days_left,
            "suggestion":   suggestion,
            "message": (
                f"⚠️  {int(row['points_amount']):,} reward points on your "
                f"{card_name} expire in {days_left} day{'s' if days_left != 1 else ''} "
                f"({exp_date}). {suggestion}"
            ),
        }
        alerts.append(alert)

        # Mark as flagged so we don't re-alert tomorrow
        execute(
            "UPDATE reward_expiry SET flagged = 1 WHERE id = ?",
            (row["id"],),
        )

    if alerts:
        print(f"[RewardTracker] Flagged {len(alerts)} expiring reward(s).")
    return alerts


# ─── APScheduler setup ───────────────────────────────────────────────────────

_scheduler = None


def init_scheduler(app=None) -> None:
    """
    Start the APScheduler background scheduler.
    Safe to call multiple times — only starts once.
    Avoids double-start in Flask debug reloader.
    """
    global _scheduler

    # In Flask debug mode, the reloader spawns a child process marked with
    # WERKZEUG_RUN_MAIN=true. Only start scheduler in the child.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "false":
        return
    if _scheduler is not None:
        return

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        _scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
        _scheduler.add_job(
            run_expiry_check,
            trigger=CronTrigger(hour=0, minute=5),
            id="reward_expiry_check",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        _scheduler.start()
        print("[RewardTracker] Scheduler started — nightly expiry check at 00:05 IST.")
    except Exception as e:
        print(f"[RewardTracker] Scheduler failed to start: {e}")


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
