"""
app.py — Flask entry point for CrediWise-AI backend
All routes return: {success: bool, data: {}, error: str}
"""

from __future__ import annotations
import os, sys, json, uuid, logging
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

# Make backend importable when running from project root
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import run_migrations, get_user, execute
from audit_engine import run_audit
from persona_engine import predict_persona
from statement_parser import parse_statement, categorize
from reward_tracker import (
    add_reward_expiry, get_user_expiries, run_expiry_check, init_scheduler
)
from boardroom import run_boardroom, parse_offer_image
from downgrade_detector import (
    run_downgrade_check, get_active_alerts, acknowledge_alert,
    acknowledge_all_alerts, get_rate_history_for_card,
    write_snapshot, snapshot_current_rates, init_downgrade_scheduler,
)
from life_event_simulator import (
    simulate_marriage, simulate_salary_hike, simulate_emi_purchase,
)
from community import (
    create_offer, vote_offer, get_offer, get_offers_for_card, get_all_offers,
    submit_combo, get_leaderboard, get_all_combos_for_city, get_combo,
    PERSONAS, INDIAN_CITIES,
)
from database import query as db_query
from report_generator import generate_report
from approval_predictor import predict_approval, train_and_save as train_approval
from recommendation_engine import RecommendationEngine

# ─── App setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, supports_credentials=True)

# ─── Debug mode ──────────────────────────────────────────────────────────────
# Enable verbose logging by setting CREDIWISE_DEBUG=1 in the environment.
DEBUG_MODE = os.environ.get("CREDIWISE_DEBUG", "").lower() in {"1", "true", "yes"}
_log_level = logging.DEBUG if DEBUG_MODE else logging.INFO
logging.basicConfig(
    level=_log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
app.logger.setLevel(_log_level)
logger = logging.getLogger(__name__)
if DEBUG_MODE:
    app.logger.info("🐛 CREDIWISE_DEBUG is ON — verbose logs enabled")

BASE_DIR   = Path(__file__).resolve().parent
MEMORY_DIR = BASE_DIR / "memory"
REPORTS_DIR = BASE_DIR / "reports"
MEMORY_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)


def ok(data: dict) -> tuple:
    return jsonify({"success": True, "data": data, "error": ""}), 200


def err(msg: str, code: int = 400) -> tuple:
    return jsonify({"success": False, "data": {}, "error": msg}), code


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return ok({"status": "online", "version": "2.0.0"})


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 1 — SHADOW AUDIT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/audit")
def audit():
    """
    POST /api/audit
    Body:
    {
      "monthly_spend": {
        "dining": 8000, "fuel": 5000, "grocery": 6000,
        "travel": 10000, "online": 7000, "utilities": 3000,
        "international": 2000, "other": 4000
      },
      "current_cards": ["hdfc_regalia", "icici_coral"],
      "income_annual": 1200000,
      "cibil_score": 740,
      "user_id": "optional-uuid-to-persist-result"
    }

    Returns AuditResult with leakage, status, SHAP-attributed recommendations.
    """
    body = request.get_json(silent=True)
    if not body:
        return err("Request body must be JSON.")

    monthly_spend = body.get("monthly_spend")
    if not monthly_spend or not isinstance(monthly_spend, dict):
        return err("monthly_spend is required and must be a dict of {category: amount}.")

    # Validate spend values
    for cat, val in monthly_spend.items():
        try:
            float(val)
        except (TypeError, ValueError):
            return err(f"Spend value for '{cat}' must be a number.")

    user_profile = {
        "monthly_spend":  monthly_spend,
        "current_cards":  body.get("current_cards", []),
        "income_annual":  float(body.get("income_annual", 0)),
        "cibil_score":    int(body.get("cibil_score", 700)),
    }

    try:
        result = run_audit(user_profile)
    except Exception as e:
        app.logger.exception("Audit engine error")
        return err(f"Audit failed: {str(e)}", 500)

    # Optionally persist to DB
    user_id = body.get("user_id")
    if user_id:
        try:
            execute(
                """INSERT INTO audit_results
                   (user_id, current_nav_annual, optimal_nav_annual, leakage_inr,
                    status, recommendations_json)
                   VALUES (?,?,?,?,?,?)""",
                (
                    user_id,
                    result["current_nav_annual"],
                    result["optimal_nav_annual"],
                    result["leakage_inr"],
                    result["status"],
                    json.dumps(result["recommendations"]),
                ),
            )
        except Exception:
            pass  # Non-fatal — still return result

    return ok(result)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 1B — UNIFIED RECOMMENDATION ENGINE (audit + approval + persona)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/recommend")
