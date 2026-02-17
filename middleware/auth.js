const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const securityAudit = require('./securityAudit');

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

/**
 * Middleware to validate accountId for extension endpoints
 * Ensures accountId is provided and is a valid ObjectId
 * Note: This does NOT verify ownership - that must be done in controllers
 */
const validateAccountId = (req, res, next) => {
    const accountId = req.query.accountId || req.body.accountId;
    
    if (!accountId) {
        console.error('❌ [Account Validation] Missing accountId');
        return res.status(400).json({ 
            success: false, 
            message: 'accountId is required' 
        });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
        securityAudit.logInvalidAccountId(req.path, accountId, req.query.accountId ? 'query' : 'body');
        console.error('❌ [Account Validation] Invalid accountId format:', accountId);
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid accountId format' 
        });
    }

    // Store validated accountId for use in controllers
    req.validatedAccountId = accountId;
    next();
};

/**
 * Middleware to verify accountId ownership for extension endpoints
 * Verifies that the accountId belongs to an active user account
 */
const verifyAccountOwnership = async (req, res, next) => {
    try {
        const accountId = req.validatedAccountId || req.query.accountId || req.body.accountId;
        
        if (!accountId) {
            return res.status(400).json({ 
                success: false, 
                message: 'accountId is required' 
            });
        }

        // Verify account exists and is active
        const account = await User.findById(accountId).select('accountStatus');
        
        if (!account) {
            securityAudit.logUnauthorizedAccess(req.path, accountId, 'Account not found');
            console.error('❌ [Account Ownership] Account not found:', accountId);
            return res.status(404).json({ 
                success: false, 
                message: 'Account not found' 
            });
        }

        if (account.accountStatus !== 'active') {
            securityAudit.logUnauthorizedAccess(req.path, accountId, 'Account not active');
            console.error('❌ [Account Ownership] Account not active:', accountId);
            return res.status(403).json({ 
                success: false, 
                message: 'Account is not active' 
            });
        }

        // Store verified accountId
        req.verifiedAccountId = accountId;
        next();
    } catch (error) {
        console.error('❌ [Account Ownership] Verification error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Account verification failed' 
        });
    }
};

module.exports = { protect, verifyExtensionKey, validateAccountId, verifyAccountOwnership };
