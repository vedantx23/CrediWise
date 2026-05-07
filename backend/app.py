import os
import sqlite3
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from apscheduler.schedulers.background import BackgroundScheduler
from parser import parse_statement, detect_anomalies
from boardroom import run_boardroom_debate
from ocr import parse_offer_image
from report_generator import generate_annual_report
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'pipeline'))
from downgrade_detector import run_downgrade_check

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'cards.db')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'persona_rf.pkl')

# Load model
try:
    persona_model = joblib.load(MODEL_PATH)
except Exception as e:
    print(f"Warning: Could not load persona model: {e}")
    persona_model = None

PERSONA_MAP = {
    0: {"name": "The Stealth Nomad", "description": "High travel and international spend focus.", "focus": ["travel", "international"]},
    1: {"name": "The High-Street Architect", "description": "High dining and shopping focus.", "focus": ["dining", "online"]},
    2: {"name": "The Reward Arbitrageur", "description": "Maximum cashback math focus across categories.", "focus": ["online", "grocery", "fuel"]},
    3: {"name": "The Frugal Zen Master", "description": "Zero fee, maximum efficiency focus.", "focus": ["utilities", "grocery"]}
}

# --- APScheduler Setup ---
def check_reward_expiry():
    # In a real scenario, this queries a `rewards_expiry` table.
    # We log it here to demonstrate the nightly cron job.
    print("[APScheduler] Running nightly reward decay check...")
    # Example: Check if any user's reward points expire in 30 days
    # cursor.execute("SELECT * FROM rewards WHERE expiry_date <= date('now', '+30 days')")
    # Send WhatsApp alert (Twilio) to those users.

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_reward_expiry, trigger="interval", hours=24)
scheduler.add_job(func=run_downgrade_check, trigger="interval", days=7) # Weekly check
scheduler.start()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/audit', methods=['POST'])
def audit():
    data = request.json
    if not data or 'monthly_spend' not in data or 'current_cards' not in data:
        return jsonify({"success": False, "error": "Missing required fields", "data": {}}), 400

    monthly_spend = data['monthly_spend'] # dict: {category: amount}
    current_cards = data['current_cards'] # list of card_ids

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get reward rates for all cards
    cursor.execute("SELECT card_id, category, rate_percent FROM card_reward_categories")
    all_rates = cursor.fetchall()
    
    # Initialize best rates dict
    categories = list(monthly_spend.keys())
    
    best_rate_current = {cat: 0.0 for cat in categories}
    best_rate_all = {cat: 0.0 for cat in categories}
    
    card_rates = {}
    for r in all_rates:
        c_id = r['card_id']
        cat = r['category']
        rate = r['rate_percent']
        
        if c_id not in card_rates:
            card_rates[c_id] = {}
        card_rates[c_id][cat] = rate
    
    # Fill in best rates
    for cat in categories:
        # Find best rate in current cards
        for c_id in current_cards:
            rate = card_rates.get(c_id, {}).get(cat, card_rates.get(c_id, {}).get('other', 0.0))
            if rate > best_rate_current[cat]:
                best_rate_current[cat] = rate
                
        # Find best rate in all cards
        for c_id in card_rates.keys():
            rate = card_rates.get(c_id, {}).get(cat, card_rates.get(c_id, {}).get('other', 0.0))
            if rate > best_rate_all[cat]:
                best_rate_all[cat] = rate

    # Calculate NAV
    current_nav_annual = 0
    optimal_nav_annual = 0
    
    for cat, spend in monthly_spend.items():
        c_nav = (spend * best_rate_current[cat] / 100) * 12
        o_nav = (spend * best_rate_all[cat] / 100) * 12
        
        current_nav_annual += c_nav
        optimal_nav_annual += o_nav

    leakage_inr = optimal_nav_annual - current_nav_annual
    
    if leakage_inr < 2000:
        status = "pass"
    elif leakage_inr < 5000:
        status = "warning"
    else:
        status = "critical"
        
    # Find recommendations (Cards that improve NAV the most)
    recommendations = []
    
    for c_id in card_rates.keys():
        if c_id in current_cards:
            continue
            
        card_nav_improvement = 0
        card_shap_values = {}
        
        for cat, spend in monthly_spend.items():
            rate = card_rates.get(c_id, {}).get(cat, card_rates.get(c_id, {}).get('other', 0.0))
            if rate > best_rate_current[cat]:
                improvement = (spend * (rate - best_rate_current[cat]) / 100) * 12
                card_nav_improvement += improvement
                if improvement > 0:
                    card_shap_values[cat] = improvement
                    
        if card_nav_improvement > 0:
            recommendations.append({
                "card_id": c_id,
                "improvement": card_nav_improvement,
                "shap_values": card_shap_values
            })
            
    # Sort recommendations by improvement
    recommendations.sort(key=lambda x: x['improvement'], reverse=True)
    top_recommendations = recommendations[:3]
    
    # Format recommendations
    formatted_recs = []
    for rec in top_recommendations:
        cursor.execute("SELECT name, bank FROM cards WHERE card_id = ?", (rec['card_id'],))
        card_info = cursor.fetchone()
        
        if rec['shap_values']:
            top_cat = max(rec['shap_values'], key=rec['shap_values'].get)
            top_cat_value = rec['shap_values'][top_cat]
            reason = f"Excellent for {top_cat} spend. Adds ₹{top_cat_value:.0f}/yr in value."
        else:
            reason = "Good overall addition."
            
        formatted_recs.append({
            "card_id": rec['card_id'],
            "card_name": f"{card_info['bank']} {card_info['name']}",
            "reason": reason,
            "shap_values": rec['shap_values'],
            "annual_benefit_inr": rec['improvement']
        })

    conn.close()

    result = {
        "current_nav_annual": current_nav_annual,
        "optimal_nav_annual": optimal_nav_annual,
        "leakage_inr": leakage_inr,
        "status": status,
        "message": f"You are losing ₹{leakage_inr:.0f} per year",
        "recommendations": formatted_recs
    }

    return jsonify({"success": True, "data": result, "error": None})

