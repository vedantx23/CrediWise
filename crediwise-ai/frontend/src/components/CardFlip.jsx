/**
 * CardFlip.jsx — CSS 3D flip credit card component
 * Front: card name + bank logo initial + last-4 digits + chip
 * Back:  reward rate table per spend category
 */
import { useState } from 'react'
import { pct } from '../utils/format.js'

const CATEGORY_ICONS = {
  dining:        '🍽️',
  fuel:          '⛽',
  grocery:       '🛒',
  travel:        '✈️',
  online:        '🛍️',
  utilities:     '⚡',
  international: '🌍',
  other:         '💳',
}

// Simple gradient palette per bank
const BANK_GRADIENTS = {
  'HDFC Bank':             'from-[#004785] to-[#001f5a]',
  'ICICI Bank':            'from-[#b5122e] to-[#6b0b1c]',
  'Axis Bank':             'from-[#7b0025] to-[#3d0012]',
  'SBI Card':              'from-[#1a3c8f] to-[#0d1f4e]',
  'Amex':                  'from-[#006ac1] to-[#003a6b]',
  'Kotak':                 'from-[#d5133a] to-[#7a0020]',
  'IndusInd Bank':         'from-[#005eb8] to-[#002d5c]',
  'AU Small Finance Bank': 'from-[#e85d04] to-[#7b2d00]',
}

function getBankInitials(bank) {
  return bank.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

export default function CardFlip({ card, rewards = {}, className = '' }) {
  const [flipped, setFlipped] = useState(false)

  const gradient = BANK_GRADIENTS[card.bank] || 'from-[#1a1a2e] to-[#0f3460]'
  const categories = Object.entries(rewards).sort(([, a], [, b]) => b - a)

  return (
    <div
      className={`card-scene ${className}`}
      onClick={() => setFlipped(f => !f)}
      role="button"
      aria-label={`${card.name} - click to flip`}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
    >
      <div className={`card-3d ${flipped ? 'flipped' : ''}`}>

        {/* ── FRONT ───────────────────────────────────────────────────────── */}
        <div className={`card-face card-front bg-gradient-to-br ${gradient}`}>
          {/* Chip */}
          <div className="absolute top-6 left-6">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500
                            grid grid-cols-2 grid-rows-3 gap-px p-1 opacity-90">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-yellow-600/50 rounded-sm" />
              ))}
            </div>
          </div>

          {/* NFC wave */}
          <div className="absolute top-6 right-6 text-white/40 text-xl">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" opacity=".3"/>
              <path d="M10 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" opacity=".6"/>
              <circle cx="10" cy="10" r="1.5"/>
            </svg>
          </div>

          {/* Bank logo initial */}
          <div className="absolute bottom-14 left-6 flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20
                            flex items-center justify-center">
              <span className="text-white font-black text-xs font-mono">
                {getBankInitials(card.bank)}
              </span>
            </div>
            <span className="text-white/70 text-xs font-medium">{card.bank}</span>
          </div>

          {/* Card number placeholder */}
          <div className="absolute bottom-6 left-6 font-mono text-white/80 text-sm tracking-[0.25em]">
            •••• •••• •••• {card.card_id.slice(-4).toUpperCase()}
          </div>

          {/* Card name */}
          <div className="absolute bottom-6 right-6 text-right">
            <p className="text-white font-semibold text-sm leading-tight max-w-[130px]">
              {card.name}
            </p>
          </div>

          {/* Annual fee chip */}
          <div className="absolute top-6 right-12">
            {card.annual_fee === 0 ? (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-700/50
                               px-2 py-0.5 rounded-full font-mono">FREE</span>
            ) : null}
          </div>

          {/* Hover hint */}
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent
                          via-vault-gold/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
        </div>

        {/* ── BACK ────────────────────────────────────────────────────────── */}
        <div className="card-face card-back p-4 flex flex-col">
          <p className="text-vault-gold font-mono text-xs font-semibold mb-2 tracking-wider uppercase">
            Reward Rates
          </p>
          <div className="flex-1 overflow-auto grid grid-cols-2 gap-x-4 gap-y-1.5 content-start">
            {categories.slice(0, 8).map(([cat, rate]) => (
              <div key={cat} className="flex items-center justify-between gap-1">
                <span className="text-vault-muted text-xs flex items-center gap-1">
                  <span>{CATEGORY_ICONS[cat] ?? '💳'}</span>
                  <span className="capitalize">{cat}</span>
                </span>
                <span className={`font-mono text-xs font-bold ${
                  rate >= 4 ? 'text-emerald-400' : rate >= 2 ? 'text-amber-400' : 'text-vault-textDim'
                }`}>
                  {pct(rate)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-vault-border/50 text-xs text-vault-muted font-mono">
            Annual fee: {card.annual_fee === 0 ? (
              <span className="text-emerald-400">₹0 (Lifetime Free)</span>
            ) : (
              <span>₹{new Intl.NumberFormat('en-IN').format(card.annual_fee)}</span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
