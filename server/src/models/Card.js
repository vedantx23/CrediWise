const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  bank: { type: String, required: true },
  min_income_lpa: { type: Number },
  annual_fee_inr: { type: Number },
  reward_rate: { type: String },
  reward_type: { type: String },
  reward_value_per_point_inr: { type: Number },
  lounge_access: { type: String },
  international_usage: { type: String },
  milestone_reward: { type: String },
  spend_based_fee_waiver: { type: String },
  third_party_tieups: [{ type: String }],
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Card', cardSchema);
