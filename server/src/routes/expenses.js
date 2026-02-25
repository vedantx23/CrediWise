const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { categorize } = require('../services/categorizer');

const router = express.Router();
router.use(authMiddleware);

// GET /api/expenses
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { month, category, limit = 200 } = req.query;
    let query = `
      SELECT e.*, pi.name as instrument_name, pi.color as instrument_color
      FROM expenses e
      LEFT JOIN payment_instruments pi ON e.payment_instrument_id = pi.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.id];

    if (month) {
      query += ` AND strftime('%Y-%m', e.date) = ?`;
      params.push(month);
    }
    if (category && category !== 'All') {
      query += ` AND e.category = ?`;
      params.push(category);
    }
    query += ` ORDER BY e.date DESC, e.created_at DESC LIMIT ?`;
    params.push(Number(limit));

    const expenses = db.prepare(query).all(...params);
    res.json({ expenses });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/expenses
router.post('/', (req, res) => {
  const { date, amount, category, payment_instrument_id, note } = req.body;

  if (!date || !amount) {
    return res.status(400).json({ message: 'Date and amount are required' });
  }
  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    const db = getDb();

    // Auto-categorize if not provided
    const finalCategory = category || categorize(note || '');

    const result = db.prepare(
      'INSERT INTO expenses (user_id, date, amount, category, payment_instrument_id, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, date, Number(amount), finalCategory, payment_instrument_id || null, note || '');

    const expense = db.prepare(`
      SELECT e.*, pi.name as instrument_name, pi.color as instrument_color
      FROM expenses e
      LEFT JOIN payment_instruments pi ON e.payment_instrument_id = pi.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ expense });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', (req, res) => {
  const { date, amount, category, payment_instrument_id, note } = req.body;

  if (!date || !amount) {
    return res.status(400).json({ message: 'Date and amount are required' });
  }

  try {
    const db = getDb();
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    db.prepare(
      'UPDATE expenses SET date=?, amount=?, category=?, payment_instrument_id=?, note=? WHERE id=? AND user_id=?'
    ).run(date, Number(amount), category || expense.category, payment_instrument_id || null, note || '', req.params.id, req.user.id);

    const updated = db.prepare(`
      SELECT e.*, pi.name as instrument_name, pi.color as instrument_color
      FROM expenses e
      LEFT JOIN payment_instruments pi ON e.payment_instrument_id = pi.id
      WHERE e.id = ?
    `).get(req.params.id);

    res.json({ expense: updated });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
