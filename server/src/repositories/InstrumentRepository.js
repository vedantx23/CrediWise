const PaymentInstrument = require('../models/PaymentInstrument');
const { InstrumentDTO } = require('../dtos/InstrumentDTO');

class InstrumentRepository {
  async findAllByUserId(userId) {
    const instruments = await PaymentInstrument.find({ user_id: userId }).sort({ created_at: 1 });
    return instruments.map(inst => new InstrumentDTO(inst));
  }

  async findById(id, userId) {
    const instrument = await PaymentInstrument.findOne({ _id: id, user_id: userId });
    return instrument ? new InstrumentDTO(instrument) : null;
  }

  async create(createInstrumentDto) {
    const instrument = await PaymentInstrument.create(createInstrumentDto);
    return new InstrumentDTO(instrument);
  }

  async update(id, userId, updateData) {
    const instrument = await PaymentInstrument.findOneAndUpdate(
      { _id: id, user_id: userId },
      { $set: updateData },
      { new: true }
    );
    return instrument ? new InstrumentDTO(instrument) : null;
  }

  async delete(id, userId) {
    const result = await PaymentInstrument.deleteOne({ _id: id, user_id: userId });
    return result.deletedCount > 0;
  }
}

module.exports = new InstrumentRepository();
