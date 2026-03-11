const Card = require('../models/Card');
const { CardDTO } = require('../dtos/CardDTO');

class CardRepository {
  async findAll() {
    const cards = await Card.find().sort({ name: 1 });
    return cards.map(card => new CardDTO(card));
  }

  async findById(id) {
    const card = await Card.findById(id);
    return card ? new CardDTO(card) : null;
  }

  async search(query) {
    const cards = await Card.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { bank: { $regex: query, $options: 'i' } }
      ]
    }).sort({ name: 1 });
    return cards.map(card => new CardDTO(card));
  }

  async create(cardData) {
    const card = await Card.create(cardData);
    return new CardDTO(card);
  }
}

module.exports = new CardRepository();
