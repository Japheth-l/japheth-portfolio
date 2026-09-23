const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { startDB, stopDB } = require('./setup');
const app = require('../src/app');
const Project = require('../src/models/Project');
const ContactMessage = require('../src/models/ContactMessage');
const AnalyticsEvent = require('../src/models/AnalyticsEvent');

test.before(async () => {
  await startDB();
  await Project.create({
    method: 'GET', route: '/projects/demo', title: 'Demo API',
    description: 'A seeded project used by the tests.', tags: ['Node.js'], order: 0,
  });
});

test.after(async () => { await stopDB(); });

test('GET /api/projects returns the stored projects', async () => {
  const res = await request(app).get('/api/projects').expect(200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.data[0].title, 'Demo API');
});

test('GET /api/projects/:id rejects a malformed id with 400, not 500', async () => {
  const res = await request(app).get('/api/projects/not-an-object-id').expect(400);
  assert.equal(res.body.success, false);
});

test('GET /api/projects/:id returns 404 for an unknown id', async () => {
  await request(app).get('/api/projects/507f1f77bcf86cd799439011').expect(404);
});

test('POST /api/contact rejects an invalid payload without storing it', async () => {
  const before = await ContactMessage.countDocuments();
  const res = await request(app)
    .post('/api/contact')
    .send({ name: 'x', email: 'not-an-email', message: 'short' })
    .expect(400);

  assert.equal(res.body.success, false);
  assert.equal(res.body.errors.length, 3);
  assert.equal(await ContactMessage.countDocuments(), before);
});

test('POST /api/contact rejects an over-long message', async () => {
  const res = await request(app)
    .post('/api/contact')
    .send({ name: 'Valid Name', email: 'a@b.com', message: 'x'.repeat(5001) })
    .expect(400);

  assert.ok(res.body.errors.some(e => e.includes('5000')));
});

test('POST /api/contact stores a valid message', async () => {
  const res = await request(app)
    .post('/api/contact')
    .send({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'I would like to talk about an API.' })
    .expect(202);

  assert.equal(res.body.success, true);
  const stored = await ContactMessage.findOne({ email: 'ada@example.com' });
  assert.equal(stored.name, 'Ada Lovelace');
  assert.equal(stored.emailSent, false); // no RESEND_API_KEY in tests
});

test('POST /api/analytics/track rejects an unsupported event type', async () => {
  await request(app).post('/api/analytics/track').send({ type: 'rm -rf' }).expect(400);
});

test('POST /api/analytics/track records a known event', async () => {
  await request(app)
    .post('/api/analytics/track')
    .send({ type: 'project_click', label: 'Demo API' })
    .expect(204);

  assert.equal(await AnalyticsEvent.countDocuments({ type: 'project_click' }), 1);
});

test('unknown API routes return JSON, unknown pages return HTML', async () => {
  const api = await request(app).get('/api/nope').expect(404);
  assert.equal(api.body.success, false);

  const page = await request(app).get('/nope').expect(404);
  assert.match(page.headers['content-type'], /html/);
});
