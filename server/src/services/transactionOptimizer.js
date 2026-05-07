/**
 * CrediWise Transaction Optimizer — Indian Credit Card Edition
 *
 * For a given transaction: { amount, category, channel, merchant, upi }
 * Returns ranked recommendations across the user's portfolio with:
 * - Accelerated reward matching (SmartBuy, Grab Deals, partner portals)
 * - Online vs Offline differentiation
 * - UPI/RuPay special benefits
 * - Category exclusion warnings
 * - Monthly cap alerts
 * - Milestone proximity tracking
 */

const { CARD_DIRECTORY } = require('../data/cardDirectory');

// Category → channel mapping for auto-detection
const CATEGORY_CHANNEL_MAP = {
  'Food & Dining': 'Dining',
  'Travel': 'Travel',
  'Shopping': 'Online',
  'Entertainment': 'Online',
  'Groceries': 'Grocery',
  'Fuel': 'Fuel',
  'Utilities & Bills': 'Utilities',
  'Rent': 'Rent',
  'Government': 'Government',
  'Insurance': 'Insurance',
  'Education': 'Online',
  'Health & Medical': 'Offline',
};

/**
 * Find the best card for a transaction from user's portfolio
 * @param {Object} params
 * @param {string[]} params.userCards - Array of card names the user holds
 * @param {number} params.amount - Transaction amount in ₹
 * @param {string} params.category - Spend category
 * @param {string} params.channel - "online" | "offline" | "upi" | "portal" (optional)
 * @param {string} params.merchant - Specific merchant name (optional)
 * @param {Object} params.monthlySpends - { cardName: amountSpentThisMonth } for cap tracking (optional)
 * @param {Object} params.cumulativeSpends - { cardName: totalSpend } for milestone tracking (optional)
 */
