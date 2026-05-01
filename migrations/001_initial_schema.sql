CREATE TABLE IF NOT EXISTS cards (
    card_id TEXT PRIMARY KEY,
    bank TEXT NOT NULL,
    name TEXT NOT NULL,
    annual_fee INTEGER NOT NULL,
    fee_waiver_spend INTEGER NOT NULL,
    lounge_domestic INTEGER NOT NULL,
    lounge_intl INTEGER NOT NULL,
    forex_markup_percent REAL NOT NULL,
    interest_rate_monthly REAL NOT NULL,
    min_income_required INTEGER NOT NULL,
    min_cibil INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS card_reward_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    category TEXT NOT NULL,
    rate_percent REAL NOT NULL,
    monthly_cap_inr INTEGER,
    FOREIGN KEY(card_id) REFERENCES cards(card_id)
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    income_annual INTEGER NOT NULL,
    cibil_score INTEGER NOT NULL,
    life_event TEXT
);

CREATE TABLE IF NOT EXISTS user_monthly_spend (
    user_id TEXT PRIMARY KEY,
    dining INTEGER DEFAULT 0,
    fuel INTEGER DEFAULT 0,
    grocery INTEGER DEFAULT 0,
    travel INTEGER DEFAULT 0,
    online INTEGER DEFAULT 0,
    utilities INTEGER DEFAULT 0,
    international INTEGER DEFAULT 0,
    other INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS user_cards (
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    PRIMARY KEY(user_id, card_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(card_id) REFERENCES cards(card_id)
);

CREATE TABLE IF NOT EXISTS offer_votes (
    offer_id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(card_id) REFERENCES cards(card_id)
);

CREATE TABLE IF NOT EXISTS card_combos (
    combo_id TEXT PRIMARY KEY,
    cards_json TEXT NOT NULL,
    city TEXT,
    persona TEXT,
    nav_score INTEGER,
    submissions INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS card_rate_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    category TEXT NOT NULL,
    rate REAL NOT NULL,
    scraped_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(card_id) REFERENCES cards(card_id)
);

CREATE TABLE IF NOT EXISTS downgrade_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    category TEXT NOT NULL,
    old_rate REAL NOT NULL,
    new_rate REAL NOT NULL,
    extra_loss INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(card_id) REFERENCES cards(card_id)
);
