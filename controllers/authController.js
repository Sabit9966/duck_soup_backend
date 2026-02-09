const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const AutomationData = require('../models/AutomationData');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all fields' });
        }
        
        // Additional validation before database query
        if (username.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
        }
        if (username.trim().length > 30) {
            return res.status(400).json({ success: false, message: 'Username cannot exceed 30 characters' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        }

        // Check if user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        // Create automation data for user
        await AutomationData.create({ userId: user._id });

        // Generate token
        const token = generateToken(user._id);

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create session
        await Session.create({
            userId: user._id,
            token,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            expiresAt
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                token
            }
        });
    } catch (error) {
        console.error(error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: errors[0] || 'Validation failed',
                errors: errors
            });
        }
        
        // Handle duplicate key error (MongoDB)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                success: false, 
                message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
            });
        }
        
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Support both email and username login
        const identifier = email || username;

        // Validation
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
        }

        // Check for user by email or username
        const user = await User.findOne({ 
            $or: [
                { email: identifier },
                { username: identifier }
            ]
        }).select('+password');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Update last login without triggering pre-save hook
        await User.updateOne(
            { _id: user._id },
            { $set: { lastLogin: Date.now() } }
        );

        // Generate token
        const token = generateToken(user._id);

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create session
        await Session.create({
            userId: user._id,
            token,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            expiresAt
        });

        res.json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                token
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];

        // Delete session
        await Session.deleteOne({ token });

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    register,
    login,
    logout,
    verifyToken
};
