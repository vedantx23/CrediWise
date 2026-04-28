"""
auth.py — JWT authentication for CrediWise-AI (ported from Node.js main branch)
"""
from __future__ import annotations
import os, functools, json
import bcrypt, jwt
from flask import request, jsonify, g
from database import query, execute

JWT_SECRET = os.getenv("JWT_SECRET", "crediwise-secret-key-change-in-production")
JWT_EXPIRES = 86400  # 24h in seconds


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def make_token(user: dict) -> str:
    import time
    payload = {
        "id": user["id"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "name": user["name"],
        "exp": int(time.time()) + JWT_EXPIRES,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def require_auth(fn):
    """Decorator that ensures a valid JWT is present. Sets g.user."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "No token provided"}), 401
        decoded = decode_token(auth_header.split(" ")[1])
        if not decoded:
            return jsonify({"message": "Invalid or expired token"}), 401
        g.user = decoded
        return fn(*args, **kwargs)
    return wrapper


# ── Route handlers (register as Flask routes in app.py) ─────────────────────

def register_auth_routes(app):
    """Attach /api/auth/* routes to the Flask app."""

    @app.route("/api/auth/register", methods=["POST"])
    def auth_register():
        data = request.get_json(force=True)
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not name or not email or not password:
            return jsonify({"message": "Name, email, and password are required"}), 400
        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400

        existing = query("SELECT id FROM auth_users WHERE email = ?", (email,))
        if existing:
            return jsonify({"message": "Email is already registered"}), 409

        user_id = execute(
            "INSERT INTO auth_users (name, email, role) VALUES (?, ?, 'user')",
            (name, email),
        )
        execute(
            "INSERT INTO auth_credentials (user_id, password_hash) VALUES (?, ?)",
            (user_id, hash_password(password)),
        )
        user = {"id": user_id, "name": name, "email": email, "role": "user"}
        return jsonify({"token": make_token(user), "user": user}), 201

    @app.route("/api/auth/login", methods=["POST"])
    def auth_login():
        data = request.get_json(force=True)
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"message": "Email and password are required"}), 400

        rows = query("SELECT * FROM auth_users WHERE email = ?", (email,))
        if not rows:
            return jsonify({"message": "Invalid credentials"}), 401

        user = rows[0]
        creds = query("SELECT password_hash FROM auth_credentials WHERE user_id = ?", (user["id"],))
        if not creds or not check_password(password, creds[0]["password_hash"]):
            return jsonify({"message": "Invalid credentials"}), 401

        user_out = {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
        return jsonify({"token": make_token(user_out), "user": user_out})

    @app.route("/api/auth/me", methods=["GET"])
    @require_auth
    def auth_me():
        rows = query("SELECT * FROM auth_users WHERE id = ?", (g.user["id"],))
        if not rows:
            return jsonify({"message": "User not found"}), 404
        u = rows[0]
        return jsonify({"user": {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"]}})

    @app.route("/api/auth/profile", methods=["PUT"])
    @require_auth
    def auth_update_profile():
        data = request.get_json(force=True)
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "Name is required"}), 400
        execute("UPDATE auth_users SET name = ? WHERE id = ?", (name, g.user["id"]))
        rows = query("SELECT * FROM auth_users WHERE id = ?", (g.user["id"],))
        u = rows[0]
        return jsonify({"user": {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"]}, "message": "Profile updated"})

    @app.route("/api/auth/password", methods=["PUT"])
    @require_auth
    def auth_change_password():
        data = request.get_json(force=True)
        current = data.get("currentPassword") or ""
        new_pw = data.get("newPassword") or ""
        if not current or not new_pw:
            return jsonify({"message": "Current and new password required"}), 400
        if len(new_pw) < 6:
            return jsonify({"message": "New password must be at least 6 characters"}), 400
        creds = query("SELECT password_hash FROM auth_credentials WHERE user_id = ?", (g.user["id"],))
        if not creds or not check_password(current, creds[0]["password_hash"]):
            return jsonify({"message": "Current password is incorrect"}), 401
        execute("UPDATE auth_credentials SET password_hash = ? WHERE user_id = ?", (hash_password(new_pw), g.user["id"]))
        return jsonify({"message": "Password changed successfully"})


def register_expense_routes(app):
    """Attach /api/expenses/* routes."""

    @app.route("/api/expenses", methods=["GET"])
    @require_auth
    def get_expenses():
        uid = g.user["id"]
        month = request.args.get("month", "")
        category = request.args.get("category", "")
        limit = int(request.args.get("limit", 200))

        sql = "SELECT e.*, i.name as instrument_name, i.color as instrument_color FROM expenses e LEFT JOIN instruments i ON e.payment_instrument_id = i.id WHERE e.user_id = ?"
        params = [uid]
        if month:
            sql += " AND e.date LIKE ?"
            params.append(f"{month}%")
        if category:
            sql += " AND e.category = ?"
            params.append(category)
        sql += " ORDER BY e.date DESC, e.id DESC LIMIT ?"
        params.append(limit)
        return jsonify({"expenses": query(sql, tuple(params))})

    @app.route("/api/expenses", methods=["POST"])
    @require_auth
    def create_expense():
        data = request.get_json(force=True)
        date = data.get("date")
        amount = data.get("amount")
        if not date or not amount:
            return jsonify({"message": "Date and amount required"}), 400
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return jsonify({"message": "Amount must be a number"}), 400
        if amount <= 0:
            return jsonify({"message": "Amount must be positive"}), 400

        category = data.get("category") or "Other"
        pid = data.get("payment_instrument_id") or None
        note = data.get("note") or ""
        eid = execute(
            "INSERT INTO expenses (user_id, date, amount, category, payment_instrument_id, note) VALUES (?,?,?,?,?,?)",
            (g.user["id"], date, amount, category, pid, note),
        )
        rows = query("SELECT * FROM expenses WHERE id = ?", (eid,))
        return jsonify({"expense": rows[0] if rows else {}}), 201

    @app.route("/api/expenses/<int:eid>", methods=["PUT"])
    @require_auth
    def update_expense(eid):
        data = request.get_json(force=True)
        date = data.get("date")
        amount = data.get("amount")
        if not date or not amount:
            return jsonify({"message": "Date and amount required"}), 400
        execute(
            "UPDATE expenses SET date=?, amount=?, category=?, payment_instrument_id=?, note=? WHERE id=? AND user_id=?",
            (date, float(amount), data.get("category", "Other"), data.get("payment_instrument_id"), data.get("note", ""), eid, g.user["id"]),
        )
        rows = query("SELECT * FROM expenses WHERE id = ? AND user_id = ?", (eid, g.user["id"]))
        if not rows:
            return jsonify({"message": "Expense not found"}), 404
        return jsonify({"expense": rows[0]})

    @app.route("/api/expenses/<int:eid>", methods=["DELETE"])
    @require_auth
    def delete_expense(eid):
        rows = query("SELECT id FROM expenses WHERE id = ? AND user_id = ?", (eid, g.user["id"]))
        if not rows:
            return jsonify({"message": "Expense not found"}), 404
        execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", (eid, g.user["id"]))
        return jsonify({"message": "Expense deleted"})


def register_instrument_routes(app):
    """Attach /api/instruments/* routes."""

    @app.route("/api/instruments", methods=["GET"])
    @require_auth
    def get_instruments():
        rows = query("SELECT * FROM instruments WHERE user_id = ? ORDER BY created_at DESC", (g.user["id"],))
        # Parse category_multipliers JSON
        for r in rows:
            try:
                r["category_multipliers"] = json.loads(r.get("category_multipliers") or "{}")
            except Exception:
                r["category_multipliers"] = {}
        return jsonify({"instruments": rows})

    @app.route("/api/instruments", methods=["POST"])
    @require_auth
    def create_instrument():
        data = request.get_json(force=True)
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "Instrument name required"}), 400
        cm = json.dumps(data.get("category_multipliers") or {})
        iid = execute(
            "INSERT INTO instruments (user_id, name, type, base_reward_rate, redemption_value, milestone_threshold, milestone_bonus, reward_cap, category_multipliers, color) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (g.user["id"], name, data.get("type", "credit_card"),
             data.get("base_reward_rate", 1.0), data.get("redemption_value", 0.25),
             data.get("milestone_threshold"), data.get("milestone_bonus", 0),
             data.get("reward_cap"), cm, data.get("color", "#6366f1")),
        )
        rows = query("SELECT * FROM instruments WHERE id = ?", (iid,))
        return jsonify({"instrument": rows[0] if rows else {}}), 201

    @app.route("/api/instruments/<int:iid>", methods=["PUT"])
    @require_auth
    def update_instrument(iid):
        data = request.get_json(force=True)
        cm = json.dumps(data.get("category_multipliers") or {})
        execute(
            "UPDATE instruments SET name=?, type=?, base_reward_rate=?, redemption_value=?, milestone_threshold=?, milestone_bonus=?, reward_cap=?, category_multipliers=?, color=? WHERE id=? AND user_id=?",
            (data.get("name"), data.get("type", "credit_card"),
             data.get("base_reward_rate", 1.0), data.get("redemption_value", 0.25),
             data.get("milestone_threshold"), data.get("milestone_bonus", 0),
             data.get("reward_cap"), cm, data.get("color", "#6366f1"),
             iid, g.user["id"]),
        )
        rows = query("SELECT * FROM instruments WHERE id = ? AND user_id = ?", (iid, g.user["id"]))
        if not rows:
            return jsonify({"message": "Instrument not found"}), 404
        return jsonify({"instrument": rows[0]})

    @app.route("/api/instruments/<int:iid>", methods=["DELETE"])
    @require_auth
    def delete_instrument(iid):
        rows = query("SELECT id FROM instruments WHERE id = ? AND user_id = ?", (iid, g.user["id"]))
        if not rows:
            return jsonify({"message": "Instrument not found"}), 404
        execute("DELETE FROM instruments WHERE id = ? AND user_id = ?", (iid, g.user["id"]))
        return jsonify({"message": "Instrument deleted"})


def register_analytics_routes(app):
    """Attach /api/analytics/* routes."""

    @app.route("/api/analytics/summary", methods=["GET"])
    @require_auth
    def analytics_summary():
        uid = g.user["id"]
        import datetime
        now = datetime.datetime.now()
        current_month = now.strftime("%Y-%m")

        # Monthly totals (last 6 months)
        monthly = query(
            "SELECT substr(date,1,7) as month, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY substr(date,1,7) ORDER BY month DESC LIMIT 6",
            (uid,),
        )
        monthly.reverse()

        # Category breakdown (current month)
        cats = query(
            "SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND date LIKE ? GROUP BY category ORDER BY total DESC",
            (uid, f"{current_month}%"),
        )

        month_total_rows = query(
            "SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date LIKE ?",
            (uid, f"{current_month}%"),
        )
        month_total = month_total_rows[0]["total"] or 0 if month_total_rows else 0

        all_total_rows = query("SELECT SUM(amount) as total FROM expenses WHERE user_id = ?", (uid,))
        all_total = all_total_rows[0]["total"] or 0 if all_total_rows else 0

        inst_count_rows = query("SELECT COUNT(*) as cnt FROM instruments WHERE user_id = ?", (uid,))
        inst_count = inst_count_rows[0]["cnt"] if inst_count_rows else 0

        # Recent expenses
        recent = query(
            "SELECT e.*, i.name as instrument_name, i.color as instrument_color FROM expenses e LEFT JOIN instruments i ON e.payment_instrument_id = i.id WHERE e.user_id = ? ORDER BY e.date DESC LIMIT 10",
            (uid,),
        )

        return jsonify({
            "currentMonth": current_month,
            "monthTotal": round(month_total, 2),
            "allTimeTotal": round(all_total, 2),
            "instrumentCount": inst_count,
            "totalRewardsValue": 0,
            "monthlyTotals": monthly,
            "categoryBreakdown": cats,
            "instrumentSummaries": [],
            "recentExpenses": recent,
        })


def register_user_cards_routes(app):
    """Attach /api/user-cards/* routes for tracking cards from the catalog."""

    @app.route("/api/user-cards", methods=["GET"])
    @require_auth
    def get_user_tracked_cards():
        rows = query(
            "SELECT c.* FROM user_tracked_cards uc JOIN cards c ON uc.card_id = c.card_id WHERE uc.user_id = ?",
            (g.user["id"],),
        )
        return jsonify({"cards": rows})

    @app.route("/api/user-cards", methods=["POST"])
    @require_auth
    def add_user_tracked_card():
        data = request.get_json(force=True)
        card_id = data.get("card_id") or ""
        if not card_id:
            return jsonify({"message": "card_id required"}), 400
        try:
            execute("INSERT OR IGNORE INTO user_tracked_cards (user_id, card_id) VALUES (?, ?)", (g.user["id"], card_id))
        except Exception:
            pass
        return jsonify({"message": "Card tracked"}), 201

    @app.route("/api/user-cards/<card_id>", methods=["DELETE"])
    @require_auth
    def remove_user_tracked_card(card_id):
        execute("DELETE FROM user_tracked_cards WHERE user_id = ? AND card_id = ?", (g.user["id"], card_id))
        return jsonify({"message": "Card removed"})


def seed_demo_user():
    """Create a demo account if it doesn't exist."""
    existing = query("SELECT id FROM auth_users WHERE email = 'demo@crediwise.com'")
    if not existing:
        uid = execute("INSERT INTO auth_users (name, email, role) VALUES ('Demo User', 'demo@crediwise.com', 'user')")
        execute("INSERT INTO auth_credentials (user_id, password_hash) VALUES (?, ?)", (uid, hash_password("password123")))
        print("  ✓ Demo account seeded: demo@crediwise.com / password123")

