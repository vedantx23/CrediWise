// Legacy SpendForm — replaced by VaultForms.jsx. Kept for reference.
const CATEGORIES = ['dining','fuel','grocery','travel','online','utilities','international','other']
export default function SpendForm({ spend, setSpend, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
      {CATEGORIES.map(c => (
        <label key={c} className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted capitalize">{c}</span>
          <input type="number" value={spend[c]||''} onChange={e=>setSpend(s=>({...s,[c]:e.target.value}))}
            className="bg-vault-card border border-vault-border rounded px-3 py-2 text-white text-sm" />
        </label>
      ))}
      <button type="submit" className="col-span-2 btn-gold mt-2">Run Audit</button>
    </form>
  )
}
