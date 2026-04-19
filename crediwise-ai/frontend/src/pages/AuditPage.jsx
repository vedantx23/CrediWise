import { useState, useEffect, useRef } from 'react'
import { runAudit } from '../api'
import VaultCard from '../components/VaultCard'
import { VaultButton, VaultInput } from '../components/VaultForms'
import SpendDial from '../components/SpendDial'
import { ScrollReveal } from '../hooks/useScrollReveal.jsx'
import { useToast } from '../components/VaultToast'
import { inr } from '../utils/format'

const CATEGORIES = ['dining','fuel','grocery','travel','online','utilities','international','other']
const DEFAULT_SPEND = Object.fromEntries(CATEGORIES.map(c => [c, '']))

const SCANNING_LINES = [
  '> initializing shadow audit engine...',
  '> cross-referencing 847 card configurations...',
  '> calculating reward leakage...',
]

function CountUp({ target, duration = 1200, prefix = '₹' }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    const start = performance.now()
    const raf = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(ease * target))
      if (t < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target])

  return <>{prefix}{value.toLocaleString('en-IN')}</>
}

function TypeLine({ text, speed = 35, onDone }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      setShown(text.slice(0, i + 1)); i++
      if (i >= text.length) { clearInterval(iv); onDone?.() }
    }, speed)
    return () => clearInterval(iv)
  }, [text])
  return <>{shown}<span className="type-cursor">_</span></>
}

