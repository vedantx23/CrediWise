/**
 * PersonaCard.jsx — Persona reveal with traits, description, recommendations
 */
import RecommendationCard from './RecommendationCard.jsx'
import { pct } from '../utils/format.js'

const PERSONA_BG = {
  stealth_nomad:          'from-indigo-950 via-blue-950 to-slate-950',
  high_street_architect:  'from-rose-950 via-pink-950 to-slate-950',
  reward_arbitrageur:     'from-emerald-950 via-teal-950 to-slate-950',
  frugal_zen_master:      'from-violet-950 via-purple-950 to-slate-950',
}
const PERSONA_ACCENT = {
  stealth_nomad:          'text-blue-400 border-blue-800',
  high_street_architect:  'text-rose-400 border-rose-800',
  reward_arbitrageur:     'text-emerald-400 border-emerald-800',
  frugal_zen_master:      'text-violet-400 border-violet-800',
}

export default function PersonaCard({ result }) {
  const {
    persona_id, persona_name, persona_emoji, tagline, description,
    traits, confidence, probabilities, top_drivers, recommendations,
  } = result

  const personaKey = Object.values({
    0: 'stealth_nomad', 1: 'high_street_architect',
    2: 'reward_arbitrageur', 3: 'frugal_zen_master',
  })[persona_id] || 'stealth_nomad'

  const bg     = PERSONA_BG[personaKey]     || PERSONA_BG.stealth_nomad
  const accent = PERSONA_ACCENT[personaKey] || PERSONA_ACCENT.stealth_nomad

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Persona hero ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl bg-gradient-to-br ${bg} border border-vault-border
                       overflow-hidden p-6`}>
        <div className="flex items-start gap-5">
          <div className="text-6xl leading-none">{persona_emoji}</div>
          <div className="flex-1">
            <p className={`text-xs font-mono font-bold uppercase tracking-[0.3em] mb-1 ${accent.split(' ')[0]}`}>
              Your financial persona
            </p>
            <h2 className="text-2xl font-bold text-white mb-1">{persona_name}</h2>
            <p className="text-vault-textDim text-sm italic">"{tagline}"</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {traits.map(t => (
                <span key={t}
                  className={`text-xs px-2 py-0.5 rounded-full border bg-black/20 ${accent}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-vault-muted text-xs mb-1">Confidence</p>
            <p className={`font-mono text-3xl font-black ${accent.split(' ')[0]}`}>
              {Math.round(confidence * 100)}%
            </p>
          </div>
        </div>
        <p className="mt-4 text-vault-textDim text-sm leading-relaxed border-t border-white/10 pt-4">
          {description}
        </p>
      </div>

      {/* ── Probability breakdown ─────────────────────────────────────────── */}
      <div className="glass rounded-xl border border-vault-border p-4">
        <p className="text-xs font-mono text-vault-muted uppercase tracking-wider mb-3">
          Persona fit scores
        </p>
        <div className="space-y-2">
          {Object.entries(probabilities)
            .sort(([,a],[,b]) => b-a)
            .map(([name, prob]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-vault-textDim w-52 truncate">{name}</span>
                <div className="flex-1 h-1.5 bg-vault-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vault-gold rounded-full transition-all duration-700"
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-vault-gold w-10 text-right">
                  {pct(prob * 100, 0)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* ── Key spend signals ──────────────────────────────────────────────── */}
      <div className="glass rounded-xl border border-vault-border p-4">
        <p className="text-xs font-mono text-vault-muted uppercase tracking-wider mb-3">
          Key signals that identified you
        </p>
        <div className="flex flex-wrap gap-2">
          {top_drivers.map(drv => (
            <span key={drv}
              className="text-xs bg-vault-surface border border-vault-border px-3 py-1
                         rounded-full font-mono text-vault-textDim">
              {drv.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* ── Persona-matched cards ─────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-vault-text mb-3">
            {persona_emoji} Cards matched to your persona
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
