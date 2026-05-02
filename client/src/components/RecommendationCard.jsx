/**
 * RecommendationCard.jsx — Card recommendation with SHAP breakdown
 */
import { useState } from 'react'
import { inr, inrShort, pct, inrNum } from '../utils/format.js'

const CAT_ICONS = {
  dining:'🍽️', fuel:'⛽', grocery:'🛒', travel:'✈️',
  online:'🛍️', utilities:'⚡', international:'🌍', other:'💳',
}

export default function RecommendationCard({ rec, rank }) {
  const [expanded, setExpanded] = useState(false)

  const topShap = Object.entries(rec.shap_values || {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const maxShap = topShap[0]?.[1] || 1

  return (
    <div className="glass rounded-xl border border-vault-border overflow-hidden
                    hover:border-vault-gold/30 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vault-gold/10 border border-vault-gold/30
                          flex items-center justify-center flex-shrink-0">
            <span className="text-vault-gold font-mono font-bold text-sm">#{rank}</span>
          </div>
          <div>
            <p className="font-semibold text-vault-text text-sm">{rec.card_name}</p>
            <p className="text-vault-muted text-xs">{rec.bank}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-emerald-400 font-mono font-bold text-base">
            +{inrShort(rec.marginal_nav)}
            <span className="text-xs text-vault-muted">/yr</span>
          </p>
          <p className="text-vault-muted text-xs">
            {rec.annual_fee === 0 ? 'Free' : `Fee: ₹${inrNum(rec.annual_fee)}`}
          </p>
        </div>
      </div>

      {/* Reason */}
      <div className="px-4 pb-3">
        <p className="text-vault-textDim text-xs leading-relaxed">{rec.reason}</p>
        {!rec.eligible && (
          <span className="inline-block mt-1.5 text-xs bg-amber-900/30 text-amber-400
                           border border-amber-800/50 px-2 py-0.5 rounded-full">
            ⚠ May need eligibility check
          </span>
        )}
      </div>

      {/* SHAP breakdown toggle */}
      {topShap.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full px-4 py-2 text-left text-xs text-vault-muted hover:text-vault-textDim
                       border-t border-vault-border/50 flex items-center gap-1 transition-colors"
          >
            <span>{expanded ? '▾' : '▸'}</span>
            <span className="font-mono">SHAP attribution — why this card</span>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-2 border-t border-vault-border/30">
              {topShap.map(([cat, val]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs w-28 text-vault-textDim flex items-center gap-1">
                    {CAT_ICONS[cat]} <span className="capitalize">{cat}</span>
                  </span>
                  <div className="flex-1 h-1.5 bg-vault-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(val / maxShap) * 100}%` }}
                    />
                  </div>
                  <span className="text-emerald-400 font-mono text-xs w-16 text-right">
                    +{inrShort(val)}/yr
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
