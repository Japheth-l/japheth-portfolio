const express = require('express');
const Project = require('../models/Project');
const SiteContent = require('../models/SiteContent');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { defaultContent } = require('../seed/data');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [projects, content] = await Promise.all([
      Project.find().sort({ order: 1, createdAt: 1 }).lean(),
      SiteContent.findOne({ key: 'main' }).lean(),
    ]);

    AnalyticsEvent.create({ type: 'page_view' }).catch(err => console.error('page_view track failed:', err));

    res.render('index', {
      projects,
      content: content || defaultContent,
      year: new Date().getFullYear(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'portfolio', timestamp: new Date().toISOString() });
});

module.exports = router;
