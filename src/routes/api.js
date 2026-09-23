const express = require('express');
const rateLimit = require('express-rate-limit');
const Project = require('../models/Project');
const SiteContent = require('../models/SiteContent');
const ContactMessage = require('../models/ContactMessage');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { validateContactPayload } = require('../utils/validate');
const { sendContactEmail } = require('../utils/mailer');
const { defaultContent } = require('../seed/data');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages sent. Please try again later.' },
});

// Unauthenticated and write-backed, so it is the easiest endpoint to use for
// filling the database. A real visitor fires a handful of these per session.
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many events.' },
});

// ── Public content API ───────────────────────────────────────────────────────
router.get('/projects', async (_req, res, next) => {
  try {
    const projects = await Project.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) { next(err); }
});

router.get('/projects/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
});

router.get('/content', async (_req, res, next) => {
  try {
    const content = await SiteContent.findOne({ key: 'main' }).lean();
    res.json({ success: true, data: content || defaultContent });
  } catch (err) { next(err); }
});

// The endpoint the homepage terminal animation pretends to call.
router.get('/me', async (_req, res, next) => {
  try {
    const content = (await SiteContent.findOne({ key: 'main' }).lean()) || defaultContent;
    const skills = content.skills instanceof Map ? Object.fromEntries(content.skills) : content.skills;
    res.json({
      name: content.heroName,
      role: content.heroRole,
      location: 'Accra, Ghana',
      stack: skills?.runtime?.concat(skills?.framework || [], skills?.database || []) || [],
      status: 'open_to_work',
    });
  } catch (err) { next(err); }
});

// ── Contact ──────────────────────────────────────────────────────────────────
router.post('/contact', contactLimiter, async (req, res, next) => {
  const { name, email, message } = req.body;

  const errors = validateContactPayload({ name, email, message });
  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  try {
    const { sent } = await sendContactEmail({ name, email, message });

    await ContactMessage.create({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      emailSent: sent,
      ip: req.ip,
    });

    if (!sent) {
      return res.status(202).json({
        success: true,
        message: 'Message received — I\'ll be in touch soon.',
      });
    }
    res.json({ success: true, message: 'Message sent! I\'ll be in touch soon.' });
  } catch (err) { next(err); }
});

// ── Analytics ────────────────────────────────────────────────────────────────
router.post('/analytics/track', analyticsLimiter, async (req, res) => {
  const { type, label } = req.body;
  if (!['project_click', 'resume_download'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Unsupported event type.' });
  }
  try {
    await AnalyticsEvent.create({ type, label: typeof label === 'string' ? label.slice(0, 120) : null });
  } catch (err) {
    console.error('analytics track failed:', err);
  }
  res.status(204).end();
});

module.exports = router;
