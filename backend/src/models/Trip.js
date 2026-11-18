const mongoose = require('mongoose');
module.exports = mongoose.model('Trip', new mongoose.Schema({
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  time: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1, max: 60 },
  fare: { type: Number, required: true, min: 0 },
  date: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true }));
