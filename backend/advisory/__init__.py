"""
advisory — Multi-agent AI Boardroom (Max / Sage / Mint).

Re-exports the public API of boardroom.py so callers can use:
    from advisory import run_boardroom, parse_offer_image
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from boardroom import (   # noqa: F401,E402
    run_boardroom,
    parse_offer_image,
)

__all__ = ["run_boardroom", "parse_offer_image"]
