const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Like = require('./models/Like');

// Connect to MongoDB
const init = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI env var not set');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

const createUser = async ({ username, email, displayName, passwordHash }) => {
  const user = new User({ username, email, displayName, passwordHash });
  await user.save();
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    profilePicture: user.profilePicture
  };
};

const findUserByUsernameOrEmail = async (identifier) => {
  const user = await User.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  });
  return user || null;
};

const createPost = async ({ userId, content }) => {
  const post = new Post({ user: userId, content });
  await post.save();
  await post.populate('user', 'username displayName profilePicture');
  return post;
};

const listPosts = async ({ limit = 20 } = {}) => {
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'username displayName profilePicture');
  return posts;
};

const getUserById = async (id) => {
  try {
    const user = await User.findById(id).select('-passwordHash');
    return user || null;
  } catch (err) {
    return null;
  }
};

const updateUserProfile = async (id, { displayName, bio, profilePicture, email, password }) => {
  try {
    const update = {};
    if (displayName !== undefined) update.displayName = displayName;
    if (bio !== undefined) update.bio = bio;
    if (profilePicture !== undefined) update.profilePicture = profilePicture;
    if (email !== undefined) update.email = email;
    if (password !== undefined) update.passwordHash = password;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).select('-passwordHash');
    return user || null;
  } catch (err) {
    console.error('updateUserProfile error:', err);
    return null;
  }
};

// ===== Post Operations =====
const deletePost = async (postId, userId) => {
  try {
    const post = await Post.findById(postId);
    if (!post) return null;
    if (post.user.toString() !== userId.toString()) return false; // Not authorized
    await Post.findByIdAndDelete(postId);
    return true;
  } catch (err) {
    console.error('deletePost error:', err);
    return null;
  }
};

const updatePost = async (postId, userId, { content }) => {
  try {
    const post = await Post.findById(postId);
    if (!post) return null;
    if (post.user.toString() !== userId.toString()) return false; // Not authorized
    post.content = content.trim();
    await post.save();
    await post.populate('user', 'username displayName profilePicture');
    return post;
  } catch (err) {
    console.error('updatePost error:', err);
    return null;
  }
};

// ===== Like Operations =====
const toggleLike = async (postId, userId) => {
  try {
    const existing = await Like.findOne({ post: postId, user: userId });
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      const post = await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } }, { new: true });
      return { liked: false, post };
    } else {
      await Like.create({ post: postId, user: userId });
      const post = await Post.findByIdAndUpdate(postId, { $push: { likes: userId } }, { new: true });
      return { liked: true, post };
    }
  } catch (err) {
    console.error('toggleLike error:', err);
    return null;
  }
};

const getLikeCount = async (postId) => {
  try {
    return await Like.countDocuments({ post: postId });
  } catch (err) {
    console.error('getLikeCount error:', err);
    return 0;
  }
};

// ===== Message Operations =====
const sendMessage = async ({ senderId, recipientId, content }) => {
  try {
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content: content.trim()
    });
    await message.save();
    await message.populate('sender', 'username displayName profilePicture');
    await message.populate('recipient', 'username displayName profilePicture');
    return message;
  } catch (err) {
    console.error('sendMessage error:', err);
    return null;
  }
};

const getConversation = async (userId, otherUserId, limit = 50) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username displayName profilePicture')
      .populate('recipient', 'username displayName profilePicture');
    return messages.reverse(); // Oldest first
  } catch (err) {
    console.error('getConversation error:', err);
    return [];
  }
};

const getConversations = async (userId) => {
  try {
    // Get unique conversation partners
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { recipient: new mongoose.Types.ObjectId(userId) }]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', new mongoose.Types.ObjectId(userId)] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 50 }
    ]);

    // Populate user details
    const populated = await Promise.all(
      messages.map(async (conv) => {
        const user = await User.findById(conv._id).select('username displayName profilePicture');
        return { conversationWith: user, lastMessage: conv.lastMessage };
      })
    );
    return populated;
  } catch (err) {
    console.error('getConversations error:', err);
    return [];
  }
};

const markMessagesAsRead = async (conversationId, userId) => {
  try {
    await Message.updateMany(
      { recipient: userId, sender: conversationId, isRead: false },
      { $set: { isRead: true } }
    );
    return true;
  } catch (err) {
    console.error('markMessagesAsRead error:', err);
    return false;
  }
};

const getUnreadCount = async (userId) => {
  try {
    return await Message.countDocuments({ recipient: userId, isRead: false });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
};

module.exports = { 
  init, 
  createUser, 
  findUserByUsernameOrEmail, 
  getUserById, 
  updateUserProfile, 
  createPost, 
  listPosts, 
  deletePost,
  updatePost,
  toggleLike,
  getLikeCount,
  sendMessage,
  getConversation,
  getConversations,
  markMessagesAsRead,
  getUnreadCount,
  User, 
  Post, 
  Message,
  Like
};
