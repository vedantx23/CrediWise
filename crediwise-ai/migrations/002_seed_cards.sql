-- Migration 002: Seed 16 Indian Credit Cards
-- Effective Reward Rate (ERR) = (points_per_spend * point_value_paise / spend_unit_paise) * 100
-- All rates are post-GST where applicable. Sources: public bank websites / T&C docs.

INSERT OR IGNORE INTO cards VALUES
-- card_id, bank, name, annual_fee, fee_waiver_spend, lounge_domestic, lounge_intl,
-- forex_markup_pct, interest_rate_monthly, min_income_annual, min_cibil,
-- is_invite_only, is_lifetime_free, is_customizable, joining_fee, card_network, created_at, updated_at

-- ── HDFC ────────────────────────────────────────────────────────────────────
('hdfc_regalia',   'HDFC Bank',  'HDFC Regalia',
 2500, 300000,  6,  6,  2.0, 3.49, 600000,  700, 0, 0, 0, 2500,  'Visa',       datetime('now'), datetime('now')),

('hdfc_millennia', 'HDFC Bank',  'HDFC Millennia',
 1000, 100000,  8,  0,  3.5, 3.49, 420000,  700, 0, 0, 0, 1000,  'Mastercard', datetime('now'), datetime('now')),

('hdfc_infinia',   'HDFC Bank',  'HDFC Infinia',
 10000, 1000000, 99, 99, 2.0, 3.49, 1500000, 750, 1, 0, 0, 10000, 'Visa',      datetime('now'), datetime('now')),

-- ── ICICI ────────────────────────────────────────────────────────────────────
('icici_amazon',   'ICICI Bank', 'ICICI Amazon Pay',
 0,    0,       0,  0,  3.5, 3.40, 300000,  700, 0, 1, 0, 0,     'Visa',       datetime('now'), datetime('now')),

('icici_coral',    'ICICI Bank', 'ICICI Coral',
 500,  150000,  2,  0,  3.5, 3.40, 300000,  700, 0, 0, 0, 0,     'Visa',       datetime('now'), datetime('now')),

-- ── AXIS ────────────────────────────────────────────────────────────────────
('axis_ace',       'Axis Bank',  'Axis Ace',
 499,  200000,  4,  0,  3.5, 3.49, 240000,  700, 0, 0, 0, 0,     'Visa',       datetime('now'), datetime('now')),

('axis_flipkart',  'Axis Bank',  'Axis Flipkart',
 500,  200000,  4,  0,  3.5, 3.49, 300000,  700, 0, 0, 0, 500,   'Visa',       datetime('now'), datetime('now')),

-- ── SBI ─────────────────────────────────────────────────────────────────────
('sbi_simplyclick','SBI Card',   'SBI SimplyCLICK',
 499,  100000,  0,  0,  3.5, 3.35, 300000,  700, 0, 0, 0, 499,   'Visa',       datetime('now'), datetime('now')),

('sbi_elite',      'SBI Card',   'SBI Elite',
 4999, 1000000, 8,  6,  1.99,3.35, 600000,  750, 0, 0, 0, 4999,  'Mastercard', datetime('now'), datetime('now')),

-- ── AMEX ────────────────────────────────────────────────────────────────────
('amex_mrcc',      'Amex',       'Amex Membership Rewards Credit Card',
 1000, 0,       0,  0,  3.5, 3.50, 600000,  700, 0, 0, 0, 0,     'Amex',       datetime('now'), datetime('now')),

('amex_gold',      'Amex',       'Amex Gold Card',
 4500, 0,       0,  0,  3.5, 3.50, 600000,  750, 0, 0, 0, 0,     'Amex',       datetime('now'), datetime('now')),

-- ── KOTAK ────────────────────────────────────────────────────────────────────
('kotak_811',      'Kotak',      'Kotak 811 Dream Different',
 0,    0,       0,  0,  3.5, 3.50, 200000,  650, 0, 1, 0, 0,     'Visa',       datetime('now'), datetime('now')),

('kotak_league',   'Kotak',      'Kotak League Platinum',
 499,  50000,   8,  0,  3.5, 3.50, 300000,  700, 0, 0, 0, 499,   'Mastercard', datetime('now'), datetime('now')),

-- ── INDUSIND ─────────────────────────────────────────────────────────────────
('indusind_platinum','IndusInd Bank','IndusInd Platinum',
 999,  150000,  8,  0,  3.5, 3.49, 300000,  700, 0, 0, 0, 0,     'Visa',       datetime('now'), datetime('now')),

('indusind_legend', 'IndusInd Bank','IndusInd Legend',
 3999, 800000,  16, 8,  2.0, 3.49, 600000,  750, 0, 0, 0, 3999,  'Mastercard', datetime('now'), datetime('now')),

