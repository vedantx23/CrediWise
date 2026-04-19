-- Migration 001: Initial Schema for CrediWise-AI
-- Run: python backend/database.py migrate

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─────────────────────────────────────────────
-- CARD CATALOGUE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
    card_id             TEXT PRIMARY KEY,
    bank                TEXT NOT NULL,
    name                TEXT NOT NULL,
    annual_fee          REAL NOT NULL DEFAULT 0,
    fee_waiver_spend    REAL,           -- annual spend needed for fee waiver
    lounge_domestic     INTEGER DEFAULT 0,
    lounge_intl         INTEGER DEFAULT 0,
    forex_markup_pct    REAL DEFAULT 3.5,
    interest_rate_monthly REAL DEFAULT 3.5,
    min_income_annual   REAL DEFAULT 0,
    min_cibil           INTEGER DEFAULT 700,
    is_invite_only      INTEGER DEFAULT 0,   -- 1 = invite-only (e.g., Infinia)
    is_lifetime_free    INTEGER DEFAULT 0,
    is_customizable     INTEGER DEFAULT 0,   -- AU LIT special case
    joining_fee         REAL DEFAULT 0,
    card_network        TEXT,                -- Visa/Mastercard/Amex/RuPay
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Per-card, per-category reward rate
CREATE TABLE IF NOT EXISTS reward_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id         TEXT NOT NULL REFERENCES cards(card_id),
    category        TEXT NOT NULL,   -- dining|fuel|grocery|travel|online|utilities|international|other
    rate_percent    REAL NOT NULL,   -- Effective Reward Rate %
    monthly_cap_inr REAL,            -- NULL = no cap
    notes           TEXT,
    UNIQUE(card_id, category)
);

-- ─────────────────────────────────────────────
-- DOWNGRADE DETECTOR
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_rate_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id         TEXT NOT NULL REFERENCES cards(card_id),
    category        TEXT NOT NULL,
    rate_percent    REAL NOT NULL,
    scraped_date    TEXT NOT NULL DEFAULT (date('now'))
);
CREATE INDEX IF NOT EXISTS idx_rate_history_card ON card_rate_history(card_id, scraped_date);

CREATE TABLE IF NOT EXISTS downgrade_alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id         TEXT NOT NULL REFERENCES cards(card_id),
    category        TEXT NOT NULL,
    old_rate        REAL NOT NULL,
    new_rate        REAL NOT NULL,
    detected_date   TEXT NOT NULL DEFAULT (date('now')),
    acknowledged    INTEGER DEFAULT 0,
    extra_loss_annual REAL   -- computed ₹ loss at average spend
);

-- ─────────────────────────────────────────────
-- USER DATA
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id         TEXT PRIMARY KEY,
    name            TEXT,
    email           TEXT UNIQUE,
    income_annual   REAL DEFAULT 0,
    cibil_score     INTEGER DEFAULT 700,
    life_event      TEXT,                -- null|married|salary_hike|new_city
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_spend (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL REFERENCES users(user_id),
    month           TEXT NOT NULL,       -- YYYY-MM
    dining          REAL DEFAULT 0,
    fuel            REAL DEFAULT 0,
    grocery         REAL DEFAULT 0,
    travel          REAL DEFAULT 0,
    online          REAL DEFAULT 0,
    utilities       REAL DEFAULT 0,
    international   REAL DEFAULT 0,
    other           REAL DEFAULT 0,
    source          TEXT DEFAULT 'manual',   -- manual|pdf_parse
    UNIQUE(user_id, month)
);

CREATE TABLE IF NOT EXISTS user_cards (
    user_id     TEXT NOT NULL REFERENCES users(user_id),
    card_id     TEXT NOT NULL REFERENCES cards(card_id),
    added_at    TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, card_id)
);

-- ─────────────────────────────────────────────
-- AUDIT RESULTS (SHADOW AUDIT)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_results (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             TEXT NOT NULL REFERENCES users(user_id),
    current_nav_annual  REAL,
    optimal_nav_annual  REAL,
    leakage_inr         REAL,
    status              TEXT CHECK(status IN ('pass','warning','critical')),
    recommendations_json TEXT,      -- JSON array of {card_id, reason, shap_values}
    created_at          TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- REWARD EXPIRY TRACKER
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_expiry (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL REFERENCES users(user_id),
    card_id         TEXT NOT NULL REFERENCES cards(card_id),
    points_amount   REAL NOT NULL,
    expiry_date     TEXT NOT NULL,
    redemption_suggestion TEXT,
    flagged         INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- COMMUNITY INTELLIGENCE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_votes (
    offer_id        TEXT PRIMARY KEY,
    card_id         TEXT NOT NULL REFERENCES cards(card_id),
    offer_text      TEXT NOT NULL,
    offer_rate      REAL,
    upvotes         INTEGER DEFAULT 0,
    downvotes       INTEGER DEFAULT 0,
    last_updated    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS card_combos (
    combo_id        TEXT PRIMARY KEY,
    cards_json      TEXT NOT NULL,   -- JSON array of card_ids
    city            TEXT,
    persona         TEXT,
    nav_score       REAL,
    submissions     INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- STATEMENT TRANSACTIONS (PDF FORENSICS)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL REFERENCES users(user_id),
    txn_date        TEXT NOT NULL,
    description     TEXT,
    amount          REAL NOT NULL,
    category        TEXT DEFAULT 'other',
    month           TEXT,   -- YYYY-MM derived
    card_id         TEXT REFERENCES cards(card_id),
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
