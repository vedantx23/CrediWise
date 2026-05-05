# CrediWise 💳

> Intelligent Credit Card Optimization & Personal Finance Platform

CrediWise helps you maximize rewards on every transaction by evaluating reward rates, accelerated portals, category multipliers, milestone thresholds, and Indian-market nuances (SmartBuy, Grab Deals, UPI/RuPay, category exclusions, and monthly caps).

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start frontend + backend in development mode
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **AI Backend** (Flask): http://localhost:5001

**Demo Login**: `demo@crediwise.com` / `password123`

## Project Structure

```
crediwise/
├── client/                 # Vite + React frontend
│   └── src/
│       ├── pages/          # Route pages (Optimizer, Dashboard, etc.)
│       ├── components/     # Reusable UI components (Vault theme)
│       ├── context/        # Auth & Card context providers
│       ├── api/            # Axios API layer (Node + Flask)
│       ├── hooks/          # Custom React hooks
│       ├── utils/          # Formatters & helpers
│       └── styles/         # CSS tokens
├── server/                 # Node.js + Express backend
│   └── src/
│       ├── routes/         # API routes (auth, expenses, optimizer, etc.)
│       ├── services/       # Business logic (rewardEngine, transactionOptimizer)
│       ├── repositories/   # Data access layer (MongoDB)
│       ├── models/         # Mongoose schemas
│       ├── dtos/           # Data transfer objects
│       ├── middleware/     # Auth middleware
│       ├── data/           # Static data (card directory)
│       └── db/             # Database connection & seeding
├── backend/                # Python/Flask AI backend
│   ├── app.py             # Flask app (audit, persona, boardroom, etc.)
│   ├── boardroom.py       # AI Boardroom multi-agent simulation
│   ├── train_persona.py   # ML persona training
│   └── requirements.txt
└── package.json            # Root scripts (dev, install:all)
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18, Tailwind CSS, Recharts, Lucide Icons |
| Backend (API) | Node.js + Express, JWT, Mongoose |
| Backend (AI) | Python + Flask, scikit-learn, SHAP |
| Database | MongoDB Atlas |
| Auth | JWT (24h expiry) |

## Key Features

### 💳 Card Optimizer (NEW)
- **Transaction Optimizer** — Best card recommendation per transaction
- **Portfolio Audit** — Compare your cards vs. market leaders
- Accelerated rewards (SmartBuy 10X, Grab Deals, partner portals)
- Online vs. Offline vs. UPI differentiation
- Category exclusion warnings (Fuel, Rent, Govt)
- Monthly cap alerts & milestone tracking
- 27 Indian credit cards with full metadata

### 📊 Finance Management
- Expense tracking with auto-categorization
- Multi-card payment instrument management
- Dashboard with spending analytics
- Reward calculation engine

### 🤖 AI Features (Flask Backend)
- Shadow Audit — card performance analysis
- Persona Engine — spending personality profiling
- Approval Predictor — card approval likelihood
- Life-Event Simulator — what-if financial scenarios
- AI Boardroom — multi-agent credit card debate
