const mongoose = require('mongoose');
const User = require('./models/User');

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

const getUserById = async (id) => {
  try {
    const user = await User.findById(id).select('-passwordHash');
    return user || null;
  } catch (err) {
    return null;
  }
};

const updateUserProfile = async (id, { displayName, bio, profilePicture }) => {
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { displayName, bio, profilePicture },
      { new: true }
    ).select('-passwordHash');
    return user || null;
  } catch (err) {
    return null;
  }
};

module.exports = { init, createUser, findUserByUsernameOrEmail, getUserById, updateUserProfile, User };
