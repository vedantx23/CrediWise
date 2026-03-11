const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { categorize } = require('../services/categorizer');
const ExpenseRepository = require('../repositories/ExpenseRepository');
const { CreateExpenseDTO } = require('../dtos/ExpenseDTO');

const router = express.Router();
router.use(authMiddleware);

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { month, category, limit = 200 } = req.query;
    const expenses = await ExpenseRepository.findFiltered(req.user.id, { month, category, limit });
    res.json({ expenses });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const { date, amount, category, payment_instrument_id, note } = req.body;

  if (!date || !amount) {
    return res.status(400).json({ message: 'Date and amount are required' });
  }
  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    const finalCategory = category || categorize(note || '');
    const createDto = new CreateExpenseDTO({
      ...req.body,
      user_id: req.user.id,
      category: finalCategory
    });

    const expense = await ExpenseRepository.create(createDto);
    res.status(201).json({ expense });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  const { date, amount } = req.body;

  if (!date || !amount) {
    return res.status(400).json({ message: 'Date and amount are required' });
  }

  try {
    const expense = await ExpenseRepository.findById(req.params.id, req.user.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const updateDto = new CreateExpenseDTO({
      ...req.body,
      user_id: req.user.id
    });

    const updated = await ExpenseRepository.update(req.params.id, req.user.id, updateDto);
    res.json({ expense: updated });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await ExpenseRepository.delete(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

module.exports = router;
