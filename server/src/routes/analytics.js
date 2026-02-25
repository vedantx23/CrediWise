const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/analytics/summary
router.get('/summary', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    // Current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Monthly totals (last 6 months)
    const monthlyTotals = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
      FROM expenses
      WHERE user_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all(userId).reverse();

    // Category breakdown (current month)
    const categoryBreakdown = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
      GROUP BY category
      ORDER BY total DESC
    `).all(userId, currentMonth);

    // Total spent this month
    const monthTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `).get(userId, currentMonth);

    // Total spent all time
    const allTimeTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?
    `).get(userId);

    // Instrument count
    const instrumentCount = db.prepare(`
      SELECT COUNT(*) as count FROM payment_instruments WHERE user_id = ?
    `).get(userId);

    // Reward calculations per instrument (current month)
    const instruments = db.prepare(
      'SELECT * FROM payment_instruments WHERE user_id = ?'
    ).all(userId);

    let totalRewardsValue = 0;
    const instrumentSummaries = instruments.map(inst => {
      const multipliers = JSON.parse(inst.category_multipliers || '{}');
      const expenses = db.prepare(`
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE user_id = ? AND payment_instrument_id = ? AND strftime('%Y-%m', date) = ?
        GROUP BY category
      `).all(userId, inst.id, currentMonth);

      let rawRewards = 0;
      expenses.forEach(exp => {
        const mult = multipliers[exp.category] || 1;
        rawRewards += exp.total * (inst.base_reward_rate / 100) * mult;
      });

      if (inst.reward_cap) rawRewards = Math.min(rawRewards, inst.reward_cap);
      const monetaryValue = rawRewards * inst.redemption_value;
      totalRewardsValue += monetaryValue;

      // Milestone check
      const totalForInst = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = ? AND payment_instrument_id = ?
      `).get(userId, inst.id);

      return {
        id: inst.id,
        name: inst.name,
        color: inst.color,
        monthlyRewards: parseFloat(monetaryValue.toFixed(2)),
        totalSpend: parseFloat(totalForInst.total.toFixed(2)),
        milestoneThreshold: inst.milestone_threshold,
        milestoneBonus: inst.milestone_bonus,
        milestoneProgress: inst.milestone_threshold
          ? Math.min((totalForInst.total / inst.milestone_threshold) * 100, 100)
          : null
      };
    });

    // Recent expenses
    const recentExpenses = db.prepare(`
      SELECT e.*, pi.name as instrument_name, pi.color as instrument_color
      FROM expenses e
      LEFT JOIN payment_instruments pi ON e.payment_instrument_id = pi.id
      WHERE e.user_id = ?
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT 10
    `).all(userId);

    res.json({
      currentMonth,
      monthTotal: parseFloat(monthTotal.total.toFixed(2)),
      allTimeTotal: parseFloat(allTimeTotal.total.toFixed(2)),
      instrumentCount: instrumentCount.count,
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
