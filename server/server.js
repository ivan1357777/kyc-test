require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { type } = require('os');
const cron = require('node-cron');
const { Connection, Keypair, PublicKey, Transaction, LAMPORTS_PER_SOL, clusterApiUrl } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');

// Initialize Express app and middleware
const app = express();
const port = 5000;

// Middleware setup
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.urlencoded({ extended: true }));

// Move rate limiter initialization here
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many signup attempts. Please try again later.' }
});

// Ensure the "uploads" folder exists and setup static serving
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created uploads folder:', uploadDir);
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// read your .env value
const keypairEnv = process.env.KYC_WALLET_KEYPAIR_PATH;
if (!keypairEnv) {
  console.error('❌ KYC_WALLET_KEYPAIR_PATH not set in .env');
  process.exit(1);
}

// Use absolute path resolution from server directory
const keypairPath = path.resolve(__dirname, keypairEnv);
console.log('🔑 Loading vault keypair from', keypairPath);

let vaultKeypair;
try {
  // Check if file exists
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Keypair file not found at ${keypairPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(keypairPath, 'utf8');
  
  // Validate JSON format
  let secret;
  try {
    secret = JSON.parse(raw);
  } catch (parseError) {
    console.error('❌ Invalid JSON in keypair file:', parseError);
    process.exit(1);
  }

  // Validate array format
  if (!Array.isArray(secret) || secret.length !== 64) {
    console.error('❌ Invalid keypair format: Expected 64-byte array');
    process.exit(1);
  }

  // Create keypair
  vaultKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  
  // Verify keypair is valid
  if (!vaultKeypair || !vaultKeypair.publicKey) {
    throw new Error('Invalid keypair generated');
  }

  console.log('✅ Vault keypair loaded successfully');
  console.log('🔑 Vault Wallet Address:', vaultKeypair.publicKey.toString());
  console.log('📝 Public key:', vaultKeypair.publicKey.toBase58());

} catch (err) {
  console.error(`❌ Failed to load vault keypair from ${keypairPath}:`, err);
  process.exit(1);
}

// Make sure .env is loaded:
if (!process.env.SNV2_MINT_ADDRESS) {
  console.error('❌ SNV2_MINT_ADDRESS is not set in your .env file');
  process.exit(1);
}

console.log('▶️ Using SNV2 mint:', process.env.SNV2_MINT_ADDRESS);

let mintPublicKey;
try {
  mintPublicKey = new PublicKey(process.env.SNV2_MINT_ADDRESS);
} catch (err) {
  console.error('❌ Invalid SNV2_MINT_ADDRESS:', process.env.SNV2_MINT_ADDRESS);
  console.error(err);
  process.exit(1);
}

// now mintPublicKey is safe to use...
const connection = new Connection(clusterApiUrl(process.env.SOLANA_CLUSTER || 'devnet'));

// Add wallet and mint address constants
const VAULT_WALLET_ADDRESS = "3fBHbMdcBTAHBs9P8XhHRZHeoMsReM4Z4JL572iLFpqq";
const SNV2_MINT_ADDRESS = "4nM4vQGczETsWZBPX6VhymkvKZKqNJZybjbGS7YqsLVb";

// Verify the vault keypair matches expected address
const loadedVaultAddress = vaultKeypair.publicKey.toBase58();
if (loadedVaultAddress !== VAULT_WALLET_ADDRESS) {
  console.error('❌ Loaded vault keypair does not match expected address!');
  console.error(`Expected: ${VAULT_WALLET_ADDRESS}`);
  console.error(`Loaded:   ${loadedVaultAddress}`);
  process.exit(1);
}

// Verify SNV2 mint address matches
if (process.env.SNV2_MINT_ADDRESS !== SNV2_MINT_ADDRESS) {
  console.error('❌ Environment SNV2_MINT_ADDRESS does not match expected address!');
  console.error(`Expected: ${SNV2_MINT_ADDRESS}`);
  console.error(`Loaded:   ${process.env.SNV2_MINT_ADDRESS}`);
  process.exit(1);
}

console.log('✅ Vault and mint addresses verified');

// Replace the file-based key loading with direct env var loading
const secretKeyEnv = process.env.MINT_AUTHORITY_SECRET_KEY;
if (!secretKeyEnv) {
  console.error('❌ MINT_AUTHORITY_SECRET_KEY is not set in .env');
  process.exit(1);
}
let mintAuthority;
try {
  const secretKey = Uint8Array.from(JSON.parse(secretKeyEnv));
  mintAuthority = Keypair.fromSecretKey(secretKey);
} catch (err) {
  console.error('❌ Failed to parse MINT_AUTHORITY_SECRET_KEY:', err);
  process.exit(1);
}

// Utility: ensure vault has SOL to pay fees
async function ensureSol(keypair) {
  const bal = await connection.getBalance(keypair.publicKey);
  if (bal < 0.5 * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
  }
}

// Add helper function to create ATA
async function createAssociatedTokenAccount(
  connection,
  payer,
  mint,
  owner,
) {
  const associatedToken = await getAssociatedTokenAddress(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    await connection.getAccountInfo(associatedToken);
    return associatedToken;
  } catch (e) {
    console.log("Creating associated token account...");
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedToken,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    const signature = await connection.sendTransaction(transaction, [payer]);
    await connection.confirmTransaction(signature);
    console.log("Associated token account created!");
    return associatedToken;
  }
}

// Update the distributeReferralReward function with improved implementation
async function distributeReferralReward(recipientAddress) {
  if (!recipientAddress) {
    throw new Error('Recipient address is required');
  }

  console.log('Starting reward distribution to:', recipientAddress);
  
  try {
    const mint = new PublicKey('4nM4vQGczETsWZBPX6VhymkvKZKqNJZybjbGS7YqsLVb');
    const sourceAccount = new PublicKey('38PTfKiHQet72aQDLS1omjUz7AkdwmE65DDdGgeekLBx');
    
    // Get or create recipient's token account
    const destinationAccount = await getAssociatedTokenAddress(
      mint,
      new PublicKey(recipientAddress)
    );

    console.log('Using source account:', sourceAccount.toString());
    console.log('Destination account:', destinationAccount.toString());

    // Ensure source account has sufficient balance
    try {
      const balance = await connection.getTokenAccountBalance(sourceAccount);
      console.log('Source account balance:', balance.value.uiAmount);
      
      if (!balance.value.uiAmount || balance.value.uiAmount < 1) {
        throw new Error('Insufficient tokens in source account');
      }
    } catch (balanceError) {
      console.error('Error checking source account balance:', balanceError);
      throw new Error('Failed to verify source account balance');
    }

    // Create transfer instruction (1 SNV2 = 1_000_000_000 lamports)
    const transferIx = createTransferInstruction(
      sourceAccount,
      destinationAccount, 
      vaultKeypair.publicKey,
      10_000_000_000,
      [],
      TOKEN_PROGRAM_ID
    );

    // Build and send transaction
    const tx = new Transaction().add(transferIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = vaultKeypair.publicKey;

    // Sign and send with timeout protection
    const signaturePromise = connection.sendTransaction(tx, [vaultKeypair]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transaction timeout')), 30000)
    );
    
    const signature = await Promise.race([signaturePromise, timeoutPromise]);
    console.log('Transaction sent:', signature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    console.log('Transfer confirmed successfully');
    return signature;

  } catch (error) {
    console.error('Error in distributeReferralReward:', error);
    throw new Error(`Failed to distribute reward: ${error.message}`);
  }
}

// Update the claim referral rewards endpoint
app.post('/api/users/:id/claim-referral-rewards', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.hasUnclaimedReferralReward) {
      return res.status(400).json({ error: 'No rewards to claim' });
    }

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    console.log('Processing reward claim for wallet:', walletAddress);
    
    try {
      // Distribute 1 SNV2 (1,000,000,000 lamports)
      const result = await distributeReferralReward(walletAddress);
      
      // Update user's status
      user.hasUnclaimedReferralReward = false;
      user.referralRewards = (user.referralRewards || 0) + 1;
      await user.save();

      console.log('Reward claimed successfully by user:', user.username);
      console.log('New referral rewards total:', user.referralRewards);

      res.json({ 
        success: true, 
        signature: result,
        message: 'Successfully claimed 10 SNV2 token!'
      });
    } catch (err) {
      console.error('Error distributing rewards:', err);
      res.status(500).json({ error: 'Failed to distribute rewards', details: err.message });
    }
  } catch (error) {
    console.error('Error claiming rewards:', error);
    res.status(500).json({ error: 'Failed to claim rewards', details: error.message });
  }
});

