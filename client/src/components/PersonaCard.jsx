// Legacy PersonaCard — superseded by PersonaScan.jsx. Kept for reference.
const PERSONAS = {
  0: { name: 'The Stealth Nomad',         color: 'text-blue-400' },
  1: { name: 'The High-Street Architect', color: 'text-amber-400' },
  2: { name: 'The Reward Arbitrageur',    color: 'text-emerald-400' },
  3: { name: 'The Frugal Zen Master',     color: 'text-purple-400' },
}
export default function PersonaCard({ personaId }) {
  const p = PERSONAS[personaId] || PERSONAS[0]
  return (
    <div className="glass rounded-xl p-6 text-center">
      <h2 className={`text-2xl font-bold ${p.color}`}>{p.name}</h2>
    </div>
  )
}
