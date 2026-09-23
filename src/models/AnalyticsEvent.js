const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  type: { type: String, enum: ['page_view', 'project_click', 'resume_download'], required: true },
  label: { type: String, default: null }, // e.g. project title for project_click
}, { timestamps: true });

// Every dashboard query filters on type and a createdAt window.
analyticsEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
