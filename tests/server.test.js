/**
 * Integration tests for CLASS-APP server routes.
 * Focuses on auth enforcement, ownership checks, and basic contract testing.
 */

const os   = require('os');
const path = require('path');
const fs   = require('fs');

// Use a temp data file so tests never touch data.json
const tmpData = path.join(os.tmpdir(), `class-app-test-${Date.now()}.json`);
process.env.DATA_PATH_OVERRIDE = tmpData;
process.env.JWT_SECRET         = 'test-jwt-secret';
process.env.ADMIN_USERNAME     = 'TestAdmin';
process.env.ADMIN_PASSWORD     = 'adminpass123';
process.env.NODE_ENV           = 'test';

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const { app } = require('../server');

const JWT_SECRET   = 'test-jwt-secret';
const ADMIN_USER   = 'TestAdmin';
const REGULAR_USER = 'testuser_jest';

function makeToken(username, isAdmin = false) {
  return jwt.sign({ username, isAdmin }, JWT_SECRET, { expiresIn: '1h' });
}

afterAll(() => {
  if (fs.existsSync(tmpData)) fs.unlinkSync(tmpData);
});

// ── Health ────────────────────────────────────────────────
describe('Health', () => {
  test('GET /api/ping → 200 ok:true', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/config → has supabaseUrl + supabaseKey', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('supabaseUrl');
    expect(res.body).toHaveProperty('supabaseKey');
  });
});

// ── Login ─────────────────────────────────────────────────
describe('POST /api/login', () => {
  test('missing fields → 400', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(400);
  });

  test('wrong admin password → 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: ADMIN_USER, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('valid non-admin login → 200 with token + user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: REGULAR_USER, password: 'anypassword' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(REGULAR_USER);
    expect(res.body.isAdmin).toBe(false);
  });

  test('valid admin login → 200 with isAdmin:true', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: ADMIN_USER, password: 'adminpass123' });
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
    expect(res.body.token).toBeDefined();
  });
});

// ── Auth middleware ───────────────────────────────────────
describe('Auth enforcement', () => {
  test('PUT /api/users/:u without token → 401', async () => {
    const res = await request(app).put('/api/users/someone').send({ displayName: 'x' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/users/:u with other user token → 403', async () => {
    const res = await request(app)
      .put('/api/users/someone')
      .set('Authorization', `Bearer ${makeToken('otheruser')}`)
      .send({ displayName: 'x' });
    expect(res.status).toBe(403);
  });

  test('DELETE /api/users/:u without token → 401', async () => {
    const res = await request(app).delete('/api/users/someone');
    expect(res.status).toBe(401);
  });

  test('GET /api/diagnostics without token → 401', async () => {
    const res = await request(app).get('/api/diagnostics');
    expect(res.status).toBe(401);
  });

  test('GET /api/diagnostics with non-admin token → 403', async () => {
    const res = await request(app)
      .get('/api/diagnostics')
      .set('Authorization', `Bearer ${makeToken('regularuser')}`);
    expect(res.status).toBe(403);
  });

  test('PUT /api/messages/:id without token → 401', async () => {
    const res = await request(app).put('/api/messages/fake-id').send({ text: 'x' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/messages/:id without token → 401', async () => {
    const res = await request(app).delete('/api/messages/fake-id');
    expect(res.status).toBe(401);
  });
});

// ── Users ─────────────────────────────────────────────────
describe('GET /api/users', () => {
  test('returns array', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('user created by login appears in list', async () => {
    await request(app).post('/api/login').send({ username: 'listcheck_user', password: 'pw' });
    const res = await request(app).get('/api/users');
    const usernames = res.body.map(u => u.username);
    expect(usernames).toContain('listcheck_user');
  });
});

// ── Messages ──────────────────────────────────────────────
describe('GET /api/messages', () => {
  test('missing chat param → 400', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(400);
  });

  test('group messages → 200 array', async () => {
    const res = await request(app).get('/api/messages?chat=group');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