@app.route('/api/persona', methods=['POST'])
def get_persona():
    data = request.json
    if not data or 'monthly_spend' not in data:
        return jsonify({"success": False, "error": "Missing monthly_spend", "data": {}}), 400

    spend = data['monthly_spend']
    categories = ['dining', 'fuel', 'grocery', 'travel', 'online', 'utilities', 'international']
    
    # Prepare features for prediction
    features = [[spend.get(cat, 0) for cat in categories]]
    
    if persona_model:
        persona_id = int(persona_model.predict(features)[0])
    else:
        # Fallback logic if model not loaded
        persona_id = 3 # Default to Frugal Zen Master

    persona_info = PERSONA_MAP[persona_id]
    
    # Get top 3 card recommendations based on persona focus
    conn = get_db_connection()
    cursor = conn.cursor()
    
    recommendations = []
    
    # Simple logic: Find cards that have the highest rates in the persona's focus categories
    placeholders = ', '.join(['?'] * len(persona_info['focus']))
    query = f"""
        SELECT c.card_id, c.name, c.bank, SUM(r.rate_percent) as score
        FROM cards c
        JOIN card_reward_categories r ON c.card_id = r.card_id
        WHERE r.category IN ({placeholders})
        GROUP BY c.card_id
        ORDER BY score DESC
        LIMIT 3
    """
    cursor.execute(query, persona_info['focus'])
    recs = cursor.fetchall()
    
    for r in recs:
        recommendations.append({
            "card_id": r['card_id'],
            "card_name": f"{r['bank']} {r['name']}",
            "reason": f"Top pick for your {', '.join(persona_info['focus'])} patterns."
        })
        
    conn.close()

    result = {
        "persona_name": persona_info['name'],
        "description": persona_info['description'],
        "recommendations": recommendations
    }

    return jsonify({"success": True, "data": result, "error": None})

