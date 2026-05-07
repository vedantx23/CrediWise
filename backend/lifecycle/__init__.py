"""
lifecycle — Lifecycle management subpackage.

Bundles the three lifecycle subsystems mandated by the research spec:
  * Downgrade Detector       (downgrade_detector.py)
  * Life Event Simulator     (life_event_simulator.py)
  * Reward Expiry Tracker    (reward_tracker.py)

Re-exports their public surfaces.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Downgrade detector ──────────────────────────────────────────────────────
from downgrade_detector import (   # noqa: F401,E402
    run_downgrade_check,
    get_active_alerts,
    acknowledge_alert,
    acknowledge_all_alerts,
    get_rate_history_for_card,
    snapshot_current_rates,
    write_snapshot,
    init_downgrade_scheduler,
)

# ── Life event simulator ────────────────────────────────────────────────────
from life_event_simulator import (   # noqa: F401,E402
    simulate_marriage,
    simulate_salary_hike,
    simulate_emi_purchase,
)

# ── Reward expiry tracker ───────────────────────────────────────────────────
from reward_tracker import (   # noqa: F401,E402
    add_reward_expiry,
    get_user_expiries,
    run_expiry_check,
    init_scheduler,
)

__all__ = [
    # downgrade
    "run_downgrade_check", "get_active_alerts", "acknowledge_alert",
    "acknowledge_all_alerts", "get_rate_history_for_card",
    "snapshot_current_rates", "write_snapshot", "init_downgrade_scheduler",
    # life events
    "simulate_marriage", "simulate_salary_hike", "simulate_emi_purchase",
    # reward expiries
    "add_reward_expiry", "get_user_expiries", "run_expiry_check", "init_scheduler",
]
