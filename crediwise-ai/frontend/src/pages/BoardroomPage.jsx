/**
 * BoardroomPage.jsx — AI Boardroom (Max / Sage / Mint)
 *
 * 3-agent multi-LLM debate over the user's question.
 * Backend: POST /api/boardroom
 */
import { useState } from 'react'
import api from '../api'
import { useToast } from '../components/VaultToast'
import { VaultInput } from '../components/VaultForms'
import { useUserProfile, PROFILE_CATEGORIES } from '../context/UserProfileContext'

const CATS = PROFILE_CATEGORIES

const AGENT_META = {
  max:  { emoji: '💼', color: '#facc15' },
  sage: { emoji: '✈️', color: '#60a5fa' },
  mint: { emoji: '🌱', color: '#4ade80' },
}

export default function BoardroomPage() {
  const toast = useToast()
  const { profile, updateProfile, updateSpend, asPayload } = useUserProfile()
  const [question, setQuestion]   = useState('Which card should I add to my wallet next?')
  const [loading,  setLoading]    = useState(false)
  const [transcript, setTranscript] = useState([])
  const [meta,     setMeta]       = useState(null)

  const spend  = profile.monthly_spend
  const income = profile.income_annual
  const cibil  = profile.cibil_score

  const totalSpend = Object.values(spend).reduce((a, b) => a + (Number(b) || 0), 0)

  async function ask() {
    if (!question.trim()) { toast.error?.('Please enter a question') || toast.add?.('Please enter a question','error'); return }
    if (totalSpend <= 0)  { toast.error?.('Please enter at least one spend category') || toast.add?.('Please enter at least one spend category','error'); return }

    setLoading(true)
    setTranscript([])
    setMeta(null)

    try {
      const payload = asPayload()
      const { data } = await api.post('/boardroom', {
        ...payload,
        question,
      })
      if (!data.success) throw new Error(data.error)
      setTranscript(data.data.transcript || [])
      setMeta({ model: data.data.model, ollama: data.data.ollama })
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Boardroom call failed'
      toast.error?.(msg) || toast.add?.(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 980, margin: '0 auto', color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🏛 The AI Boardroom</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Three local-LLM agents debate your wallet question.
        <strong style={{ color: '#facc15' }}> Max</strong> the fee optimizer,
        <strong style={{ color: '#60a5fa' }}> Sage</strong> the travel maximizer,
        <strong style={{ color: '#4ade80' }}> Mint</strong> the zero-fee minimalist.
      </p>

      <label style={{ display: 'block', fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
        Your question
      </label>
      <textarea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        rows={2}
        style={{
          width: '100%', background: '#0f172a', border: '1px solid #334155',
          color: '#fff', padding: 10, borderRadius: 6, resize: 'vertical',
          fontFamily: 'inherit', fontSize: 14,
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <VaultInput label="Annual income (₹)" value={income} onChange={(e) => updateProfile({ income_annual: e.target.value })} type="number" />
        <VaultInput label="CIBIL score"        value={cibil}  onChange={(e) => updateProfile({ cibil_score: e.target.value })}  type="number" />
      </div>

      <h3 style={{ marginTop: 20, marginBottom: 8 }}>Monthly spend (₹)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {CATS.map(c => (
          <VaultInput key={c} label={c} value={spend[c] ?? ''} onChange={(e) => updateSpend(c, e.target.value)} type="number" />
        ))}
      </div>

      <button
        onClick={ask}
        disabled={loading}
        style={{
          marginTop: 20, padding: '12px 28px', fontWeight: 600,
          background: loading ? '#374151' : 'linear-gradient(90deg,#facc15,#fb923c)',
          color: '#0b0f1a', border: 0, borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
        }}>
        {loading ? 'Convening boardroom…' : 'Convene the boardroom'}
      </button>

      {meta && (
        <div style={{ marginTop: 18, fontSize: 13, opacity: 0.6 }}>
          {meta.ollama
            ? <>🟢 Live LLM: <code>{meta.model}</code></>
            : <>🟡 Rule-based fallback (Ollama unavailable)</>}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {transcript.map((t, i) => {
          const m = AGENT_META[t.agent] || { emoji: '🤖', color: '#fff' }
          return (
            <div key={i} style={{
              background: '#0f172a', border: `1px solid ${m.color}40`,
              borderLeft: `4px solid ${m.color}`,
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{m.emoji}</span>
                <strong style={{ color: m.color }}>{t.name}</strong>
                <span style={{ opacity: 0.6, fontSize: 13 }}>— {t.role}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{t.response}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
