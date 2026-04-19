import { Link } from 'react-router-dom'
import CardFlip from '../components/CardFlip.jsx'

const SAMPLE_CARD = {
  card_id: 'hdfc_regalia', bank: 'HDFC Bank', name: 'HDFC Regalia', annual_fee: 2500,
}
const SAMPLE_REWARDS = {
  dining: 1.67, fuel: 1.33, grocery: 1.33, travel: 1.67,
  online: 1.33, utilities: 1.33, international: 2.0, other: 1.33,
}

const FEATURES = [
  { icon: '🔍', title: 'Shadow Audit',       desc: 'Discover exactly how much reward money you\'re leaving on the table every year.' },
  { icon: '🎭', title: 'Persona Engine',      desc: 'ML classifier reveals your financial archetype from your spending DNA.' },
  { icon: '📊', title: 'SHAP Explanations',  desc: 'Every recommendation backed by explainable AI — no black boxes.' },
  { icon: '🏦', title: '16 Indian Cards',     desc: 'HDFC, ICICI, Axis, SBI, Amex, Kotak, IndusInd, AU — all seeded with real rates.' },
  { icon: '🔒', title: '100% Offline',        desc: 'Your financial data never leaves your machine. Local LLM, local DB.' },
  { icon: '📄', title: 'Statement Forensics', desc: 'Upload bank PDF → auto-categorise transactions → instant audit.' },
]

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                        bg-vault-gold/10 border border-vault-gold/30 text-vault-gold
                        text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-vault-gold animate-pulse"/>
          Financial Intelligence Suite · Indian Credit Card Market
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-5">
          Stop leaving<br/>
          <span className="text-vault-gold">₹22,000/year</span>
          <br />on the table.
        </h1>
        <p className="text-vault-textDim text-lg max-w-2xl mx-auto mb-8">
          CrediWise-AI audits your credit card wallet, reveals your financial persona,
          and shows the exact cards that maximize your rewards — all locally, all private.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/audit"   className="btn-gold text-base px-8 py-3.5">Run Shadow Audit →</Link>
          <Link to="/persona" className="btn-ghost text-base px-8 py-3.5">Discover Persona</Link>
        </div>
      </div>

      {/* ── 3D card demo ─────────────────────────────────────────────────── */}
      <div className="flex justify-center mb-20">
        <div className="text-center">
          <p className="text-vault-muted text-xs font-mono mb-4 tracking-wider uppercase">
            Hover to flip any card
          </p>
          <div className="flex gap-6 flex-wrap justify-center">
            <CardFlip card={SAMPLE_CARD} rewards={SAMPLE_REWARDS} />
            <CardFlip
              card={{ card_id: 'axis_ace', bank: 'Axis Bank', name: 'Axis Ace', annual_fee: 499 }}
              rewards={{ dining:4, fuel:2, grocery:2, travel:2, online:2, utilities:5, international:2, other:2 }}
            />
            <CardFlip
              card={{ card_id: 'icici_amazon', bank: 'ICICI Bank', name: 'ICICI Amazon Pay', annual_fee: 0 }}
              rewards={{ dining:2, fuel:1, grocery:2, travel:2, online:5, utilities:1, international:1, other:1 }}
            />
          </div>
        </div>
      </div>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} className="glass rounded-xl border border-vault-border p-5
                                      hover:border-vault-gold/20 transition-colors group">
            <div className="text-2xl mb-3">{icon}</div>
            <h3 className="font-semibold text-vault-text mb-1.5 group-hover:text-vault-gold transition-colors">
              {title}
            </h3>
            <p className="text-vault-muted text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className="text-center glass rounded-2xl border border-vault-gold/20 p-10">
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to see your leakage?
        </h2>
        <p className="text-vault-textDim mb-6">
          Takes 60 seconds. Runs entirely on your machine.
        </p>
        <Link to="/audit" className="btn-gold text-base px-10 py-3.5">
          Start Shadow Audit →
        </Link>
      </div>

    </main>
  )
}
