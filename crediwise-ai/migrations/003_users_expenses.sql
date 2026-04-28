-- 003: User auth, expenses, instruments tables (ported from main branch)

CREATE TABLE IF NOT EXISTS auth_users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT DEFAULT 'user',
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_credentials (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES auth_users(id),
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL REFERENCES auth_users(id),
    date                  TEXT NOT NULL,
    amount                REAL NOT NULL,
    category              TEXT DEFAULT 'Other',
    payment_instrument_id INTEGER,
    note                  TEXT DEFAULT '',
    created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instruments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES auth_users(id),
    name                TEXT NOT NULL,
    type                TEXT DEFAULT 'credit_card',
    base_reward_rate    REAL DEFAULT 1.0,
    redemption_value    REAL DEFAULT 0.25,
    milestone_threshold REAL,
    milestone_bonus     REAL DEFAULT 0,
    reward_cap          REAL,
    category_multipliers TEXT DEFAULT '{}',
    color               TEXT DEFAULT '#6366f1',
    created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_tracked_cards (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL REFERENCES auth_users(id),
    card_id  TEXT NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, card_id)
);

-- Seed demo account: demo@crediwise.com / password123
-- password hash for 'password123' using bcrypt
-- This will be seeded by Python code instead

INSERT OR IGNORE INTO schema_migrations(version) VALUES (3);

