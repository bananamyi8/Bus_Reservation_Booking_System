const mongoose = require('mongoose');
module.exports = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  contact: { type: String, trim: true },
  role: { type: String, enum: ['staff', 'admin', 'passenger'], default: 'staff' }
}, { timestamps: true }));
