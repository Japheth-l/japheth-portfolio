const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  type: { type: String, enum: ['page_view', 'project_click', 'resume_download'], required: true },
  label: { type: String, default: null }, // e.g. project title for project_click
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
