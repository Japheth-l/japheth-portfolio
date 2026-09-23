require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const Project = require('./models/Project');
const SiteContent = require('./models/SiteContent');
const { defaultContent, defaultProjects } = require('./seed/data');

const PORT = process.env.PORT || 3000;

// Populates a fresh database with the starting content so the site is never blank.
async function seedIfEmpty() {
  if (await Project.countDocuments() === 0) await Project.insertMany(defaultProjects);
  if (await SiteContent.countDocuments() === 0) await SiteContent.create(defaultContent);
}

async function start() {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD_HASH) {
    console.warn('ADMIN_PASSWORD_HASH is not set — /admin cannot be signed into.');
  }

  await connectDB();
  await seedIfEmpty();
  app.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
