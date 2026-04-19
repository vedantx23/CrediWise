import { Link } from 'react-router-dom'
import CardFlip from '../components/CardFlip.jsx'

const CARDS = [
  {
    card: { card_id: 'hdfc_regalia', bank: 'HDFC Bank', name: 'HDFC Regalia', annual_fee: 2500 },
    rewards: { dining: 1.67, fuel: 1.33, grocery: 1.33, travel: 1.67, online: 1.33, utilities: 1.33, international: 2.0, other: 1.33 },
  },
  {
    card: { card_id: 'axis_ace', bank: 'Axis Bank', name: 'Axis Ace', annual_fee: 499 },
    rewards: { dining: 4, fuel: 2, grocery: 2, travel: 2, online: 2, utilities: 5, international: 2, other: 2 },
  },
  {
    card: { card_id: 'icici_amazon', bank: 'ICICI Bank', name: 'ICICI Amazon Pay', annual_fee: 0 },
    rewards: { dining: 2, fuel: 1, grocery: 2, travel: 2, online: 5, utilities: 1, international: 1, other: 1 },
  },
]

const FEATURES = [
  {
    emoji: '🔍',
    title: 'Find your hidden leakage',
    desc: 'Most people lose ₹8,000–₹22,000 a year just by using the wrong card for the wrong purchase. We show you exactly where.',
  },
  {
    emoji: '🎭',
    title: 'Know your spending style',
    desc: 'Are you a frequent flyer, a weekend diner, or a savvy online shopper? Your spending DNA points to the perfect card stack.',
  },
  {
    emoji: '📄',
    title: 'Upload your bank statement',
    desc: 'Drop in your PDF statement and we auto-categorise every transaction — no manual entry, no guesswork.',
  },
  {
    emoji: '🏦',
    title: '16 real Indian cards',
    desc: 'HDFC, ICICI, Axis, SBI, Amex, Kotak, IndusInd, AU — all with up-to-date reward rates baked in.',
  },
  {
    emoji: '🔒',
    title: 'Completely private',
    desc: 'Everything runs on your machine. No accounts, no cloud, no tracking. Your financial data stays yours.',
  },
  {
    emoji: '📊',
    title: 'Plain-English explanations',
    desc: 'Every card recommendation comes with a clear reason — not just a score, but a story you can act on.',
  },
]

const STEPS = [
  { n: '1', title: 'Tell us what you spend', desc: 'Enter your rough monthly spend by category — dining, fuel, groceries, travel.' },
  { n: '2', title: 'See your leakage', desc: 'We calculate exactly how much extra you\'d earn with a better card combination.' },
  { n: '3', title: 'Pick your cards', desc: 'Get ranked recommendations with reasons. Switch at your own pace.' },
]

