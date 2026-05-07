"""
models — ML models subpackage (persona classifier + approval predictor).

This package coexists with the .pkl artefact files in the same directory
(approval_rf.pkl, persona_rf.pkl). Both code-imports and file-paths work:

    from models import predict_persona, predict_approval     # ← code
    BASE_DIR / "models" / "persona_rf.pkl"                   # ← file path
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from persona_engine import (         # noqa: F401,E402
    predict_persona,
    train_and_save as train_persona,
    extract_features as persona_features,
)
from approval_predictor import (     # noqa: F401,E402
    predict_approval,
    train_and_save as train_approval,
)

__all__ = [
    "predict_persona", "train_persona", "persona_features",
    "predict_approval", "train_approval",
]
