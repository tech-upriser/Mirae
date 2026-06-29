const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const User = require('../models/User');
const Job = require('../models/Job');
const bcrypt = require('bcrypt');
const { resumeUploadDir } = require('../middlewares/uploadMiddleware');
const { extractSkillsWithAI } = require('./trackerController');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const deleteFileIfExists = async (targetPath) => {
  if (!targetPath) return;
  try {
    await fs.promises.unlink(targetPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('File delete error:', error);
    }
  }
};

const extractResumeText = async (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (extension === '.pdf' || file.mimetype === 'application/pdf') {
    const buffer = await fs.promises.readFile(file.path);
    const parsed = await pdfParse(buffer);
    return (parsed.text || '').trim();
  }

  return (await fs.promises.readFile(file.path, 'utf8')).trim();
};

// Get the logged-in user's profile data
exports.getProfile = async (req, res) => {
  try {
    // req.user.id comes from your authMiddleware (the Bouncer)
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user.id }
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email is already in use" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: name.trim(),
          email: normalizedEmail,
          "settings.profile.name": name.trim(),
          "settings.profile.email": normalizedEmail
        }
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const photoUrl = `${baseUrl}/uploads/profile/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: photoUrl },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Profile photo uploaded successfully",
      profilePhoto: photoUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error("Profile Photo Upload Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await Promise.all([
      Job.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    return res.status(200).json({
      message: "Account and related application data deleted successfully"
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Save or update the user's resume text
exports.updateResume = async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: "No resume text provided" });
    }

    const resumeSkills = await extractSkillsWithAI(resumeText, true);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { resumeText, resumeSkills },
      { new: true } // Returns the updated document
    ).select('-password');

    res.status(200).json({ 
      message: "✅ Resume updated successfully!", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Resume Update Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const resumeText = await extractResumeText(req.file);

    if (!resumeText || resumeText.length < 20) {
      await deleteFileIfExists(req.file.path);
      return res.status(400).json({ error: 'Could not extract enough text from the uploaded resume' });
    }

    const existingUser = await User.findById(req.user.id).select('resumeFileName');
    if (!existingUser) {
      await deleteFileIfExists(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }

    const previousFileName = existingUser.resumeFileName;

    const resumeSkills = await extractSkillsWithAI(resumeText, true);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        resumeText,
        resumeSkills,
        resumeFileName: req.file.filename,
        resumeUploadedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (previousFileName && previousFileName !== req.file.filename) {
      await deleteFileIfExists(path.join(resumeUploadDir, previousFileName));
    }

    return res.status(200).json({
      message: 'Resume uploaded successfully',
      user: updatedUser,
      stats: {
        fileName: req.file.originalname,
        storedFileName: req.file.filename,
        uploadedAt: updatedUser.resumeUploadedAt,
        charCount: resumeText.length,
      }
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteFileIfExists(req.file.path);
    }
    console.error('Resume Upload Error:', error);
    return res.status(500).json({ error: 'Failed to upload resume' });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const previousFileName = user.resumeFileName;
    user.resumeText = '';
    user.resumeFileName = '';
    user.resumeUploadedAt = null;
    await user.save();

    if (previousFileName) {
      await deleteFileIfExists(path.join(resumeUploadDir, previousFileName));
    }

    return res.status(200).json({ message: 'Resume deleted successfully', user });
  } catch (error) {
    console.error('Resume Delete Error:', error);
    return res.status(500).json({ error: 'Failed to delete resume' });
  }
};

// Save or update the user's social links array
exports.updateSocialLinks = async (req, res) => {
  try {
    const { socialLinks } = req.body;

    if (!Array.isArray(socialLinks)) {
      return res.status(400).json({ error: "Social links must be an array" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { socialLinks },
      { new: true }
    ).select('-password');

    res.status(200).json({ 
      message: "✅ Social portfolio updated successfully!", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Social Links Update Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
