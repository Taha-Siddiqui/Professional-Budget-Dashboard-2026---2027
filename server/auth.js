const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { USERS, SESSION_SECRET } = require('./config');

const COOKIE_NAME = 'reo_token';
const TOKEN_TTL = '8h';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours, matches TOKEN_TTL

function findUser(username) {
  return USERS.find((u) => u.username.toLowerCase() === String(username || '').toLowerCase());
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Netlify serves everything over HTTPS, so the secure flag is safe to
    // require there. Locally over plain http, only enforce it once you've
    // explicitly set NODE_ENV=production.
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  };
}

function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password are required.' });
  }

  const user = findUser(username);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid username or password.' });
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ ok: false, error: 'Invalid username or password.' });
  }

  const sessionUser = { username: user.username, displayName: user.displayName, role: user.role };
  const token = jwt.sign(sessionUser, SESSION_SECRET, { expiresIn: TOKEN_TTL });

  res.cookie(COOKIE_NAME, token, cookieOptions());
  return res.json({ ok: true, user: sessionUser });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
}

function verifyRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const { username, displayName, role } = jwt.verify(token, SESSION_SECRET);
    return { username, displayName, role };
  } catch (err) {
    // expired or tampered token
    return null;
  }
}

function sessionInfo(req, res) {
  const user = verifyRequest(req);
  if (user) return res.json({ authenticated: true, user });
  return res.json({ authenticated: false });
}

function requireAuth(req, res, next) {
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated.' });
  req.user = user;
  return next();
}

module.exports = { login, logout, sessionInfo, requireAuth };
