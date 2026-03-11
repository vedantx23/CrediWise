const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { calculateRecommendations } = require('../services/rewardEngine');

const router = express.Router();
router.use(authMiddleware);

// POST /api/recommend
router.post('/', async (req, res) => {
  const { amount, category } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'A valid positive amount is required' });
  }
  if (!category) {
    return res.status(400).json({ message: 'Category is required' });
  }

  try {
    const result = await calculateRecommendations(req.user.id, Number(amount), category);
    res.json(result);
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
