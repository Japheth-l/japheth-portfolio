const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { startDB, stopDB, ADMIN_PASSWORD } = require('./setup');
const app = require('../src/app');

test.before(async () => { await startDB(); });
test.after(async () => { await stopDB(); });

test('the dashboard is not reachable without signing in', async () => {
  const res = await request(app).get('/admin').expect(302);
  assert.equal(res.headers.location, '/admin/login');
});

test('project and content editors are not reachable without signing in', async () => {
  await request(app).get('/admin/projects/new').expect(302);
  await request(app).get('/admin/content').expect(302);
});

test('a forged session cookie is rejected', async () => {
  const res = await request(app)
    .get('/admin')
    .set('Cookie', 'admin_token=not.a.real.jwt')
    .expect(302);
  assert.equal(res.headers.location, '/admin/login');
});

test('signing in with the wrong password fails and sets no cookie', async () => {
  const res = await request(app)
    .post('/admin/login')
    .type('form')
    .send({ email: process.env.ADMIN_EMAIL, password: 'wrong-password' })
    .expect(401);

  assert.equal(res.headers['set-cookie'], undefined);
});

test('signing in with the wrong email fails even with the right password', async () => {
  await request(app)
    .post('/admin/login')
    .type('form')
    .send({ email: 'someone-else@test.local', password: ADMIN_PASSWORD })
    .expect(401);
});

test('valid credentials issue an httpOnly session cookie that opens the dashboard', async () => {
  const login = await request(app)
    .post('/admin/login')
    .type('form')
    .send({ email: process.env.ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(302);

  const cookie = login.headers['set-cookie'][0];
  assert.match(cookie, /admin_token=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);

  const dashboard = await request(app).get('/admin').set('Cookie', cookie).expect(200);
  assert.match(dashboard.text, /Analytics/);
});