export default function AuditPage() {
  const [spend, setSpend] = useState(DEFAULT_SPEND)
  const [cards, setCards] = useState('')
  const [phase, setPhase] = useState('idle') // idle | scanning | result
  const [scanLine, setScanLine] = useState(0)
  const [result, setResult] = useState(null)
  const toast = useToast()

  const totalSpend = Object.values(spend).reduce((s, v) => s + (Number(v) || 0), 0)
  const effectiveRate = result
    ? (result.current_nav_annual / (totalSpend * 12) * 100) || 0
    : totalSpend > 0 ? 1.5 : 0

  const handleSubmit = async e => {
    e.preventDefault()
    setPhase('scanning')
    setScanLine(0)
    setResult(null)

    const profile = {
      monthly_spend: Object.fromEntries(
        Object.entries(spend).map(([k, v]) => [k, Number(v) || 0])
      ),
      current_cards: cards.split(',').map(s => s.trim()).filter(Boolean),
      income_annual: 0, cibil_score: 700,
    }
    try {
      const res = await runAudit(profile)
      // Wait for scanning animation (3 lines × ~1s)
      setTimeout(() => {
        setResult(res)
        setPhase('result')
      }, 3200)
    } catch(err) {
      toast.add(err.response?.data?.error || 'Audit failed', 'error')
      setPhase('idle')
    }
  }

  const statusColor = {
    pass:     'var(--status-pass-fg)',
    warning:  'var(--status-warn-fg)',
    critical: 'var(--status-crit-fg)',
  }

  return (
    <div className="audit-page">
      <div className="audit-header">
        <h1 className="vault-heading">Shadow Audit</h1>
        <p className="vault-subtext">
          Discover exactly how much your current card stack is leaving on the table.
        </p>
      </div>

      <div className="audit-layout">
        {/* ── Left: Input form ── */}
        <div className="audit-left">
          <VaultCard>
            <h2 className="section-label">Monthly Spend</h2>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="spend-grid">
                {CATEGORIES.map(cat => (
                  <VaultInput
                    key={cat}
                    label={cat}
                    currency
                    type="number"
                    placeholder="0"
                    value={spend[cat]}
                    onChange={e => setSpend(s => ({ ...s, [cat]: e.target.value }))}
                  />
                ))}
              </div>
              <VaultInput
                label="Current Cards (comma-separated IDs)"
                placeholder="hdfc_regalia, icici_amazon"
                value={cards}
                onChange={e => setCards(e.target.value)}
              />
              <VaultButton type="submit" loading={phase === 'scanning'}>
                Run Audit
              </VaultButton>
            </form>
          </VaultCard>

          {/* Spend Dial */}
          <VaultCard style={{ marginTop: 16, display:'flex', justifyContent:'center' }}>
            <SpendDial totalMonthlySpend={totalSpend} effectiveRate={effectiveRate} />
          </VaultCard>
        </div>

        {/* ── Right: Result ── */}
        <div className="audit-right">
          {phase === 'idle' && (
            <VaultCard style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', minHeight:320 }}>
              <p style={{ color:'var(--plat-muted)', fontFamily:'var(--font-mono)', fontSize:13, textAlign:'center' }}>
                Enter your monthly spend<br/>and run the audit.
              </p>
            </VaultCard>
          )}

          {phase === 'scanning' && (
            <VaultCard active style={{ minHeight:320 }}>
              <div className="scan-terminal">
                {SCANNING_LINES.slice(0, scanLine + 1).map((line, i) => (
                  <div key={i} className="scan-line">
                    {i === scanLine
                      ? <TypeLine text={line} onDone={() => setScanLine(l => l + 1)} />
                      : line
                    }
                  </div>
                ))}
              </div>
              <div className="scan-sweep" />
            </VaultCard>
          )}

          {phase === 'result' && result && (
            <ScrollReveal stagger={120}>
              {/* Leakage hero */}
              <VaultCard active>
                <div className="result-leakage">
                  <div
                    className="leakage-amount"
                    style={{
                      color: statusColor[result.status] || 'var(--gold-bright)',
                      animation: result.status === 'critical' ? 'pulse-crit 1s ease infinite' : 'none',
                    }}
                  >
                    <CountUp target={result.leakage_inr} />
                  </div>
                  <p className="leakage-label">leaving your wallet every year</p>
                  <span
                    className={`status-badge ${result.status}`}
                    style={{
                      animation: result.status === 'critical' ? 'badge-pulse 2s ease infinite' : 'none',
                    }}
                  >
                    {result.status?.toUpperCase()}
                  </span>
                </div>
                <div className="nav-grid" style={{ marginTop:20 }}>
                  <div>
                    <div className="nav-label-sm">Current NAV</div>
                    <div className="nav-value">{inr(result.current_nav_annual)}</div>
                  </div>
                  <div>
                    <div className="nav-label-sm">Optimal NAV</div>
                    <div className="nav-value gold">{inr(result.optimal_nav_annual)}</div>
                  </div>
                </div>
              </VaultCard>

              {/* Recommendations */}
              {result.recommendations?.map((rec, i) => (
                <VaultCard key={rec.card_id} style={{ animationDelay: `${i * 120}ms` }} className="slide-in">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div className="rec-card-name">{rec.card_name || rec.card_id}</div>
                      <div className="rec-reason">{rec.reason}</div>
                    </div>
                    <div className="rec-gain">{inr(rec.nav_gain || 0)}<span>/yr</span></div>
                  </div>
                  {rec.shap_values && Object.keys(rec.shap_values).length > 0 && (
                    <div className="shap-bars" style={{ marginTop:12 }}>
                      {Object.entries(rec.shap_values)
                        .filter(([,v]) => v > 0)
                        .sort((a,b) => b[1]-a[1])
                        .slice(0,4)
                        .map(([cat, val]) => (
                          <div key={cat} className="shap-row">
                            <span className="shap-cat">{cat}</span>
                            <div className="shap-track">
                              <div
                                className="shap-fill"
                                style={{ width: `${Math.min(val / 3000 * 100, 100)}%` }}
                              />
                            </div>
                            <span className="shap-val">+{inr(val)}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </VaultCard>
              ))}
            </ScrollReveal>
          )}
        </div>
      </div>

      <style>{`
        .audit-page { padding: 40px 48px; max-width: 1200px; }
        .vault-heading {
          font-family: var(--font-display); font-weight: 400;
          font-size: clamp(24px, 3vw, 36px); color: var(--plat-white);
          letter-spacing: 0.05em; margin: 0 0 4px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--gold-dim);
          display: inline-block;
        }
        .vault-subtext { font-family: var(--font-ui); font-weight: 300; font-size: 15px; color: var(--plat-cool); line-height: 1.7; margin: 8px 0 32px; }
        .section-label { font-family: var(--font-ui); font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--plat-muted); margin: 0 0 20px; }
        .audit-layout { display: grid; grid-template-columns: 400px 1fr; gap: 24px; align-items: start; }
        .spend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Scan terminal */
        .scan-terminal { font-family: var(--font-mono); font-size: 13px; color: var(--gold-bright); line-height: 2; position: relative; z-index: 1; }
        .scan-line { letter-spacing: 0.02em; }
        .type-cursor { animation: type-cursor 0.8s ease infinite; }
        .scan-sweep {
          position: absolute; left:0; right:0; top:0; height:2px;
          background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
          animation: scan-sweep 0.8s ease infinite;
          pointer-events: none;
        }

        /* Result */
        .result-leakage { text-align: center; padding: 8px 0; }
        .leakage-amount {
          font-family: var(--font-display); font-weight: 300;
          font-size: clamp(48px, 8vw, 80px); letter-spacing: -0.02em;
          line-height: 1;
        }
        .leakage-label { font-family: var(--font-ui); font-weight: 300; font-size: 15px; color: var(--plat-cool); margin: 8px 0 16px; }
        .status-badge {
          display: inline-block;
          font-family: var(--font-ui); font-size: 11px; font-weight: 600;
          letter-spacing: 0.15em;
          padding: 4px 14px; border-radius: var(--radius-pill);
          animation: scale-in 300ms var(--ease-snap) forwards;
        }
        .status-badge.pass     { background: var(--status-pass);  color: var(--status-pass-fg); }
        .status-badge.warning  { background: var(--status-warn);  color: var(--status-warn-fg); }
        .status-badge.critical { background: var(--status-crit);  color: var(--status-crit-fg); }

        .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .nav-label-sm { font-family: var(--font-ui); font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--plat-muted); margin-bottom: 4px; }
        .nav-value { font-family: var(--font-mono); font-size: 16px; color: var(--plat-bright); }
        .nav-value.gold { color: var(--gold-hot); }

        .rec-card-name { font-family: var(--font-ui); font-size: 14px; font-weight: 500; color: var(--plat-white); letter-spacing: 0.05em; }
        .rec-reason { font-family: var(--font-ui); font-size: 12px; color: var(--plat-muted); margin-top: 4px; }
        .rec-gain { font-family: var(--font-mono); font-size: 18px; color: var(--gold-hot); text-align: right; white-space: nowrap; }
        .rec-gain span { font-size: 11px; color: var(--plat-muted); margin-left: 2px; }

        .shap-bars { display: flex; flex-direction: column; gap: 6px; }
        .shap-row { display: flex; align-items: center; gap: 8px; }
        .shap-cat { font-family: var(--font-mono); font-size: 10px; color: var(--plat-muted); width: 80px; flex-shrink: 0; text-transform: capitalize; }
        .shap-track { flex: 1; height: 3px; background: var(--bg-overlay); border-radius: 2px; overflow: hidden; }
        .shap-fill { height: 100%; background: var(--gold-mid); border-radius: 2px; transition: width 600ms var(--ease-vault); }
        .shap-val { font-family: var(--font-mono); font-size: 10px; color: var(--gold-hot); width: 60px; text-align: right; flex-shrink: 0; }

        .slide-in { animation: slide-right 400ms var(--ease-vault) both; }

        @media (max-width: 900px) {
          .audit-layout { grid-template-columns: 1fr; }
          .audit-page { padding: 24px 16px; }
        }
      `}</style>
    </div>
  )
}