export default function HomePage() {
  return (
    <main className="home-page">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          Made for the Indian credit card market
        </div>
        <h1 className="hero-heading">
          Your wallet is losing<br />
          <span className="hero-amount">₹22,000 a year.</span><br />
          <span className="hero-sub">Let's fix that in 60 seconds.</span>
        </h1>
        <p className="hero-body">
          CrediWise analyses your spending, compares every major Indian credit card,
          and shows you the exact switch that puts the most money back in your pocket —
          all offline, all private.
        </p>
        <div className="hero-actions">
          <Link to="/audit" className="btn-gold">Check my wallet →</Link>
          <Link to="/persona" className="btn-ghost">What's my spending style?</Link>
        </div>
      </section>

      {/* ── Card showcase ─────────────────────────────────────────── */}
      <section className="cards-section">
        <p className="cards-hint">Click any card to see its reward rates</p>
        <div className="cards-row">
          {CARDS.map(({ card, rewards }) => (
            <CardFlip key={card.card_id} card={card} rewards={rewards} />
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="steps-section">
        <h2 className="section-heading">How it works</h2>
        <div className="steps-row">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="step-card">
              <div className="step-num">{n}</div>
              <h3 className="step-title">{title}</h3>
              <p className="step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="features-section">
        <h2 className="section-heading">Everything you need to optimise your cards</h2>
        <div className="features-grid">
          {FEATURES.map(({ emoji, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-emoji">{emoji}</div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-heading">Ready to stop leaving money on the table?</h2>
          <p className="cta-body">Takes about a minute. Works entirely on your device.</p>
          <Link to="/audit" className="btn-gold" style={{ fontSize: 16, padding: '14px 40px' }}>
            Run my free audit →
          </Link>
        </div>
      </section>

      <style>{`
        .home-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 48px 40px 80px;
        }

        /* Hero */
        .hero-section { margin-bottom: 72px; }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-ui); font-size: 12px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--gold-mid);
          background: rgba(212,175,55,0.06);
          border: 1px solid rgba(212,175,55,0.15);
          padding: 6px 14px; border-radius: 99px;
          margin-bottom: 28px;
        }
        .eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--gold-bright);
          animation: pulse-crit 2s ease infinite;
        }
        .hero-heading {
          font-family: var(--font-display); font-weight: 400;
          font-size: clamp(36px, 5.5vw, 64px); line-height: 1.12;
          color: var(--plat-white);
          margin: 0 0 24px;
        }
        .hero-amount {
          color: var(--gold-bright);
          font-weight: 600;
        }
        .hero-sub {
          color: var(--plat-cool); font-weight: 300;
        }
        .hero-body {
          font-family: var(--font-ui); font-size: 17px; font-weight: 300;
          color: var(--plat-cool); line-height: 1.75;
          max-width: 580px; margin: 0 0 36px;
        }
        .hero-actions {
          display: flex; gap: 16px; flex-wrap: wrap; align-items: center;
        }

        /* Cards */
        .cards-section { margin-bottom: 80px; }
        .cards-hint {
          font-family: var(--font-mono); font-size: 11px;
          color: var(--plat-muted); letter-spacing: 0.1em;
          text-transform: uppercase; text-align: center;
          margin-bottom: 24px;
        }
        .cards-row {
          display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;
        }

        /* Steps */
        .steps-section { margin-bottom: 72px; }
        .section-heading {
          font-family: var(--font-display); font-weight: 400;
          font-size: clamp(22px, 3vw, 32px); color: var(--plat-white);
          margin: 0 0 36px; letter-spacing: 0.03em;
        }
        .steps-row {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }
        .step-card {
          background: var(--bg-surface);
          border: 1px solid rgba(212,175,55,0.08);
          border-radius: var(--radius-lg);
          padding: 28px 24px;
          position: relative;
          transition: border-color 200ms ease;
        }
        .step-card:hover { border-color: rgba(212,175,55,0.2); }
        .step-num {
          font-family: var(--font-mono); font-size: 40px; font-weight: 300;
          color: rgba(212,175,55,0.15); line-height: 1;
          margin-bottom: 16px;
        }
        .step-title {
          font-family: var(--font-ui); font-size: 15px; font-weight: 500;
          color: var(--plat-white); margin: 0 0 10px;
        }
        .step-desc {
          font-family: var(--font-ui); font-size: 13px; font-weight: 300;
          color: var(--plat-muted); line-height: 1.65; margin: 0;
        }

        /* Features */
        .features-section { margin-bottom: 72px; }
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }
        .feature-card {
          background: var(--bg-surface);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: var(--radius-lg);
          padding: 24px;
          transition: border-color 200ms ease, transform 200ms ease;
        }
        .feature-card:hover {
          border-color: rgba(212,175,55,0.15);
          transform: translateY(-2px);
        }
        .feature-emoji { font-size: 28px; margin-bottom: 14px; }
        .feature-title {
          font-family: var(--font-ui); font-size: 14px; font-weight: 500;
          color: var(--plat-white); margin: 0 0 8px;
        }
        .feature-desc {
          font-family: var(--font-ui); font-size: 13px; font-weight: 300;
          color: var(--plat-muted); line-height: 1.65; margin: 0;
        }

        /* CTA */
        .cta-box {
          background: var(--bg-surface);
          border: 1px solid rgba(212,175,55,0.15);
          border-radius: var(--radius-xl);
          padding: 56px 48px;
          text-align: center;
        }
        .cta-heading {
          font-family: var(--font-display); font-weight: 400;
          font-size: clamp(22px, 3vw, 30px); color: var(--plat-white);
          margin: 0 0 12px;
        }
        .cta-body {
          font-family: var(--font-ui); font-size: 15px; font-weight: 300;
          color: var(--plat-cool); margin: 0 0 32px;
        }

        @media (max-width: 860px) {
          .home-page { padding: 32px 20px 60px; }
          .steps-row { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 580px) {
          .features-grid { grid-template-columns: 1fr; }
          .cta-box { padding: 36px 24px; }
        }
      `}</style>
    </main>
  )
}