function optimizeTransaction({
  userCards = [],
  amount,
  category,
  channel = 'online',
  merchant = '',
  monthlySpends = {},
  cumulativeSpends = {},
  userInstruments = []
}) {
  const lowerMerchant = (merchant || '').toLowerCase();
  const lowerChannel = channel.toLowerCase();
  const isUPI = lowerChannel === 'upi';
  const isOnline = lowerChannel === 'online' || lowerChannel === 'portal';
  const isOffline = lowerChannel === 'offline' || lowerChannel === 'pos';

  // Get full card data for user's portfolio
  const portfolio = userCards
    .map(name => CARD_DIRECTORY.find(c => c.name === name))
    .filter(Boolean);

  if (portfolio.length === 0) {
    return {
      recommendations: [],
      message: 'No recognized cards in your portfolio. Please add cards from our directory.'
    };
  }

  const results = portfolio.map(card => {
    const warnings = [];
    let effectiveRate = card.base_reward_rate;
    let matchedAccelerator = null;
    let isExcluded = false;

    // ── 0. Overlay User Context ──
    // If the user has this card in their wallet, they might have custom rates/multipliers
    const userInst = userInstruments.find(ui => {
      const n1 = ui.name.toLowerCase().replace(/ credit card$/, '').trim();
      const n2 = card.name.toLowerCase().replace(/ credit card$/, '').trim();
      return n1 === n2;
    });
    if (userInst) {
      // Use user's custom base rate if provided
      effectiveRate = userInst.base_reward_rate || effectiveRate;

      // Check for category multiplier in user's instrument settings
      const multipliers = userInst.category_multipliers || {};
      const catKey = category.toLowerCase();
      // Try exact match or fuzzy match (e.g. "Food & Dining" -> "food")
      let multiplier = 1;
      if (multipliers instanceof Map) {
        multiplier = multipliers.get(category) || multipliers.get(catKey) || 1;
      } else {
        multiplier = multipliers[category] || multipliers[catKey] || 1;
      }

      if (multiplier > 1) {
        effectiveRate = effectiveRate * multiplier;
        matchedAccelerator = {
          channel: 'User Custom Setting',
          rate_percent: effectiveRate,
          description: `Custom ${multiplier}X multiplier for ${category} set in My Cards`
        };
      }
    }

    // ── 1. Check Exclusions ──
    const exclusionMatch = card.exclusions.find(ex => {
      const lowerEx = ex.toLowerCase();
      return lowerEx.includes(category.toLowerCase()) ||
        (category === 'Utilities & Bills' && lowerEx.includes('utilit')) ||
        (category === 'Fuel' && lowerEx.includes('fuel')) ||
        (lowerMerchant && lowerEx.includes(lowerMerchant));
    });

    if (exclusionMatch) {
      isExcluded = true;
      effectiveRate = 0;
      warnings.push({
        type: 'EXCLUSION',
        severity: 'high',
        message: `⚠️ ${category} is EXCLUDED from earning rewards on ${card.name}. (${exclusionMatch})`
      });
    }

    // ── 2. Third-Party Tieup Match ──
    let tieupMatch = null;
    if (!isExcluded && lowerMerchant && card.third_party_tieups?.length > 0) {
      tieupMatch = card.third_party_tieups.find(t =>
        t.toLowerCase().includes(lowerMerchant) ||
        lowerMerchant.includes(t.toLowerCase())
      );
      if (tieupMatch) {
        // Find a specific accelerator that references this partner/merchant
        const partnerAcc = card.accelerated_rewards.find(a => {
          const ch = a.channel.toLowerCase();
          return ch.includes(lowerMerchant) || ch.includes(tieupMatch.toLowerCase());
        });
        if (partnerAcc) {
          // Card has a dedicated accelerator for this merchant (e.g., Amazon Pay ICICI → "Amazon")
          effectiveRate = partnerAcc.rate_percent;
          matchedAccelerator = {
            ...partnerAcc,
            score: 110
          };
        } else {
          // Tieup exists but no dedicated accelerator — just note it as a partner benefit
          // Don't artificially boost rate, but flag it for the user
          tieupMatch = null; // Let normal accelerator logic handle rate
        }
      }
    }

    // ── 3. Match Accelerated Rewards ──
    if (!isExcluded && !matchedAccelerator && card.accelerated_rewards.length > 0) {
      // Priority: merchant-specific > channel-specific > category-specific > general
      const scoredAccelerators = card.accelerated_rewards.map(acc => {
        const accChannel = acc.channel.toLowerCase();
        let score = 0;

        // Merchant match (e.g., "Flipkart" in Flipkart Axis card)
        if (lowerMerchant && accChannel.includes(lowerMerchant)) score = 100;
        // Merchant matches card's third-party tieups
        else if (lowerMerchant && card.third_party_tieups?.some(t =>
          t.toLowerCase().includes(lowerMerchant) || lowerMerchant.includes(t.toLowerCase())
        )) score = 95;
        // Portal match (e.g., user is on SmartBuy)
        else if (lowerChannel === 'portal' && (accChannel.includes('smartbuy') || accChannel.includes('grab deals'))) score = 90;
        // Direct channel match
        else if (accChannel.includes(lowerChannel)) score = 70;
        // Category match
        else if (accChannel.includes(category.toLowerCase())) score = 60;
        else if (accChannel.includes(CATEGORY_CHANNEL_MAP[category]?.toLowerCase() || '___')) score = 55;
        // Online/Offline differentiation
        else if (isOnline && accChannel.includes('online')) score = 50;
        else if (isOffline && accChannel.includes('offline')) score = 50;
        // UPI
        else if (isUPI && accChannel.includes('upi')) score = 80;
        // "All spends" fallback
        else if (accChannel.includes('all')) score = 10;

        return { ...acc, score };
      });

      scoredAccelerators.sort((a, b) => b.score - a.score);
      const best = scoredAccelerators[0];
      if (best && best.score > 0) {
        effectiveRate = best.rate_percent;
        matchedAccelerator = best;
      }
    }

    // ── 4. UPI Benefits ──
    if (isUPI && card.upi_benefits && !isExcluded) {
      if (!matchedAccelerator || card.upi_benefits.rate_percent > effectiveRate) {
        effectiveRate = card.upi_benefits.rate_percent;
        matchedAccelerator = {
          channel: 'UPI (RuPay)',
          rate_percent: card.upi_benefits.rate_percent,
          description: card.upi_benefits.description
        };
      }
    }

    // ── 5. Calculate rewards ──
    const rewardAmount = (amount * effectiveRate) / 100;

    // ── 6. Monthly Cap Check ──
    let capWarning = null;
    if (card.monthly_caps.length > 0 || (userInst && userInst.reward_cap)) {
      const caps = [...card.monthly_caps];
      if (userInst && userInst.reward_cap) {
        caps.push({ cap_amount: userInst.reward_cap, description: "User-defined monthly cap" });
      }

      for (const cap of caps) {
        const spent = monthlySpends[card.name] || 0;
        if (cap.cap_amount) {
          const remainingCap = cap.cap_amount - spent * (effectiveRate / 100);
          if (rewardAmount > remainingCap && remainingCap > 0) {
            capWarning = {
              type: 'CAP_WARNING',
              severity: 'medium',
              message: `⚡ Monthly cap alert: Only ₹${remainingCap.toFixed(0)} cashback remaining this month (${cap.description})`
            };
            warnings.push(capWarning);
          } else if (remainingCap <= 0) {
            capWarning = {
              type: 'CAP_HIT',
              severity: 'high',
              message: `🚫 Monthly cap REACHED for ${card.name}. (${cap.description}) — No additional rewards this month.`
            };
            warnings.push(capWarning);
            // Don't zero out — user may still want to see the theoretical rate
          }
        }
      }
    }

    // ── 6. Milestone Tracking ──
    let milestoneInfo = null;
    if (card.milestone_tiers.length > 0) {
      const cumulative = cumulativeSpends[card.name] || 0;
      const newCumulative = cumulative + amount;

      for (const tier of card.milestone_tiers) {
        if (cumulative < tier.spend && newCumulative >= tier.spend) {
          milestoneInfo = {
            triggered: true,
            tier,
            message: `🎉 This purchase crosses the ₹${(tier.spend / 100000).toFixed(1)}L milestone! You unlock: ${tier.reward}`
          };
          break;
        } else if (cumulative < tier.spend) {
          const remaining = tier.spend - cumulative;
          milestoneInfo = {
            triggered: false,
            tier,
            remaining,
            message: `📊 ₹${(remaining / 1000).toFixed(0)}K more to unlock: ${tier.reward}`
          };
          break;
        }
      }
    }

    return {
      card: {
        name: card.name,
        bank: card.bank,
        network: card.network
      },
      effectiveRate,
      rewardAmount: parseFloat(rewardAmount.toFixed(2)),
      matchedAccelerator,
      isExcluded,
      milestoneInfo,
      warnings,
      explanation: buildExplanation(card, amount, effectiveRate, matchedAccelerator, isExcluded, category, channel)
    };
  });

  // Sort: non-excluded first, then by reward amount
  results.sort((a, b) => {
    if (a.isExcluded && !b.isExcluded) return 1;
    if (!a.isExcluded && b.isExcluded) return -1;
    return b.rewardAmount - a.rewardAmount;
  });

  // Mark best
  const nonExcluded = results.filter(r => !r.isExcluded);
  if (nonExcluded.length > 0) {
    nonExcluded[0].isBest = true;
  }

  return { recommendations: results };
}

