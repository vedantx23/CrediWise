class InstrumentDTO {
  constructor(instrument) {
    this.id = instrument._id.toString();
    this.user_id = instrument.user_id.toString();
    this.name = instrument.name;
    this.type = instrument.type;
    this.base_reward_rate = instrument.base_reward_rate;
    this.redemption_value = instrument.redemption_value;
    this.milestone_threshold = instrument.milestone_threshold;
    this.milestone_bonus = instrument.milestone_bonus;
    this.reward_cap = instrument.reward_cap;
    this.category_multipliers = Object.fromEntries(instrument.category_multipliers || new Map());
    this.color = instrument.color;
    this.created_at = instrument.created_at;
  }
}

class CreateInstrumentDTO {
  constructor(data) {
    this.user_id = data.user_id;
    this.name = data.name;
    this.type = data.type || 'credit_card';
    this.base_reward_rate = Number(data.base_reward_rate) || 1.0;
    this.redemption_value = Number(data.redemption_value) || 0.25;
    this.milestone_threshold = data.milestone_threshold ? Number(data.milestone_threshold) : null;
    this.milestone_bonus = Number(data.milestone_bonus) || 0;
    this.reward_cap = data.reward_cap ? Number(data.reward_cap) : null;
    this.category_multipliers = typeof data.category_multipliers === 'string' 
      ? JSON.parse(data.category_multipliers) 
      : (data.category_multipliers || {});
    this.color = data.color || '#6366f1';
  }
}

module.exports = { InstrumentDTO, CreateInstrumentDTO };