-- ── AU ───────────────────────────────────────────────────────────────────────
('au_lit',         'AU Small Finance Bank','AU LIT',
 499,  100000,  4,  0,  3.5, 3.49, 300000,  700, 0, 0, 1, 499,   'Visa',       datetime('now'), datetime('now'));


-- ── REWARD CATEGORIES ────────────────────────────────────────────────────────
-- ERR formula used: e.g., HDFC Regalia 4pts/₹150, 1pt=₹0.50 → 4*50/15000*100=1.33%
-- "dining" "fuel" "grocery" "travel" "online" "utilities" "international" "other"

-- HDFC Regalia (4x pts/₹150, 1pt=₹0.50 = 1.33% base; 5x on dining/travel = 1.67%)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('hdfc_regalia','dining',      1.67, NULL, '5x pts/₹150 @ ₹0.50/pt'),
('hdfc_regalia','fuel',        1.33, NULL, '4x pts; 1% fuel surcharge waived'),
('hdfc_regalia','grocery',     1.33, NULL, '4x pts/₹150'),
('hdfc_regalia','travel',      1.67, NULL, '5x on flights/hotels'),
('hdfc_regalia','online',      1.33, NULL, '4x pts/₹150'),
('hdfc_regalia','utilities',   1.33, NULL, '4x pts/₹150'),
('hdfc_regalia','international',2.00, NULL,'4x pts + no forex benefit'),
('hdfc_regalia','other',       1.33, NULL, '4x pts/₹150');

-- HDFC Millennia (5% cashback on select; 1% others; cashback as CashPoints)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('hdfc_millennia','dining',    5.00, 750,  '5% cashback (Swiggy/Zomato)'),
('hdfc_millennia','fuel',      1.00, NULL, '1% CashPoints'),
('hdfc_millennia','grocery',   5.00, 750,  '5% cashback (BigBasket, Grofers)'),
('hdfc_millennia','travel',    5.00, 750,  '5% on MakeMyTrip, Ola'),
('hdfc_millennia','online',    5.00, 750,  '5% on Amazon/Flipkart/Myntra'),
('hdfc_millennia','utilities', 1.00, NULL, '1% CashPoints'),
('hdfc_millennia','international',1.00,NULL,'1% CashPoints'),
('hdfc_millennia','other',     1.00, NULL, '1% CashPoints');

-- HDFC Infinia (5x pts/₹150, 1pt=₹1 = 3.33% base; 10x on SmartBuy = 6.67%)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('hdfc_infinia','dining',      5.00, NULL, '5x pts/₹150, 1pt=₹1 via SmartBuy'),
('hdfc_infinia','fuel',        3.33, NULL, '5x pts/₹150, 1pt=₹1'),
('hdfc_infinia','grocery',     3.33, NULL, '5x pts/₹150, 1pt=₹1'),
('hdfc_infinia','travel',      6.67, NULL, '10x via HDFC SmartBuy travel portal'),
('hdfc_infinia','online',      6.67, NULL, '10x on select partners via SmartBuy'),
('hdfc_infinia','utilities',   3.33, NULL, '5x pts/₹150'),
('hdfc_infinia','international',3.33,NULL, '5x pts + 2% forex'),
('hdfc_infinia','other',       3.33, NULL, '5x pts/₹150, 1pt=₹1');

-- ICICI Amazon Pay (5% Amazon Prime; 2% on others for Prime; 1% on rest)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('icici_amazon','dining',      2.00, NULL, '2% cashback (Prime member)'),
('icici_amazon','fuel',        1.00, NULL, '1% + 1% fuel surcharge waiver'),
('icici_amazon','grocery',     2.00, NULL, '2% cashback (Prime)'),
('icici_amazon','travel',      2.00, NULL, '2% cashback (Prime)'),
('icici_amazon','online',      5.00, NULL, '5% on Amazon.in (Prime member)'),
('icici_amazon','utilities',   1.00, NULL, '1% cashback'),
('icici_amazon','international',1.00,NULL, '1% cashback'),
('icici_amazon','other',       1.00, NULL, '1% cashback (non-Prime 0.5%)');

-- ICICI Coral (2x on dining/entertainment = 0.50% ERR; 1x others)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('icici_coral','dining',       1.00, NULL, '2x PAYBACK pts/₹100, 1pt=₹0.50'),
('icici_coral','fuel',         0.50, NULL, '1x pts; 1% surcharge waiver'),
('icici_coral','grocery',      0.50, NULL, '1x pts/₹100'),
('icici_coral','travel',       1.00, NULL, '2x on travel bookings'),
('icici_coral','online',       0.50, NULL, '1x pts/₹100'),
('icici_coral','utilities',    0.50, NULL, '1x pts/₹100'),
('icici_coral','international',0.50,NULL,  '1x pts/₹100'),
('icici_coral','other',        0.50, NULL, '1x pts/₹100');

