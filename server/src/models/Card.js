const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  bank: { type: String, required: true },
  type: { type: String, default: 'credit' }, // credit, debit
  network: { type: String }, // Visa, Mastercard, RuPay, Amex
  base_reward_rate: { type: Number, default: 0 },
  redemption_value: { type: Number, default: 1 }, // value of 1 reward point in INR
  category_multipliers: { type: Map, of: Number, default: {} },
  annual_fee: { type: Number, default: 0 },
  benefits: [{ type: String }],
  image_url: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Card', cardSchema);
