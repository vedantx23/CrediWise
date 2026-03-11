const mongoose = require('mongoose');

const paymentInstrumentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, default: 'credit_card' },
  base_reward_rate: { type: Number, default: 1.0 },
  redemption_value: { type: Number, default: 0.25 },
  milestone_threshold: { type: Number, default: null },
  milestone_bonus: { type: Number, default: 0 },
  reward_cap: { type: Number, default: null },
  category_multipliers: { type: Map, of: Number, default: {} },
  color: { type: String, default: '#6366f1' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentInstrument', paymentInstrumentSchema);
