const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
  route: { type: String, required: true, trim: true, maxlength: 200 },
  status: { type: String, default: '200 OK', maxlength: 40 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  tags: {
    type: [{ type: String, maxlength: 40 }],
    default: [],
    validate: [tags => tags.length <= 12, 'a project can have at most 12 tags'],
  },
  liveUrl: { type: String, trim: true, maxlength: 500 },
  sourceUrl: { type: String, trim: true, maxlength: 500 },
  order: { type: Number, default: 0 },
}, { timestamps: true });

projectSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Project', projectSchema);
