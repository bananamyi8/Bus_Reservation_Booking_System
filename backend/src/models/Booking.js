const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  travelDate: { type: String, required: true },
  seat: { type: Number, required: true, min: 1 },
  passenger: {
    name: { type: String, required: true },
    nameKey: { type: String, required: true },
    contact: { type: String, required: true },
    type: { type: String, default: 'Adult' },
    idVerified: { type: Boolean, default: false }
  },
  type: { type: String, enum: ['Walk-in', 'Advance reservation'], required: true },
  status: { type: String, enum: ['Confirmed', 'Cancelled'], default: 'Confirmed' },
  fare: { type: Number, required: true },
  received: { type: Number, default: 0 },
  payStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
  cancelReason: String,
  createdBy: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
// The database itself refuses a second active booking for the same seat on the same trip and date.
schema.index({ tripId: 1, travelDate: 1, seat: 1 }, { unique: true, partialFilterExpression: { status: 'Confirmed' } });
module.exports = mongoose.model('Booking', schema);
