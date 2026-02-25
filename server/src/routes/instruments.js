const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/instruments
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const instruments = db.prepare('SELECT * FROM payment_instruments WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    // Parse JSON fields
    const parsed = instruments.map(i => ({
      ...i,
      category_multipliers: JSON.parse(i.category_multipliers || '{}')
    }));
    res.json({ instruments: parsed });
  } catch (err) {
    console.error('Get instruments error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/instruments
router.post('/', (req, res) => {
  const {
    name, type, base_reward_rate, redemption_value,
    milestone_threshold, milestone_bonus, reward_cap,
    category_multipliers, color
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Instrument name is required' });
  }

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO payment_instruments
      (user_id, name, type, base_reward_rate, redemption_value, milestone_threshold, milestone_bonus, reward_cap, category_multipliers, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      name,
      type || 'credit_card',
      Number(base_reward_rate) || 1.0,
      Number(redemption_value) || 0.25,
      milestone_threshold ? Number(milestone_threshold) : null,
      Number(milestone_bonus) || 0,
      reward_cap ? Number(reward_cap) : null,
      JSON.stringify(category_multipliers || {}),
      color || '#6366f1'
    );

    const instrument = db.prepare('SELECT * FROM payment_instruments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      instrument: { ...instrument, category_multipliers: JSON.parse(instrument.category_multipliers) }
    });
  } catch (err) {
    console.error('Create instrument error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/instruments/:id
router.put('/:id', (req, res) => {
  const {
    name, type, base_reward_rate, redemption_value,
    milestone_threshold, milestone_bonus, reward_cap,
    category_multipliers, color
  } = req.body;

  try {
    const db = getDb();
    const instrument = db.prepare('SELECT * FROM payment_instruments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }

    db.prepare(`
      UPDATE payment_instruments SET
        name=?, type=?, base_reward_rate=?, redemption_value=?,
        milestone_threshold=?, milestone_bonus=?, reward_cap=?,
        category_multipliers=?, color=?
      WHERE id=? AND user_id=?
    `).run(
      name || instrument.name,
      type || instrument.type,
      Number(base_reward_rate) || instrument.base_reward_rate,
      Number(redemption_value) || instrument.redemption_value,
      milestone_threshold !== undefined ? (milestone_threshold ? Number(milestone_threshold) : null) : instrument.milestone_threshold,
      Number(milestone_bonus) || instrument.milestone_bonus,
      reward_cap !== undefined ? (reward_cap ? Number(reward_cap) : null) : instrument.reward_cap,
      JSON.stringify(category_multipliers || JSON.parse(instrument.category_multipliers)),
      color || instrument.color,
      req.params.id,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM payment_instruments WHERE id = ?').get(req.params.id);
    res.json({ instrument: { ...updated, category_multipliers: JSON.parse(updated.category_multipliers) } });
  } catch (err) {
    console.error('Update instrument error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/instruments/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const instrument = db.prepare('SELECT * FROM payment_instruments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }
    db.prepare('DELETE FROM payment_instruments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Instrument deleted' });
  } catch (err) {
    console.error('Delete instrument error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
