const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../../crediwise.db");

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");
        db.pragma("foreign_keys = ON");
        initializeSchema();
    }
    return db;
}

function initializeSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'credit_card',
      base_reward_rate REAL NOT NULL DEFAULT 1.0,
      redemption_value REAL NOT NULL DEFAULT 0.25,
      milestone_threshold REAL DEFAULT NULL,
      milestone_bonus REAL DEFAULT 0,
      reward_cap REAL DEFAULT NULL,
      category_multipliers TEXT NOT NULL DEFAULT '{}',
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      payment_instrument_id INTEGER,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_instrument_id) REFERENCES payment_instruments(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_instruments_user_id ON payment_instruments(user_id);
  `);
}

module.exports = { getDb };