@app.route('/api/parse-statement', methods=['POST'])
def parse_stmt():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        upload_folder = os.path.join(os.path.dirname(__file__), 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Parse statement
        current_spend, df = parse_statement(filepath)
        
        # Detect anomalies
        alerts = detect_anomalies(current_spend)
        
        anomaly_messages = []
        for alert in alerts:
            # Recommend a card to recover value. Just picking a generic one for demo
            anomaly_messages.append(
                f"Your {alert['category']} spend was {alert['multiplier']}x your normal — "
                f"activate your top {alert['category']} card to recover value."
            )
            
        result = {
            "monthly_spend": current_spend,
            "anomalies": anomaly_messages,
            "transactions_parsed": len(df)
        }
        
        return jsonify({"success": True, "data": result, "error": None})

@app.route('/api/boardroom', methods=['POST'])
def boardroom():
    data = request.json
    if not data or 'user_id' not in data:
        return jsonify({"success": False, "error": "Missing user_id"}), 400
        
    user_id = data['user_id']
    profile = data.get('profile_summary', "Average spender looking for options.")
    facts = data.get('card_facts', "HDFC Regalia gives 2.6% on travel.")
    
    debate = run_boardroom_debate(user_id, profile, facts)
    return jsonify({"success": True, "data": {"debate": debate}, "error": None})

@app.route('/api/ocr-offer', methods=['POST'])
def ocr_offer():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No image file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        upload_folder = os.path.join(os.path.dirname(__file__), 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        parsed_data = parse_offer_image(filepath)
        
        return jsonify({"success": True, "data": parsed_data, "error": None})

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"success": False, "error": "Missing user_id"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT d.id, d.card_id, c.name, c.bank, d.category, d.old_rate, d.new_rate, d.extra_loss, d.created_at
        FROM downgrade_alerts d
        JOIN cards c ON d.card_id = c.card_id
        WHERE d.user_id = ?
        ORDER BY d.created_at DESC
    """, (user_id,))
    
    alerts_raw = cursor.fetchall()
    conn.close()
    
    alerts = []
    for a in alerts_raw:
        message = (
            f"ALERT: Your {a['bank']} {a['name']} reward rate on {a['category']} "
            f"dropped from {a['old_rate']}% to {a['new_rate']}% — "
            f"you are now losing ₹{a['extra_loss']}/year extra."
        )
        alerts.append({
            "id": a['id'],
            "card_name": f"{a['bank']} {a['name']}",
            "category": a['category'],
            "extra_loss_inr": a['extra_loss'],
            "message": message,
            "date": a['created_at']
        })
        
    return jsonify({"success": True, "data": {"alerts": alerts}, "error": None})

@app.route('/api/simulate', methods=['POST'])
def simulate_event():
    data = request.json
    if not data or 'life_event' not in data or 'user_profile' not in data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    event = data['life_event']
    profile = data['user_profile']
    
    if event == "marriage":
        partner = data.get('partner_profile', {'monthly_spend': {}})
        joint_spend = {}
        categories = ['dining', 'fuel', 'grocery', 'travel', 'online', 'utilities', 'international', 'other']
        for cat in categories:
            joint_spend[cat] = profile.get('monthly_spend', {}).get(cat, 0) + partner.get('monthly_spend', {}).get(cat, 0)
            
        return jsonify({
            "success": True, 
            "data": {
                "event": "marriage",
                "message": "Combined profiles successfully.",
                "joint_spend": joint_spend,
                "suggestion": "Your combined grocery and travel spend makes the HDFC Infinia highly lucrative. Consider applying as a joint account."
            }, 
            "error": None
        })
        
    elif event == "salary_hike":
        old_income = profile.get('income_annual', 0)
        new_income = data.get('new_income', old_income * 1.5)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT card_id, name, bank, min_income_required 
            FROM cards 
            WHERE min_income_required > ? AND min_income_required <= ?
        """, (old_income, new_income))
        
        unlocked = cursor.fetchall()
        conn.close()
        
        unlocked_cards = [{"card_id": r['card_id'], "name": f"{r['bank']} {r['name']}", "required": r['min_income_required']} for r in unlocked]
        
        radar_data = []
        for c in unlocked_cards:
            radar_data.append({
                "card": c['name'],
                "prestige": 90 if "Infinia" in c['name'] else 70,
                "rewards": 85,
                "lifestyle": 95 if "Infinia" in c['name'] else 60,
                "fees": 40
            })
            
        return jsonify({
            "success": True, 
            "data": {
                "event": "salary_hike",
                "unlocked_cards": unlocked_cards,
                "radar_data": radar_data,
                "message": f"Congratulations! Your hike unlocks {len(unlocked_cards)} premium tier cards."
            }, 
            "error": None
        })
        
    elif event == "emi_purchase":
        amount = data.get('purchase_amount', 100000)
        tenure_months = data.get('tenure_months', 6)
        interest_rate = data.get('interest_rate_pa', 15.0)
        card_reward_rate = data.get('card_reward_rate_percent', 5.0)
        
        monthly_rate = (interest_rate / 12) / 100
        emi = amount * monthly_rate * ((1 + monthly_rate)**tenure_months) / (((1 + monthly_rate)**tenure_months) - 1)
        total_paid = emi * tenure_months
        interest_cost = total_paid - amount
        
        cashback_earned = amount * (card_reward_rate / 100)
        
        net_impact = cashback_earned - interest_cost
        
        chart_data = []
        for month in range(1, tenure_months + 1):
            interest_paid_so_far = (interest_cost / tenure_months) * month
            chart_data.append({
                "month": month,
                "cashback_gained": cashback_earned,
                "interest_cost": interest_paid_so_far
            })
            
        return jsonify({
            "success": True, 
            "data": {
                "event": "emi_purchase",
                "interest_cost": round(interest_cost, 2),
                "cashback_earned": round(cashback_earned, 2),
                "net_impact": round(net_impact, 2),
                "break_even": net_impact >= 0,
                "chart_data": chart_data,
                "message": f"EMI costs ₹{interest_cost:.0f} in interest, but you earn ₹{cashback_earned:.0f} in rewards. Net: ₹{net_impact:.0f}."
            }, 
            "error": None
        })
        
    return jsonify({"success": False, "error": "Unknown life event"}), 400

@app.route('/api/vote', methods=['POST'])
def vote_offer():
    data = request.json
    if not data or 'offer_id' not in data or 'card_id' not in data or 'vote' not in data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    offer_id = data['offer_id']
    card_id = data['card_id']
    vote = data['vote'] # 'up' or 'down'
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Ensure offer exists in table first
    cursor.execute("INSERT OR IGNORE INTO offer_votes (offer_id, card_id, upvotes, downvotes) VALUES (?, ?, 0, 0)", (offer_id, card_id))
    
    if vote == 'up':
        cursor.execute("UPDATE offer_votes SET upvotes = upvotes + 1, last_updated = CURRENT_TIMESTAMP WHERE offer_id = ?", (offer_id,))
    elif vote == 'down':
        cursor.execute("UPDATE offer_votes SET downvotes = downvotes + 1, last_updated = CURRENT_TIMESTAMP WHERE offer_id = ?", (offer_id,))
        
    cursor.execute("SELECT upvotes, downvotes FROM offer_votes WHERE offer_id = ?", (offer_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    
    total_votes = row['upvotes'] + row['downvotes']
    acceptance_rate = int((row['upvotes'] / total_votes) * 100) if total_votes > 0 else 0
    
    return jsonify({
        "success": True, 
        "data": {
            "acceptance_rate": acceptance_rate,
            "message": f"{acceptance_rate}% of users confirmed this works"
        }, 
        "error": None
    })

@app.route('/api/submit-combo', methods=['POST'])
def submit_combo():
    data = request.json
    if not data or 'combo_id' not in data or 'cards' not in data or 'city' not in data or 'persona' not in data or 'nav_score' not in data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    combo_id = data['combo_id']
    cards_json = str(data['cards']) # list of card names or IDs
    city = data['city']
    persona = data['persona']
    nav_score = data['nav_score']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insert or update submissions count
    cursor.execute("SELECT submissions FROM card_combos WHERE combo_id = ?", (combo_id,))
    row = cursor.fetchone()
    
    if row:
        cursor.execute("UPDATE card_combos SET submissions = submissions + 1, nav_score = ? WHERE combo_id = ?", (nav_score, combo_id))
    else:
        cursor.execute("""
            INSERT INTO card_combos (combo_id, cards_json, city, persona, nav_score, submissions) 
            VALUES (?, ?, ?, ?, ?, 1)
        """, (combo_id, cards_json, city, persona, nav_score))
        
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "data": {"message": "Combo submitted successfully."}, "error": None})

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    city = request.args.get('city', 'Mumbai')
    persona = request.args.get('persona', 'The Reward Arbitrageur')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cards_json, nav_score, submissions 
        FROM card_combos 
        WHERE city = ? AND persona = ?
        ORDER BY nav_score DESC 
        LIMIT 5
    """, (city, persona))
    
    combos_raw = cursor.fetchall()
    conn.close()
    
    leaderboard = []
    for c in combos_raw:
        # Assuming cards_json was stored as string representation of a list
        try:
            import ast
            cards_list = ast.literal_eval(c['cards_json'])
            stack_name = " + ".join(cards_list)
        except:
            stack_name = c['cards_json']
            
        message = f"The {city} Optimal Stack for {persona}s: {stack_name} — avg NAV ₹{c['nav_score']:,.0f}/year"
        
        leaderboard.append({
            "stack": stack_name,
            "nav_score": c['nav_score'],
            "submissions": c['submissions'],
            "message": message
        })
        
    return jsonify({"success": True, "data": {"leaderboard": leaderboard}, "error": None})

@app.route('/api/generate-report', methods=['GET'])
def generate_report():
    user_id = request.args.get('user_id', 'demo_user')
    filepath = generate_annual_report(user_id, 2025)
    return send_file(filepath, as_attachment=True)

import uuid

@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.json
    return jsonify({
        "token": "mock-jwt-token-123",
        "user": {
            "id": str(uuid.uuid4()),
            "name": data.get("name", "Demo User"),
            "email": data.get("email", "demo@example.com")
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.json
    return jsonify({
        "token": "mock-jwt-token-123",
        "user": {
            "id": "demo-user-1",
            "name": "Demo User",
            "email": data.get("email", "demo@example.com")
        }
    })

@app.route('/api/instruments', methods=['GET'])
def get_instruments():
    # In a real app, we'd get the user_id from the JWT token
    user_id = 'demo-user-1'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.card_id as id, c.name, c.bank
        FROM user_cards uc
        JOIN cards c ON uc.card_id = c.card_id
        WHERE uc.user_id = ?
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    instruments = [{"id": r['id'], "name": r['name'], "type": r['bank']} for r in rows]
    return jsonify({"success": True, "instruments": instruments})

@app.route('/api/instruments', methods=['POST'])
def add_instrument():
    user_id = 'demo-user-1'
    data = request.json
    card_name = data.get('name')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Find card_id by name
    cursor.execute("SELECT card_id FROM cards WHERE name = ?", (card_name,))
    row = cursor.fetchone()
    
    if not row:
        # Fallback: maybe the name is already a card_id or includes bank name
        cursor.execute("SELECT card_id FROM cards WHERE name LIKE ?", (f"%{card_name}%",))
        row = cursor.fetchone()
        
    if row:
        card_id = row['card_id']
        try:
            cursor.execute("INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)", (user_id, card_id))
            conn.commit()
            instrument = {"id": card_id, "name": card_name}
            return jsonify({"success": True, "instrument": instrument})
        except sqlite3.IntegrityError:
            return jsonify({"success": False, "error": "Card already added"}), 400
        finally:
            conn.close()
    else:
        conn.close()
        return jsonify({"success": False, "error": "Card not found in catalog"}), 404

@app.route('/api/instruments/<instrument_id>', methods=['DELETE'])
def remove_instrument(instrument_id):
    user_id = 'demo-user-1'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_cards WHERE user_id = ? AND card_id = ?", (user_id, instrument_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/analytics/summary', methods=['GET'])
def get_analytics_summary():
    user_id = 'demo-user-1'
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Card count
    cursor.execute("SELECT COUNT(*) FROM user_cards WHERE user_id = ?", (user_id,))
    card_count = cursor.fetchone()[0]
    
    # Monthly spend
    cursor.execute("SELECT * FROM user_monthly_spend WHERE user_id = ?", (user_id,))
    spend_row = cursor.fetchone()
    
    month_total = 0
    if spend_row:
        categories = ['dining', 'fuel', 'grocery', 'travel', 'online', 'utilities', 'international', 'other']
        for cat in categories:
            month_total += spend_row[cat] if spend_row[cat] else 0
            
    conn.close()
    
    return jsonify({
        "success": True,
        "monthTotal": month_total,
        "totalRewardsValue": int(month_total * 0.02), # Mock 2% reward
        "instrumentCount": card_count,
        "topCategory": "Travel"
    })

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    user_id = 'demo-user-1'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_monthly_spend WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"success": True, "monthly_spend": {}})
        
    spend = {
        "dining": row['dining'],
        "fuel": row['fuel'],
        "grocery": row['grocery'],
        "travel": row['travel'],
        "online": row['online'],
        "utilities": row['utilities'],
        "international": row['international'],
        "other": row['other']
    }
    return jsonify({"success": True, "monthly_spend": spend})

@app.route('/api/recommend', methods=['POST'])
def recommend():
    user_id = 'demo-user-1'
    data = request.json
    amount = data.get('amount', 0)
    category = data.get('category', 'Other').lower()
    
    # Map high-level categories to DB categories
    cat_map = {
        'food & dining': 'dining',
        'travel': 'travel',
        'shopping': 'online',
        'entertainment': 'online',
        'health & medical': 'other',
        'utilities & bills': 'utilities',
        'education': 'other'
    }
    db_cat = cat_map.get(category, 'other')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get user's cards
    cursor.execute("""
        SELECT uc.card_id, c.name, c.bank 
        FROM user_cards uc
        JOIN cards c ON uc.card_id = c.card_id
        WHERE uc.user_id = ?
    """, (user_id,))
    user_cards = cursor.fetchall()
    
    recommendations = []
    
    for card in user_cards:
        # Get reward rate for this card and category
        cursor.execute("""
            SELECT rate_percent FROM card_reward_categories 
            WHERE card_id = ? AND category = ?
        """, (card['card_id'], db_cat))
        rate_row = cursor.fetchone()
        
        if not rate_row:
            # Fallback to 'other'
            cursor.execute("""
                SELECT rate_percent FROM card_reward_categories 
                WHERE card_id = ? AND category = 'other'
            """, (card['card_id'],))
            rate_row = cursor.fetchone()
            
        rate = rate_row['rate_percent'] if rate_row else 1.0 # Default 1%
        
        monetary_value = round((amount * rate / 100), 2)
        
        recommendations.append({
            "instrument": {
                "id": card['card_id'],
                "name": f"{card['bank']} {card['name']}",
                "redemption_value": 1.0 # Simplified for demo
            },
            "monetaryValue": monetary_value,
            "rawRewards": monetary_value, # Assuming 1:1 for demo
            "isBest": False,
            "explanation": {
                "steps": [
                    {"label": "Base Reward Rate", "value": f"{rate}%"},
                    {"label": "Transaction Amount", "value": f"₹{amount}"},
                    {"label": "Total Earned", "value": f"₹{monetary_value}"}
                ]
            }
        })
    
    conn.close()
    
    # Sort and mark best
    recommendations.sort(key=lambda x: x['monetaryValue'], reverse=True)
    if recommendations:
        recommendations[0]['isBest'] = True
        
    return jsonify({"success": True, "recommendations": recommendations})

if __name__ == '__main__':

    app.run(debug=True, port=5000)

