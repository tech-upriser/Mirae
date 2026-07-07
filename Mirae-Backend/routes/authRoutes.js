const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // 🔐 Added for the "VIP Wristband"
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { protect } = require('../middlewares/authMiddleware');
const googleCalendarController = require('../controllers/googleCalendarController');

const router = express.Router();

// ─── Email Transporter Setup ────────────────────────────────────────────────
// If EMAIL_USER and EMAIL_PASS are set, use Gmail SMTP.
// Otherwise, fall back to logging OTP to the console (dev mode).
let transporter = null;

const emailUser = process.env.EMAIL_USER || '';
const emailPass = process.env.EMAIL_PASS || '';

// Only configure SMTP if real credentials are set (not placeholders)
const isPlaceholder = !emailUser || !emailPass
  || emailUser.includes('your-email')
  || emailPass.includes('your-gmail-app-password');

if (!isPlaceholder) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
  console.log('📧 Email transporter configured with Gmail SMTP');
} else {
  console.log('📧 Email credentials not configured — OTPs will be logged to console (dev mode)');
}

// ─── Helper: Generate a 6-digit OTP ─────────────────────────────────────────
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// ─── Helper: Validate Gmail address ─────────────────────────────────────────
function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
}

// ─── 1. SEND OTP ────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate Gmail
    if (!isValidGmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Only @gmail.com addresses are allowed.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Generate and store OTP (old ones for this email get replaced)
    const code = generateOtp();
    await Otp.deleteMany({ email: normalizedEmail }); // Clear previous OTPs
    await Otp.create({ email: normalizedEmail, code });

    // Send email — fall back to console if SMTP fails
    let emailSent = false;
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Mirae" <${emailUser}>`,
          to: normalizedEmail,
          subject: 'Your Mirae Verification Code',
          html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; border-radius: 12px; border: 1px solid #1a1a2e;">
              <h2 style="color: #e0e0ff; margin-bottom: 8px;">Welcome to Mirae ✨</h2>
              <p style="color: #a0a0b8; font-size: 14px;">Use the code below to verify your email and complete signup:</p>
              <div style="background: #12122a; border: 1px solid #2a2a4a; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #7c5cfc;">${code}</span>
              </div>
              <p style="color: #606078; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
            </div>
          `,
        });
        emailSent = true;
        console.log(`✅ OTP sent to ${normalizedEmail}`);
      } catch (smtpError) {
        console.error('📧 SMTP failed, falling back to console:', smtpError.message);
      }
    }

    if (!emailSent) {
      // Dev fallback: log to console
      console.log(`\n🔑 [DEV MODE] OTP for ${normalizedEmail}: ${code}\n`);
    }

    return res.status(200).json({ message: 'Verification code sent to your email.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Failed to send verification code.' });
  }
});

// ─── 2. REGISTER (with OTP verification) ────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ error: 'Name, email, password, and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate Gmail
    if (!isValidGmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Only @gmail.com addresses are allowed.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ email: normalizedEmail, code: otp.trim() });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // OTP is valid — delete it so it can't be reused
    await Otp.deleteMany({ email: normalizedEmail });

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

// ─── 3. LOGIN ROUTE ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate Gmail on login too
    if (!isValidGmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Only @gmail.com addresses are allowed.' });
    }

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
