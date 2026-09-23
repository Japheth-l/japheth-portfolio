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

    AnalyticsEvent.create({ type: 'page_view' }).catch(err => console.error('page_view track failed:', err.message));

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

router.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`,
  );
});

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const latest = await Project.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean();
    const lastmod = (latest?.updatedAt || new Date()).toISOString().split('T')[0];

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n` +
      `</urlset>\n`,
    );
  } catch (err) { next(err); }
});

module.exports = router;
