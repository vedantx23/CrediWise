"""
api — Flask HTTP API subpackage.

Re-exports the Flask `app` from app.py so the spec layout works:
    from api import app
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import app   # noqa: F401,E402

__all__ = ["app"]
