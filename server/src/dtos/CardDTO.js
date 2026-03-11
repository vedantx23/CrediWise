class CardDTO {
  constructor(card) {
    this.id = card._id;
    this.name = card.name;
    this.bank = card.bank;
    this.min_income_lpa = card.min_income_lpa;
    this.annual_fee_inr = card.annual_fee_inr;
    this.reward_rate = card.reward_rate;
    this.reward_type = card.reward_type;
    this.reward_value_per_point_inr = card.reward_value_per_point_inr;
    this.lounge_access = card.lounge_access;
    this.international_usage = card.international_usage;
    this.milestone_reward = card.milestone_reward;
    this.spend_based_fee_waiver = card.spend_based_fee_waiver;
    this.third_party_tieups = card.third_party_tieups || [];
  }
}

module.exports = { CardDTO };
