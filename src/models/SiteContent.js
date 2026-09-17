const mongoose = require('mongoose');

// Singleton document (key: "main") holding the editable text on the homepage,
// so the admin can update copy without touching code.
const siteContentSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  heroHello: String,
  heroName: String,
  heroRole: String,
  heroLede: String,
  aboutParagraphs: { type: [String], default: [] },
  skills: {
    type: Map,
    of: [String],
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model('SiteContent', siteContentSchema);
