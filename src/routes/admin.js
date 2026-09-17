const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Project = require('../models/Project');
const SiteContent = require('../models/SiteContent');
const ContactMessage = require('../models/ContactMessage');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { requireAdmin, signAdminToken, COOKIE_NAME } = require('../middleware/auth');
const { defaultContent } = require('../seed/data');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again later.',
});

// ── Auth ─────────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.cookies[COOKIE_NAME]) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash || !process.env.JWT_SECRET) {
    return res.status(500).render('admin/login', {
      error: 'Admin auth is not configured. Set ADMIN_PASSWORD_HASH and JWT_SECRET.',
    });
  }

  const emailOk = email === process.env.ADMIN_EMAIL;
  const passwordOk = await bcrypt.compare(password || '', hash);

  if (!emailOk || !passwordOk) {
    return res.status(401).render('admin/login', { error: 'Invalid credentials.' });
  }

  res.cookie(COOKIE_NAME, signAdminToken(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/admin/login');
});

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [projects, messages, totalViews, viewsLast30, topClicks] = await Promise.all([
      Project.find().sort({ order: 1, createdAt: 1 }).lean(),
      ContactMessage.find().sort({ createdAt: -1 }).limit(20).lean(),
      AnalyticsEvent.countDocuments({ type: 'page_view' }),
      AnalyticsEvent.countDocuments({ type: 'page_view', createdAt: { $gte: since } }),
      AnalyticsEvent.aggregate([
        { $match: { type: { $in: ['project_click', 'resume_download'] } } },
        { $group: { _id: { type: '$type', label: '$label' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.render('admin/dashboard', {
      projects,
      messages,
      stats: { totalViews, viewsLast30, topClicks },
      admin: req.admin,
    });
  } catch (err) { next(err); }
});

// ── Projects CRUD ────────────────────────────────────────────────────────────
router.get('/projects/new', requireAdmin, (req, res) => {
  res.render('admin/project-form', { project: null, action: '/admin/projects' });
});

router.post('/projects', requireAdmin, async (req, res, next) => {
  try {
    await Project.create(parseProjectBody(req.body));
    res.redirect('/admin');
  } catch (err) { next(err); }
});

router.get('/projects/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.redirect('/admin');
    res.render('admin/project-form', { project, action: `/admin/projects/${project._id}` });
  } catch (err) { next(err); }
});

router.post('/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, parseProjectBody(req.body), { runValidators: true });
    res.redirect('/admin');
  } catch (err) { next(err); }
});

router.post('/projects/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (err) { next(err); }
});

// ── Site content ─────────────────────────────────────────────────────────────
router.get('/content', requireAdmin, async (req, res, next) => {
  try {
    const doc = await SiteContent.findOne({ key: 'main' }).lean();
    const content = doc || defaultContent;
    res.render('admin/content-form', {
      content,
      skillsText: skillsToText(content.skills),
      aboutText: (content.aboutParagraphs || []).join('\n\n'),
    });
  } catch (err) { next(err); }
});

router.post('/content', requireAdmin, async (req, res, next) => {
  try {
    const { heroHello, heroName, heroRole, heroLede, aboutText, skillsText } = req.body;
    await SiteContent.findOneAndUpdate(
      { key: 'main' },
      {
        key: 'main',
        heroHello,
        heroName,
        heroRole,
        heroLede,
        aboutParagraphs: aboutText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
        skills: textToSkills(skillsText),
      },
      { upsert: true, new: true },
    );
    res.redirect('/admin');
  } catch (err) { next(err); }
});

// ── Messages ─────────────────────────────────────────────────────────────────
router.post('/messages/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (err) { next(err); }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseProjectBody(body) {
  return {
    method: body.method,
    route: body.route,
    status: body.status,
    title: body.title,
    description: body.description,
    tags: (body.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    liveUrl: body.liveUrl || undefined,
    sourceUrl: body.sourceUrl || undefined,
    order: Number(body.order) || 0,
  };
}

// Skills are edited as "category: a, b, c" lines — one category per line.
function skillsToText(skills) {
  const obj = skills instanceof Map ? Object.fromEntries(skills) : (skills || {});
  return Object.entries(obj).map(([key, values]) => `${key}: ${values.join(', ')}`).join('\n');
}

function textToSkills(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) continue;
    const values = rest.join(':').split(',').map(v => v.trim()).filter(Boolean);
    if (values.length) result[key.trim()] = values;
  }
  return result;
}

module.exports = router;
