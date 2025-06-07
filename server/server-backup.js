require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js'); // For hashing the security key
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path'); // For handling file paths
const multer = require('multer'); // For handling file uploads
const fs = require('fs'); // For checking and creating directories
const { type } = require('os');
const cron = require('node-cron'); // NEW: For scheduling tasks

// Ensure the "uploads" folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created uploads folder:', uploadDir);
}

// Initialize the app
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads folder so profile pictures can be accessed
app.use('/uploads', express.static('uploads'));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this folder exists in your project directory
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/kycdb', {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the User schema with additional profile fields
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Additional fields for profile updates
  walletAddress: { type: String },
  country: { type: String },
  city: { type: String },
  phoneNumber: { type: String },
  phoneCountryCode: { type: String }, // Added field for country code
  isAdult: { type: Boolean },
  notifyQuestUpdates: { type: Boolean, default: true },
  notifyRewardAlerts: { type: Boolean, default: true },
  profilePicture: { type: String },
});

const User = mongoose.model('User', userSchema);

// Security Key (store in an environment variable)
const correctKey = process.env.SECURITY_KEY;

// **Rate Limiting for Signups**
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per IP
  message: { error: 'Too many signup attempts. Please try again later.' },
});

// **Sign-up API (Captcha removed)**
app.post('/api/signup', signupLimiter, async (req, res) => {
  const { firstName, lastName, username, email, password, confirmPassword } = req.body;

  // Continue Normal Signup Flow
  if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ firstName, lastName, username, email, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: 'User signed up successfully!' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Get all users API endpoint
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Get a single user by ID
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by id:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Login API endpoint (modified to include user ID in response)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: 'Incorrect password.' });
    }

    const encryptionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const encryptedKey = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    let encrypted = encryptedKey.update(process.env.SECURITY_KEY, 'utf8', 'hex');
    encrypted += encryptedKey.final('hex');

    sendEmail(user.email, 'Encrypted Key', `Your encrypted key: ${encrypted}`, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Error sending email. Please try again later.' });
      }
      console.log('Email sent successfully:', info);
    });

    // Modified response: include user._id converted to a string along with username
    res.status(200).json({
      message: 'Login successful!',
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email
      },
      encryptedKey: encrypted,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Delete user API endpoint
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Update user profile API endpoint with enhanced logging
app.put('/api/users/:id', upload.single('profilePicture'), async (req, res) => {
  console.log('--- Update Profile Request Received ---');
  console.log('req.params:', req.params);
  console.log('req.body:', req.body);

  let id = req.params.id;
  if (!id || id === 'undefined') {
    id = req.body._id;
  }
  console.log('Using id:', id);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  
  const updateData = {
    walletAddress: req.body.walletAddress,
    country: req.body.country,
    city: req.body.city,
    phoneNumber: req.body.phoneNumber,
    phoneCountryCode: req.body.phoneCountryCode,
    isAdult: req.body.isAdult === 'true' || req.body.isAdult === true,
    notifyQuestUpdates: req.body.notifyQuestUpdates === 'true' || req.body.notifyQuestUpdates === true,
    notifyRewardAlerts: req.body.notifyRewardAlerts === 'true' || req.body.notifyRewardAlerts === true,
  };

  if (req.body.username) {
    updateData.username = req.body.username;
  }

  if (req.file) {
    updateData.profilePicture = req.file.path;
  }

  try {
    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    console.log('User updated successfully:', user);
    return res.status(200).json({ message: 'Profile updated successfully!', user });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Reset Password API endpoint
app.put('/api/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  console.log(`Reset password request received for user id: ${id}`);
  console.log(`New password received: ${newPassword ? '***' : 'none'}`);

  if (!newPassword) {
    console.error('No newPassword provided in request body.');
    return res.status(400).json({ error: 'New password is required.' });
  }
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );
    if (!user) {
      console.error(`User not found for id: ${id}`);
      return res.status(404).json({ error: 'User not found.' });
    }
    console.log(`Password updated successfully for user id: ${id}`);
    res.status(200).json({ message: 'Password reset successfully!' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Setup Two-Factor Authentication (2FA) API endpoint
app.post('/api/users/:id/setup-2fa', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const twoFASecret = crypto.randomBytes(20).toString('hex');
    sendEmail(user.email, '2FA Setup Instructions', `Your 2FA secret is: ${twoFASecret}. Please use it to setup your authenticator app.`, (error, info) => {
      if (error) {
        console.error('Error sending 2FA setup email:', error);
      } else {
        console.log('2FA setup email sent:', info);
      }
    });
    res.status(200).json({ message: '2FA setup initiated. Please check your email for further instructions.', twoFASecret });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Apply for KYC API endpoint
app.post('/api/users/:id/apply-kyc', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.kycStatus = 'Pending';
    await user.save();
    res.status(200).json({ message: 'KYC application submitted successfully!' });
  } catch (error) {
    console.error('Error applying for KYC:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Generate security key
app.get('/api/generate-key', (req, res) => {
  try {
    const hashedKey = CryptoJS.SHA256(correctKey).toString();
    console.log('Generated Key:', hashedKey);
    res.status(200).json({ securityKey: correctKey, hashedKey, message: 'Generated security key successfully!' });
  } catch (error) {
    console.error('Error generating key:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// ----------------------
// NEW: Approved Images Endpoints & Cron Job
// ----------------------

// In-memory storage for approved images
let approvedImages = [];

// GET endpoint to retrieve approved images
app.get('/api/approved-images', (req, res) => {
  res.json(approvedImages);
});

// POST endpoint to add an approved image (modified to expect 'url')
app.post('/api/approved-images', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  approvedImages.push(url);
  res.status(200).json({ message: 'Image added successfully.' });
});

// DELETE endpoint to clear approved images
app.delete('/api/approved-images', (req, res) => {
  approvedImages = [];
  res.json({ message: 'Approved images cleared successfully.' });
});

// Cron job: Clear approved images at 00:05 (5 minutes after midnight) Romania time.
cron.schedule('5 0 * * *', () => {
  approvedImages = [];
  console.log('Approved images cleared at 00:05 Romania time.');
}, {
  scheduled: true,
  timezone: 'Europe/Bucharest'
});

// ----------------------
// NEW: Pending Images Endpoints
// ----------------------

// In-memory storage for pending images
let pendingImages = [];

// GET endpoint to retrieve pending images
app.get('/api/pending-images', (req, res) => {
  res.json(pendingImages);
});

// POST endpoint to add a pending image (expects 'url' in the body)
app.post('/api/pending-images', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  pendingImages.push(url);
  res.status(200).json({ message: 'Pending image added successfully.' });
});

// DELETE endpoint to remove a pending image by index
app.delete('/api/pending-images/:index', (req, res) => {
  const { index } = req.params;
  const idx = parseInt(index);
  if (isNaN(idx) || idx < 0 || idx >= pendingImages.length) {
    return res.status(400).json({ error: 'Invalid index.' });
  }
  pendingImages.splice(idx, 1);
  res.status(200).json({ message: 'Pending image deleted successfully.' });
});

// ----------------------
// NEW: Endpoint to upload an image to the server
// ----------------------
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  const imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
  // FIX: Also add the uploaded image URL to the pending images array
  pendingImages.push(imageUrl);
  res.status(200).json({ url: imageUrl });
});

// --------------------------------------------------------------------
// NEW: Confession Schema and Endpoints (for all accounts to see confessions)
// --------------------------------------------------------------------

const confessionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['anonymous', 'public'], default: 'anonymous' },
  file: { type: String, default: null },
  video: { type: String, default: null },
  user: { type: String, required: true },
  username: { type: String, default: '' }, // NEW: Store the username who submitted the confession
  votes: { type: Number, default: 0 },
  reports: { type: Number, default: 0 },
  upvotedBy: { type: [String], default: [] },
  reportedBy: { type: [String], default: [] },
  hidden: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  boostedUntil: { type: Date, default: null },
  rewarded: { type: Boolean, default: false }
});

const Confession = mongoose.model('Confession', confessionSchema);

// POST endpoint to submit a confession
app.post('/api/confessions', async (req, res) => {
  try {
    const { text, type, file, video, user, username, votes, reports, upvotedBy, reportedBy, timestamp, boostedUntil } = req.body;
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 50) {
      return res.status(400).json({ error: 'Confession must be at least 50 words.' });
    }
    const confession = new Confession({
      text,
      type,
      file,
      video,
      user,
      username,
      votes: votes || 0,
      reports: reports || 0,
      upvotedBy: upvotedBy || [],
      reportedBy: reportedBy || [],
      timestamp: timestamp || Date.now(),
      boostedUntil: boostedUntil || null
    });
    await confession.save();
    res.status(201).json({ message: 'Confession submitted successfully!', confession });
  } catch (error) {
    console.error('Error submitting confession:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// GET endpoint to retrieve all confessions (non-hidden)
app.get('/api/confessions', async (req, res) => {
  try {
    const confessions = await Confession.find({ hidden: { $ne: true } }).sort({ timestamp: -1 });
    res.status(200).json(confessions);
  } catch (error) {
    console.error('Error fetching confessions:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Delete All Confessions Endpoint (admin only)
app.delete('/api/confessions/all-delete', async (req, res) => {
  const { admin } = req.body;
  if (!admin) {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  try {
    await Confession.deleteMany({});
    res.status(200).json({ message: 'All confessions deleted successfully.' });
  } catch (error) {
    console.error('Error deleting all confessions:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// DELETE endpoint to remove a confession
app.delete('/api/confessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, admin } = req.body;
    const confession = await Confession.findById(id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }
    if (!admin && confession.user !== user) {
      return res.status(403).json({ error: 'You can only delete your own confessions.' });
    }
    await Confession.findByIdAndDelete(id);
    res.status(200).json({ message: 'Confession deleted successfully.' });
  } catch (error) {
    console.error('Error deleting confession:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Upvote Confession Endpoint
app.post('/api/confessions/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;
    const confession = await Confession.findById(id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }
    if (confession.upvotedBy.includes(user)) {
      return res.status(400).json({ error: 'You have already upvoted this confession.' });
    }
    confession.upvotedBy.push(user);
    confession.votes += 1;
    await confession.save();
    res.status(200).json({ message: 'Confession upvoted successfully.', confession });
  } catch (error) {
    console.error('Error upvoting confession:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Report Confession Endpoint
app.post('/api/confessions/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;
    const confession = await Confession.findById(id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }
    if (confession.reportedBy.includes(user)) {
      return res.status(400).json({ error: 'Only one report per account is allowed.' });
    }
    confession.reportedBy.push(user);
    confession.reports += 1;
    if (confession.reports >= 5) {
      confession.hidden = true;
    }
    await confession.save();
    res.status(200).json({ message: 'Confession reported successfully.', confession });
  } catch (error) {
    console.error('Error reporting confession:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Get Total Reports for a User's Confessions
app.get('/api/users/:user/reports', async (req, res) => {
  try {
    const { user } = req.params;
    const confessions = await Confession.find({ user });
    const totalReports = confessions.reduce((sum, conf) => sum + (conf.reports || 0), 0);
    res.status(200).json({ totalReports });
  } catch (error) {
    console.error('Error fetching reports for user:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});

// Send Email Function
function sendEmail(to, subject, text, callback) {
  const mailOptions = {
    from: 'test@testing.com',
    to: to,
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, info);
  });
}

// Email Transporter (MailHog Example)
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
  logger: true,   // Enable logging
  debug: true     // Show debug output
});

// NEW: Endpoint to send the admin code email using MailHog
app.post('/api/send-admin-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }
  sendEmail(email, 'Admin Access Code', `Your admin access code is: ${code}`, (error, info) => {
    if (error) {
      console.error('Error sending admin code email:', error);
      return res.status(500).json({ error: 'Error sending email. Please try again later.' });
    }
    res.status(200).json({ message: 'Admin code sent successfully.' });
  });
});
