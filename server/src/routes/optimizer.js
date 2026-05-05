const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { optimizeTransaction, auditPortfolio, getCardDirectory } = require('../services/transactionOptimizer');

const router = express.Router();

// GET /api/optimizer/cards — List all available cards in the directory
router.get('/cards', (req, res) => {
  try {
    const cards = getCardDirectory();
    res.json({ cards });
  } catch (err) {
    console.error('Get card directory error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/optimizer/recommend — Transaction Optimizer
// Body: { userCards: [...], amount, category, channel, merchant, monthlySpends, cumulativeSpends }
router.post('/recommend', async (req, res) => {
  const { userCards, amount, category, channel, merchant, monthlySpends, cumulativeSpends } = req.body;

  if (!userCards || !Array.isArray(userCards) || userCards.length === 0) {
    return res.status(400).json({ message: 'userCards array is required (list of card names you hold)' });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'A valid positive amount is required' });
  }
  if (!category) {
    return res.status(400).json({ message: 'category is required (e.g., "Food & Dining", "Travel", "Shopping")' });
  }

  try {
    const result = optimizeTransaction({
      userCards,
      amount: Number(amount),
      category,
      channel: channel || 'online',
      merchant: merchant || '',
      monthlySpends: monthlySpends || {},
      cumulativeSpends: cumulativeSpends || {}
    });
    res.json(result);
  } catch (err) {
    console.error('Optimizer error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/optimizer/audit — Portfolio Audit
// Body: { userCards: [...], monthlyProfile: { "Food & Dining": 5000, "Travel": 10000, ... } }
router.post('/audit', async (req, res) => {
  const { userCards, monthlyProfile } = req.body;

  if (!userCards || !Array.isArray(userCards) || userCards.length === 0) {
    return res.status(400).json({ message: 'userCards array is required' });
  }
  if (!monthlyProfile || typeof monthlyProfile !== 'object') {
    return res.status(400).json({ message: 'monthlyProfile object is required (e.g., { "Food & Dining": 5000, "Travel": 10000 })' });
  }

  try {
    const result = auditPortfolio({ userCards, monthlyProfile });
    res.json(result);
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

