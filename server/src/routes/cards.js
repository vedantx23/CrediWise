const express = require('express');
const CardRepository = require('../repositories/CardRepository');

const router = express.Router();

// GET /api/cards
// Optional query: ?search=HDFC
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let cards;
    if (search) {
      cards = await CardRepository.search(search);
    } else {
      cards = await CardRepository.findAll();
    }
    res.json({ cards });
  } catch (err) {
    console.error('Get cards error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  try {
    const card = await CardRepository.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }
    res.json({ card });
  } catch (err) {
    console.error('Get card detail error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
