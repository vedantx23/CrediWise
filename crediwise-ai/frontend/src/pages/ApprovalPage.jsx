import { useState, useEffect } from 'react'
import api from '../api'
import { inr as formatINR } from '../utils/format'
import { useUserProfile } from '../context/UserProfileContext'

const TIERS = {
  high:   { color: 'text-green-400',  bar: 'bg-green-500',  label: 'High' },
  medium: { color: 'text-amber-400',  bar: 'bg-amber-500',  label: 'Medium' },
  low:    { color: 'text-red-400',    bar: 'bg-red-500',    label: 'Low' },
}

export default function ApprovalPage() {
  const { profile, updateProfile } = useUserProfile()
  const [form, setForm] = useState({
    cibil_score:           profile.cibil_score ?? '',
    income_annual:         profile.income_annual ?? '',
    existing_cards_count:  String((profile.current_cards || []).length || 0),
  })
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Re-sync if user updates profile elsewhere (Audit / Persona pages).
  useEffect(() => {
    setForm(f => ({
      ...f,
      cibil_score:   profile.cibil_score ?? f.cibil_score,
      income_annual: profile.income_annual ?? f.income_annual,
      existing_cards_count:
        String((profile.current_cards || []).length || f.existing_cards_count || 0),
    }))
  }, [profile.cibil_score, profile.income_annual, profile.current_cards])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (name === 'cibil_score' || name === 'income_annual') {
      updateProfile({ [name]: value })
    }
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/predict-approval', {
        cibil_score:           Number(form.cibil_score),
        income_annual:         Number(form.income_annual),
        existing_cards_count:  Number(form.existing_cards_count),
      })
      setResults(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gold mb-1">Card Approval Predictor</h1>
      <p className="text-slate-400 mb-8 text-sm">
        See your approval odds for every Indian credit card — ranked by probability.
      </p>

      {/* Input form */}
      <form onSubmit={submit}
            className="glass rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'cibil_score',          label: 'CIBIL Score',           placeholder: '300–900' },
          { name: 'income_annual',        label: 'Annual Income (₹)',      placeholder: 'e.g. 1200000' },
          { name: 'existing_cards_count', label: 'Existing Cards Count',  placeholder: '0–10' },
        ].map(({ name, label, placeholder }) => (
          <div key={name}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <input
              type="number" name={name} required
              value={form[name]} onChange={handleChange}
              placeholder={placeholder}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                         text-white focus:border-teal-400 focus:outline-none"
            />
          </div>
        ))}
        <div className="md:col-span-3 flex justify-end">
          <button type="submit" disabled={loading}
                  className="bg-teal-500 hover:bg-teal-400 text-black font-bold
                             px-8 py-2 rounded-xl transition-colors disabled:opacity-50">
            {loading ? 'Predicting…' : 'Predict Approval'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-900/30 border border-red-600 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {results && (
        <div>
          {/* Profile summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'CIBIL Score',   val: results.profile.cibil_score },
              { label: 'Annual Income', val: formatINR(results.profile.income_annual) },
              { label: 'Cards Held',    val: results.profile.existing_cards_count },
            ].map(({ label, val }) => (
              <div key={label} className="glass rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className="text-xl font-bold text-white">{val}</p>
              </div>
            ))}
          </div>

          {/* Results table */}
          <div className="space-y-3">
            {results.predictions.map(card => {
              const tier = TIERS[card.tier] || TIERS.low
              return (
                <div key={card.card_id}
                     className="glass rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-white">{card.card_name}</span>
                      {card.bank && (
                        <span className="ml-2 text-xs text-slate-400">{card.bank}</span>
                      )}
                    </div>
                    <span className={`font-bold text-lg ${tier.color}`}>
                      {card.approval_probability_percent}%
                      <span className="ml-2 text-xs font-normal">{tier.label}</span>
                    </span>
                  </div>

                  {/* Probability bar */}
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`${tier.bar} h-2 rounded-full transition-all duration-700`}
                      style={{ width: `${card.approval_probability_percent}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-400">{card.reason}</p>

                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Min CIBIL: {card.min_cibil_required}</span>
                    {card.min_income_required > 0 && (
                      <span>Min Income: {formatINR(card.min_income_required)}</span>
                    )}
                    {card.annual_fee > 0 && (
                      <span>Annual Fee: {formatINR(card.annual_fee)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
