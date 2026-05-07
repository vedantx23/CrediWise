"""
audit_engine — Shadow Audit Engine subpackage (spec-aligned namespace).

Re-exports the public surface of audit_engine_core so callers can use
either:
    from audit_engine import run_audit
    from audit_engine_core import run_audit
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from audit_engine_core import (   # noqa: F401,E402
    run_audit,
    CATEGORIES,
    CAT_LABEL,
    APPROVAL_HARD_FLOOR,
    _capped_monthly_reward,
    _annual_card_reward,
    _best_per_category_in_wallet,
    _wallet_nav,
    _compute_shap,
    _best_rates_for_wallet,
    _compute_nav,
    _build_reason,
    _build_top_reasons,
    _find_recommendations,
    _build_split_plays,
    _leakage_message,
)

__all__ = [
    "run_audit", "CATEGORIES", "CAT_LABEL",
    "_find_recommendations", "_build_split_plays",
]