-- Axis Ace (5% Google Pay; 4% dining/Swiggy/Ola; 2% all else)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('axis_ace','dining',          4.00, NULL, '4% cashback on Swiggy/Zomato/Ola'),
('axis_ace','fuel',            2.00, NULL, '2% cashback + 1% surcharge waiver'),
('axis_ace','grocery',         2.00, NULL, '2% cashback'),
('axis_ace','travel',          2.00, NULL, '2% cashback (4% on Ola)'),
('axis_ace','online',          2.00, NULL, '2% cashback'),
('axis_ace','utilities',       5.00, NULL, '5% via Google Pay (recharge/bills)'),
('axis_ace','international',   2.00, NULL, '2% cashback'),
('axis_ace','other',           2.00, NULL, '2% cashback on all others');

-- Axis Flipkart (5% Flipkart; 4% preferred; 1.5% all)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('axis_flipkart','dining',     4.00, NULL, '4% on preferred merchants'),
('axis_flipkart','fuel',       1.50, NULL, '1.5% cashback'),
('axis_flipkart','grocery',    4.00, NULL, '4% on BigBasket'),
('axis_flipkart','travel',     4.00, NULL, '4% on preferred travel partners'),
('axis_flipkart','online',     5.00, NULL, '5% on Flipkart/Myntra/2GUD'),
('axis_flipkart','utilities',  1.50, NULL, '1.5% cashback'),
('axis_flipkart','international',1.50,NULL,'1.5% cashback'),
('axis_flipkart','other',      1.50, NULL, '1.5% cashback on all others');

-- SBI SimplyCLICK (10x Amazon/BookMyShow=2.5%; 5x dining/entertainment=1.25%; 1x others=0.25%)
-- 1 point = ₹0.25; spend unit ₹100 → base 1x=0.25%
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('sbi_simplyclick','dining',   1.25, NULL, '5x pts/₹100, 1pt=₹0.25'),
('sbi_simplyclick','fuel',     0.25, NULL, '1x pts/₹100; surcharge waiver'),
('sbi_simplyclick','grocery',  0.25, NULL, '1x pts/₹100'),
('sbi_simplyclick','travel',   0.25, NULL, '1x pts (10x on certain OTAs)'),
('sbi_simplyclick','online',   2.50, NULL, '10x on Amazon/Cleartrip/BookMyShow'),
('sbi_simplyclick','utilities',0.25, NULL, '1x pts/₹100'),
('sbi_simplyclick','international',0.25,NULL,'1x pts/₹100'),
('sbi_simplyclick','other',    0.25, NULL, '1x pts/₹100');

-- SBI Elite (5x dining/grocery/dept = 1.25%; 2x others = 0.50%)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('sbi_elite','dining',         2.50, NULL, '5x pts/₹100, 1pt=₹0.50 (Elite benefit)'),
('sbi_elite','fuel',           1.00, NULL, '2x pts/₹100'),
('sbi_elite','grocery',        2.50, NULL, '5x pts/₹100 on dept stores'),
('sbi_elite','travel',         1.00, NULL, '2x pts/₹100'),
('sbi_elite','online',         1.00, NULL, '2x pts/₹100'),
('sbi_elite','utilities',      1.00, NULL, '2x pts/₹100'),
('sbi_elite','international',  1.00, NULL, '2x pts + 1.99% forex'),
('sbi_elite','other',          1.00, NULL, '2x pts/₹100');

-- Amex MRCC (1pt/₹50; 18x on partner merchants; 1pt~₹0.40 avg for Gold Collection)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('amex_mrcc','dining',         4.00, NULL, '18x on partner restaurants, 1pt~₹0.40'),
('amex_mrcc','fuel',           0.80, NULL, '1pt/₹50, 1pt~₹0.40'),
('amex_mrcc','grocery',        0.80, NULL, '1pt/₹50, 1pt~₹0.40'),
('amex_mrcc','travel',         0.80, NULL, '1pt/₹50; bonus on Amex Travel'),
('amex_mrcc','online',         0.80, NULL, '1pt/₹50'),
('amex_mrcc','utilities',      0.80, NULL, '1pt/₹50'),
('amex_mrcc','international',  0.80, NULL, '1pt/₹50'),
('amex_mrcc','other',          0.80, NULL, '1pt/₹50');

