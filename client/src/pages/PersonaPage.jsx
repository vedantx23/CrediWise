import { useState } from 'react'
import { runPersona } from '../api/ai'
import VaultCard from '../components/VaultCard'
import { VaultButton, VaultInput } from '../components/VaultForms'
import PersonaScan from '../components/PersonaScan'
import HoloCard from '../components/HoloCard'
import { ScrollReveal } from '../hooks/useScrollReveal.jsx'
import { useToast } from '../components/VaultToast'
import { inr } from '../utils/format'

const CATEGORIES = ['dining','fuel','grocery','travel','online','utilities','international','other']
const DEFAULT_SPEND = Object.fromEntries(CATEGORIES.map(c => [c, '']))

export default function PersonaPage() {
  const [spend, setSpend]       = useState(DEFAULT_SPEND)
  const [income, setIncome]     = useState('')
  const [cibil, setCibil]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult]     = useState(null)
  const toast = useToast()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await runPersona({
        monthly_spend: Object.fromEntries(
          Object.entries(spend).map(([k,v]) => [k, Number(v)||0])
        ),
        income_annual: Number(income)||0,
        cibil_score:   Number(cibil)||700,
        current_cards: [],
      })
      setScanning(true)
      setTimeout(() => {
        setLoading(false)
        setResult(res)
      }, 2800)
    } catch(err) {
      toast.add(err.response?.data?.error || 'Persona detection failed', 'error')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding:'40px 48px', maxWidth:1200 }}>
      {scanning && result && (
        <PersonaScan persona={result.persona} onDone={() => setScanning(false)} />
      )}

      <h1 className="vault-heading">Persona Engine</h1>
      <p className="vault-subtext">
        Our ML model reads your spend DNA and identifies your financial archetype.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:24, alignItems:'start' }}>
        <VaultCard>
          <h2 style={{ fontFamily:'var(--font-ui)', fontSize:11, fontWeight:500, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--plat-muted)', margin:'0 0 20px' }}>
            Monthly Spend
          </h2>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {CATEGORIES.map(cat => (
                <VaultInput key={cat} label={cat} currency type="number" placeholder="0"
                  value={spend[cat]} onChange={e => setSpend(s => ({...s,[cat]:e.target.value}))} />
              ))}
            </div>
            <VaultInput label="Annual Income (₹)" currency type="number" placeholder="1200000"
              value={income} onChange={e => setIncome(e.target.value)} />
            <VaultInput label="CIBIL Score" type="number" placeholder="740"
              value={cibil} onChange={e => setCibil(e.target.value)} />
            <VaultButton type="submit" loading={loading}>Reveal My Persona</VaultButton>
          </form>
        </VaultCard>

        <div>
          {!result && !loading && (
            <VaultCard style={{ minHeight:320, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ color:'var(--plat-muted)', fontFamily:'var(--font-mono)', fontSize:13, textAlign:'center' }}>
                Awaiting spending data...
              </p>
            </VaultCard>
          )}

          {result && !scanning && (
            <ScrollReveal stagger={100}>
              <VaultCard active>
                <div style={{ textAlign:'center', padding:'12px 0' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:300, fontSize:'clamp(28px,4vw,48px)', color:'var(--gold-bright)', letterSpacing:'0.08em', animation:'persona-bounce 500ms var(--ease-snap)' }}>
                    {result.persona}
                  </div>
                  <div style={{ fontFamily:'var(--font-ui)', fontWeight:300, fontSize:14, color:'var(--plat-cool)', marginTop:8 }}>
                    Confidence: <span style={{ color:'var(--gold-hot)', fontFamily:'var(--font-mono)' }}>{(result.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </VaultCard>

              <div style={{ marginTop:24 }}>
                <h3 style={{ fontFamily:'var(--font-ui)', fontSize:11, fontWeight:500, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--plat-muted)', marginBottom:16 }}>
                  Recommended Cards
                </h3>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
                  {result.recommendations?.slice(0,3).map(rec => (
                    <HoloCard key={rec.card_id} card={{
                      card_id: rec.card_id,
                      name: rec.card_name || rec.card_id,
                      bank: rec.bank || '',
                      reward_categories: rec.reward_rates
                        ? Object.entries(rec.reward_rates).map(([cat,rate]) => ({ category:cat, rate_percent:rate }))
                        : [],
                    }} />
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>

      <style>{`
        .vault-heading { font-family:var(--font-display);font-weight:400;font-size:clamp(24px,3vw,36px);color:var(--plat-white);letter-spacing:0.05em;margin:0 0 4px;padding-bottom:8px;border-bottom:1px solid var(--gold-dim);display:inline-block; }
        .vault-subtext { font-family:var(--font-ui);font-weight:300;font-size:15px;color:var(--plat-cool);line-height:1.7;margin:8px 0 32px; }
      `}</style>
    </div>
  )
}
