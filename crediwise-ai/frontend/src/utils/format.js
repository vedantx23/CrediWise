/**
 * format.js — Indian number formatting utilities
 */

/** Format a number as ₹X,XX,XXX (Indian locale) */
export function inr(value, options = {}) {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    maximumFractionDigits: options.decimals ?? 0,
    minimumFractionDigits: options.decimals ?? 0,
    ...options,
  }).format(value)
}

/** Format a plain number in Indian comma style: 1,23,456 */
export function inrNum(value) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value))
}

/** Format percentage: 3.33% */
export function pct(value, decimals = 2) {
  return `${Number(value).toFixed(decimals)}%`
}

/** Short form: ₹1.2L, ₹34K */
export function inrShort(value) {
  const n = Number(value)
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return inr(n)
}

/** Status colour class */
export function statusClass(status) {
  return status === 'pass'
    ? 'text-emerald-400'
    : status === 'warning'
    ? 'text-amber-400'
    : 'text-red-400'
}

/** Status background badge */
export function statusBg(status) {
  return status === 'pass'
    ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800'
    : status === 'warning'
    ? 'bg-amber-900/40 text-amber-400 border-amber-800'
    : 'bg-red-900/40 text-red-400 border-red-800'
}
