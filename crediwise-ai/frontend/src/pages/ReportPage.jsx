import { useState } from 'react'
import api from '../api'
import { inr as formatINR } from '../utils/format'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const CATEGORIES = ['dining','fuel','grocery','travel','online','utilities','international','other']

const DEFAULT_SPEND = Object.fromEntries(CATEGORIES.map(c => [c, '']))

function buildMonthlyData(year, spendRow) {
  // Build 12 identical months for demo (real use: import from audit)
  const data = {}
  MONTHS.forEach((_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    data[key] = Object.fromEntries(
      Object.entries(spendRow).map(([k, v]) => [k, Number(v) || 0])
    )
  })
  return data
}

export default function ReportPage() {
  const year = new Date().getFullYear()
  const [spend,    setSpend]    = useState(DEFAULT_SPEND)
  const [meta,     setMeta]     = useState({
    user_id: 'user', persona: 'The Reward Arbitrageur',
    current_nav: '', optimal_nav: '', current_cards: '',
  })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  const handleSpend = e => setSpend(s => ({ ...s, [e.target.name]: e.target.value }))
  const handleMeta  = e => setMeta(m => ({ ...m, [e.target.name]: e.target.value }))

  const download = async e => {
    e.preventDefault()
    setError('')
    setDone(false)
    setLoading(true)
    try {
      const currentNav = Number(meta.current_nav) || 0
      const optimalNav = Number(meta.optimal_nav) || 0
      const body = {
        user_id:         meta.user_id || 'user',
        year,
        monthly_data:    buildMonthlyData(year, spend),
        persona:         meta.persona,
        current_nav:     currentNav,
        optimal_nav:     optimalNav,
        leakage_rescued: optimalNav - currentNav,
        status:          (optimalNav - currentNav) > 5000 ? 'critical'
                       : (optimalNav - currentNav) > 2000 ? 'warning' : 'pass',
        recommendations: [],
        current_cards:   meta.current_cards
          ? meta.current_cards.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      }

      const res = await api.post('/generate-report', body, {
        responseType: 'blob',
        params: { user_id: body.user_id, year },
      })

      // Trigger browser download
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `crediwise_${body.user_id}_${year}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gold mb-1">Annual Wallet Report</h1>
      <p className="text-slate-400 text-sm mb-8">
        Generate your branded 4-page PDF — persona, rewards earned, category breakdown,
        and next-year recommendations.
      </p>

      <form onSubmit={download} className="space-y-6">
        {/* Meta */}
        <div className="glass rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 text-teal-400 font-semibold">Report Details</h2>
          {[
            { name: 'user_id',      label: 'Your Name / ID',       ph: 'e.g. alice' },
            { name: 'persona',      label: 'Your Persona',          ph: 'The Reward Arbitrageur' },
            { name: 'current_nav',  label: 'Current NAV / Year (₹)', ph: 'e.g. 12000' },
            { name: 'optimal_nav',  label: 'Optimal NAV / Year (₹)', ph: 'e.g. 18400' },
            { name: 'current_cards',label: 'Current Cards (comma-sep)', ph: 'hdfc_regalia, axis_ace' },
          ].map(({ name, label, ph }) => (
            <div key={name} className={name === 'current_cards' ? 'md:col-span-2' : ''}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                name={name} value={meta[name]} onChange={handleMeta}
                placeholder={ph}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                           text-white focus:border-teal-400 focus:outline-none"
              />
            </div>
          ))}
        </div>

        {/* Monthly spend (used for all 12 months) */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-teal-400 font-semibold mb-4">
            Average Monthly Spend (₹)
            <span className="ml-2 text-xs text-slate-500 font-normal">
              — applied to all 12 months
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <div key={cat}>
                <label className="block text-xs text-slate-400 mb-1 capitalize">{cat}</label>
                <input
                  type="number" name={cat} value={spend[cat]} onChange={handleSpend}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                             text-white focus:border-teal-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-xl p-4 text-red-400">
            {error}
          </div>
        )}
        {done && (
          <div className="bg-green-900/30 border border-green-600 rounded-xl p-4 text-green-400">
            ✅ Report downloaded! Check your Downloads folder.
          </div>
        )}

        <button type="submit" disabled={loading}
                className="w-full bg-gold hover:bg-yellow-400 text-black font-bold
                           py-3 rounded-xl transition-colors disabled:opacity-50 text-lg">
          {loading ? 'Generating PDF…' : '📄 Download Annual Report'}
        </button>
      </form>
    </div>
  )
}
