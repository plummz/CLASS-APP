/**
 * Integration tests for CLASS-APP server routes.
 * Focuses on auth enforcement, ownership checks, and route contracts.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const tmpData = path.join(os.tmpdir(), `class-app-test-${Date.now()}.json`);
process.env.DATA_PATH_OVERRIDE = tmpData;
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_USERNAME = 'TestAdmin';
process.env.ADMIN_PASSWORD = 'adminpass123';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../server');

const JWT_SECRET = 'test-jwt-secret';
const ADMIN_USER = 'TestAdmin';
const REGULAR_USER = 'testuser_jest';
const REGULAR_PASSWORD = 'password123';

function makeToken(username, isAdmin = false) {
  return jwt.sign({ username, isAdmin }, JWT_SECRET, { expiresIn: '1h' });
}

async function registerUser(username = REGULAR_USER, password = REGULAR_PASSWORD) {
  return request(app).post('/api/register').send({ username, password });
}

afterAll(() => {
  if (fs.existsSync(tmpData)) fs.unlinkSync(tmpData);
});

describe('Health', () => {
  test('GET /api/ping returns ok', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/config exposes Supabase config keys', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('supabaseUrl');
    expect(res.body).toHaveProperty('supabaseKey');
  });
});

describe('POST /api/register', () => {
  test('stores a regular user and returns a token', async () => {
    const res = await registerUser();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(REGULAR_USER);
  });
});

describe('POST /api/login', () => {
  test('missing fields returns 400', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(400);
  });

  test('wrong admin password returns 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: ADMIN_USER, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('valid non-admin login returns token and user', async () => {
    await registerUser('login_user', REGULAR_PASSWORD);
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'login_user', password: REGULAR_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('login_user');
    expect(res.body.isAdmin).toBe(false);
  });

  test('valid admin login returns isAdmin true', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: ADMIN_USER, password: 'adminpass123' });
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
    expect(res.body.token).toBeDefined();
  });
});

describe('Auth enforcement', () => {
  test('PUT /api/users/:username without token returns 401', async () => {
    const res = await request(app).put('/api/users/someone').send({ displayName: 'x' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/users/:username with another user token returns 403', async () => {
    const res = await request(app)
      .put('/api/users/someone')
      .set('Authorization', `Bearer ${makeToken('otheruser')}`)
      .send({ displayName: 'x' });
    expect(res.status).toBe(403);
  });

  test('DELETE /api/users/:username without token returns 401', async () => {
    const res = await request(app).delete('/api/users/someone');
    expect(res.status).toBe(401);
  });

  test('GET /api/diagnostics without token returns 401', async () => {
    const res = await request(app).get('/api/diagnostics');
    expect(res.status).toBe(401);
  });

  test('GET /api/diagnostics with non-admin token returns 403', async () => {
    const res = await request(app)
      .get('/api/diagnostics')
      .set('Authorization', `Bearer ${makeToken('regularuser')}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/messages without token returns 401', async () => {
    const res = await request(app).post('/api/messages').send({ chat: 'group', text: 'hi' });
    expect(res.status).toBe(401);
  });

  test('POST /api/folders without token returns 401', async () => {
    const res = await request(app).post('/api/folders').send({ parent: 'root', name: 'Docs' });
    expect(res.status).toBe(401);
  });

  test('POST /api/files without token returns 401', async () => {
    const res = await request(app).post('/api/files').send({ folderId: 'abc', name: 'file.txt' });
    expect(res.status).toBe(401);
  });

  test('POST /api/upload without token returns 401', async () => {
    const res = await request(app).post('/api/upload').attach('file', Buffer.from('hello'), 'hello.txt');
    expect(res.status).toBe(401);
  });

  test('POST /api/code-lab/assets without token returns 401', async () => {
    const res = await request(app).post('/api/code-lab/assets').attach('file', Buffer.from('hello'), 'hello.png');
    expect(res.status).toBe(401);
  });

  test('POST /api/summarize-file without token returns 401', async () => {
    const res = await request(app).post('/api/summarize-file').send({ text: 'abc', type: 'short' });
    expect(res.status).toBe(401);
  });

  test('POST /api/quiz without token returns 401', async () => {
    const res = await request(app).post('/api/quiz').send({ text: 'abc', quizType: 'multiple-choice', count: 3 });
    expect(res.status).toBe(401);
  });

  test('POST /api/gemini without token returns 401', async () => {
    const res = await request(app).post('/api/gemini').send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  test('POST /api/groq without token returns 401', async () => {
    const res = await request(app).post('/api/groq').send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users', () => {
  test('returns an array', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('registered user appears in the user list', async () => {
    await registerUser('listcheck_user', REGULAR_PASSWORD);
    const res = await request(app).get('/api/users');
    const usernames = res.body.map((user) => user.username);
    expect(usernames).toContain('listcheck_user');
  });
});

describe('PUT /api/users/:username allowlist', () => {
  test('updates allowed profile fields and ignores protected ones', async () => {
    await registerUser('allowlist_user', REGULAR_PASSWORD);
    const token = makeToken('allowlist_user');
    const res = await request(app)
      .put('/api/users/allowlist_user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Updated Name',
        username: 'TestAdmin',
        isAdmin: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Updated Name');
    expect(res.body.username).toBe('allowlist_user');
    expect(res.body.isAdmin).toBeUndefined();
  });
});

describe('GET /api/messages', () => {
  test('missing chat param returns 400', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(400);
  });

  test('group messages returns an array', async () => {
    const res = await request(app).get('/api/messages?chat=group');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns at most 50 messages by default', async () => {
    await registerUser('message_limit_user', REGULAR_PASSWORD);
    const token = makeToken('message_limit_user');
    for (let index = 0; index < 60; index += 1) {
      const postRes = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ chat: 'group', text: `message-${index}` });
      expect(postRes.status).toBe(200);
    }

    const res = await request(app).get('/api/messages?chat=group');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(50);
    expect(res.body[res.body.length - 1].text).toBe('message-59');
  });
});
