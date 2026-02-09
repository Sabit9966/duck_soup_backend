const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            if (req.user.accountStatus !== 'active') {
                return res.status(403).json({ success: false, message: 'Account is not active' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

/**
 * Middleware to verify extension API key
 * Allows extension to call endpoints without JWT auth
 */
const verifyExtensionKey = (req, res, next) => {
    const extensionKey = req.headers['x-extension-key'];
    const expectedKey = process.env.EXTENSION_API_KEY;

    console.log('🔐 [Auth] Extension key verification:', {
        hasHeader: !!extensionKey,
        headerLength: extensionKey?.length || 0,
        hasExpectedKey: !!expectedKey,
        expectedKeyLength: expectedKey?.length || 0,
        endpoint: req.path,
        method: req.method
    });

    if (!expectedKey) {
        console.error('❌ [Auth] Extension API key not configured on server');
        return res.status(500).json({ 
            success: false, 
            message: 'Extension API key not configured on server' 
        });
    }

    if (!extensionKey || extensionKey !== expectedKey) {
        console.error('❌ [Auth] Invalid or missing extension API key:', {
            received: extensionKey ? extensionKey.substring(0, 10) + '...' : 'none',
            expected: expectedKey.substring(0, 10) + '...',
            match: extensionKey === expectedKey
        });
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or missing extension API key' 
        });
    }

    console.log('✅ [Auth] Extension key verified successfully');
    next();
};

module.exports = { protect, verifyExtensionKey };