// Define the User schema with additional profile fields
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  walletAddress: { type: String },
  country: { type: String },
  city: { type: String },
  phoneNumber: { type: String },
  phoneCountryCode: { type: String },
  isAdult: { type: Boolean },
  notifyQuestUpdates: { type: Boolean, default: true },
  notifyRewardAlerts: { type: Boolean, default: true },
  profilePicture: { type: String },
  accountVerified: { type: Boolean, default: false },
  accountVerificationCode: { type: String },
  exp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: { type: [String], default: [] },
  goodDeeds: { type: Array, default: [] },
  confessions: { type: Array, default: [] },
  nftHoldings: { type: Array, default: [] },
  acceptedGoodDeedsCount: { type: Number, default: 0 },
  acceptedConfessionsCount: { type: Number, default: 0 },
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralRewards: { type: Number, default: 0 },
  tokensPurchased: { type: Number, default: 0 },
  hasUnclaimedReferralReward: { type: Boolean, default: false },
  hasUnclaimedReward: { type: Boolean, default: false },
  referralCount: { type: Number, default: 0 }
});

// Pre-save hook to generate a referral code if not already present.
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = `${this.username}-${randomPart}`;
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Add helper function for referral code generation
function generateReferralCode(username) {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username}-${randomPart}`;
}

// Replace existing signup endpoint
app.post('/api/signup', signupLimiter, async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, confirmPassword, walletAddress, referralCode } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      walletAddress,
      hasUnclaimedReward: false,
      hasUnclaimedReferralReward: false,
      referralCode: generateReferralCode(username)
    });

    // Handle referral code if provided
    if (referralCode) {
      console.log(`Processing referral code: ${referralCode} for new user: ${username}`);
      const referrer = await User.findOne({ referralCode });

      if (referrer) {
        console.log(`Found referrer: ${referrer.username} (ID: ${referrer._id})`);
        
        // Set up referral relationship
        newUser.referredBy = referrer._id;
        newUser.hasUnclaimedReferralReward = true;

        // Save the new user first
        await newUser.save();
        console.log(`New user saved with ID: ${newUser._id}`);

        // Update referrer's stats
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        referrer.hasUnclaimedReferralReward = true;
        await referrer.save();
        console.log(`Updated referrer stats. New referral count: ${referrer.referralCount}`);

        // Attempt immediate reward distribution if wallet addresses are provided
        if (walletAddress && referrer.walletAddress) {
          try {
            console.log('Attempting immediate reward distribution...');
            // Distribute to new user
            await distributeReferralReward(walletAddress);
            newUser.hasUnclaimedReferralReward = false;
            await newUser.save();

            // Distribute to referrer
            await distributeReferralReward(referrer.walletAddress);
            referrer.hasUnclaimedReferralReward = false;
            await referrer.save();
            
            console.log('Rewards distributed successfully');
          } catch (rewardError) {
            console.error('Failed to distribute immediate rewards:', rewardError);
            // Don't fail signup if reward distribution fails
          }
        }
      } else {
        console.log(`No referrer found for code: ${referralCode}`);
        await newUser.save();
      }
    } else {
      await newUser.save();
    }

    // Fetch final user state for response
    const savedUser = await User.findById(newUser._id);
    console.log('Final user state:', {
      id: savedUser._id,
      hasUnclaimedReferralReward: savedUser.hasUnclaimedReferralReward,
      hasUnclaimedReward: savedUser.hasUnclaimedReward
    });

    res.status(201).json({
      message: 'User signed up successfully!',
      hasUnclaimedReferralReward: savedUser.hasUnclaimedReferralReward,
      hasUnclaimedReward: savedUser.hasUnclaimedReward,
      userId: savedUser._id
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Update check rewards endpoint for better logging
app.get('/api/users/:id/check-rewards', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const rewards = {
      hasUnclaimedReferralReward: Boolean(user.hasUnclaimedReferralReward),
      hasUnclaimedReward: Boolean(user.hasUnclaimedReward)
    };

    console.log('Checking rewards for user:', user.username, 'with ID:', userId);
    console.log('User data:', {
      id: user._id,
      referralCode: user.referralCode,
      walletAddress: user.walletAddress,
      ...rewards
    });

    res.json({
      hasUnclaimedReferralReward: Boolean(user.hasUnclaimedReferralReward),
      hasUnclaimedReward: Boolean(user.hasUnclaimedReward),
      walletAddress: user.walletAddress
    });
  } catch (error) {
    console.error('Error checking rewards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a utility endpoint to manually set reward status (for testing)
app.post('/api/users/:id/set-reward-status', async (req, res) => {
  try {
    const { hasUnclaimedReferralReward, hasUnclaimedReward } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          hasUnclaimedReferralReward: Boolean(hasUnclaimedReferralReward),
          hasUnclaimedReward: Boolean(hasUnclaimedReward)
        }
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Updated reward status for user:', user.username, {
      hasUnclaimedReferralReward: user.hasUnclaimedReferralReward,
      hasUnclaimedReward: user.hasUnclaimedReward
    });

    res.json({
      success: true,
      rewards: {
        hasUnclaimedReferralReward: user.hasUnclaimedReferralReward,
        hasUnclaimedReward: user.hasUnclaimedReward
      }
    });
  } catch (error) {
    console.error('Error setting reward status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add claim reward endpoint (after other user endpoints)
app.post('/api/users/:id/claim-reward', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user?.hasUnclaimedReward) {
      return res.status(400).json({ error: 'No rewards to claim' });
    }

    await distributeReward(walletAddress);

    user.hasUnclaimedReward = false;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// Add new reward endpoints after other user endpoints
app.get('/api/users/:id/check-reward', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json({ 
      hasUnclaimedReward: user?.hasUnclaimedReward || false 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error checking reward status' });
  }
});

app.post('/api/users/:id/claim-reward', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user?.hasUnclaimedReward) {
      return res.status(400).json({ message: 'No rewards to claim' });
    }

    await distributeRewardFromVault(walletAddress);

    user.hasUnclaimedReward = false;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Claim reward error:', error);
    res.status(500).json({ message: 'Failed to claim reward' });
  }
});

// Add new reward check endpoint
app.get('/api/users/:id/reward-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ 
      hasUnclaimedReward: user.hasUnclaimedReward,
      walletAddress: user.walletAddress 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error checking reward status' });
  }
});

// Add referral rewards endpoint
app.get('/api/users/:id/referral-rewards', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ referralRewards: user.referralRewards || 0 });
  } catch (error) {
    console.error('Error getting referral rewards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Security Key (store in an environment variable)
const correctKey = process.env.SECURITY_KEY;

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

// NEW: Get a single user by ID (with accepted good deeds and confessions count)
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(id);
    
    if (!user) {
      console.log('User not found for ID:', id);
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The requested user ID does not exist in the database'
      });
    }

    console.log('User found:', user.username);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
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
        email: user.email,
        referralCode: user.referralCode
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
  
  // Create update data object with only the fields that are present
  const updateData = {};
  
  if (req.body.walletAddress) updateData.walletAddress = req.body.walletAddress;
  if (req.body.country) updateData.country = req.body.country;
  if (req.body.city) updateData.city = req.body.city;
  if (req.body.phoneNumber) updateData.phoneNumber = req.body.phoneNumber;
  if (req.body.phoneCountryCode) updateData.phoneCountryCode = req.body.phoneCountryCode;
  if (req.body.isAdult !== undefined) updateData.isAdult = req.body.isAdult === 'true' || req.body.isAdult === true;
  if (req.body.notifyQuestUpdates !== undefined) updateData.notifyQuestUpdates = req.body.notifyQuestUpdates === 'true' || req.body.notifyQuestUpdates === true;
  if (req.body.notifyRewardAlerts !== undefined) updateData.notifyRewardAlerts = req.body.notifyRewardAlerts === 'true' || req.body.notifyRewardAlerts === true;
  if (req.body.username) updateData.username = req.body.username;
  if (req.file) updateData.profilePicture = req.file.path;

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

// NEW: Generate security key
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
let approvedImages = [];

app.get('/api/approved-images', (req, res) => {
  res.json(approvedImages);
});

app.post('/api/approved-images', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  approvedImages.push(url);
  res.status(200).json({ message: 'Image added successfully.' });
});

app.delete('/api/approved-images', (req, res) => {
  approvedImages = [];
  res.json({ message: 'Approved images cleared successfully.' });
});

app.delete('/api/approved-images/:index', (req, res) => {
  const { index } = req.params;
  const idx = parseInt(index);
  if (isNaN(idx) || idx < 0 || idx >= approvedImages.length) {
    return res.status(400).json({ error: 'Invalid index.' });
  }
  approvedImages.splice(idx, 1);
  res.status(200).json({ message: 'Approved image deleted successfully.' });
});

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
let pendingImages = [];

app.get('/api/pending-images', (req, res) => {
  res.json(pendingImages);
});

app.post('/api/pending-images', (req, res) => {
  const { url, submittedBy } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  pendingImages.push({ url, submittedBy: submittedBy || 'Unknown' });
  res.status(200).json({ message: 'Pending image added successfully.' });
});

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
  const normalizedPath = req.file.path.replace(/\\/g, '/');
  const imageUrl = `${req.protocol}://${req.get('host')}/${normalizedPath}`;
  const submittedBy = req.body.submittedBy || 'Unknown';
  pendingImages.push({ url: imageUrl, submittedBy });
  res.status(200).json({ url: imageUrl });
});

