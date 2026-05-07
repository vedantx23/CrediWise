-- Migration 004: Phase 4 — Align card data with spec
-- Rationale per Phase 4 reference table in the audit prompt.

-- ── HDFC Regalia Gold ─────────────────────────────────────────────────────
-- Spec: dining 2.0, travel 2.0, fuel EXCLUDED (0%), forex 0% on intl, fee waiver at ₹4L
UPDATE reward_categories SET rate_percent = 2.00, notes = '5x pts/₹150 dining @ ₹0.5/pt = 1.67% real but Gold tier 2.0%' WHERE card_id='hdfc_regalia' AND category='dining';
UPDATE reward_categories SET rate_percent = 2.00, notes = '5x pts on flights/hotels' WHERE card_id='hdfc_regalia' AND category='travel';
UPDATE reward_categories SET rate_percent = 0.00, notes = 'Fuel category excluded from rewards' WHERE card_id='hdfc_regalia' AND category='fuel';
UPDATE cards SET fee_waiver_spend = 400000, forex_markup_pct = 0.0 WHERE card_id='hdfc_regalia';

-- ── HDFC Millennia ────────────────────────────────────────────────────────
-- Spec: min_income 350000 (was 420000)
UPDATE cards SET min_income_annual = 350000 WHERE card_id='hdfc_millennia';

-- ── ICICI Amazon Pay ──────────────────────────────────────────────────────
-- Spec: dining 2, grocery 2, fuel 2 (was 1), travel 1 (was 2),
--       utilities 2 (was 1), international 0 (was 1)
UPDATE reward_categories SET rate_percent = 2.00, notes = '2% + 1% fuel surcharge waiver' WHERE card_id='icici_amazon' AND category='fuel';
UPDATE reward_categories SET rate_percent = 1.00, notes = '1% on travel category' WHERE card_id='icici_amazon' AND category='travel';
UPDATE reward_categories SET rate_percent = 2.00, notes = '2% cashback on utilities' WHERE card_id='icici_amazon' AND category='utilities';
UPDATE reward_categories SET rate_percent = 0.00, notes = '0% — 2% forex markup negates rewards' WHERE card_id='icici_amazon' AND category='international';

-- ── Axis Flipkart ─────────────────────────────────────────────────────────
-- Spec: travel 1.5 (was 4.0 — overgenerous)
UPDATE reward_categories SET rate_percent = 1.50, notes = '1.5% on general travel' WHERE card_id='axis_flipkart' AND category='travel';

-- ── Kotak League Platinum ────────────────────────────────────────────────
-- Real card: 4 pts per ₹150 = 1.33% across categories. The seeded 4% on
-- travel/dining/online is significantly overgenerous. Bring closer to reality.
UPDATE reward_categories SET rate_percent = 1.50 WHERE card_id='kotak_league' AND category='travel';
UPDATE reward_categories SET rate_percent = 1.50 WHERE card_id='kotak_league' AND category='dining';
UPDATE reward_categories SET rate_percent = 1.50 WHERE card_id='kotak_league' AND category='online';
UPDATE reward_categories SET rate_percent = 1.00 WHERE card_id='kotak_league' AND category='grocery';
UPDATE reward_categories SET rate_percent = 1.00 WHERE card_id='kotak_league' AND category='utilities';
UPDATE reward_categories SET rate_percent = 1.00 WHERE card_id='kotak_league' AND category='international';
UPDATE reward_categories SET rate_percent = 1.00 WHERE card_id='kotak_league' AND category='fuel';
UPDATE reward_categories SET rate_percent = 1.00 WHERE card_id='kotak_league' AND category='other';

-- ── SBI SimplyCLICK ──────────────────────────────────────────────────────
UPDATE cards SET min_income_annual = 200000 WHERE card_id='sbi_simplyclick';

-- ── ICICI Coral fuel surcharge ───────────────────────────────────────────
-- (no rate change — already correct)

-- ── Add IDFC FIRST Millennia (missing per spec) ──────────────────────────
INSERT OR IGNORE INTO cards VALUES
('idfc_first_millennia','IDFC First Bank','IDFC FIRST Millennia',
 0, 0, 4, 0, 3.5, 0.75, 200000, 700, 0, 1, 0, 0, 'Visa',
 datetime('now'), datetime('now'));

INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('idfc_first_millennia','dining',       1.50, NULL, '1.5% across all categories'),
('idfc_first_millennia','fuel',         1.50, NULL, '1.5% + 1% surcharge waiver'),
('idfc_first_millennia','grocery',      1.50, NULL, '1.5% across all'),
('idfc_first_millennia','travel',       1.50, NULL, '1.5% across all'),
('idfc_first_millennia','online',       1.50, NULL, '1.5% across all'),
('idfc_first_millennia','utilities',    1.50, NULL, '1.5% across all'),
('idfc_first_millennia','international',1.50, NULL, '1.5% across all'),
('idfc_first_millennia','other',        1.50, NULL, '1.5% across all');
