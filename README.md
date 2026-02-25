# CrediWise 💳

> Intelligent Personal Finance Decision-Support System

CrediWise helps you choose the optimal payment method for every transaction by evaluating reward rates, cashback, category multipliers, and milestone thresholds.

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start frontend + backend in development mode
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Stack

- **Frontend**: Vite + React 18, Recharts, React Router v6
- **Backend**: Node.js + Express, JWT authentication
- **Database**: SQLite (via better-sqlite3) — zero config, no server needed

## Project Structure

```
crediwise/
├── client/         # Vite + React frontend
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       └── api/
└── server/         # Node.js + Express backend
    └── src/
        ├── routes/
        ├── services/
        ├── middleware/
        └── db/
```

## Features

- 🔐 JWT-based authentication (register / login)
- 💰 Expense tracking with auto-categorization
- 💳 Multi-card payment instrument management
- 🧠 Intelligent recommendation engine (rule-based, explainable)
- 📊 Dashboard with charts and spending analytics
- 🏆 Milestone tracking and reward optimization
