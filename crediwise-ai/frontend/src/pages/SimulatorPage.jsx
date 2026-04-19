/**
 * SimulatorPage.jsx — Life Event Simulator UI
 *
 * Three event modes:
 *   marriage      → dual profile form + joint audit display
 *   salary_hike   → income slider + animated D3 radar chart
 *   emi_purchase  → purchase form + Chart.js break-even chart
 */

import { useState } from "react";
import RadarChart   from "../components/RadarChart";
import EMIBreakeven from "../components/EMIBreakeven";
import AuditResult  from "../components/AuditResult";
import { inr, pct } from "../utils/format";
import api          from "../api";

const SPEND_CATS = ["dining","fuel","grocery","travel","online","utilities","international"];

const EVENTS = [
  { key: "marriage",     label: "💍 Marriage",       desc: "Merge two profiles for joint audit" },
  { key: "salary_hike",  label: "💰 Salary Hike",    desc: "Unlock premium cards with new income" },
  { key: "emi_purchase", label: "🛒 EMI Purchase",   desc: "Break-even: interest vs cashback" },
];

// ── Reusable spend form ────────────────────────────────────────────────────────
function SpendInput({ label, spend, setSpend }) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wide">{label}</h4>
      <div className="grid grid-cols-2 gap-2">
        {SPEND_CATS.map((cat) => (
          <div key={cat} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 capitalize">{cat}</label>
            <input
              type="number" min="0" placeholder="0"
              value={spend[cat] || ""}
              onChange={(e) => setSpend({ ...spend, [cat]: +e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white
                         focus:outline-none focus:border-teal-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Marriage form ──────────────────────────────────────────────────────────────
function MarriageForm({ onResult }) {
  const [spendA, setSpendA]       = useState({});
  const [spendB, setSpendB]       = useState({});
  const [incomeA, setIncomeA]     = useState("");
  const [incomeB, setIncomeB]     = useState("");
  const [cibilA, setCibilA]       = useState("720");
  const [cibilB, setCibilB]       = useState("700");
  const [cardsA, setCardsA]       = useState("");
  const [cardsB, setCardsB]       = useState("");
  const [loading, setLoading]     = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/simulate", {
        event: "marriage",
        profile_a: {
          monthly_spend: spendA, income_annual: +incomeA, cibil_score: +cibilA,
          current_cards: cardsA.split(",").map(s => s.trim()).filter(Boolean),
        },
        profile_b: {
          monthly_spend: spendB, income_annual: +incomeB, cibil_score: +cibilB,
          current_cards: cardsB.split(",").map(s => s.trim()).filter(Boolean),
        },
      });
      if (data.success) onResult(data.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <SpendInput label="Partner A — Monthly Spend" spend={spendA} setSpend={setSpendA} />
          <input placeholder="Annual Income ₹" value={incomeA} onChange={e => setIncomeA(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
          <input placeholder="CIBIL Score" value={cibilA} onChange={e => setCibilA(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
          <input placeholder="Current cards (comma-separated IDs)" value={cardsA} onChange={e => setCardsA(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-2">
          <SpendInput label="Partner B — Monthly Spend" spend={spendB} setSpend={setSpendB} />
          <input placeholder="Annual Income ₹" value={incomeB} onChange={e => setIncomeB(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
          <input placeholder="CIBIL Score" value={cibilB} onChange={e => setCibilB(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
          <input placeholder="Current cards (comma-separated IDs)" value={cardsB} onChange={e => setCardsB(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
      </div>
      <button onClick={submit} disabled={loading}
        className="btn-primary self-start disabled:opacity-50">
        {loading ? "Simulating…" : "Simulate Joint Household"}
      </button>
    </div>
  );
}

// ── Salary hike form ──────────────────────────────────────────────────────────
function SalaryHikeForm({ onResult }) {
  const [spend, setSpend]         = useState({});
  const [curIncome, setCurIncome] = useState("600000");
  const [newIncome, setNewIncome] = useState("1200000");
  const [cibil, setCibil]         = useState("750");
  const [cards, setCards]         = useState("");
  const [loading, setLoading]     = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/simulate", {
        event: "salary_hike",
        monthly_spend:  spend,
        current_income: +curIncome,
        new_income:     +newIncome,
        cibil_score:    +cibil,
        current_cards:  cards.split(",").map(s => s.trim()).filter(Boolean),
      });
      if (data.success) onResult(data.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SpendInput label="Monthly Spend" spend={spend} setSpend={setSpend} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Current Annual Income (₹)</label>
          <input value={curIncome} onChange={e => setCurIncome(e.target.value)} type="number"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">New Annual Income (₹)</label>
          <input value={newIncome} onChange={e => setNewIncome(e.target.value)} type="number"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">CIBIL Score</label>
          <input value={cibil} onChange={e => setCibil(e.target.value)} type="number"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Current Card IDs (comma-sep)</label>
          <input value={cards} onChange={e => setCards(e.target.value)} placeholder="e.g. kotak_811"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
      </div>
      <button onClick={submit} disabled={loading}
        className="btn-primary self-start disabled:opacity-50">
        {loading ? "Simulating…" : "Simulate Salary Hike"}
      </button>
    </div>
  );
}

// ── EMI form ──────────────────────────────────────────────────────────────────
function EMIForm({ onResult }) {
  const [amount, setAmount]   = useState("");
  const [months, setMonths]   = useState("6");
  const [cardId, setCardId]   = useState("");
  const [cards, setCards]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/simulate", {
        event:           "emi_purchase",
        purchase_amount: +amount,
        emi_months:      +months,
        card_id:         cardId || undefined,
        current_cards:   cards.split(",").map(s => s.trim()).filter(Boolean),
      });
      if (data.success) onResult(data.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Purchase Amount (₹)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="50000"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">EMI Months</label>
          <select value={months} onChange={e => setMonths(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none bg-slate-800">
            {[3,6,9,12,18,24].map(m => <option key={m} value={m}>{m} months</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Card ID (optional)</label>
          <input value={cardId} onChange={e => setCardId(e.target.value)} placeholder="e.g. hdfc_millennia"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Your Cards (comma-sep)</label>
          <input value={cards} onChange={e => setCards(e.target.value)} placeholder="icici_amazon, axis_ace"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
      </div>
      <button onClick={submit} disabled={loading || !amount}
        className="btn-primary self-start disabled:opacity-50">
        {loading ? "Calculating…" : "Calculate Break-Even"}
      </button>
    </div>
  );
}

// ── Result renderers ──────────────────────────────────────────────────────────
function MarriageResult({ result }) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <p className="text-slate-300 text-sm bg-slate-800/60 rounded-xl px-4 py-3">
        {result.summary}
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Partner A NAV", result.audit_before_a?.optimal_nav_annual],
          ["Partner B NAV", result.audit_before_b?.optimal_nav_annual],
          ["Joint NAV",     result.audit_joint?.optimal_nav_annual],
        ].map(([label, val]) => (
          <div key={label} className="glass rounded-xl p-4">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-xl font-bold text-teal-400">{inr(val)}/yr</p>
          </div>
        ))}
      </div>
      <AuditResult result={result.audit_joint} />
    </div>
  );
}

function SalaryHikeResult({ result }) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <p className="text-slate-300 text-sm bg-slate-800/60 rounded-xl px-4 py-3">
        {result.summary}
      </p>
      {result.newly_unlocked?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.newly_unlocked_names?.map((name, i) => (
            <span key={i}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              🔓 {name}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <RadarChart data={result.radar_before} title="Before Salary Hike" width={360} height={360} />
        <RadarChart data={result.radar_after}  title="After Salary Hike"  width={360} height={360} />
      </div>
    </div>
  );
}

const REC_STYLES = {
  pay_full: "bg-green-500/20 border-green-500/40 text-green-300",
  emi_ok:   "bg-amber-500/20 border-amber-500/40 text-amber-300",
  avoid:    "bg-red-500/20   border-red-500/40   text-red-300",
};
const REC_LABELS = {
  pay_full: "✅ Cashback covers interest — EMI is fine",
  emi_ok:   "⚠️ Marginal cost — acceptable for large purchases",
  avoid:    "🚫 Interest far exceeds cashback — avoid EMI",
};

function EMIResult({ result }) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${REC_STYLES[result.recommendation] || ""}`}>
        {REC_LABELS[result.recommendation]}
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          ["EMI Interest", result.emi_interest_total, "text-red-400"],
          ["Cashback",     result.cashback_earned,    "text-green-400"],
          ["Net Cost",     Math.abs(result.net_cost), result.net_cost <= 0 ? "text-green-400" : "text-red-400"],
        ].map(([label, val, cls]) => (
          <div key={label} className="glass rounded-xl p-4">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-xl font-bold ${cls}`}>{inr(val)}</p>
          </div>
        ))}
      </div>
      <EMIBreakeven
        chartData={result.chart_data}
        breakEvenMonth={result.break_even_month}
        cardName={result.card_used?.name}
        purchaseAmount={result.purchase_amount}
      />
      <p className="text-xs text-slate-400 mt-1">{result.summary}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const [activeEvent, setActiveEvent] = useState("salary_hike");
  const [result, setResult]           = useState(null);

  const handleResult = (data) => setResult(data);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Life Event Simulator</h1>
        <p className="text-slate-400 mt-1">See how life changes affect your credit card strategy</p>
      </div>

      {/* Event selector */}
      <div className="flex gap-3 flex-wrap">
        {EVENTS.map(({ key, label, desc }) => (
          <button key={key} onClick={() => { setActiveEvent(key); setResult(null); }}
            className={`flex flex-col gap-1 px-4 py-3 rounded-xl border text-left transition-all
              ${activeEvent === key
                ? "border-teal-500 bg-teal-500/10 text-white"
                : "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500"
              }`}>
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs text-slate-400">{desc}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="glass rounded-2xl p-6">
        {activeEvent === "marriage"     && <MarriageForm   onResult={handleResult} />}
        {activeEvent === "salary_hike"  && <SalaryHikeForm onResult={handleResult} />}
        {activeEvent === "emi_purchase" && <EMIForm         onResult={handleResult} />}
      </div>

      {/* Results */}
      {result && (
        <div className="glass rounded-2xl p-6">
          {result.event === "marriage"     && <MarriageResult   result={result} />}
          {result.event === "salary_hike"  && <SalaryHikeResult result={result} />}
          {result.event === "emi_purchase" && <EMIResult        result={result} />}
        </div>
      )}
    </div>
  );
}
