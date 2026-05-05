const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  bank: { type: String, required: true },
  network: { type: String },
  min_income_lpa: { type: Number },
  annual_fee_inr: { type: Number },
  base_reward_rate: { type: Number },
  reward_type: { type: String },
  point_value_inr: { type: Number },
  lounge_access: { type: String },
  international_usage: { type: String },
  fee_waiver_spend: { type: Number },
  accelerated_rewards: [{
    channel: String,
    rate_percent: Number,
    description: String
  }],
  exclusions: [{ type: String }],
  monthly_caps: [{
    category: String,
    cap_points: Number,
    cap_amount: Number,
    description: String
  }],
  milestone_tiers: [{
    spend: Number,
    reward: String
  }],
  upi_benefits: {
    rate_percent: Number,
    description: String
  },
  best_for: [{ type: String }],
  third_party_tieups: [{ type: String }],
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Card', cardSchema);
