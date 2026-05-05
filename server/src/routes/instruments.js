const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const InstrumentRepository = require('../repositories/InstrumentRepository');
const { CreateInstrumentDTO } = require('../dtos/InstrumentDTO');

const router = express.Router();
router.use(authMiddleware);

// GET /api/instruments
router.get('/', async (req, res) => {
  try {
    const instruments = await InstrumentRepository.findAllByUserId(req.user.id);
    res.json({ instruments });
  } catch (err) {
    console.error('Get instruments error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/instruments
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Instrument name is required' });
  }

  try {
    const createDto = new CreateInstrumentDTO({ ...req.body, user_id: req.user.id });
    const instrument = await InstrumentRepository.create(createDto);
    res.status(201).json({ instrument });
  } catch (err) {
    console.error('Create instrument error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/instruments/:id
router.put('/:id', async (req, res) => {
  try {
    const instrument = await InstrumentRepository.findById(req.params.id, req.user.id);
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }

    const updateDto = new CreateInstrumentDTO({ ...req.body, user_id: req.user.id });
    const updated = await InstrumentRepository.update(req.params.id, req.user.id, updateDto);

    res.json({ instrument: updated });
  } catch (err) {
    console.error('Update instrument error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/instruments/:id
router.delete('/:id', async (req, res) => {
  try {
    const success = await InstrumentRepository.delete(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ message: 'Instrument not found' });
    }
    res.json({ message: 'Instrument deleted' });
  } catch (err) {
    console.error('Delete instrument error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

module.exports = router;