function buildExplanation(card, amount, effectiveRate, accelerator, isExcluded, category, channel) {
  if (isExcluded) {
    return `${category} is excluded from rewards on ${card.name}. Use a different card for this category.`;
  }

  let explanation = `**${card.name}** earns **${effectiveRate}%** = **₹${(amount * effectiveRate / 100).toFixed(2)}** on this ₹${amount} transaction.`;

  if (accelerator) {
    explanation += ` (via ${accelerator.channel}: ${accelerator.description})`;
  }

  return explanation;
}

/**
 * Portfolio Audit — Compare user's cards against market leaders
 */
function auditPortfolio({ userCards = [], monthlyProfile = {}, userInstruments = [] }) {
  const portfolio = userCards
    .map(name => CARD_DIRECTORY.find(c => c.name === name))
    .filter(Boolean);

  const allCards = CARD_DIRECTORY;

  // Categories from monthly profile
  const categories = Object.keys(monthlyProfile);
  const findings = [];
  const suggestions = [];

  // For each spend category, find the best card in user's portfolio vs market best
  for (const [category, amount] of Object.entries(monthlyProfile)) {
    if (amount <= 0) continue;

    const channel = CATEGORY_CHANNEL_MAP[category] || 'online';

    // Best in portfolio
    const portfolioResults = portfolio.map(card => {
      let rate = card.base_reward_rate;
      
      // Overlay user context
      const userInst = userInstruments.find(ui => {
        const n1 = ui.name.toLowerCase().replace(/ credit card$/, '').trim();
        const n2 = card.name.toLowerCase().replace(/ credit card$/, '').trim();
        return n1 === n2;
      });
      if (userInst) {
        rate = userInst.base_reward_rate || rate;
        const multipliers = userInst.category_multipliers || {};
        const mult = (multipliers instanceof Map) ? (multipliers.get(category) || 1) : (multipliers[category] || 1);
        rate = rate * mult;
      }

      const match = card.accelerated_rewards.find(a =>
        a.channel.toLowerCase().includes(channel.toLowerCase()) ||
        a.channel.toLowerCase().includes(category.toLowerCase()) ||
        a.channel.toLowerCase().includes('online')
      );
      if (match) rate = match.rate_percent;
      // Check exclusion
      const excluded = card.exclusions.some(e => e.toLowerCase().includes(category.toLowerCase()));
      return { card, rate: excluded ? 0 : rate, excluded };
    }).sort((a, b) => b.rate - a.rate);

    const bestInPortfolio = portfolioResults[0];

    // Best in market
    const marketResults = allCards.map(card => {
      let rate = card.base_reward_rate;
      const match = card.accelerated_rewards.find(a =>
        a.channel.toLowerCase().includes(channel.toLowerCase()) ||
        a.channel.toLowerCase().includes(category.toLowerCase()) ||
        a.channel.toLowerCase().includes('online')
      );
      if (match) rate = match.rate_percent;
      const excluded = card.exclusions.some(e => e.toLowerCase().includes(category.toLowerCase()));
      return { card, rate: excluded ? 0 : rate, excluded };
    }).sort((a, b) => b.rate - a.rate);

    const bestInMarket = marketResults[0];

    const monthlyRewardPortfolio = amount * (bestInPortfolio?.rate || 0) / 100;
    const monthlyRewardMarket = amount * (bestInMarket?.rate || 0) / 100;
    const gap = monthlyRewardMarket - monthlyRewardPortfolio;

    findings.push({
      category,
      monthlySpend: amount,
      bestCard: bestInPortfolio?.card?.name || 'N/A',
      bestRate: bestInPortfolio?.rate || 0,
      monthlyReward: parseFloat(monthlyRewardPortfolio.toFixed(2)),
      marketBest: bestInMarket?.card?.name,
      marketRate: bestInMarket?.rate || 0,
      marketReward: parseFloat(monthlyRewardMarket.toFixed(2)),
      gap: parseFloat(gap.toFixed(2)),
      isOptimal: gap < 1 // Less than ₹1/month difference
    });

    if (gap > 50 && !userCards.includes(bestInMarket?.card?.name)) {
      suggestions.push({
        category,
        currentCard: bestInPortfolio?.card?.name,
        currentRate: bestInPortfolio?.rate,
        suggestedCard: bestInMarket?.card?.name,
        suggestedRate: bestInMarket?.rate,
        monthlySavings: parseFloat(gap.toFixed(2)),
        annualSavings: parseFloat((gap * 12).toFixed(2)),
        reason: `Switch to **${bestInMarket?.card?.name}** for ${category} — earns ${bestInMarket?.rate}% vs your current ${bestInPortfolio?.rate}%. Save ₹${(gap * 12).toFixed(0)}/year.`
      });
    }
  }

  // Milestone recommendations
  const milestoneAdvice = portfolio
    .filter(c => c.milestone_tiers.length > 0)
    .map(card => ({
      card: card.name,
      milestones: card.milestone_tiers,
      advice: `Track your spend on ${card.name}. Milestones: ${card.milestone_tiers.map(t => `₹${(t.spend / 100000).toFixed(1)}L → ${t.reward}`).join(' | ')}`
    }));

  // Total portfolio stats
  const totalMonthlySpend = Object.values(monthlyProfile).reduce((s, v) => s + v, 0);
  const totalMonthlyReward = findings.reduce((s, f) => s + f.monthlyReward, 0);
  const totalMarketOptimal = findings.reduce((s, f) => s + f.marketReward, 0);

  return {
    summary: {
      cardsInPortfolio: portfolio.length,
      totalMonthlySpend,
      currentMonthlyRewards: parseFloat(totalMonthlyReward.toFixed(2)),
      optimalMonthlyRewards: parseFloat(totalMarketOptimal.toFixed(2)),
      monthlyGap: parseFloat((totalMarketOptimal - totalMonthlyReward).toFixed(2)),
      annualGap: parseFloat(((totalMarketOptimal - totalMonthlyReward) * 12).toFixed(2)),
      overallRewardRate: totalMonthlySpend > 0
        ? parseFloat((totalMonthlyReward / totalMonthlySpend * 100).toFixed(2))
        : 0
    },
    findings,
    suggestions,
    milestoneAdvice
  };
}

/**
 * Get all available cards in directory
 */
function getCardDirectory() {
  return CARD_DIRECTORY.map(c => ({
    name: c.name,
    bank: c.bank,
    network: c.network,
    base_reward_rate: c.base_reward_rate,
    annual_fee_inr: c.annual_fee_inr,
    best_for: c.best_for,
    has_upi_benefits: !!c.upi_benefits
  }));
}

module.exports = { optimizeTransaction, auditPortfolio, getCardDirectory, CARD_DIRECTORY };

