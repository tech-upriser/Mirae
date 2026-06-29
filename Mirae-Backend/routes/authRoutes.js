const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // 🔐 Added for the "VIP Wristband"
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');
const googleCalendarController = require('../controllers/googleCalendarController');

const router = express.Router();

// 1. CHANGED: From '/signup' to '/register' to match your authService
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    // 🔐 GENERATE TOKEN: This is what allows the Chrome Extension to work!
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Signup successful',
      token, // 👈 Sending this to the frontend
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔐 GENERATE TOKEN
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Login successful',
      token, // 👈 Now the dashboard can actually fetch your jobs!
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/google/url', protect, googleCalendarController.getGoogleAuthUrl);
router.get('/google/status', protect, googleCalendarController.getGoogleConnectionStatus);
router.post('/google/sync', protect, googleCalendarController.syncGoogleCalendar);
router.post('/google/disconnect', protect, googleCalendarController.disconnect);
router.get('/google/callback', googleCalendarController.handleGoogleCallback);

module.exports = router;
