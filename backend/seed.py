import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'cards.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '..', 'migrations', '001_initial_schema.sql')

def init_db():
    print(f"Initializing DB at {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    with open(SCHEMA_PATH, 'r') as f:
        cursor.executescript(f.read())
    
    conn.commit()
    return conn

def seed_cards(conn):
    cursor = conn.cursor()
    
    cards = [
        # HDFC
        ("hdfc_regalia", "HDFC", "Regalia", 2500, 300000, 12, 6, 2.0, 3.6, 1200000, 750),
        ("hdfc_millennia", "HDFC", "Millennia", 1000, 100000, 4, 0, 3.5, 3.6, 400000, 700),
        ("hdfc_infinia", "HDFC", "Infinia", 12500, 1000000, 999, 999, 2.0, 1.99, 4500000, 800),
        # ICICI
        ("icici_amazon_pay", "ICICI", "Amazon Pay", 0, 0, 0, 0, 3.5, 3.5, 300000, 700),
        ("icici_coral", "ICICI", "Coral", 500, 150000, 4, 0, 3.5, 3.5, 300000, 700),
        # Axis
        ("axis_ace", "Axis", "Ace", 499, 200000, 4, 0, 3.5, 3.6, 300000, 700),
        ("axis_flipkart", "Axis", "Flipkart", 500, 200000, 4, 0, 3.5, 3.6, 300000, 700),
        # SBI
        ("sbi_simplyclick", "SBI", "SimplyCLICK", 499, 100000, 0, 0, 3.5, 3.5, 250000, 700),
        ("sbi_elite", "SBI", "Elite", 4999, 1000000, 6, 6, 1.99, 3.5, 1200000, 750),
        # Amex
        ("amex_mrcc", "Amex", "Membership Rewards", 4500, 150000, 0, 0, 3.5, 3.5, 600000, 750),
        ("amex_gold", "Amex", "Gold", 4500, 0, 0, 0, 3.5, 3.5, 600000, 750),
        # Kotak
        ("kotak_811", "Kotak", "811", 500, 50000, 0, 0, 3.5, 3.5, 300000, 700),
        ("kotak_league", "Kotak", "League", 499, 50000, 0, 0, 3.5, 3.5, 400000, 700),
        # IndusInd
        ("indusind_platinum", "IndusInd", "Platinum", 0, 0, 0, 0, 3.5, 3.5, 500000, 700),
        ("indusind_legend", "IndusInd", "Legend", 0, 0, 0, 0, 1.8, 3.5, 1000000, 750),
        # AU
        ("au_lit", "AU", "LIT", 0, 0, 4, 0, 3.5, 3.5, 300000, 700),
    ]
    
    cursor.executemany("""
        INSERT OR IGNORE INTO cards (
            card_id, bank, name, annual_fee, fee_waiver_spend, 
            lounge_domestic, lounge_intl, forex_markup_percent, 
            interest_rate_monthly, min_income_required, min_cibil
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, cards)
    
    rewards = [
        # HDFC Regalia (approx 1.33% to 2.6%)
        ("hdfc_regalia", "travel", 2.66, None),
        ("hdfc_regalia", "dining", 2.66, None),
        ("hdfc_regalia", "other", 1.33, None),
        
        # HDFC Millennia
        ("hdfc_millennia", "online", 5.0, 1000),
        ("hdfc_millennia", "other", 1.0, 1000),
        
        # HDFC Infinia
        ("hdfc_infinia", "travel", 16.5, None),
        ("hdfc_infinia", "dining", 16.5, None),
        ("hdfc_infinia", "other", 3.3, None),
        
        # ICICI Amazon Pay
        ("icici_amazon_pay", "online", 5.0, None),
        ("icici_amazon_pay", "travel", 2.0, None),
        ("icici_amazon_pay", "other", 1.0, None),
        
        # Axis Ace
        ("axis_ace", "utilities", 5.0, 500),
        ("axis_ace", "dining", 4.0, 500),
        ("axis_ace", "other", 2.0, None),
        
        # SBI SimplyCLICK
        ("sbi_simplyclick", "online", 1.25, None),
        ("sbi_simplyclick", "other", 0.25, None),
    ]
    
    cursor.executemany("""
        INSERT OR IGNORE INTO card_reward_categories (
            card_id, category, rate_percent, monthly_cap_inr
        ) VALUES (?, ?, ?, ?)
    """, rewards)
    
    conn.commit()
    print("Database seeded successfully.")

if __name__ == "__main__":
    conn = init_db()
    seed_cards(conn)
    conn.close()
