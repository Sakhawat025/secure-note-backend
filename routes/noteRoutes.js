const express = require('express');
const Note = require('../models/Note');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();


router.get('/', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(filter),
    ]);

    res.json({
      notes,
      page,
      totalPages: Math.ceil(total / limit),
      totalNotes: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      Note.find({})
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments({}),
    ]);

    res.json({
      notes,
      page,
      totalPages: Math.ceil(total / limit),
      totalNotes: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this note' });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post('/', protect, async (req, res) => {
  try {
    const { title, content } = req.body;

    const note = await Note.create({
      title,
      content,
      user: req.user._id,
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.put('/:id', protect, async (req, res) => {
  try {
    const { title, content } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    note.title = title || note.title;
    note.content = content || note.content;

    const updatedNote = await note.save();
    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.delete('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    await note.deleteOne();
    res.json({ message: 'Note removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;