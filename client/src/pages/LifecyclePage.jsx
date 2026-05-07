/**
 * LifecyclePage.jsx — Lifecycle Alerts dashboard
 *
 * Aggregates downgrade alerts + reward expiries from /api/lifecycle/{user_id}.
 */
import { useEffect, useState } from 'react'
import api from '../api'
import { inr } from '../utils/format'
import { useToast } from '../components/VaultToast'
import { useUserProfile } from '../context/UserProfileContext'

export default function LifecyclePage() {
  const toast = useToast()
  const { profile, updateProfile } = useUserProfile()
  const userId = profile.user_id || 'web-user'
  const setUserId = (val) => updateProfile({ user_id: val })
  const [data,    setData]   = useState(null)
  const [loading, setLoading]= useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data: r } = await api.get(`/lifecycle/${encodeURIComponent(userId)}`)
      if (!r.success) throw new Error(r.error)
      setData(r.data)
    } catch (e) {
      toast.error(e.message || 'Failed to load lifecycle')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])  // eslint-disable-line

  async function ackAlert(id) {
    try {
      await api.post(`/alerts/acknowledge/${id}`)
      toast.success('Alert acknowledged')
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function runDowngradeCheck() {
    try {
      await api.post('/alerts/run-check', {})
      toast.success('Downgrade check complete')
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto', color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🔔 Lifecycle Alerts</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Detect quiet reward-rate downgrades and rewards about to expire.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <input
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="user id"
          style={{
            background: '#0f172a', border: '1px solid #334155',
            color: '#fff', padding: '8px 12px', borderRadius: 6,
          }}
        />
        <button onClick={load} disabled={loading}
          style={{ padding: '8px 16px', background: '#facc15', color: '#0b0f1a',
                   border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button onClick={runDowngradeCheck}
          style={{ padding: '8px 16px', background: 'transparent', color: '#facc15',
                   border: '1px solid #facc15', borderRadius: 6, cursor: 'pointer' }}>
          Run downgrade scan
        </button>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Downgrade alerts */}
          <section style={{ background: '#0f172a', borderRadius: 8, padding: 20, border: '1px solid #1e293b' }}>
            <h2 style={{ fontSize: 18, marginBottom: 12, color: '#fb7185' }}>
              📉 Downgrade alerts ({data.downgrade_count})
            </h2>
            {data.downgrade_alerts.length === 0 && (
              <div style={{ opacity: 0.6 }}>✓ No active downgrades. Your wallet is stable.</div>
            )}
            {data.downgrade_alerts.slice(0, 12).map(a => (
              <div key={a.id} style={{
                padding: 12, marginBottom: 8, borderRadius: 6,
                background: '#1e293b', borderLeft: '3px solid #fb7185',
              }}>
                <div style={{ fontWeight: 600 }}>{a.card_id} · {a.category}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  {a.old_rate}% → {a.new_rate}%
                  {a.extra_loss_annual ? ` · loss ${inr(a.extra_loss_annual)}/yr` : ''}
                </div>
                <button onClick={() => ackAlert(a.id)}
                  style={{ marginTop: 8, fontSize: 12, padding: '4px 10px',
                           background: 'transparent', color: '#facc15',
                           border: '1px solid #facc15', borderRadius: 4, cursor: 'pointer' }}>
                  Acknowledge
                </button>
              </div>
            ))}
          </section>

          {/* Reward expiries */}
          <section style={{ background: '#0f172a', borderRadius: 8, padding: 20, border: '1px solid #1e293b' }}>
            <h2 style={{ fontSize: 18, marginBottom: 12, color: '#facc15' }}>
              ⏳ Expiring rewards ({data.expiring_soon_count} within 30 days)
            </h2>
            {data.reward_expiries.length === 0 && (
              <div style={{ opacity: 0.6 }}>No tracked reward-expiry items for this user.</div>
            )}
            {data.reward_expiries.map((e, i) => (
              <div key={i} style={{
                padding: 12, marginBottom: 8, borderRadius: 6,
                background: '#1e293b',
                borderLeft: `3px solid ${(e.days_until_expiry ?? 99) <= 30 ? '#facc15' : '#475569'}`,
              }}>
                <div style={{ fontWeight: 600 }}>
                  {e.card_id || e.card_name || 'Card'} · {e.points_balance ?? e.balance ?? '?'} pts
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  Expires in {e.days_until_expiry ?? '?'} days
                  {e.estimated_value ? ` · est value ${inr(e.estimated_value)}` : ''}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}
