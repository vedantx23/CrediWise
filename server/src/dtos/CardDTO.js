class CardDTO {
  constructor(card) {
    this.id = card._id;
    this.name = card.name;
    this.bank = card.bank;
    this.network = card.network;
    this.min_income_lpa = card.min_income_lpa;
    this.annual_fee_inr = card.annual_fee_inr;
    this.base_reward_rate = card.base_reward_rate;
    this.reward_type = card.reward_type;
    this.point_value_inr = card.point_value_inr;
    this.lounge_access = card.lounge_access;
    this.international_usage = card.international_usage;
    this.fee_waiver_spend = card.fee_waiver_spend;
    this.accelerated_rewards = card.accelerated_rewards || [];
    this.exclusions = card.exclusions || [];
    this.monthly_caps = card.monthly_caps || [];
    this.milestone_tiers = card.milestone_tiers || [];
    this.upi_benefits = card.upi_benefits || null;
    this.best_for = card.best_for || [];
    this.third_party_tieups = card.third_party_tieups || [];
  }
}

module.exports = { CardDTO };
