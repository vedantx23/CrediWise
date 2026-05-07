"""
recommendation — Unified RecommendationEngine subpackage.

Re-exports recommendation_engine.py to satisfy the spec layout:
    from recommendation import RecommendationEngine, recommend
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from recommendation_engine import (   # noqa: F401,E402
    RecommendationEngine,
    recommend,
)

__all__ = ["RecommendationEngine", "recommend"]
