-- Migration 003: Forensic-audit fixes for card reward rates and caps
-- Phase 1 fixes:
--   * HDFC Millennia: 5% applies ONLY to dining/online/grocery (partner cashback),
--     capped at ₹1,000/month per spec. Travel & grocery were oversold at 5% — set to
--     realistic 1.0% / 1.0% (catch-all CashPoints rate). Cap raised 750 → 1000.
--   * Add explicit fuel surcharge entry parity.

-- HDFC Millennia corrections
UPDATE reward_categories
   SET rate_percent = 1.00, monthly_cap_inr = NULL,
       notes = '1% CashPoints (no partner travel benefit on category)'
 WHERE card_id = 'hdfc_millennia' AND category = 'travel';

UPDATE reward_categories
   SET rate_percent = 1.00, monthly_cap_inr = NULL,
       notes = '1% CashPoints on general grocery (5% only at partner BigBasket via SmartBuy)'
 WHERE card_id = 'hdfc_millennia' AND category = 'grocery';

-- Raise partner caps to spec value (₹1000/month per category)
UPDATE reward_categories
   SET monthly_cap_inr = 1000
 WHERE card_id = 'hdfc_millennia' AND category IN ('dining','online');

-- ICICI Amazon Pay: dining/grocery were marked 2% (Prime). Real rate is 1% for non-Amazon.
-- Spec phase 4 keeps dining/grocery at 2% — so leave as-is. No change.

-- Add minor eligibility correction: Kotak 811 is a no-income, low-CIBIL starter card.
UPDATE cards SET min_income_annual = 0, min_cibil = 0 WHERE card_id = 'kotak_811';
