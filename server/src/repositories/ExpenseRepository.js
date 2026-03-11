const Expense = require('../models/Expense');
const { ExpenseDTO } = require('../dtos/ExpenseDTO');

class ExpenseRepository {
  async findFiltered(userId, { month, category, limit = 200 }) {
    let query = { user_id: userId };
    
    if (month) {
      // month format is YYYY-MM, matching string date prefix
      query.date = { $regex: new RegExp(`^${month}`) };
    }
    
    if (category && category !== 'All') {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .populate('payment_instrument_id')
      .sort({ date: -1, created_at: -1 })
      .limit(limit);
      
    return expenses.map(e => new ExpenseDTO(e));
  }

  async findById(id, userId) {
    const expense = await Expense.findOne({ _id: id, user_id: userId }).populate('payment_instrument_id');
    return expense ? new ExpenseDTO(expense) : null;
  }

  async create(createExpenseDto) {
    const expense = await Expense.create(createExpenseDto);
    const populated = await expense.populate('payment_instrument_id');
    return new ExpenseDTO(populated);
  }

  async update(id, userId, updateData) {
    const expense = await Expense.findOneAndUpdate(
      { _id: id, user_id: userId },
      { $set: updateData },
      { new: true }
    ).populate('payment_instrument_id');
    return expense ? new ExpenseDTO(expense) : null;
  }

  async delete(id, userId) {
    const result = await Expense.deleteOne({ _id: id, user_id: userId });
    return result.deletedCount > 0;
  }

  async sumAmountByInstrument(userId, instrumentId) {
    const result = await Expense.aggregate([
      { $match: { user_id: userId, payment_instrument_id: instrumentId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }
}

module.exports = new ExpenseRepository();
