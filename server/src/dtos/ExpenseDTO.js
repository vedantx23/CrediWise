class ExpenseDTO {
  constructor(expense) {
    this.id = expense._id;
    this.user_id = expense.user_id;
    this.date = expense.date;
    this.amount = expense.amount;
    this.category = expense.category;
    this.payment_instrument_id = expense.payment_instrument_id;
    this.note = expense.note;
    this.created_at = expense.created_at;
    
    // Virtual fields if populated
    if (expense.payment_instrument_id && typeof expense.payment_instrument_id === 'object') {
      this.instrument_name = expense.payment_instrument_id.name;
      this.instrument_color = expense.payment_instrument_id.color;
      this.payment_instrument_id = expense.payment_instrument_id._id;
    }
  }
}

class CreateExpenseDTO {
  constructor(data) {
    this.user_id = data.user_id;
    this.date = data.date;
    this.amount = Number(data.amount);
    this.category = data.category || 'Other';
    this.payment_instrument_id = data.payment_instrument_id || null;
    this.note = data.note || '';
  }
}

module.exports = { ExpenseDTO, CreateExpenseDTO };