def recommend_endpoint():
    """
    POST /api/recommend
    Body (JSON):
    {
      "monthly_spend": {category: amount, ...},
      "current_cards": [card_id, ...],
      "income_annual": float,
      "cibil_score":   int,
      "k":             int (optional, default 3)
    }
    Returns the unified RecommendationEngine result
    (audit + persona + approval-adjusted top-k).
    """
    body = request.get_json(silent=True) or {}
    spend = body.get("monthly_spend") or {}
    if not isinstance(spend, dict):
        return err("monthly_spend must be a dict.")

    user_profile = {
        "monthly_spend":  {k: float(v or 0) for k, v in spend.items()},
        "current_cards":  body.get("current_cards") or [],
        "income_annual":  float(body.get("income_annual", 0)),
        "cibil_score":    int(body.get("cibil_score", 700)),
    }
    k = max(1, min(int(body.get("k", 3)), 10))

    try:
        result = RecommendationEngine().recommend(user_profile, k=k)
    except Exception as e:
        app.logger.exception("Recommendation engine error")
        return err(f"Recommendation failed: {str(e)}", 500)
    return ok(result)


# ═══════════════════════════════════════════════════════════════════════════════
#  LIFECYCLE AGGREGATE — downgrade alerts + reward expiries (single endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/lifecycle/<user_id>")
def lifecycle_summary(user_id: str):
    """
    GET /api/lifecycle/{user_id}
    Aggregates the three lifecycle subsystems for the dashboard:
      - downgrade_alerts (active, unacknowledged)
      - reward_expiries  (next 30 days)
    """
    try:
        alerts = get_active_alerts(None)
    except Exception:
        alerts = []
    try:
        expiries = get_user_expiries(user_id)
    except Exception:
        expiries = []

    expiring_soon = [
        e for e in (expiries or [])
        if isinstance(e, dict) and (e.get("days_until_expiry") or 999) <= 30
    ]

    return ok({
        "user_id":            user_id,
        "downgrade_alerts":   alerts,
        "downgrade_count":    len(alerts),
        "reward_expiries":    expiries,
        "expiring_soon":      expiring_soon,
        "expiring_soon_count": len(expiring_soon),
    })

@app.post("/api/persona")
def persona():
    """
    POST /api/persona
    Body:
    {
      "monthly_spend": {
        "dining": 15000, "online": 20000, "grocery": 8000,
        "travel": 3000, "fuel": 4000, "utilities": 2000,
        "international": 1000, "other": 2000
      },
      "income_annual": 1200000,
      "cibil_score":   720,
      "current_cards": ["kotak_811"],
      "cards_count":   1
    }

    Returns:
    {
      "persona_name": "The High-Street Architect",
      "persona_emoji": "🛍️",
      "tagline": "...",
      "description": "...",
      "traits": [...],
      "confidence": 0.97,
      "probabilities": {...},
      "shap_drivers": {...},
      "top_drivers": [...],
      "recommendations": [...]
    }
    """
    body = request.get_json(silent=True)
    if not body:
        return err("Request body must be JSON.")

    monthly_spend = body.get("monthly_spend")
    if not monthly_spend or not isinstance(monthly_spend, dict):
        return err("monthly_spend is required and must be a dict of {category: amount}.")

    current_cards = body.get("current_cards", [])
    cards_count   = int(body.get("cards_count", len(current_cards)))
    income        = float(body.get("income_annual", 0))
    cibil         = int(body.get("cibil_score", 700))

    try:
        if app.logger.isEnabledFor(logging.DEBUG):
            app.logger.debug(
                "[persona] inputs: spend_keys=%s total=%.0f income=%.0f cibil=%s cards=%s",
                list(monthly_spend.keys()),
                sum(float(v or 0) for v in monthly_spend.values()),
                income, cibil, cards_count,
            )
        result = predict_persona(
            monthly_spend  = monthly_spend,
            income_annual  = income,
            cards_count    = cards_count,
            current_cards  = current_cards,
            cibil_score    = cibil,
        )
    except FileNotFoundError as e:
        app.logger.error("[persona] model file missing: %s", e)
        return err(str(e), 503)
    except Exception as e:
        app.logger.exception("Persona engine error")
        return err(f"Persona prediction failed: {str(e)}", 500)

    # Backward-compatible aliases so older frontend code that reads
    # `result.persona` keeps working alongside `result.persona_name`.
    if isinstance(result, dict):
        result.setdefault("persona", result.get("persona_name"))
        result.setdefault("features_used", {
            "monthly_spend":  monthly_spend,
            "income_annual":  income,
            "cibil_score":    cibil,
            "cards_count":    cards_count,
            "total_spend":    sum(float(v or 0) for v in monthly_spend.values()),
        })

    if app.logger.isEnabledFor(logging.DEBUG):
        app.logger.debug(
            "[persona] output: persona=%s confidence=%.3f",
            result.get("persona_name"), float(result.get("confidence", 0)),
        )

    return ok(result)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 4 — BANK STATEMENT FORENSICS