-- Amex Gold (3x dining=2.4%; 2x grocery=1.6%; 1x others=0.80%)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('amex_gold','dining',         4.80, NULL, '3x Membership Rewards, 1pt~₹0.80 avg transfer'),
('amex_gold','fuel',           0.80, NULL, '1x pts/₹50, 1pt~₹0.80'),
('amex_gold','grocery',        1.60, NULL, '2x pts/₹50 on supermarkets'),
('amex_gold','travel',         2.40, NULL, '3x on Amex Travel; transfer to airlines'),
('amex_gold','online',         0.80, NULL, '1x pts/₹50'),
('amex_gold','utilities',      0.80, NULL, '1x pts/₹50'),
('amex_gold','international',  0.80, NULL, '1x pts + Amex global offers'),
('amex_gold','other',          0.80, NULL, '1x pts/₹50');

-- Kotak 811 (2% online; 1% all others — direct cashback)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('kotak_811','dining',         1.00, NULL, '1% cashback'),
('kotak_811','fuel',           1.00, 500,  '1% cashback; ₹500/month cap'),
('kotak_811','grocery',        1.00, NULL, '1% cashback'),
('kotak_811','travel',         1.00, NULL, '1% cashback'),
('kotak_811','online',         2.00, 500,  '2% cashback on online transactions'),
('kotak_811','utilities',      1.00, NULL, '1% cashback'),
('kotak_811','international',  1.00, NULL, '1% cashback'),
('kotak_811','other',          1.00, NULL, '1% cashback');

-- Kotak League Platinum (8x dining/movies=4%; 4x others=2%; 1pt=₹0.50)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('kotak_league','dining',      4.00, NULL, '8x pts/₹100, 1pt=₹0.50'),
('kotak_league','fuel',        2.00, NULL, '4x pts; 1% surcharge waiver'),
('kotak_league','grocery',     2.00, NULL, '4x pts/₹100'),
('kotak_league','travel',      4.00, NULL, '8x on travel (movies/entertainment)'),
('kotak_league','online',      4.00, NULL, '8x on select online merchants'),
('kotak_league','utilities',   2.00, NULL, '4x pts/₹100'),
('kotak_league','international',2.00,NULL, '4x pts/₹100'),
('kotak_league','other',       2.00, NULL, '4x pts/₹100');

-- IndusInd Platinum (1.5x=0.75% on all; reward rate is low)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('indusind_platinum','dining',   1.50, NULL,'Accelerated 3x on dining (some variants)'),
('indusind_platinum','fuel',     0.75, NULL,'1.5x pts/₹150, 1pt=₹0.75'),
('indusind_platinum','grocery',  0.75, NULL,'1.5x pts/₹150'),
('indusind_platinum','travel',   0.75, NULL,'1.5x pts/₹150'),
('indusind_platinum','online',   0.75, NULL,'1.5x pts/₹150'),
('indusind_platinum','utilities',0.75, NULL,'1.5x pts/₹150'),
('indusind_platinum','international',0.75,NULL,'1.5x pts + 3.5% forex'),
('indusind_platinum','other',    0.75, NULL,'1.5x pts/₹150');

-- IndusInd Legend (2x all=1.5%; 4x dining/travel=3%)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('indusind_legend','dining',     3.00, NULL,'4x pts/₹150, 1pt=₹1.12 avg'),
('indusind_legend','fuel',       1.50, NULL,'2x pts/₹150'),
('indusind_legend','grocery',    1.50, NULL,'2x pts/₹150'),
('indusind_legend','travel',     3.00, NULL,'4x pts on travel; Priority Pass'),
('indusind_legend','online',     1.50, NULL,'2x pts/₹150'),
('indusind_legend','utilities',  1.50, NULL,'2x pts/₹150'),
('indusind_legend','international',3.00,NULL,'4x pts + 2% forex markup'),
('indusind_legend','other',      1.50, NULL,'2x pts/₹150');

-- AU LIT (customizable: base 1%; with dining module +5%; with fuel +5%)
INSERT OR IGNORE INTO reward_categories(card_id,category,rate_percent,monthly_cap_inr,notes) VALUES
('au_lit','dining',     5.00, 1000, 'With Dining feature enabled (+₹299/quarter)'),
('au_lit','fuel',       5.00, 500,  'With Fuel feature enabled (+₹99/quarter)'),
('au_lit','grocery',    1.00, NULL, 'Base cashback'),
('au_lit','travel',     1.00, NULL, 'Base cashback (upgrade for more)'),
('au_lit','online',     2.00, NULL, 'With OTT/Online feature module'),
('au_lit','utilities',  1.00, NULL, 'Base cashback'),
('au_lit','international',1.00,NULL,'Base cashback'),
('au_lit','other',      1.00, NULL, 'Base 1% on all spends');

-- Mark migration as applied
INSERT OR IGNORE INTO schema_migrations(version) VALUES (2);
