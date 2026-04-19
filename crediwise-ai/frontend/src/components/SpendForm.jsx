/**
 * SpendForm.jsx — Category spend input form with live dial
 */
import { useState, useMemo } from 'react'
import SpendDial from './SpendDial.jsx'
import { inrNum } from '../utils/format.js'

const CATEGORIES = [
  { key: 'dining',        label: 'Dining & Restaurants', icon: '🍽️', placeholder: '8,000' },
  { key: 'fuel',          label: 'Fuel & Petrol',         icon: '⛽', placeholder: '5,000' },
  { key: 'grocery',       label: 'Groceries',             icon: '🛒', placeholder: '6,000' },
  { key: 'travel',        label: 'Travel & Flights',      icon: '✈️', placeholder: '10,000' },
  { key: 'online',        label: 'Online Shopping',       icon: '🛍️', placeholder: '7,000' },
  { key: 'utilities',     label: 'Utility Bills',         icon: '⚡', placeholder: '3,000' },
  { key: 'international', label: 'International',         icon: '🌍', placeholder: '2,000' },
  { key: 'other',         label: 'Other',                 icon: '💳', placeholder: '4,000' },
]

export default function SpendForm({ onSubmit, loading, submitLabel = 'Analyse →' }) {
  const [spend, setSpend] = useState({})
  const [income, setIncome] = useState('')
  const [cibil, setCibil]   = useState('')
  const [cards, setCards]   = useState('')

  const totalMonthly = useMemo(
    () => Object.values(spend).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [spend]
  )

  function handleChange(key, raw) {
    // Strip commas, allow only digits
    const clean = raw.replace(/,/g, '').replace(/[^\d]/g, '')
    setSpend(prev => ({ ...prev, [key]: clean }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const monthly_spend = {}
    CATEGORIES.forEach(({ key }) => {
      monthly_spend[key] = parseFloat(spend[key] || '0')
    })
    const currentCards = cards
      ? cards.split(',').map(s => s.trim()).filter(Boolean)
      : []
    onSubmit({
      monthly_spend,
      income_annual:  parseFloat(income || '0'),
      cibil_score:    parseInt(cibil || '700', 10),
      current_cards:  currentCards,
      cards_count:    currentCards.length,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Spend Dial */}
      <div className="flex justify-center py-2">
        <SpendDial totalMonthly={totalMonthly} />
      </div>

      {/* Category spend inputs */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(({ key, label, icon, placeholder }) => (
          <div key={key}>
            <label className="block text-xs text-vault-textDim mb-1 font-medium">
              {icon} {label}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted text-sm font-mono">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={spend[key] ? inrNum(parseInt(spend[key])) : ''}
                onChange={e => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="vault-input pl-7"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Profile fields */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-vault-border">
        <div>
          <label className="block text-xs text-vault-textDim mb-1">💰 Annual Income</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted text-sm font-mono">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={income}
              onChange={e => setIncome(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="12,00,000"
              className="vault-input pl-7"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-vault-textDim mb-1">📊 CIBIL Score</label>
          <input
            type="number"
            min="300" max="900"
            value={cibil}
            onChange={e => setCibil(e.target.value)}
            placeholder="750"
            className="vault-input"
          />
        </div>
        <div>
          <label className="block text-xs text-vault-textDim mb-1">💳 Current Card IDs</label>
          <input
            type="text"
            value={cards}
            onChange={e => setCards(e.target.value)}
            placeholder="hdfc_regalia, kotak_811"
            className="vault-input text-xs"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || totalMonthly === 0}
        className="btn-gold w-full text-base"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Analysing…
          </span>
        ) : submitLabel}
      </button>
    </form>
  )
}
