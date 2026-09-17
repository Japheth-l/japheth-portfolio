const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
  route: { type: String, required: true, trim: true },
  status: { type: String, default: '200 OK' },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  tags: { type: [String], default: [] },
  liveUrl: { type: String, trim: true },
  sourceUrl: { type: String, trim: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
