require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db');
const Project = require('./models/Project');
const SiteContent = require('./models/SiteContent');
const { defaultContent, defaultProjects } = require('./seed/data');

const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('trust proxy', 1);

// Cache-busts CSS/JS on every deploy so returning visitors never see stale assets.
const ASSET_VERSION = Date.now().toString(36);
app.use((_req, res, next) => {
  res.locals.assetVersion = ASSET_VERSION;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}));

app.use('/', pagesRouter);
app.use('/api', apiRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Route not found.' });
  }
  res.status(404).render('404');
});

app.use((err, req, res, _next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
  res.status(500).render('500');
});

// Populates a fresh database with the starting content so the site is never blank.
async function seedIfEmpty() {
  if (await Project.countDocuments() === 0) await Project.insertMany(defaultProjects);
  if (await SiteContent.countDocuments() === 0) await SiteContent.create(defaultContent);
}

async function start() {
  await connectDB();
  await seedIfEmpty();
  app.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
