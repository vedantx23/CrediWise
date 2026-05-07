"""
recommendation_engine.py — Unified RecommendationEngine

Composes the existing modules into a single entry point that mirrors the
research-spec pipeline:

    User Profile  →  Audit (NAV + leakage)
                  →  Eligibility filter
                  →  Approval-probability layer
                  →  Persona alignment boost
                  →  Top-k ranked recommendations + explanations

Public API:
    from recommendation_engine import RecommendationEngine
    engine = RecommendationEngine()
    result = engine.recommend(user_profile, k=3)

`user_profile` shape (same as audit_engine.run_audit):
    {
      "monthly_spend":   {"dining": 8000, "fuel": 4000, ...},
      "current_cards":   ["hdfc_millennia", ...],
      "income_annual":   1_200_000,
      "cibil_score":     780,
    }
"""
from __future__ import annotations

import sys, os
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from audit_engine        import run_audit
from approval_predictor  import predict_approval, _load_models as _load_approval_models  # noqa
try:
    from persona_engine import predict_persona
    _HAS_PERSONA = True
except Exception:    # pragma: no cover
    _HAS_PERSONA = False


class RecommendationEngine:
    """Thin orchestrator over audit + approval + persona modules."""

    def __init__(self, approval_floor: float = 0.30):
        self.approval_floor = approval_floor

    # ── Public ───────────────────────────────────────────────────────────────
    def recommend(self, user_profile: dict, k: int = 3) -> dict:
        """Run the full pipeline and return a dict ready for the API/UI."""
        audit = run_audit(user_profile)

        # Treat as truly unaudited only when there's no spend at all.
        # Empty wallet (status='unaudited' but spend > 0) is a valid
        # "recommend my first card" scenario — surface recs as usual.
        if audit.get("status") == "unaudited" and not audit.get("recommendations"):
            return {
                "status":          "unaudited",
                "message":         audit.get("message"),
                "audit":           audit,
                "recommendations": [],
                "persona":         None,
            }

        recs = audit.get("recommendations", [])[:k]

        # Audit already attaches `approval_probability` and `adjusted_score`.
        # We add a normalized expected-value field to make the UI math obvious.
        for r in recs:
            p   = r.get("approval_probability")
            ev  = r["marginal_nav"] * (p if p is not None else 1.0)
            r["expected_annual_value"] = round(ev, 2)

        persona = self._safe_persona(user_profile)
        if persona:
            self._apply_persona_boost(recs, persona)
            recs.sort(key=lambda x: -x.get("adjusted_score", x["marginal_nav"]))

        return {
            "status":          audit.get("status"),
            "message":         audit.get("message"),
            "leakage_inr":     audit.get("leakage_inr"),
            "current_nav":     audit.get("current_nav_annual"),
            "optimal_nav":     audit.get("optimal_nav_annual"),
            "audit":           audit,
            "persona":         persona,
            "recommendations": recs,
            "split_plays":     audit.get("split_plays", []),
        }

    # ── Internals ────────────────────────────────────────────────────────────
    def _safe_persona(self, user_profile: dict) -> dict | None:
        if not _HAS_PERSONA:
            return None
        try:
            spend = user_profile.get("monthly_spend", {})
            return predict_persona(
                monthly_spend = spend,
                income_annual = float(user_profile.get("income_annual", 0)),
                cards_count   = len(user_profile.get("current_cards", [])),
                current_cards = user_profile.get("current_cards", []),
                cibil_score   = int(user_profile.get("cibil_score", 700)),
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("persona prediction failed: %s", e)
            return None

    def _apply_persona_boost(self, recs: list[dict], persona: dict) -> None:
        """Mild rerank nudge (+5%) for cards aligned with the user's persona."""
        # persona['recommendations'] is a list of dicts with card_id
        ideal_ids = set()
        for r in (persona.get("recommendations") or []):
            cid = r.get("card_id") if isinstance(r, dict) else r
            if cid:
                ideal_ids.add(cid)
        if not ideal_ids:
            return
        for r in recs:
            if r["card_id"] in ideal_ids:
                r["persona_aligned"] = True
                base = r.get("adjusted_score", r["marginal_nav"])
                r["adjusted_score"] = round(base * 1.05, 2)
            else:
                r.setdefault("persona_aligned", False)


# ─── Convenience function ────────────────────────────────────────────────────

def recommend(user_profile: dict, k: int = 3) -> dict:
    return RecommendationEngine().recommend(user_profile, k=k)
