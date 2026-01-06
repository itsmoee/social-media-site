const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const { init, createUser, findUserByUsernameOrEmail, getUserById, updateUserProfile } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'devsecret-change-me';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI env var not set');
  process.exit(1);
}

// Initialize MongoDB connection
init().then(() => {
  // Start server only after DB connection
  startServer();
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});

function startServer() {
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use(
    session({
      store: MongoStore.create({ mongoUrl: MONGODB_URI }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      }
    })
  );

  // Auth helpers
  function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    if (req.accepts('html')) {
      return res.redirect('/index.html?login=1');
    }
    res.status(401).json({ error: 'Unauthorized' });
  }

  function toPublicUser(u) {
    if (!u) return null;
    return {
      id: u._id || u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      bio: u.bio,
      profilePicture: u.profilePicture,
      createdAt: u.createdAt
    };
  }

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password, displayName } = req.body || {};
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
      }
      if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const existing = await findUserByUsernameOrEmail(username) || await findUserByUsernameOrEmail(email);
      if (existing) return res.status(409).json({ error: 'Username or email already in use' });

      const passwordHash = await bcrypt.hash(password, 10);
      const created = await createUser({ username, email, displayName, passwordHash });

      // Log in
      req.session.userId = created.id;
      res.json({ user: toPublicUser(created) });
    } catch (err) {
      console.error(err);
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Username or email already in use' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

      const user = await findUserByUsernameOrEmail(identifier);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      req.session.userId = user._id.toString();
      res.json({ user: toPublicUser(user) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    if (!req.session) return res.json({ ok: true });
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      if (!req.session || !req.session.userId) return res.json({ user: null });
      const user = await getUserById(req.session.userId);
      res.json({ user: toPublicUser(user) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const { displayName, bio, profilePicture } = req.body || {};
      const user = await updateUserProfile(req.session.userId, { displayName, bio, profilePicture });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: toPublicUser(user) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Explicitly protect key pages
  app.get(['/messages.html', '/profile.html', '/settings.html'], requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, req.path.replace(/\/+/, '/')));
  });

  // Serve root and static assets
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.use(express.static(__dirname));

  app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));
}
