const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, default: null },
    bio: { type: String, default: null },
    profilePicture: { type: String, default: null }, // Cloudinary URL
    profilePicturePublicId: { type: String, default: null }, // For deletion
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
