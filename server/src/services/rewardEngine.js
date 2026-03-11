/**
 * CrediWise Reward Engine
 * 
 * For each payment instrument:
 * 1. Get user's cumulative spend on that instrument
 * 2. Apply category multiplier
 * 3. Calculate raw rewards (amount × rate% × multiplier)
 * 4. Check milestone: does this purchase cross the threshold?
 * 5. Apply reward cap if configured
 * 6. Convert to monetary value (raw_rewards × redemption_value)
 * 7. Build explainability breakdown
 * 8. Sort by monetary value (composite score)
 */

const InstrumentRepository = require('../repositories/InstrumentRepository');
const ExpenseRepository = require('../repositories/ExpenseRepository');

async function calculateRecommendations(userId, amount, category) {
  const instruments = await InstrumentRepository.findAllByUserId(userId);

  if (instruments.length === 0) {
    return { recommendations: [], message: 'No payment instruments found. Add a card first.' };
  }

  const results = await Promise.all(instruments.map(async (inst) => {
    const multipliers = inst.category_multipliers || {};
    const categoryMult = multipliers[category] || 1;

    // Raw rewards for this transaction
    let rawRewards = amount * (inst.base_reward_rate / 100) * categoryMult;

    // Get cumulative spend on this instrument (all time)
    const cumulativeSpend = await ExpenseRepository.sumAmountByInstrument(userId, inst.id);

    const newCumulativeSpend = cumulativeSpend + amount;

    // Milestone check
    let milestoneBonus = 0;
    let milestoneTriggered = false;
    if (inst.milestone_threshold && inst.milestone_bonus) {
      // Calculate how many completed milestones before and after
      const milestonesBeforeCount = Math.floor(cumulativeSpend / inst.milestone_threshold);
      const milestonesAfterCount = Math.floor(newCumulativeSpend / inst.milestone_threshold);
      if (milestonesAfterCount > milestonesBeforeCount) {
        milestoneBonus = (milestonesAfterCount - milestonesBeforeCount) * inst.milestone_bonus;
        milestoneTriggered = true;
      }
    }

    // Apply reward cap (before milestone bonus)
    let capApplied = false;
    if (inst.reward_cap && rawRewards > inst.reward_cap) {
      rawRewards = inst.reward_cap;
      capApplied = true;
    }

    // Monetary value
    const baseMonetaryValue = rawRewards * inst.redemption_value;
    const totalMonetaryValue = baseMonetaryValue + milestoneBonus;

    // Milestone progress
    const milestoneProgress = inst.milestone_threshold
      ? {
          currentSpend: parseFloat(cumulativeSpend.toFixed(2)),
          afterThisSpend: parseFloat(newCumulativeSpend.toFixed(2)),
          threshold: inst.milestone_threshold,
          percentBefore: Math.min((cumulativeSpend / inst.milestone_threshold) * 100, 100),
          percentAfter: Math.min((newCumulativeSpend / inst.milestone_threshold) * 100, 100),
        }
      : null;

    // Explainability breakdown
    const explanation = {
      steps: [
        {
          label: 'Transaction Amount',
          value: `₹${amount.toFixed(2)}`,
          detail: ''
        },
        {
          label: 'Base Reward Rate',
          value: `${inst.base_reward_rate}%`,
          detail: `Earns ${inst.base_reward_rate} points per ₹100 spent`
        },
        {
          label: 'Category Multiplier',
          value: `${categoryMult}×`,
          detail: categoryMult > 1
            ? `${category} category gets a ${categoryMult}× bonus on this card`
            : `No special multiplier for ${category} on this card`
        },
        {
          label: 'Raw Rewards',
          value: `${parseFloat(rawRewards.toFixed(2))} pts`,
          detail: capApplied
            ? `Capped at ${inst.reward_cap} pts (reward cap applied)`
            : `= ₹${amount} × ${inst.base_reward_rate / 100} × ${categoryMult}`
        },
        {
          label: 'Redemption Value',
          value: `1 pt = ₹${inst.redemption_value}`,
          detail: 'Point-to-currency conversion rate for this card'
        },
        {
          label: 'Rewards Value',
          value: `₹${baseMonetaryValue.toFixed(2)}`,
          detail: `${rawRewards.toFixed(2)} pts × ₹${inst.redemption_value}`
        }
      ]
    };

    if (milestoneTriggered) {
      explanation.steps.push({
        label: '🎉 Milestone Bonus',
        value: `+ ₹${milestoneBonus.toFixed(2)}`,
        detail: `This purchase crosses your ₹${inst.milestone_threshold} milestone threshold!`
      });
    } else if (inst.milestone_threshold) {
      const remaining = inst.milestone_threshold - (cumulativeSpend % inst.milestone_threshold);
      explanation.steps.push({
        label: 'Milestone Progress',
        value: `₹${remaining.toFixed(2)} away`,
        detail: `Spend ₹${remaining.toFixed(2)} more to unlock the ₹${inst.milestone_bonus} milestone bonus`
      });
    }

    explanation.steps.push({
      label: 'Total Savings',
      value: `₹${totalMonetaryValue.toFixed(2)}`,
      detail: milestoneBonus > 0
        ? `₹${baseMonetaryValue.toFixed(2)} rewards + ₹${milestoneBonus.toFixed(2)} milestone bonus`
        : 'Total monetary value of rewards earned'
    });

    return {
      instrument: {
        id: inst.id,
        name: inst.name,
        type: inst.type,
        color: inst.color,
        base_reward_rate: inst.base_reward_rate,
        redemption_value: inst.redemption_value
      },
      categoryMultiplier: categoryMult,
      rawRewards: parseFloat(rawRewards.toFixed(2)),
      milestoneBonus: parseFloat(milestoneBonus.toFixed(2)),
      milestoneTriggered,
      capApplied,
      monetaryValue: parseFloat(totalMonetaryValue.toFixed(2)),
      compositeScore: parseFloat(totalMonetaryValue.toFixed(4)),
      milestoneProgress,
      explanation
    };
  }));

  // Sort by composite score descending
  results.sort((a, b) => b.compositeScore - a.compositeScore);

  // Mark the best
  if (results.length > 0) {
    results[0].isBest = true;
  }

  return { recommendations: results };
}

module.exports = { calculateRecommendations };

module.exports = { calculateRecommendations };
