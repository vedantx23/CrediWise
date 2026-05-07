import { useState, useEffect } from 'react'
import api from '../api'
import VaultCard from '../components/VaultCard'
import { VaultButton, VaultInput } from '../components/VaultForms'
import SpendDial from '../components/SpendDial'
import { ScrollReveal } from '../hooks/useScrollReveal.jsx'
import { useToast } from '../components/VaultToast'
import { inr } from '../utils/format'

const CATEGORIES = [
  { key: 'Food & Dining', label: 'dining' },
  { key: 'Fuel', label: 'fuel' },
  { key: 'Groceries', label: 'grocery' },
  { key: 'Travel', label: 'travel' },
  { key: 'Shopping', label: 'online' },
  { key: 'Utilities & Bills', label: 'utilities' },
  { key: 'Entertainment', label: 'entertainment' },
  { key: 'Other', label: 'other' },
]

const SCANNING_LINES = [
  '> initializing portfolio audit engine...',
  '> cross-referencing 27 Indian card configurations...',
  '> calculating reward leakage across categories...',
  '> checking exclusions, caps & accelerated rewards...',
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
  const [spend, setSpend] = useState(Object.fromEntries(CATEGORIES.map(c => [c.key, ''])))
  const [walletCards, setWalletCards] = useState([])
  const [allCards, setAllCards] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [showDirectory, setShowDirectory] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | scanning | result
  const [scanLine, setScanLine] = useState(0)
  const [result, setResult] = useState(null)
  const toast = useToast()

  useEffect(() => {
    fetchWallet()
    fetchDirectory()
  }, [])

  async function fetchWallet() {
    try {
      const res = await api.get('/instruments')
      const names = (res.data.instruments || []).map(i => i.name)
      setWalletCards(names)
      setSelectedCards(names)
    } catch (err) { /* ok */ }
  }

  async function fetchDirectory() {
    try {
      const res = await api.get('/optimizer/cards')
      setAllCards(res.data.cards || [])
    } catch (err) { /* ok */ }
  }

  function toggleCard(name) {
    setSelectedCards(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
  }

  const totalSpend = Object.values(spend).reduce((s, v) => s + (Number(v) || 0), 0)
  const effectiveRate = result ? result.summary.overallRewardRate : (totalSpend > 0 ? 1.5 : 0)

  const handleSubmit = async e => {
    e.preventDefault()
    if (selectedCards.length === 0) {
      toast.add('Please select at least one card', 'error')
      return
    }
    if (totalSpend === 0) {
      toast.add('Enter your monthly spend', 'error')
      return
    }

    setPhase('scanning')
    setScanLine(0)
    setResult(null)

    const monthlyProfile = {}
    CATEGORIES.forEach(({ key }) => {
      const val = Number(spend[key]) || 0
      if (val > 0) monthlyProfile[key] = val
    })

    try {
      const res = await api.post('/optimizer/audit', {
        userCards: selectedCards,
        monthlyProfile
      })
      // Wait for scanning animation
      setTimeout(() => {
        setResult(res.data)
        setPhase('result')
      }, 3500)
    } catch (err) {
      toast.add(err.response?.data?.message || 'Audit failed', 'error')
      setPhase('idle')
    }
  }

  const leakage = result ? result.summary.annualGap : 0
  const status = leakage > 5000 ? 'critical' : leakage > 1000 ? 'warning' : 'pass'

  const statusColor = {
    pass:     'var(--status-pass-fg)',
    warning:  'var(--status-warn-fg)',
    critical: 'var(--status-crit-fg)',
  }

  return (
    <div className="audit-page">
      <div className="audit-header">
        <h1 className="vault-heading">Portfolio Audit</h1>
        <p className="vault-subtext">
          Discover exactly how much your current card stack is leaving on the table — powered by 27 Indian card configurations with exclusions, caps & accelerated rewards.
        </p>
      </div>

      <div className="audit-layout">
        {/* ── Left: Input form ── */}
        <div className="audit-left">
          <VaultCard>
            <h2 className="section-label">Your Cards</h2>
            <div className="card-chips-wrap">
              {walletCards.length > 0 ? (
                <div className="card-chips">
                  {walletCards.map(name => (
                    <button
                      key={name}
                      className={`audit-chip ${selectedCards.includes(name) ? 'selected' : ''}`}
                      onClick={() => toggleCard(name)}
                    >
                      {name.replace(/ Credit Card$/, '')}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--plat-muted)', fontSize: 11 }}>No cards in wallet. Browse directory below.</p>
              )}
              <button className="browse-btn" onClick={() => setShowDirectory(!showDirectory)}>
                {showDirectory ? '▾ Hide directory' : '▸ Add from directory'}
              </button>
              {showDirectory && (
                <div className="card-chips directory">
                  {allCards.filter(c => !walletCards.includes(c.name)).map(card => (
                    <button
                      key={card.name}
                      className={`audit-chip ${selectedCards.includes(card.name) ? 'selected' : ''}`}
                      onClick={() => toggleCard(card.name)}
                    >
                      <span className="chip-bank-tiny">{card.bank}</span> {card.name.replace(/ Credit Card$/, '').replace(card.bank + ' ', '')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </VaultCard>

          <VaultCard style={{ marginTop: 16 }}>
            <h2 className="section-label">Monthly Spend</h2>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="spend-grid">
                {CATEGORIES.map(({ key, label }) => (
                  <VaultInput
                    key={key}
                    label={label}
                    currency
                    type="number"
                    placeholder="0"
                    value={spend[key]}
                    onChange={e => setSpend(s => ({ ...s, [key]: e.target.value }))}
                  />
                ))}
              </div>
              <VaultButton type="submit" loading={phase === 'scanning'}>
                Run Audit
              </VaultButton>
            </form>
          </VaultCard>

          <VaultCard style={{ marginTop: 16, display:'flex', justifyContent:'center' }}>
            <SpendDial totalMonthlySpend={totalSpend} effectiveRate={effectiveRate} />
          </VaultCard>
        </div>

        {/* ── Right: Result ── */}
        <div className="audit-right">
          {phase === 'idle' && (
            <VaultCard style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', minHeight:320 }}>
              <p style={{ color:'var(--plat-muted)', fontFamily:'var(--font-mono)', fontSize:13, textAlign:'center' }}>
                Select your cards, enter monthly spend<br/>and run the audit.
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
                      color: statusColor[status],
                      animation: status === 'critical' ? 'pulse-crit 1s ease infinite' : 'none',
                    }}
                  >
                    <CountUp target={leakage} />
                  </div>
                  <p className="leakage-label">leaving your wallet every year</p>
                  <span className={`status-badge ${status}`}>
                    {status.toUpperCase()}
                  </span>
                </div>
                <div className="nav-grid" style={{ marginTop:20 }}>
                  <div>
                    <div className="nav-label-sm">Current Rewards</div>
                    <div className="nav-value">{inr(result.summary.currentMonthlyRewards * 12)}<span className="per-yr">/yr</span></div>
                  </div>
                  <div>
                    <div className="nav-label-sm">Optimal (Market Best)</div>
                    <div className="nav-value gold">{inr(result.summary.optimalMonthlyRewards * 12)}<span className="per-yr">/yr</span></div>
                  </div>
                </div>
                <div className="nav-grid" style={{ marginTop:12 }}>
                  <div>
                    <div className="nav-label-sm">Your Reward Rate</div>
                    <div className="nav-value">{result.summary.overallRewardRate}%</div>
                  </div>
                  <div>
                    <div className="nav-label-sm">Monthly Spend</div>
                    <div className="nav-value">{inr(result.summary.totalMonthlySpend)}</div>
                  </div>
                </div>
              </VaultCard>

              {/* Suggestions */}
              {result.suggestions?.length > 0 && result.suggestions.map((s, i) => (
                <VaultCard key={i} className="slide-in" style={{ animationDelay: `${i * 120}ms` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div className="rec-card-name">{s.suggestedCard}</div>
                      <div className="rec-reason">
                        For <strong>{s.category}</strong> — switch from {s.currentCard} ({s.currentRate}%) → {s.suggestedRate}%
                      </div>
                    </div>
                    <div className="rec-gain">{inr(s.annualSavings)}<span>/yr</span></div>
                  </div>
                </VaultCard>
              ))}

              {/* Category Breakdown */}
              {result.findings?.length > 0 && (
                <VaultCard>
                  <h2 className="section-label">Category Breakdown</h2>
                  <div className="findings-table">
                    {result.findings.map((f, i) => (
                      <div key={i} className={`finding-row ${f.isOptimal ? 'optimal' : 'sub-optimal'}`}>
                        <div className="finding-cat">{f.category}</div>
                        <div className="finding-spend">{inr(f.monthlySpend)}/mo</div>
                        <div className="finding-card">{f.bestCard}</div>
                        <div className="finding-rate">{f.bestRate}%</div>
                        <div className="finding-reward">{inr(f.monthlyReward)}</div>
                        {!f.isOptimal && (
                          <div className="finding-gap">↑ {inr(f.gap)}/mo gap</div>
                        )}
                      </div>
                    ))}
                  </div>
                </VaultCard>
              )}

              {/* Milestone Advice */}
              {result.milestoneAdvice?.length > 0 && (
                <VaultCard>
                  <h2 className="section-label">🎯 Milestone Tracking</h2>
                  {result.milestoneAdvice.map((m, i) => (
                    <div key={i} className="milestone-row">
                      <strong>{m.card}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--plat-muted)', fontSize: 12 }}>{m.advice}</p>
                    </div>
                  ))}
                </VaultCard>
              )}
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
        .section-label { font-family: var(--font-ui); font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--plat-muted); margin: 0 0 16px; }
        .audit-layout { display: grid; grid-template-columns: 420px 1fr; gap: 24px; align-items: start; }
        .spend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Card chips */
        .card-chips-wrap { margin-bottom: 8px; }
        .card-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .card-chips.directory { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(212,175,55,0.08); }
        .audit-chip {
          padding: 4px 10px; border-radius: 5px;
          border: 1px solid rgba(212,175,55,0.15);
          background: var(--bg-raised, #0D1219);
          color: var(--plat-muted); font-size: 10px;
          cursor: pointer; transition: all 120ms;
        }
        .audit-chip.selected {
          background: rgba(212,175,55,0.12);
          border-color: var(--gold-bright);
          color: var(--gold-bright);
        }
        .chip-bank-tiny { font-size: 8px; opacity: 0.6; text-transform: uppercase; }
        .browse-btn {
          background: none; border: none; color: var(--plat-muted);
          font-size: 10px; cursor: pointer; padding: 4px 0;
        }
        .browse-btn:hover { color: var(--gold-bright); }

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
          padding: 4px 14px; border-radius: var(--radius-pill, 20px);
        }
        .status-badge.pass     { background: var(--status-pass, rgba(16,185,129,0.1));  color: var(--status-pass-fg, #10B981); }
        .status-badge.warning  { background: var(--status-warn, rgba(251,191,36,0.1));  color: var(--status-warn-fg, #FBBF24); }
        .status-badge.critical { background: var(--status-crit, rgba(248,113,113,0.1)); color: var(--status-crit-fg, #F87171); }

        .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .nav-label-sm { font-family: var(--font-ui); font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--plat-muted); margin-bottom: 4px; }
        .nav-value { font-family: var(--font-mono); font-size: 16px; color: var(--plat-bright, #E8EDF2); }
        .nav-value.gold { color: var(--gold-hot, #D4AF37); }
        .per-yr { font-size: 11px; color: var(--plat-muted); margin-left: 2px; }

        .rec-card-name { font-family: var(--font-ui); font-size: 14px; font-weight: 500; color: var(--plat-white); letter-spacing: 0.05em; }
        .rec-reason { font-family: var(--font-ui); font-size: 12px; color: var(--plat-muted); margin-top: 4px; }
        .rec-gain { font-family: var(--font-mono); font-size: 18px; color: var(--gold-hot, #D4AF37); text-align: right; white-space: nowrap; }
        .rec-gain span { font-size: 11px; color: var(--plat-muted); margin-left: 2px; }

        /* Findings */
        .findings-table { display: flex; flex-direction: column; gap: 6px; }
        .finding-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 6px;
          background: rgba(212,175,55,0.02);
          font-size: 11px;
        }
        .finding-row.sub-optimal { background: rgba(251,191,36,0.04); }
        .finding-cat { width: 100px; font-weight: 500; color: var(--plat-white); }
        .finding-spend { width: 80px; color: var(--plat-muted); font-family: var(--font-mono); }
        .finding-card { flex: 1; color: var(--plat-cool, #94A3B8); }
        .finding-rate { width: 40px; color: var(--gold-bright); font-family: var(--font-mono); }
        .finding-reward { width: 60px; color: var(--plat-white); font-family: var(--font-mono); }
        .finding-gap { color: var(--status-warn-fg, #FBBF24); font-weight: 600; font-size: 10px; }

        .milestone-row { padding: 8px 0; border-bottom: 1px solid rgba(212,175,55,0.06); }

        .slide-in { animation: slide-right 400ms var(--ease-vault, ease) both; }

        @media (max-width: 900px) {
          .audit-layout { grid-template-columns: 1fr; }
          .audit-page { padding: 24px 16px; }
        }
      `}</style>
    </div>
  )
}
