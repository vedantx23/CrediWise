/**
 * AuditResult.jsx — Shadow Audit result display
 * Shows leakage, status colour coding, spend breakdown, recommendations
 */
import { inr, inrShort, pct, statusClass, statusBg } from '../utils/format.js'
import RecommendationCard from './RecommendationCard.jsx'

const CAT_ICONS = {
  dining:'🍽️', fuel:'⛽', grocery:'🛒', travel:'✈️',
  online:'🛍️', utilities:'⚡', international:'🌍', other:'💳',
}

export default function AuditResult({ result }) {
  const { current_nav_annual, optimal_nav_annual, leakage_inr,
          status, message, recommendations, spend_breakdown, current_cards,
          split_plays = [] } = result

  const isUnaudited = status === 'unaudited'

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Headline leakage card ──────────────────────────────────────────── */}
      <div className={`rounded-xl border p-6 ${statusBg(status)} gold-glow`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5
                               rounded-full border ${statusBg(status)}`}>
                {isUnaudited ? '◌ UNAUDITED'
                  : status === 'pass' ? '✓ OPTIMISED'
                  : status === 'warning' ? '⚠ WARNING' : '🔴 CRITICAL'}
              </span>
            </div>
            <p className={`text-2xl font-bold font-mono ${statusClass(status)}`}>
              {message}
            </p>
          </div>
          {!isUnaudited && (
            <div className="text-right flex-shrink-0">
              <p className="text-vault-muted text-xs mb-1">Annual leakage</p>
              <p className={`font-mono text-4xl font-black ${statusClass(status)}`}>
                {inr(leakage_inr)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── NAV comparison ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 border border-vault-border">
          <p className="text-vault-muted text-xs mb-1">Current wallet NAV</p>
          <p className="font-mono text-2xl font-bold text-vault-textDim">{inr(current_nav_annual)}</p>
          <p className="text-xs text-vault-muted mt-1">per year with current cards</p>
        </div>
        <div className="glass rounded-xl p-4 border border-vault-gold/20">
          <p className="text-vault-muted text-xs mb-1">Optimal NAV (possible)</p>
          <p className="font-mono text-2xl font-bold text-vault-gold">{inr(optimal_nav_annual)}</p>
          <p className="text-xs text-vault-muted mt-1">with best available cards</p>
        </div>
      </div>

      {/* ── Category breakdown ────────────────────────────────────────────── */}
      {Object.keys(spend_breakdown).length > 0 && (
        <div className="glass rounded-xl border border-vault-border overflow-hidden">
          <div className="px-4 py-3 border-b border-vault-border">
            <h3 className="text-sm font-semibold text-vault-text">Category breakdown</h3>
            <p className="text-xs text-vault-muted">Where your money earns more</p>
          </div>
          <div className="divide-y divide-vault-border/50">
            {Object.entries(spend_breakdown).map(([cat, data]) => {
              const improvement = data.optimal_reward - data.current_reward
              const impPct = data.current_reward > 0
                ? ((data.optimal_reward / data.current_reward - 1) * 100)
                : 100
              return (
                <div key={cat} className="px-4 py-3 flex items-center gap-4 hover:bg-vault-card/30 transition-colors">
                  <div className="w-7 text-center text-lg">{CAT_ICONS[cat] ?? '💳'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize text-vault-text">{cat}</span>
                      <span className="text-xs text-vault-muted font-mono">
                        {inr(data.monthly_inr)}/mo
                      </span>
                    </div>
                    {/* Rate bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-vault-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-vault-gold/70 rounded-full"
                          style={{ width: `${(data.current_rate_pct / data.optimal_rate_pct) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-vault-textDim w-28 text-right">
                        {pct(data.current_rate_pct)} → <span className="text-vault-gold">{pct(data.optimal_rate_pct)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {improvement > 0 ? (
                      <span className="text-emerald-400 font-mono text-xs font-bold">
                        +{inrShort(improvement)}/yr
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono text-xs">✓ optimal</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Split Plays ────────────────────────────────────────────────────── */}
      {split_plays.length > 0 && (
        <div className="glass rounded-xl border border-vault-border overflow-hidden">
          <div className="px-4 py-3 border-b border-vault-border">
            <h3 className="text-sm font-semibold text-vault-text">🎴 Split Play strategy</h3>
            <p className="text-xs text-vault-muted">Mix-and-match cards to maximize per-category rewards</p>
          </div>
          <div className="divide-y divide-vault-border/50">
            {split_plays.map(p => (
              <div key={p.card_id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-vault-text">
                    Use <span className="text-vault-gold">{p.card_name}</span> for{' '}
                    {p.categories.map(c => c.category).join(', ')}
                  </span>
                  <span className="text-emerald-400 font-mono text-xs font-bold">
                    +{inrShort(p.extra_annual_inr)}/yr
                  </span>
                </div>
                <ul className="text-xs text-vault-muted space-y-0.5 ml-2">
                  {p.categories.map(c => (
                    <li key={c.category}>
                      • <span className="capitalize">{c.category}</span>: {pct(c.current_rate_pct)} → <span className="text-vault-gold">{pct(c.optimal_rate_pct)}</span>{' '}
                      (+{inrShort(c.extra_inr)}/yr)
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendations ───────────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-vault-text mb-3">
            🎯 Recommended card upgrades
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={rec.card_id} rec={rec} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
