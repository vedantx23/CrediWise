import os
import sqlite3
import datetime
from contextlib import closing

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'cards.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def simulate_new_rates_fetch():
    """
    Simulates a scraper fetching the latest reward rates for all cards.
    We will artificially downgrade one card to test the detector.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT card_id, category, rate_percent FROM card_reward_categories")
    current_rates = cursor.fetchall()
    
    new_rates = []
    for r in current_rates:
        card_id = r['card_id']
        category = r['category']
        rate = r['rate_percent']
        
        # Simulate a stealth downgrade: HDFC Regalia travel rate drops from 2.66% to 1.33%
        if card_id == 'hdfc_regalia' and category == 'travel':
            rate = 1.33
        
        new_rates.append({
            'card_id': card_id,
            'category': category,
            'rate': rate
        })
    conn.close()
    return new_rates

def run_downgrade_check():
    print("[Pipeline] Running Stealth Downgrade Detector...")
    new_rates = simulate_new_rates_fetch()
    
    with closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        
        for new_r in new_rates:
            c_id = new_r['card_id']
            cat = new_r['category']
            new_rate = new_r['rate']
            
            # Check current rate in database
            cursor.execute("SELECT rate_percent FROM card_reward_categories WHERE card_id = ? AND category = ?", (c_id, cat))
            row = cursor.fetchone()
            
            if row:
                old_rate = row['rate_percent']
                
                # If rate dropped
                if new_rate < old_rate:
                    print(f"🚨 DOWNGRADE DETECTED: {c_id} {cat} {old_rate}% -> {new_rate}%")
                    
                    # Update the live table
                    cursor.execute("UPDATE card_reward_categories SET rate_percent = ? WHERE card_id = ? AND category = ?", 
                                   (new_rate, c_id, cat))
                                   
                    # Log into history
                    cursor.execute("INSERT INTO card_rate_history (card_id, category, rate) VALUES (?, ?, ?)", 
                                   (c_id, cat, old_rate))
                                   
                    # Find affected users
                    cursor.execute("""
                        SELECT uc.user_id, us.{} 
                        FROM user_cards uc
                        JOIN user_monthly_spend us ON uc.user_id = us.user_id
                        WHERE uc.card_id = ?
                    """.format(cat), (c_id,))
                    
                    affected_users = cursor.fetchall()
                    for user in affected_users:
                        user_id = user['user_id']
                        # Monthly spend in that category
                        spend = user[cat] if user[cat] else 0
                        # Loss per year = (drop percentage / 100) * spend * 12
                        drop = old_rate - new_rate
                        extra_loss = (spend * (drop / 100)) * 12
                        
                        # Create alert
                        cursor.execute("""
                            INSERT INTO downgrade_alerts (user_id, card_id, category, old_rate, new_rate, extra_loss)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (user_id, c_id, cat, old_rate, new_rate, int(extra_loss)))
                        
        conn.commit()
    print("[Pipeline] Downgrade check complete.")

if __name__ == "__main__":
    run_downgrade_check()
