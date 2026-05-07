"""
seed_data.py — Seeds Indian credit card data into CrediWise-AI SQLite database.
Run: python backend/seed_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import get_connection, run_migrations

# ─── Card definitions ────────────────────────────────────────────────────────
# (card_id, bank, name, annual_fee, fee_waiver_spend, lounge_domestic, lounge_intl,
#  forex_markup_pct, interest_rate_monthly, min_income_annual, min_cibil,
#  is_invite_only, is_lifetime_free, is_customizable, joining_fee, card_network)

CARDS = [
    # ── HDFC ──────────────────────────────────────────────────────────────────
    ("hdfc_regalia",    "HDFC Bank",            "HDFC Regalia",
     2500,  300000,  6,  6,  2.00, 3.49, 600000,  700, 0, 0, 0, 2500,  "Visa"),
    ("hdfc_millennia",  "HDFC Bank",            "HDFC Millennia",
     1000,  100000,  8,  0,  3.50, 3.49, 420000,  700, 0, 0, 0, 1000,  "Mastercard"),
    ("hdfc_infinia",    "HDFC Bank",            "HDFC Infinia",
     10000, 1000000, 99, 99, 2.00, 3.49, 1500000, 750, 1, 0, 0, 10000, "Visa"),

    # ── ICICI ─────────────────────────────────────────────────────────────────
    ("icici_amazon",    "ICICI Bank",           "ICICI Amazon Pay",
     0,     0,       0,  0,  3.50, 3.40, 300000,  700, 0, 1, 0, 0,     "Visa"),
    ("icici_coral",     "ICICI Bank",           "ICICI Coral",
     500,   150000,  2,  0,  3.50, 3.40, 300000,  700, 0, 0, 0, 0,     "Visa"),

    # ── AXIS ──────────────────────────────────────────────────────────────────
    ("axis_ace",        "Axis Bank",            "Axis Ace",
     499,   200000,  4,  0,  3.50, 3.49, 240000,  700, 0, 0, 0, 0,     "Visa"),
    ("axis_flipkart",   "Axis Bank",            "Axis Flipkart",
     500,   200000,  4,  0,  3.50, 3.49, 300000,  700, 0, 0, 0, 500,   "Visa"),

    # ── SBI ───────────────────────────────────────────────────────────────────
    ("sbi_simplyclick", "SBI Card",             "SBI SimplyCLICK",
     499,   100000,  0,  0,  3.50, 3.35, 300000,  700, 0, 0, 0, 499,   "Visa"),
    ("sbi_elite",       "SBI Card",             "SBI Elite",
     4999,  1000000, 8,  6,  1.99, 3.35, 600000,  750, 0, 0, 0, 4999,  "Mastercard"),

    # ── AMEX ──────────────────────────────────────────────────────────────────
    ("amex_mrcc",       "Amex",                 "Amex Membership Rewards Credit Card",
     1000,  0,       0,  0,  3.50, 3.50, 600000,  700, 0, 0, 0, 0,     "Amex"),
    ("amex_gold",       "Amex",                 "Amex Gold Card",
     4500,  0,       0,  0,  3.50, 3.50, 600000,  750, 0, 0, 0, 0,     "Amex"),

    # ── KOTAK ─────────────────────────────────────────────────────────────────
    ("kotak_811",       "Kotak",                "Kotak 811 Dream Different",
     0,     0,       0,  0,  3.50, 3.50, 200000,  650, 0, 1, 0, 0,     "Visa"),
    ("kotak_league",    "Kotak",                "Kotak League Platinum",
     499,   50000,   8,  0,  3.50, 3.50, 300000,  700, 0, 0, 0, 499,   "Mastercard"),

    # ── INDUSIND ──────────────────────────────────────────────────────────────
    ("indusind_platinum","IndusInd Bank",        "IndusInd Platinum",
     999,   150000,  8,  0,  3.50, 3.49, 300000,  700, 0, 0, 0, 0,     "Visa"),
    ("indusind_legend", "IndusInd Bank",        "IndusInd Legend",
     3999,  800000,  16, 8,  2.00, 3.49, 600000,  750, 0, 0, 0, 3999,  "Mastercard"),

    # ── AU ────────────────────────────────────────────────────────────────────
    ("au_lit",          "AU Small Finance Bank","AU LIT",
     499,   100000,  4,  0,  3.50, 3.49, 300000,  700, 0, 0, 1, 499,   "Visa"),
]

# ─── Reward rates ────────────────────────────────────────────────────────────
# (card_id, category, rate_percent, monthly_cap_inr, notes)
# ERR = (points_per_unit * point_value_paise / spend_unit_paise) * 100

REWARD_RATES = [
    # ── HDFC Regalia ──────────────────────────────────────────────────────────
    # 4 pts per Rs150; 1 pt = Rs0.50 = 50 paise → (4*50/15000)*100 = 1.33%
    # 5x on dining/travel → (5*50/15000)*100 = 1.67%
    ("hdfc_regalia", "dining",       1.67, None,  "5x pts per Rs150 at 1pt=Rs0.50"),
    ("hdfc_regalia", "fuel",         1.33, None,  "4x pts per Rs150"),
    ("hdfc_regalia", "grocery",      1.33, None,  "4x pts per Rs150"),
    ("hdfc_regalia", "travel",       1.67, None,  "5x on flights and hotels"),
    ("hdfc_regalia", "online",       1.33, None,  "4x pts per Rs150"),
    ("hdfc_regalia", "utilities",    1.33, None,  "4x pts per Rs150"),
    ("hdfc_regalia", "international",2.00, None,  "4x pts + 2% forex markup"),
    ("hdfc_regalia", "other",        1.33, None,  "4x pts per Rs150"),

    # ── HDFC Millennia ────────────────────────────────────────────────────────
    # 5% cashback on select merchants; 1% on rest
    ("hdfc_millennia", "dining",       5.00, 750,  "5% cashback on Swiggy and Zomato"),
    ("hdfc_millennia", "fuel",         1.00, None,  "1% CashPoints"),
    ("hdfc_millennia", "grocery",      5.00, 750,  "5% cashback on BigBasket"),
    ("hdfc_millennia", "travel",       5.00, 750,  "5% on MakeMyTrip and Ola"),
    ("hdfc_millennia", "online",       5.00, 750,  "5% on Amazon and Flipkart"),
    ("hdfc_millennia", "utilities",    1.00, None,  "1% CashPoints"),
    ("hdfc_millennia", "international",1.00, None,  "1% CashPoints"),
    ("hdfc_millennia", "other",        1.00, None,  "1% CashPoints on all others"),

    # ── HDFC Infinia ──────────────────────────────────────────────────────────
    # 5x pts per Rs150; 1pt=Rs1 → (5*100/15000)*100 = 3.33%
    # 10x on SmartBuy travel/online → (10*100/15000)*100 = 6.67%
    ("hdfc_infinia", "dining",       5.00, None,  "5x pts per Rs150 at 1pt=Rs1"),
    ("hdfc_infinia", "fuel",         3.33, None,  "5x pts per Rs150 at 1pt=Rs1"),
    ("hdfc_infinia", "grocery",      3.33, None,  "5x pts per Rs150 at 1pt=Rs1"),
    ("hdfc_infinia", "travel",       6.67, None,  "10x via HDFC SmartBuy travel portal"),
    ("hdfc_infinia", "online",       6.67, None,  "10x on SmartBuy partner merchants"),
    ("hdfc_infinia", "utilities",    3.33, None,  "5x pts per Rs150"),
    ("hdfc_infinia", "international",3.33, None,  "5x pts plus 2% forex markup"),
    ("hdfc_infinia", "other",        3.33, None,  "5x pts per Rs150 at 1pt=Rs1"),

    # ── ICICI Amazon Pay ──────────────────────────────────────────────────────
    # 5% Amazon Prime; 2% dining/travel/grocery (Prime); 1% rest
    ("icici_amazon", "dining",       2.00, None,  "2% cashback for Prime members"),
    ("icici_amazon", "fuel",         1.00, None,  "1% cashback plus surcharge waiver"),
    ("icici_amazon", "grocery",      2.00, None,  "2% cashback for Prime members"),
    ("icici_amazon", "travel",       2.00, None,  "2% cashback for Prime members"),
    ("icici_amazon", "online",       5.00, None,  "5% on Amazon.in for Prime members"),
    ("icici_amazon", "utilities",    1.00, None,  "1% cashback"),
    ("icici_amazon", "international",1.00, None,  "1% cashback"),
    ("icici_amazon", "other",        1.00, None,  "1% cashback on all other spends"),

    # ── ICICI Coral ───────────────────────────────────────────────────────────
    # 2 PAYBACK pts per Rs100; 1pt=Rs0.50 → 1% on dining/entertainment; 0.5% base
    ("icici_coral", "dining",       1.00, None,  "2x PAYBACK pts per Rs100"),
    ("icici_coral", "fuel",         0.50, None,  "1x pts plus surcharge waiver"),
    ("icici_coral", "grocery",      0.50, None,  "1x pts per Rs100"),
    ("icici_coral", "travel",       1.00, None,  "2x pts on travel bookings"),
    ("icici_coral", "online",       0.50, None,  "1x pts per Rs100"),
    ("icici_coral", "utilities",    0.50, None,  "1x pts per Rs100"),
    ("icici_coral", "international",0.50, None,  "1x pts per Rs100"),
    ("icici_coral", "other",        0.50, None,  "1x pts per Rs100"),

    # ── Axis Ace ──────────────────────────────────────────────────────────────
    # 5% on Google Pay utility payments; 4% Swiggy/Zomato/Ola; 2% all others
    ("axis_ace", "dining",       4.00, None,  "4% cashback on Swiggy and Zomato"),
    ("axis_ace", "fuel",         2.00, None,  "2% cashback plus surcharge waiver"),
    ("axis_ace", "grocery",      2.00, None,  "2% cashback"),
    ("axis_ace", "travel",       2.00, None,  "2% cashback including Ola rides"),
    ("axis_ace", "online",       2.00, None,  "2% cashback on online spends"),
    ("axis_ace", "utilities",    5.00, None,  "5% via Google Pay recharge and bills"),
    ("axis_ace", "international",2.00, None,  "2% cashback"),
    ("axis_ace", "other",        2.00, None,  "2% cashback on all other spends"),

    # ── Axis Flipkart ─────────────────────────────────────────────────────────
    # 5% Flipkart/Myntra; 4% preferred; 1.5% all others
    ("axis_flipkart", "dining",       4.00, None,  "4% on preferred dining merchants"),
    ("axis_flipkart", "fuel",         1.50, None,  "1.5% cashback"),
    ("axis_flipkart", "grocery",      4.00, None,  "4% on BigBasket"),
    ("axis_flipkart", "travel",       4.00, None,  "4% on preferred travel partners"),
    ("axis_flipkart", "online",       5.00, None,  "5% on Flipkart and Myntra"),
    ("axis_flipkart", "utilities",    1.50, None,  "1.5% cashback"),
    ("axis_flipkart", "international",1.50, None,  "1.5% cashback"),
    ("axis_flipkart", "other",        1.50, None,  "1.5% cashback on all others"),

    # ── SBI SimplyCLICK ───────────────────────────────────────────────────────
    # 10x on Amazon/BookMyShow: 10*25/10000*100=2.5%
    # 5x on dining/entmt: 5*25/10000*100=1.25%
    # 1x base: 1*25/10000*100=0.25%
    ("sbi_simplyclick", "dining",       1.25, None, "5x pts per Rs100 at 1pt=Rs0.25"),
    ("sbi_simplyclick", "fuel",         0.25, None, "1x pts per Rs100 plus surcharge waiver"),
    ("sbi_simplyclick", "grocery",      0.25, None, "1x pts per Rs100"),
    ("sbi_simplyclick", "travel",       0.25, None, "1x pts per Rs100"),
    ("sbi_simplyclick", "online",       2.50, None, "10x on Amazon and Cleartrip"),
    ("sbi_simplyclick", "utilities",    0.25, None, "1x pts per Rs100"),
    ("sbi_simplyclick", "international",0.25, None, "1x pts per Rs100"),
    ("sbi_simplyclick", "other",        0.25, None, "1x pts per Rs100"),

    # ── SBI Elite ─────────────────────────────────────────────────────────────
    # 5x on dining/grocery/dept stores (1pt=Rs0.50) → 2.5%; 2x others → 1%
    ("sbi_elite", "dining",       2.50, None, "5x pts per Rs100 at 1pt=Rs0.50"),
    ("sbi_elite", "fuel",         1.00, None, "2x pts per Rs100"),
    ("sbi_elite", "grocery",      2.50, None, "5x pts per Rs100 on dept stores"),
    ("sbi_elite", "travel",       1.00, None, "2x pts per Rs100"),
    ("sbi_elite", "online",       1.00, None, "2x pts per Rs100"),
    ("sbi_elite", "utilities",    1.00, None, "2x pts per Rs100"),
    ("sbi_elite", "international",1.00, None, "2x pts plus 1.99% forex markup"),
    ("sbi_elite", "other",        1.00, None, "2x pts per Rs100"),

    # ── Amex MRCC ─────────────────────────────────────────────────────────────
    # 1pt per Rs50; 18x on partner restaurants; 1pt avg Rs0.40 (Gold Collection)
    # Base: (1*40/5000)*100=0.80%; 18x dining: (18*40/5000)*100=14.4% → capped ~4%
    ("amex_mrcc", "dining",       4.00, None, "18x pts per Rs50 at partner restaurants"),
    ("amex_mrcc", "fuel",         0.80, None, "1pt per Rs50 at Rs0.40 per point"),
    ("amex_mrcc", "grocery",      0.80, None, "1pt per Rs50"),
    ("amex_mrcc", "travel",       0.80, None, "1pt per Rs50 on all travel"),
    ("amex_mrcc", "online",       0.80, None, "1pt per Rs50"),
    ("amex_mrcc", "utilities",    0.80, None, "1pt per Rs50"),
    ("amex_mrcc", "international",0.80, None, "1pt per Rs50"),
    ("amex_mrcc", "other",        0.80, None, "1pt per Rs50"),

    # ── Amex Gold ─────────────────────────────────────────────────────────────
    # 3x dining; 2x grocery; 1x others; 1pt avg Rs0.80 (transfer partners)
    ("amex_gold", "dining",       4.80, None, "3x Membership Rewards at partner dining"),
    ("amex_gold", "fuel",         0.80, None, "1pt per Rs50 at Rs0.80 via transfer"),
    ("amex_gold", "grocery",      1.60, None, "2x pts per Rs50 on supermarkets"),
    ("amex_gold", "travel",       2.40, None, "3x via Amex Travel portal"),
    ("amex_gold", "online",       0.80, None, "1pt per Rs50"),
    ("amex_gold", "utilities",    0.80, None, "1pt per Rs50"),
    ("amex_gold", "international",0.80, None, "1pt per Rs50 plus global Amex offers"),
    ("amex_gold", "other",        0.80, None, "1pt per Rs50"),

    # ── Kotak 811 ─────────────────────────────────────────────────────────────
    # Direct cashback: 2% online; 1% everything else
    ("kotak_811", "dining",       1.00, None,   "1% direct cashback"),
    ("kotak_811", "fuel",         1.00, 500,    "1% cashback capped at Rs500 per month"),
    ("kotak_811", "grocery",      1.00, None,   "1% direct cashback"),
    ("kotak_811", "travel",       1.00, None,   "1% direct cashback"),
    ("kotak_811", "online",       2.00, 500,    "2% cashback on online transactions"),
    ("kotak_811", "utilities",    1.00, None,   "1% direct cashback"),
    ("kotak_811", "international",1.00, None,   "1% direct cashback"),
    ("kotak_811", "other",        1.00, None,   "1% cashback on all other spends"),

    # ── Kotak League Platinum ─────────────────────────────────────────────────
    # 8x on dining/movies (1pt=Rs0.50) → 4%; 4x others → 2%
    ("kotak_league", "dining",       4.00, None, "8x pts per Rs100 at 1pt=Rs0.50"),
    ("kotak_league", "fuel",         2.00, None, "4x pts per Rs100 plus surcharge waiver"),
    ("kotak_league", "grocery",      2.00, None, "4x pts per Rs100"),
    ("kotak_league", "travel",       4.00, None, "8x on travel and entertainment"),
    ("kotak_league", "online",       4.00, None, "8x on select online merchants"),
    ("kotak_league", "utilities",    2.00, None, "4x pts per Rs100"),
    ("kotak_league", "international",2.00, None, "4x pts per Rs100"),
    ("kotak_league", "other",        2.00, None, "4x pts per Rs100"),

    # ── IndusInd Platinum ─────────────────────────────────────────────────────
    # 1.5 pts per Rs150; 1pt=Rs0.75 → (1.5*75/15000)*100=0.75%; dining 3x=1.5%
    ("indusind_platinum", "dining",       1.50, None, "3x pts per Rs150 on dining"),
    ("indusind_platinum", "fuel",         0.75, None, "1.5x pts per Rs150"),
    ("indusind_platinum", "grocery",      0.75, None, "1.5x pts per Rs150"),
    ("indusind_platinum", "travel",       0.75, None, "1.5x pts per Rs150"),
    ("indusind_platinum", "online",       0.75, None, "1.5x pts per Rs150"),
    ("indusind_platinum", "utilities",    0.75, None, "1.5x pts per Rs150"),
    ("indusind_platinum", "international",0.75, None, "1.5x pts plus 3.5% forex markup"),
    ("indusind_platinum", "other",        0.75, None, "1.5x pts per Rs150"),

    # ── IndusInd Legend ───────────────────────────────────────────────────────
    # 2x all (Rs150 per point earn); 4x dining/travel
    ("indusind_legend", "dining",       3.00, None, "4x pts per Rs150 on dining"),
    ("indusind_legend", "fuel",         1.50, None, "2x pts per Rs150"),
    ("indusind_legend", "grocery",      1.50, None, "2x pts per Rs150"),
    ("indusind_legend", "travel",       3.00, None, "4x pts on travel with Priority Pass"),
    ("indusind_legend", "online",       1.50, None, "2x pts per Rs150"),
    ("indusind_legend", "utilities",    1.50, None, "2x pts per Rs150"),
    ("indusind_legend", "international",3.00, None, "4x pts plus 2% forex markup"),
    ("indusind_legend", "other",        1.50, None, "2x pts per Rs150"),

    # ── AU LIT (customizable) ─────────────────────────────────────────────────
    # Base 1% on all; dining +5% with Dining feature; fuel +5% with Fuel feature
    ("au_lit", "dining",       5.00, 1000, "5% with Dining feature module enabled"),
    ("au_lit", "fuel",         5.00, 500,  "5% with Fuel feature module enabled"),
    ("au_lit", "grocery",      1.00, None, "Base 1% cashback"),
    ("au_lit", "travel",       1.00, None, "Base 1% cashback"),
    ("au_lit", "online",       2.00, None, "2% with OTT or Online feature module"),
    ("au_lit", "utilities",    1.00, None, "Base 1% cashback"),
    ("au_lit", "international",1.00, None, "Base 1% cashback"),
    ("au_lit", "other",        1.00, None, "Base 1% on all other spends"),
]


def seed(conn=None) -> None:
    close = conn is None
    if conn is None:
        conn = get_connection()

    cur = conn.cursor()

    # Insert cards
    card_sql = """
        INSERT OR REPLACE INTO cards
        (card_id, bank, name, annual_fee, fee_waiver_spend, lounge_domestic, lounge_intl,
         forex_markup_pct, interest_rate_monthly, min_income_annual, min_cibil,
         is_invite_only, is_lifetime_free, is_customizable, joining_fee, card_network)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """
    cur.executemany(card_sql, CARDS)

    # Insert reward rates
    rate_sql = """
        INSERT OR REPLACE INTO reward_categories
        (card_id, category, rate_percent, monthly_cap_inr, notes)
        VALUES (?,?,?,?,?)
    """
    cur.executemany(rate_sql, REWARD_RATES)
    conn.commit()

    if close:
        conn.close()


if __name__ == "__main__":
    print("🔧 Initialising database…")
    run_migrations()
    print("🌱 Seeding Indian credit card data…")
    seed()

    # Verification
    from database import get_all_cards, get_all_rewards_map
    cards   = get_all_cards()
    rewards = get_all_rewards_map()

    print(f"\n✅ Seeding complete.")
    print(f"   Cards          : {len(cards)}")
    print(f"   Reward entries : {sum(len(v) for v in rewards.values())}")
    print()
    print(f"{'Card':<35} {'Annual Fee':>12} {'Categories':>12}")
    print("-" * 62)
    for c in cards:
        cats = len(rewards.get(c["card_id"], {}))
        fee  = f"Rs {int(c['annual_fee']):,}" if c["annual_fee"] else "FREE"
        print(f"{c['name']:<35} {fee:>12} {cats:>12}")
