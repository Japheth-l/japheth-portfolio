const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Cache-busts CSS/JS on every deploy so returning visitors never see stale assets.
const ASSET_VERSION = Date.now().toString(36);
app.use((req, res, next) => {
  res.locals.assetVersion = ASSET_VERSION;
  res.locals.canonicalUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
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
  // A malformed :id reaching Mongoose is a bad request, not a server fault.
  const status = (err.name === 'CastError' || err.name === 'ValidationError') ? 400 : 500;
  if (status === 500) console.error(err);

  if (req.path.startsWith('/api')) {
    const message = status === 400 ? 'Invalid request.' : 'Internal server error.';
    return res.status(status).json({ success: false, message });
  }
  res.status(status).render(status === 400 ? '400' : '500');
});

module.exports = app;
