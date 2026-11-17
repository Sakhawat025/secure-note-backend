const express = require('express');
const User = require('../models/User');
const Note = require('../models/Note');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/grouped-by-interests', protect, adminOnly, async (req, res) => {
    try {
    const groupedUsers = await User.aggregate([
      { $match: { interests: { $exists: true, $ne: [] } } },
      { $unwind: '$interests' },
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: {
            $push: {
              _id: '$_id',
              name: '$name',
              email: '$email',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(groupedUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({}),
    ]);

    res.json({
      users,
      page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, interests } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'admin' : 'user',
      interests: Array.isArray(interests) ? interests : [],
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, role, interests, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    if (role) user.role = role;
    if (Array.isArray(interests)) user.interests = interests;
    if (password) user.password = password; 

    const updated = await user.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      interests: updated.interests,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Note.deleteMany({ user: user._id });
    await user.deleteOne();

    res.json({ message: 'User and associated notes deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;