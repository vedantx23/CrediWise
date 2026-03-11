const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Keeping as string to match existing SQLite date format for now
  amount: { type: Number, required: true },
  category: { type: String, default: 'Other' },
  payment_instrument_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentInstrument', default: null },
  note: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

expenseSchema.index({ user_id: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
