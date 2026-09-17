require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Project = require('../models/Project');
const SiteContent = require('../models/SiteContent');
const { defaultContent, defaultProjects } = require('./data');

async function seed() {
  await connectDB();

  await Project.deleteMany({});
  await Project.insertMany(defaultProjects);
  await SiteContent.findOneAndUpdate({ key: 'main' }, defaultContent, { upsert: true });

  console.log(`Seeded ${defaultProjects.length} projects and site content.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