// ----------------------
// NEW: Account Verification Endpoints
// ----------------------
app.post('/api/send-account-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.accountVerified) return res.status(400).json({ error: 'Account already verified.' });
    
    const accountCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.accountVerificationCode = accountCode;
    await user.save();

    sendEmail(user.email, 'Account Verification Code', `Your account verification code is: ${accountCode}`, (error, info) => {
      if (error) {
        console.error('Error sending account verification email:', error);
      } else {
        console.log('Account verification email sent:', info);
      }
    });
    res.status(200).json({ message: 'Account verification code sent successfully.' });
  } catch (error) {
    console.error('Error sending account verification code:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

app.post('/api/verify-account', async (req, res) => {
  const { email, accountCode } = req.body;
  if (!email || !accountCode) return res.status(400).json({ error: 'Email and account verification code are required.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.accountVerified) return res.status(400).json({ error: 'Account already verified.' });
    if (user.accountVerificationCode !== accountCode) {
      return res.status(400).json({ error: 'Invalid account verification code.' });
    }
    user.accountVerified = true;
    user.accountVerificationCode = undefined;
    await user.save();
    res.status(200).json({ message: 'Account verified successfully.' });
  } catch (error) {
    console.error('Error verifying account:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// ----------------------
// NEW: Confession Schema and Endpoints (for all accounts to see confessions)
// ----------------------
const confessionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['anonymous', 'public'], default: 'anonymous' },
  file: { type: String, default: null },
  video: { type: String, default: null },
  user: { type: String, required: true },
  username: { type: String, default: '' },
  votes: { type: Number, default: 0 },
  reports: { type: Number, default: 0 },
  upvotedBy: { type: [String], default: [] },
  reportedBy: { type: [String], default: [] },
  hidden: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  boostedUntil: { type: Date, default: null },
  rewarded: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' }
});

const Confession = mongoose.model('Confession', confessionSchema);

// NEW: GET endpoint to retrieve pending confessions (Admin Only)
app.get('/api/confessions/pending', async (req, res) => {
  try {
    const pendingConfessions = await Confession.find({ status: 'pending' }).sort({ timestamp: -1 });
    res.status(200).json(pendingConfessions);
  } catch (error) {
    console.error('Error fetching pending confessions:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// POST endpoint to submit a confession
app.post('/api/confessions', async (req, res) => {
  try {
    const { text, type, file, video, user, username, votes, reports, upvotedBy, reportedBy, timestamp, boostedUntil, status } = req.body;
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
      boostedUntil: boostedUntil || null,
      status: status || 'pending'
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

// NEW: Approval Endpoint for Pending Confessions (Admin Only)
app.post('/api/confessions/approve/:id', async (req, res) => {
  if (!req.body.admin) {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }
    confession.status = 'approved';
    await confession.save();
    
    // Update the user's acceptedConfessionsCount based on approved confessions using referralCode
    const userToUpdate = await User.findOne({ referralCode: confession.user });
    if (userToUpdate) {
      const approvedConfessions = await Confession.find({ user: userToUpdate.referralCode, status: 'approved' });
      userToUpdate.acceptedConfessionsCount = approvedConfessions.length;
      await userToUpdate.save();
    }
    
    res.status(200).json({ message: 'Confession approved successfully.', confession });
  } catch (error) {
    console.error('Error approving confession:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Decline Endpoint for Pending Confessions (Admin Only)
app.delete('/api/confessions/decline/:id', async (req, res) => {
  if (!req.body.admin) {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  try {
    const { id } = req.params;
    await Confession.findByIdAndDelete(id);
    res.status(200).json({ message: 'Confession declined and removed successfully.' });
  } catch (error) {
    console.error('Error declining confession:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// ----------------------
// NEW: Temporary Confession Image Endpoints
// ----------------------
let tempImages = {};

app.post('/api/confessions/upload-temp-image', upload.single('image'), (req, res) => {
  const { referralCode } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  const normalizedPath = req.file.path.replace(/\\/g, '/');
  const imageUrl = `${req.protocol}://${req.get('host')}/${normalizedPath}`;
  if (referralCode) {
    tempImages[referralCode] = imageUrl;
  }
  res.status(200).json({ url: imageUrl });
});


app.get('/api/confessions/temp-image', (req, res) => {
  const referralCode = req.query.referralCode;
  if (!referralCode) {
    return res.status(400).json({ error: 'referralCode query parameter is required' });
  }
  const imageUrl = tempImages[referralCode] || null;
  res.status(200).json({ url: imageUrl });
});

app.delete('/api/confessions/temp-image', (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) {
    return res.status(400).json({ error: 'referralCode is required' });
  }
  delete tempImages[referralCode];
  res.status(200).json({ message: 'Temporary image deleted' });
});

// ----------------------
// NEW: Temporary Confession Video Endpoints
// ----------------------
let tempVideos = {};

app.post('/api/confessions/upload-temp-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video provided.' });
  }
  const normalizedPath = req.file.path.replace(/\\/g, '/');
  const videoUrl = `${req.protocol}://${req.get('host')}/${normalizedPath}`;
  if (req.body.referralCode) {
    tempVideos[req.body.referralCode] = videoUrl;
  }
  res.status(200).json({ url: videoUrl });
});

app.get('/api/confessions/temp-video', (req, res) => {
  const referralCode = req.query.referralCode;
  if (!referralCode) {
    return res.status(400).json({ error: 'referralCode query parameter is required' });
  }
  const videoUrl = tempVideos[referralCode] || null;
  res.status(200).json({ url: videoUrl });
});

app.delete('/api/confessions/temp-video', (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) {
    return res.status(400).json({ error: 'referralCode is required' });
  }
  delete tempVideos[referralCode];
  res.status(200).json({ message: 'Temporary video deleted' });
});

// ----------------------
// NEW: Update User Progress Endpoint
// ----------------------
app.put('/api/users/:id/update-progress', async (req, res) => {
  const { id } = req.params;
  const { goodDeeds, confessions, badges, nftHoldings } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    let totalExp = 0;
    let acceptedGoodDeedsCount = 0;
    if (goodDeeds && Array.isArray(goodDeeds)) {
      goodDeeds.forEach(gd => {
         if (gd.accepted && gd.reward && gd.reward.XP) {
           totalExp += gd.reward.XP;
           acceptedGoodDeedsCount++;
         }
      });
    }
    
    let acceptedConfessionsCount = 0;
    if (confessions && Array.isArray(confessions)) {
      acceptedConfessionsCount = confessions.filter(c => c.status === 'approved').length;
    }
    
    const updateData = {
       exp: totalExp,
       level: Math.floor(totalExp / 100) + 1,
       goodDeeds,
       confessions,
       badges,
       nftHoldings,
       acceptedGoodDeedsCount,
       acceptedConfessionsCount
    };
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json({ message: 'User progress updated successfully!', user: updatedUser });
  } catch(err) {
    console.error('Error updating user progress:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// NEW: Endpoint to update tokens purchased
app.put('/api/users/:id/tokens-purchased', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body; // total purchased so far

  if (amount === undefined || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Invalid amount provided.' });
  }

  try {
    const user = await User.findByIdAndUpdate(id, { tokensPurchased: amount }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json({ message: 'Tokens updated successfully.', tokensPurchased: user.tokensPurchased });
  } catch (error) {
    console.error('Error updating tokens purchased:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Add this endpoint to server.js
app.get('/api/referral/check/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    
    if (!referralCode) {
      return res.status(400).json({ 
        valid: false,
        error: 'Referral code is required' 
      });
    }

    const referrer = await User.findOne({ referralCode });
    
    if (!referrer) {
      return res.status(200).json({ 
        valid: false,
        error: 'Referral code not found' 
      });
    }

    res.status(200).json({ 
      valid: true,
      referrerName: `${referrer.firstName} ${referrer.lastName}`,
      message: 'Valid referral code'
    });

  } catch (error) {
    console.error('Error checking referral code:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Server error while checking referral code' 
    });
  }
});

// Add endpoint to create ATA
app.post('/api/create-ata', async (req, res) => {
  const { walletAddress, mintAddress } = req.body;
  if (!walletAddress || !mintAddress) {
    return res.status(400).json({ error: "Missing wallet or mint address" });
  }

  try {
    console.log('Creating ATA for:', {
      wallet: walletAddress,
      mint: mintAddress
    });

    const ata = await createAssociatedTokenAccount(
      connection,
      vaultKeypair, // payer
      new PublicKey(mintAddress),
      new PublicKey(walletAddress)
    );

    console.log('✅ ATA created:', ata.toBase58());
    
    res.json({ 
      success: true,
      ata: ata.toBase58(),
      walletAddress,
      mintAddress
    });
  } catch (err) {
    console.error('❌ Failed to create ATA:', err);
    
    // Check if error is because ATA already exists
    if (err.message.includes('already in use')) {
      return res.json({ 
        success: true,
        message: 'ATA already exists',
        ata: err.message.match(/address\s([A-Za-z0-9]+)/)?.[1]
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create ATA', 
      details: err.message 
    });
  }
});

// Update MongoDB connection with retry logic
mongoose.connect('mongodb://127.0.0.1:27017/kycdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('📦 MongoDB connected successfully');
  // Only start server after DB connection is established
  app.listen(process.env.PORT || port, '0.0.0.0', () => {
    console.log(`
🚀 Server running at http://localhost:${port}
📎 API endpoints ready
🔐 Vault address: ${vaultKeypair.publicKey.toString()}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Add error handler middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
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

// Email Transporter (MailHog)
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
  logger: true,
  debug: true
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

// NEW: Endpoint to send email verification code (Fixed)
app.post('/api/send-email-code', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  const code = Math.floor(100000 + Math.random() *900000).toString();
  
  sendEmail(email, 'Email Verification Code', `Your verification code is: ${code}`, (error, info) => {
    if (error) {
      console.error('Error sending email verification code:', error);
      return res.status(500).json({ error: 'Error sending email. Please try again later.' });
    }
    // Return the generated code along with the success message
    res.status(200).json({ message: 'Email verification code sent successfully.', code });
  });
});

