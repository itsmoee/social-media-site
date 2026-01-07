const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const { init, createUser, findUserByUsernameOrEmail, getUserById, updateUserProfile, createPost, listPosts, deletePost, updatePost, toggleLike, getLikeCount, sendMessage, getConversation, getConversations, markMessagesAsRead, getUnreadCount } = require('./db');

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
  // Raise JSON body size to allow base64 images for profile photos
  app.use(express.json({ limit: '16mb' }));

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

    // For API routes, always return JSON 401
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For HTML pages, redirect to login
    return res.redirect('/index.html?login=1');
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

  function toPublicPost(p) {
    return {
      id: p._id,
      content: p.content,
      createdAt: p.createdAt,
      author: toPublicUser(p.user)
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

  // Posts routes
  app.get('/api/posts', requireAuth, async (req, res) => {
    try {
      console.log('GET /api/posts user', req.session.userId);
      const posts = await listPosts({ limit: 50 });
      res.json({ posts: posts.map(toPublicPost) });
    } catch (err) {
      console.error('list posts error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/posts', requireAuth, async (req, res) => {
    try {
      const { content } = req.body || {};
      console.log('POST /api/posts user', req.session.userId, 'content length', content?.length);
      if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });
      if (content.length > 500) return res.status(400).json({ error: 'Content too long (max 500 characters)' });

      const post = await createPost({ userId: req.session.userId, content: content.trim() });
      res.status(201).json({ post: toPublicPost(post) });
    } catch (err) {
      console.error('create post error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete post
  app.delete('/api/posts/:postId', requireAuth, async (req, res) => {
    try {
      const result = await deletePost(req.params.postId, req.session.userId);
      if (result === null) return res.status(404).json({ error: 'Post not found' });
      if (result === false) return res.status(403).json({ error: 'Not authorized to delete this post' });
      res.json({ ok: true });
    } catch (err) {
      console.error('delete post error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update post
  app.put('/api/posts/:postId', requireAuth, async (req, res) => {
    try {
      const { content } = req.body || {};
      if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });
      if (content.length > 500) return res.status(400).json({ error: 'Content too long' });

      const result = await updatePost(req.params.postId, req.session.userId, { content });
      if (result === null) return res.status(404).json({ error: 'Post not found' });
      if (result === false) return res.status(403).json({ error: 'Not authorized' });
      res.json({ post: toPublicPost(result) });
    } catch (err) {
      console.error('update post error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Like/Unlike post
  app.post('/api/posts/:postId/like', requireAuth, async (req, res) => {
    try {
      const result = await toggleLike(req.params.postId, req.session.userId);
      if (!result) return res.status(404).json({ error: 'Post not found' });
      const likeCount = await getLikeCount(req.params.postId);
      res.json({ liked: result.liked, likeCount });
    } catch (err) {
      console.error('toggle like error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Messages routes
  app.post('/api/messages/send', requireAuth, async (req, res) => {
    try {
      const { recipientId, content } = req.body || {};
      if (!recipientId || !content) return res.status(400).json({ error: 'Recipient and content required' });
      if (content.length > 1000) return res.status(400).json({ error: 'Message too long' });

      const message = await sendMessage({
        senderId: req.session.userId,
        recipientId,
        content: content.trim()
      });
      if (!message) return res.status(400).json({ error: 'Failed to send message' });
      res.status(201).json({ message });
    } catch (err) {
      console.error('send message error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Get conversation with a user
  app.get('/api/messages/conversation/:userId', requireAuth, async (req, res) => {
    try {
      const messages = await getConversation(req.session.userId, req.params.userId);
      await markMessagesAsRead(req.params.userId, req.session.userId);
      res.json({ messages });
    } catch (err) {
      console.error('get conversation error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // List all conversations
  app.get('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
      const conversations = await getConversations(req.session.userId);
      const unreadCount = await getUnreadCount(req.session.userId);
      res.json({ conversations, unreadCount });
    } catch (err) {
      console.error('get conversations error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Change password
  app.post('/api/user/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const user = await getUserById(req.session.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

      const newHash = await bcrypt.hash(newPassword, 10);
      await updateUserProfile(req.session.userId, { password: newHash });
      res.json({ ok: true });
    } catch (err) {
      console.error('change password error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update profile settings
  app.put('/api/user/settings', requireAuth, async (req, res) => {
    try {
      const { displayName, bio, email } = req.body || {};
      const update = {};
      if (displayName !== undefined) update.displayName = displayName;
      if (bio !== undefined) update.bio = bio;
      if (email !== undefined) update.email = email.toLowerCase();

      const user = await updateUserProfile(req.session.userId, update);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: toPublicUser(user) });
    } catch (err) {
      console.error('update settings error:', err);
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
