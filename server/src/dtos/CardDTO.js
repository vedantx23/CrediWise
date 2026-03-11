class CardDTO {
  constructor(card) {
    this.id = card._id;
    this.name = card.name;
    this.bank = card.bank;
    this.type = card.type;
    this.network = card.network;
    this.base_reward_rate = card.base_reward_rate;
    this.redemption_value = card.redemption_value;
    this.category_multipliers = card.category_multipliers ? 
      (card.category_multipliers instanceof Map ? Object.fromEntries(card.category_multipliers) : card.category_multipliers) : {};
    this.annual_fee = card.annual_fee;
    this.benefits = card.benefits || [];
    this.image_url = card.image_url;
  }
}

module.exports = { CardDTO };
