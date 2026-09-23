const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { startDB, stopDB } = require('./setup');
const app = require('../src/app');
const Project = require('../src/models/Project');
const SiteContent = require('../src/models/SiteContent');
const { defaultContent } = require('../src/seed/data');

test.before(async () => {
  await startDB();
  await SiteContent.create(defaultContent);
});

test.after(async () => { await stopDB(); });

test('security headers are sent on page responses', async () => {
  const res = await request(app).get('/').expect(200);
  const csp = res.headers['content-security-policy'];

  assert.ok(csp, 'expected a Content-Security-Policy header');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.ok(!csp.includes("'unsafe-inline'"), 'CSP must not allow inline scripts');

  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.ok(!res.headers['x-powered-by'], 'Express should not advertise itself');
});

test('stored project content is escaped rather than rendered as HTML', async () => {
  await Project.create({
    method: 'GET',
    route: '/projects/xss',
    title: '<script>alert(1)</script>',
    description: 'An attempt to inject markup through the CMS.',
    order: 99,
  });

  const res = await request(app).get('/').expect(200);
  assert.ok(!res.text.includes('<script>alert(1)</script>'), 'raw script tag must not reach the page');
  assert.ok(res.text.includes('&lt;script&gt;'), 'expected the title to be HTML-escaped');
});

test('robots.txt disallows the admin panel and points at the sitemap', async () => {
  const res = await request(app).get('/robots.txt').expect(200);
  assert.match(res.text, /Disallow: \/admin/);
  assert.match(res.text, /Sitemap: http.*\/sitemap\.xml/);
});

test('sitemap.xml is well-formed and lists the homepage', async () => {
  const res = await request(app).get('/sitemap.xml').expect(200);
  assert.match(res.headers['content-type'], /xml/);
  assert.match(res.text, /<urlset/);
  assert.match(res.text, /<loc>http.*\/<\/loc>/);
});

test('pages carry a canonical url', async () => {
  const res = await request(app).get('/').expect(200);
  assert.match(res.text, /<link rel="canonical" href="http/);
});
