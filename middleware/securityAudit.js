/**
 * Security Audit Middleware
 * Logs potential security violations and unauthorized access attempts
 */

const securityAudit = {
    /**
     * Log security violation
     */
    logViolation: (type, details) => {
        const timestamp = new Date().toISOString();
        console.error(`🚨 [SECURITY VIOLATION] [${timestamp}]`, {
            type,
            ...details
        });
        
        // TODO: In production, send to security monitoring service (e.g., Sentry, DataDog)
        // Example: securityMonitoringService.logViolation(type, details);
    },

    /**
     * Log unauthorized access attempt
     */
    logUnauthorizedAccess: (endpoint, accountId, reason) => {
        securityAudit.logViolation('UNAUTHORIZED_ACCESS', {
            endpoint,
            accountId,
            reason,
            ip: null, // Could add req.ip if needed
            userAgent: null // Could add req.headers['user-agent'] if needed
        });
    },

    /**
     * Log cross-account access attempt
     */
    logCrossAccountAccess: (endpoint, requestedAccountId, actualAccountId, resourceType, resourceId) => {
        securityAudit.logViolation('CROSS_ACCOUNT_ACCESS', {
            endpoint,
            requestedAccountId,
            actualAccountId,
            resourceType,
            resourceId
        });
    },

    /**
     * Log invalid accountId format
     */
    logInvalidAccountId: (endpoint, accountId, source) => {
        securityAudit.logViolation('INVALID_ACCOUNT_ID', {
            endpoint,
            accountId,
            source // 'query', 'body', etc.
        });
    },

    /**
     * Middleware to audit accountId usage
     */
    auditAccountId: (req, res, next) => {
        const accountId = req.query.accountId || req.body.accountId;
        const endpoint = `${req.method} ${req.path}`;
        
        if (accountId) {
            // Validate format
            const mongoose = require('mongoose');
            if (!mongoose.Types.ObjectId.isValid(accountId)) {
                securityAudit.logInvalidAccountId(
                    endpoint,
                    accountId,
                    req.query.accountId ? 'query' : 'body'
                );
            }
        }
        
        next();
    }
};

module.exports = securityAudit;
