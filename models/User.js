const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    interests: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Strictly required indexes defined via schema.index for code review visibility
// 1. Supports authentication lookup and enforces unique emails
userSchema.index({ email: 1 }, { unique: true });

// 2. Supports Admin paginated list of all users sorted by newest first
userSchema.index({ createdAt: -1 });

// 3. Multikey index to support Scenario 1 aggregation (grouping/matching by interests)
userSchema.index({ interests: 1 });

// Password hashing middleware before saving (Mongoose 8+ async syntax without 'next')
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);