const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Expense = require('../models/Expense');
const PaymentInstrument = require('../models/PaymentInstrument');
const InstrumentRepository = require('../repositories/InstrumentRepository');
const ExpenseRepository = require('../repositories/ExpenseRepository');
const mongoose = require('mongoose');

const router = express.Router();
router.use(authMiddleware);

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Monthly totals (last 6 months)
    const monthlyTotals = await Expense.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: { $substr: ["$date", 0, 7] },
          total: { $sum: "$amount" }
        }
      },
      { $project: { month: "$_id", total: 1, _id: 0 } },
      { $sort: { month: -1 } },
      { $limit: 6 }
    ]);
    monthlyTotals.reverse();

    // Category breakdown (current month)
    const categoryBreakdown = await Expense.aggregate([
      {
        $match: {
          user_id: userId,
          date: { $regex: new RegExp(`^${currentMonth}`) }
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $project: { category: "$_id", total: 1, count: 1, _id: 0 } },
      { $sort: { total: -1 } }
    ]);

    // Total spent this month
    const monthTotalResult = await Expense.aggregate([
      {
        $match: {
          user_id: userId,
          date: { $regex: new RegExp(`^${currentMonth}`) }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const monthTotal = monthTotalResult.length > 0 ? monthTotalResult[0].total : 0;

    // Total spent all time
    const allTimeTotalResult = await Expense.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const allTimeTotal = allTimeTotalResult.length > 0 ? allTimeTotalResult[0].total : 0;

    // Instrument count
    const instrumentCount = await PaymentInstrument.countDocuments({ user_id: userId });

    // Reward calculations per instrument (current month)
    const instruments = await PaymentInstrument.find({ user_id: userId });

    let totalRewardsValue = 0;
    const instrumentSummaries = await Promise.all(instruments.map(async (inst) => {
      const multipliers = inst.category_multipliers || {};

      const categoryExpenses = await Expense.aggregate([
        {
          $match: {
            user_id: userId,
            payment_instrument_id: inst._id,
            date: { $regex: new RegExp(`^${currentMonth}`) }
          }
        },
        { $group: { _id: "$category", total: { $sum: "$amount" } } }
      ]);

      let rawRewards = 0;
      categoryExpenses.forEach(exp => {
        const mult = (inst.category_multipliers instanceof Map)
          ? (inst.category_multipliers.get(exp._id) || 1)
          : (inst.category_multipliers?.[exp._id] || 1);
        rawRewards += exp.total * (inst.base_reward_rate / 100) * mult;
      });

      if (inst.reward_cap) rawRewards = Math.min(rawRewards, inst.reward_cap);
      const monetaryValue = rawRewards * inst.redemption_value;
      totalRewardsValue += monetaryValue;

      const totalForInst = await ExpenseRepository.sumAmountByInstrument(userId.toString(), inst._id);

      return {
        id: inst._id,
        name: inst.name,
        color: inst.color,
        monthlyRewards: parseFloat(monetaryValue.toFixed(2)),
        totalSpend: parseFloat(totalForInst.toFixed(2)),
        milestoneThreshold: inst.milestone_threshold,
        milestoneBonus: inst.milestone_bonus,
        milestoneProgress: inst.milestone_threshold
          ? Math.min((totalForInst / inst.milestone_threshold) * 100, 100)
          : null
      };
    }));

    // Recent expenses
    const recentExpenses = await ExpenseRepository.findFiltered(userId.toString(), { limit: 10 });

    res.json({
      currentMonth,
      monthTotal: parseFloat(monthTotal.toFixed(2)),
      allTimeTotal: parseFloat(allTimeTotal.toFixed(2)),
      instrumentCount,
      totalRewardsValue: parseFloat(totalRewardsValue.toFixed(2)),
      monthlyTotals,
      categoryBreakdown,
      instrumentSummaries,
      recentExpenses
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

module.exports = router;