# ═══════════════════════════════════════════════════════════════════════════════

UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXT = {".pdf"}


@app.post("/api/parse-statement")
def parse_statement_endpoint():
    """
    POST /api/parse-statement  (multipart/form-data)
    Fields:
      file          — PDF bank statement
      user_id       — optional, to persist transactions
      current_cards — optional JSON array of card_ids
      income_annual — optional float
      cibil_score   — optional int

    Returns:
      transaction_count, months_parsed, monthly_breakdown,
      audit_payload (→ feed directly to /api/audit),
      anomaly_alerts
    """
    if "file" not in request.files:
        return err("No file uploaded. Send as multipart field 'file'.")

    f = request.files["file"]
    if not f.filename:
        return err("Empty filename.")

    ext = Path(f.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        return err(f"Only PDF files supported. Got '{ext}'.")

    # Save temp file
    tmp_path = UPLOAD_DIR / f"{uuid.uuid4().hex}.pdf"
    try:
        f.save(str(tmp_path))
        result = parse_statement(str(tmp_path))
    except Exception as e:
        app.logger.exception("Statement parse error")
        return err(f"Failed to parse statement: {str(e)}", 500)
    finally:
        tmp_path.unlink(missing_ok=True)   # clean up upload

    # Optionally persist transactions
    user_id = request.form.get("user_id")
    if user_id and result["transactions"]:
        for t in result["transactions"]:
            try:
                execute(
                    """INSERT INTO transactions
                       (user_id, txn_date, description, amount, category, month)
                       VALUES (?,?,?,?,?,?)""",
                    (user_id, t.get("month",""), t.get("description",""),
                     t.get("amount", 0), t.get("category","other"), t.get("month","")),
                )
            except Exception:
                pass

    return ok(result)


@app.post("/api/categorize-text")
def categorize_text():
    """
    POST /api/categorize-text
    Body: {"description": "SWIGGY ORDER 12345"}
    Returns: {"category": "dining"}
    Quick utility for single transaction categorization.
    """
    body = request.get_json(silent=True) or {}
    desc = body.get("description", "")
    if not desc:
        return err("description is required.")
    return ok({"category": categorize(desc), "description": desc})


# ─── Reward Expiry Tracker ───────────────────────────────────────────────────

@app.post("/api/reward-expiry")
def add_expiry():
    """
    POST /api/reward-expiry
    Body: {
      "user_id": "u1", "card_id": "hdfc_regalia",
      "points_amount": 12500,
      "expiry_date": "2024-12-31",
      "redemption_suggestion": "optional hint"
    }
    """
    body = request.get_json(silent=True) or {}
    required = ["user_id", "card_id", "points_amount", "expiry_date"]
    for field in required:
        if field not in body:
            return err(f"Missing required field: {field}")
    try:
        row_id = add_reward_expiry(
            user_id       = body["user_id"],
            card_id       = body["card_id"],
            points_amount = float(body["points_amount"]),
            expiry_date   = body["expiry_date"],
            redemption_suggestion = body.get("redemption_suggestion", ""),
        )
        return ok({"id": row_id, "message": "Expiry recorded."})
    except Exception as e:
        return err(str(e), 500)


@app.get("/api/reward-expiry/<user_id>")
def get_expiry(user_id: str):
    """GET /api/reward-expiry/{user_id} — list all reward expiries for user."""
    try:
        rows = get_user_expiries(user_id)
        return ok({"expiries": rows, "count": len(rows)})
    except Exception as e:
        return err(str(e), 500)


@app.post("/api/reward-expiry/check")
def trigger_expiry_check():
    """POST /api/reward-expiry/check — manually trigger the nightly expiry job."""
    try:
        alerts = run_expiry_check()
        return ok({"alerts_generated": len(alerts), "alerts": alerts})
    except Exception as e:
        return err(str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 5 — AI BOARDROOM (OLLAMA / LOCAL LLM)
# ═══════════════════════════════════════════════════════════════════════════════

OCR_UPLOAD_DIR = BASE_DIR / "data" / "ocr_uploads"
OCR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}


@app.post("/api/boardroom")
def boardroom():
    """
    POST /api/boardroom
    Body (JSON):
    {
      "user_id":       "u1",
      "question":      "Which card should I get next?",
      "monthly_spend": {"dining": 5000, "fuel": 2000, "online": 8000, ...},
      "current_cards": ["hdfc_regalia"],         // optional
      "income_annual": 1200000,                  // optional
      "cibil_score":   750                        // optional
    }

    Returns:
    {
      "model":      "llama3" | null,
      "ollama":     true | false,
      "transcript": [
        {"agent": "max",  "name": "Max",  "role": "The Accountant", "response": "..."},
        {"agent": "sage", "name": "Sage", "role": "The Traveler",   "response": "..."},
        {"agent": "mint", "name": "Mint", "role": "The Minimalist", "response": "..."},
      ],
      "question": "..."
    }
    """
    body = request.get_json(silent=True) or {}

    user_id  = body.get("user_id", "anonymous")
    question = (body.get("question") or "").strip()
    if not question:
        return err("question is required.")

    monthly_spend = body.get("monthly_spend") or {}
    if not isinstance(monthly_spend, dict):
        return err("monthly_spend must be a dict of {category: amount}.")

    try:
        result = run_boardroom(
            user_id       = user_id,
            question      = question,
            monthly_spend = {k: float(v) for k, v in monthly_spend.items()},
            memory_dir    = MEMORY_DIR,
            current_cards = body.get("current_cards") or [],
            income_annual = float(body.get("income_annual", 0)),
            cibil_score   = int(body.get("cibil_score", 700)),
        )
    except Exception as e:
        app.logger.exception("Boardroom error")
        return err(f"Boardroom failed: {str(e)}", 500)

    return ok(result)


@app.get("/api/boardroom/memory/<user_id>")
def get_memory(user_id: str):
    """GET /api/boardroom/memory/{user_id} — retrieve all agent memories for a user."""
    memories = {}
    for agent in ["max", "sage", "mint"]:
        p = MEMORY_DIR / f"{user_id}_{agent}.json"
        if p.exists():
            try:
                memories[agent] = json.loads(p.read_text())
            except Exception:
                memories[agent] = []
        else:
            memories[agent] = []
    return ok({"user_id": user_id, "memories": memories})


@app.delete("/api/boardroom/memory/<user_id>")
def clear_memory(user_id: str):
    """DELETE /api/boardroom/memory/{user_id} — wipe all agent memory for a user."""
    cleared = []
    for agent in ["max", "sage", "mint"]:
        p = MEMORY_DIR / f"{user_id}_{agent}.json"
        if p.exists():
            p.unlink()
            cleared.append(agent)
    return ok({"cleared": cleared, "user_id": user_id})


@app.post("/api/ocr-offer")
def ocr_offer():
    """
    POST /api/ocr-offer  (multipart/form-data)
    Field: file — JPEG/PNG image of a bank SMS, offer letter, or card mailer

    Returns parsed offer:
    {
      "raw_text":        str,
      "reward_rate":     "5%" | "10x" | null,
      "max_amount_inr":  "5000" | null,
      "card_name":       "HDFC Millennia" | null,
      "matched_card_id": "hdfc_millennia" | null,
      "valid_until":     "31/12/2025" | null,
      "parsed":          bool,
      "message":         str
    }
    """
    if "file" not in request.files:
        return err("No file uploaded. Send as multipart field 'file'.")

    f = request.files["file"]
    if not f.filename:
        return err("Empty filename.")

    ext = Path(f.filename).suffix.lower()
    if ext not in ALLOWED_IMG_EXT:
        return err(f"Unsupported image format '{ext}'. Use JPG/PNG/WebP.")

    tmp_path = OCR_UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    try:
        f.save(str(tmp_path))
        result = parse_offer_image(str(tmp_path))
    except RuntimeError as e:
        return err(str(e), 503)
    except Exception as e:
        app.logger.exception("OCR error")
        return err(f"OCR failed: {str(e)}", 500)
    finally:
        tmp_path.unlink(missing_ok=True)

    return ok(result)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 6 — STEALTH DOWNGRADE DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/alerts")
def get_alerts():
    """
    GET /api/alerts?card_ids=hdfc_regalia,axis_ace
    Returns all unacknowledged downgrade alerts.
    Optional query-param `card_ids` (comma-separated) to filter to user's cards.

    Each alert includes a red-banner message:
      "ALERT: Your {card} reward rate on {category} dropped from
       {old}% to {new}% — you are now losing ₹{extra_loss} extra per year."
    """
    card_ids_param = request.args.get("card_ids", "")
    card_ids = [c.strip() for c in card_ids_param.split(",") if c.strip()]

    try:
        alerts = get_active_alerts(card_ids or None)
        return ok({
            "alerts":      alerts,
            "count":       len(alerts),
            "has_critical": any(a.get("extra_loss_annual", 0) >= 1000 for a in alerts),
        })
    except Exception as e:
        app.logger.exception("Alerts fetch error")
        return err(str(e), 500)


@app.post("/api/alerts/acknowledge/<int:alert_id>")
def ack_alert(alert_id: int):
    """POST /api/alerts/acknowledge/{id} — mark a single alert as read."""
    try:
        ok_ = acknowledge_alert(alert_id)
        if not ok_:
            return err(f"Alert {alert_id} not found.", 404)
        return ok({"acknowledged": alert_id})
    except Exception as e:
        return err(str(e), 500)


@app.post("/api/alerts/acknowledge-all")
def ack_all():
    """
    POST /api/alerts/acknowledge-all
    Body (optional): {"card_id": "hdfc_regalia"}
    Acknowledge all alerts, or all for a specific card.
    """
    body    = request.get_json(silent=True) or {}
    card_id = body.get("card_id")
    try:
        count = acknowledge_all_alerts(card_id)
        return ok({"acknowledged_count": count})
    except Exception as e:
        return err(str(e), 500)


@app.post("/api/alerts/run-check")
def trigger_downgrade_check():
    """
    POST /api/alerts/run-check
    Body (optional): {"monthly_spend": {category: amount}}
    Manually trigger the weekly downgrade check pipeline.
    """
    body          = request.get_json(silent=True) or {}
    monthly_spend = body.get("monthly_spend") or None

    try:
        result = run_downgrade_check(monthly_spend=monthly_spend)
        return ok(result)
    except Exception as e:
        app.logger.exception("Downgrade check error")
        return err(str(e), 500)


@app.get("/api/alerts/history/<card_id>")
def rate_history(card_id: str):
    """
    GET /api/alerts/history/{card_id}?category=dining
    Return historical reward rates for a card (optionally filtered by category).
    This is the competitive moat: growing historical rate dataset.
    """
    category = request.args.get("category") or None
    limit    = min(int(request.args.get("limit", 52)), 200)
    try:
        rows = get_rate_history_for_card(card_id, category, limit)
        return ok({
            "card_id":  card_id,
            "category": category,
            "history":  rows,
            "count":    len(rows),
        })
    except Exception as e:
        return err(str(e), 500)


@app.post("/api/alerts/snapshot")
def force_snapshot():
    """
    POST /api/alerts/snapshot
    Force-write the current reward rates to card_rate_history.
    Useful for seeding the first snapshot on deploy.
    """
    try:
        current = snapshot_current_rates()
        written = write_snapshot(current)
        return ok({
            "written":   written,
            "cards":     len(current),
            "snap_date": __import__("datetime").date.today().isoformat(),
        })
    except Exception as e:
        return err(str(e), 500)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 7 — LIFE EVENT SIMULATOR
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/simulate")
def simulate():
    """
    POST /api/simulate
    Body (JSON) — all events share a common wrapper:
    {
      "event": "marriage" | "salary_hike" | "emi_purchase",
      ... event-specific fields (see below) ...
    }

    ── marriage ─────────────────────────────────────────────────────────────
    {
      "event": "marriage",
      "profile_a": {
        "monthly_spend":  {category: amount},
        "current_cards":  [card_id],
        "income_annual":  float,
        "cibil_score":    int
      },
      "profile_b": { same shape }
    }

    ── salary_hike ──────────────────────────────────────────────────────────
    {
      "event":           "salary_hike",
      "monthly_spend":   {category: amount},
      "current_income":  float,
      "new_income":      float,
      "cibil_score":     int,
      "current_cards":   [card_id]
    }

    ── emi_purchase ─────────────────────────────────────────────────────────
    {
      "event":            "emi_purchase",
      "purchase_amount":  float,
      "emi_months":       int,
      "card_id":          str | null,
      "monthly_spend":    {category: amount} | null,
      "current_cards":    [card_id] | null
    }
    """
    body = request.get_json(silent=True) or {}
    event = (body.get("event") or "").strip().lower()

    if not event:
        return err("'event' is required: 'marriage', 'salary_hike', or 'emi_purchase'.")

    try:
        if event == "marriage":
            profile_a = body.get("profile_a")
            profile_b = body.get("profile_b")
            if not profile_a or not profile_b:
                return err("Both 'profile_a' and 'profile_b' are required for marriage event.")
            result = simulate_marriage(profile_a, profile_b)

        elif event == "salary_hike":
            monthly_spend   = body.get("monthly_spend") or {}
            current_income  = float(body.get("current_income", 0))
            new_income      = float(body.get("new_income",     0))
            if new_income <= 0:
                return err("'new_income' must be greater than 0.")
            if new_income <= current_income:
                return err("'new_income' must be greater than 'current_income'.")
            result = simulate_salary_hike(
                monthly_spend   = monthly_spend,
                current_income  = current_income,
                new_income      = new_income,
                cibil_score     = int(body.get("cibil_score", 700)),
                current_cards   = body.get("current_cards") or [],
            )

        elif event == "emi_purchase":
            purchase_amount = body.get("purchase_amount")
            emi_months      = body.get("emi_months")
            if not purchase_amount or not emi_months:
                return err("'purchase_amount' and 'emi_months' are required for emi_purchase.")
            purchase_amount = float(purchase_amount)
            emi_months      = int(emi_months)
            if purchase_amount <= 0:
                return err("'purchase_amount' must be positive.")
            if not (1 <= emi_months <= 60):
                return err("'emi_months' must be between 1 and 60.")
            result = simulate_emi_purchase(
                purchase_amount = purchase_amount,
                emi_months      = emi_months,
                card_id         = body.get("card_id"),
                monthly_spend   = body.get("monthly_spend") or {},
                current_cards   = body.get("current_cards") or [],
            )

        else:
            return err(f"Unknown event '{event}'. Use: marriage, salary_hike, emi_purchase.")

    except ValueError as e:
        return err(str(e))
    except Exception as e:
        app.logger.exception("Simulator error")
        return err(f"Simulation failed: {str(e)}", 500)

    return ok(result)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 8 — COMMUNITY INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Offer Votes ─────────────────────────────────────────────────────────────

@app.post("/api/offers")
def create_offer_endpoint():
    """
    POST /api/offers
    Body: {
      "card_id":    "hdfc_millennia",
      "offer_text": "5% cashback on Swiggy till 31 Dec",
      "offer_rate": 5.0,          // optional
      "offer_id":   "my-offer-1"  // optional custom ID
    }
    Returns the created offer with offer_id.
    """
    body = request.get_json(silent=True) or {}
    card_id    = body.get("card_id", "").strip()
    offer_text = body.get("offer_text", "").strip()
    if not card_id:
        return err("'card_id' is required.")
    if not offer_text:
        return err("'offer_text' is required.")
    try:
        oid    = create_offer(card_id, offer_text,
                              body.get("offer_rate"), body.get("offer_id"))
        offer  = get_offer(oid)
        return ok(offer or {"offer_id": oid})
    except Exception as e:
        return err(str(e), 500)


@app.post("/api/vote")
def vote():
    """
    POST /api/vote
    Body: {"offer_id": "offer_abc123", "vote": "up" | "down"}
    Returns updated vote counts + acceptance rate label.
    "73% of users confirmed this works"
    """
    body = request.get_json(silent=True) or {}
    offer_id = body.get("offer_id", "").strip()
    vote_val = body.get("vote", "").strip().lower()
    if not offer_id:
        return err("'offer_id' is required.")
    if vote_val not in ("up", "down"):
        return err("'vote' must be 'up' or 'down'.")
    try:
        result = vote_offer(offer_id, vote_val)
        return ok(result)
    except ValueError as e:
        return err(str(e), 404)
    except Exception as e:
        return err(str(e), 500)


@app.get("/api/offers")
def list_offers():
    """
    GET /api/offers?card_id=hdfc_millennia&min_votes=0
    Returns all offers, optionally filtered by card.
    """
    card_id   = request.args.get("card_id", "").strip()
    min_votes = int(request.args.get("min_votes", 0))
    try:
        if card_id:
            offers = get_offers_for_card(card_id)
        else:
            offers = get_all_offers(min_votes)
        return ok({"offers": offers, "count": len(offers)})
    except Exception as e:
        return err(str(e), 500)


@app.get("/api/offers/<offer_id>")
def get_single_offer(offer_id: str):
    """GET /api/offers/{offer_id} — fetch a single offer with vote counts."""
    offer = get_offer(offer_id)
    if not offer:
        return err(f"Offer '{offer_id}' not found.", 404)
    return ok(offer)


# ─── Card Combos + Leaderboard ────────────────────────────────────────────────

@app.post("/api/submit-combo")
def submit_combo_endpoint():
    """
    POST /api/submit-combo
    Body: {
      "cards":     ["hdfc_regalia", "axis_ace", "sbi_simplyclick"],
      "city":      "Mumbai",
      "persona":   "The Reward Arbitrageur",
      "nav_score": 18400
    }
    Deduplicates by combo fingerprint — increments submissions + averages NAV.
    Returns enriched combo with display string.
    """
    body = request.get_json(silent=True) or {}
    cards     = body.get("cards") or []
    city      = (body.get("city") or "Other").strip()
    persona   = (body.get("persona") or "").strip()
    nav_score = float(body.get("nav_score", 0))

    if not cards or not isinstance(cards, list):
        return err("'cards' must be a non-empty list of card IDs.")
    if len(cards) > 6:
        return err("Maximum 6 cards per combo.")
    if persona and persona not in PERSONAS:
        return err(f"'persona' must be one of: {PERSONAS}")

    try:
        result = submit_combo(cards, city, persona, nav_score)
        return ok(result)
    except ValueError as e:
        return err(str(e))
    except Exception as e:
        app.logger.exception("Submit combo error")
        return err(str(e), 500)


@app.get("/api/leaderboard")
def leaderboard():
    """
    GET /api/leaderboard?city=Mumbai&persona=The+Reward+Arbitrageur&top_n=5
    Returns top combos with formatted display strings.

    Example output:
      "The Mumbai Optimal Stack for Reward Arbitrageurs: HDFC Regalia +
       Axis Ace + SBI SimplyCLICK — avg NAV ₹18,400/year"
    """
    city    = request.args.get("city",    "").strip() or None
    persona = request.args.get("persona", "").strip() or None
    top_n   = min(int(request.args.get("top_n", 5)), 20)

    try:
        combos = get_leaderboard(city=city, persona=persona, top_n=top_n)
        return ok({
            "combos":  combos,
            "count":   len(combos),
            "filters": {"city": city, "persona": persona},
        })
    except Exception as e:
        return err(str(e), 500)


@app.get("/api/leaderboard/cities")
def leaderboard_cities():
    """GET /api/leaderboard/cities — list of available cities in combos DB."""
    try:
        rows = db_query(
            "SELECT DISTINCT city, COUNT(*) as combos FROM card_combos "
            "WHERE city IS NOT NULL GROUP BY city ORDER BY combos DESC"
        )
    except Exception as e:
        # Table missing or DB unavailable — degrade gracefully.
        logger.warning("[leaderboard/cities] DB query failed: %s", e)
        rows = []
    return ok({
        "cities":         [r["city"] for r in rows],
        "all_cities":     INDIAN_CITIES,
        "persona_options": PERSONAS,
    })


@app.get("/api/leaderboard/combo/<combo_id>")
def get_single_combo(combo_id: str):
    """GET /api/leaderboard/combo/{combo_id} — fetch a specific combo."""
    combo = get_combo(combo_id)
    if not combo:
        return err(f"Combo '{combo_id}' not found.", 404)
    return ok(combo)


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 9 — ANNUAL WALLET REPORT PDF
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/generate-report")
def generate_report_endpoint():
    """
    GET /api/generate-report?user_id=alice&year=2025
    Accepts optional JSON body with monthly_data, persona, nav figures, etc.
    Returns branded 4-page PDF as a download.
    """
    import datetime as dt
    from flask import send_file

    body     = request.get_json(silent=True) or {}
    user_id  = request.args.get("user_id", body.get("user_id", "user"))
    year     = int(request.args.get("year",    body.get("year",    dt.date.today().year)))

    monthly_data     = body.get("monthly_data", {})
    persona          = body.get("persona", "The Reward Arbitrageur")
    current_nav      = float(body.get("current_nav", 0))
    optimal_nav      = float(body.get("optimal_nav", 0))
    leakage_rescued  = float(body.get("leakage_rescued", optimal_nav - current_nav))
    status           = body.get("status", "pass")
    recommendations  = body.get("recommendations", [])
    current_cards    = body.get("current_cards", [])

    if not monthly_data:
        monthly_data = {
            f"{year}-{m:02d}": {
                "dining": 8000, "fuel": 5000, "grocery": 6000,
                "travel": 10000, "online": 7000, "utilities": 3000,
                "international": 2000, "other": 4000,
            }
            for m in range(1, 13)
        }

    try:
        pdf_path = generate_report(
            user_id=user_id, year=year,
            monthly_data=monthly_data,
            persona=persona,
            current_nav=current_nav, optimal_nav=optimal_nav,
            leakage_rescued=leakage_rescued, status=status,
            recommendations=recommendations, current_cards=current_cards,
            reports_dir=REPORTS_DIR,
        )
        return send_file(
            pdf_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"crediwise_{user_id}_{year}.pdf",
        )
    except Exception as e:
        app.logger.exception("Report generation failed")
        return err(f"Report generation failed: {str(e)}", 500)


@app.post("/api/generate-report")
def generate_report_post():
    """POST /api/generate-report — same as GET but accepts full JSON body."""
    return generate_report_endpoint()


# ═══════════════════════════════════════════════════════════════════════════════
#  FEATURE 10 — CARD APPROVAL PREDICTOR
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/predict-approval")
def predict_approval_endpoint():
    """
    POST /api/predict-approval
    Body: {
      "cibil_score":           740,
      "income_annual":         1200000,
      "existing_cards_count":  2,
      "card_ids":              ["hdfc_regalia", "axis_ace"]   // optional filter
    }
    Returns ranked list with tier (high/medium/low) and reason string.
    """
    body = request.get_json(silent=True) or {}

    cibil   = body.get("cibil_score")
    income  = body.get("income_annual")
    n_cards = int(body.get("existing_cards_count", 0))

    if cibil is None:
        return err("'cibil_score' is required.")
    if income is None:
        return err("'income_annual' is required.")

    cibil  = int(cibil)
    income = float(income)

    if not (300 <= cibil <= 900):
        return err("'cibil_score' must be between 300 and 900.")
    if income < 0:
        return err("'income_annual' must be non-negative.")

    card_ids = body.get("card_ids") or None

    try:
        predictions = predict_approval(
            cibil_score=cibil,
            income_annual=income,
            existing_cards_count=n_cards,
            card_ids=card_ids,
        )
        return ok({
            "predictions": predictions,
            "count":       len(predictions),
            "profile": {
                "cibil_score":           cibil,
                "income_annual":         income,
                "existing_cards_count":  n_cards,
            },
        })
    except Exception as e:
        app.logger.exception("Approval prediction failed")
        return err(f"Prediction failed: {str(e)}", 500)


if __name__ == "__main__":
    print("🔧 Initialising database…")
    run_migrations()

    # Seed if not already done
    from seed_data import seed
    from database import get_all_cards
    if len(get_all_cards()) == 0:
        print("🌱 Seeding card data…")
        seed()

    # Seed first rate snapshot if history is empty
    from downgrade_detector import get_latest_history
    if not get_latest_history():
        print("📸 Seeding initial rate snapshot…")
        write_snapshot(snapshot_current_rates())

    # Start APScheduler jobs
    init_scheduler()              # nightly reward expiry check
    init_downgrade_scheduler()    # weekly downgrade diff

    print("🚀 CrediWise-AI backend starting on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)
