const Action = require('../models/Action');
const Message = require('../models/Message');

// Retryable error codes
const RETRYABLE_ERRORS = ['TEMP_DOM_FAIL', 'NETWORK', 'RATE_LIMIT'];
const NON_RETRYABLE_ERRORS = ['AUTH_REQUIRED', 'CHECKPOINT', 'PERMISSION_DENIED'];
const MAX_ATTEMPTS = 5;
const STALE_LOCK_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Get pending actions for extension
 * @route GET /api/actions/pending
 * @access Private (Extension Key)
 */
const getPendingActions = async (req, res) => {
    try {
        // CRITICAL: Use validated accountId from middleware
        const accountId = req.verifiedAccountId || req.validatedAccountId || req.query.accountId;
        const extensionInstanceId = req.headers['x-extension-instance-id'] || `ext_${Date.now()}`;

        console.log('📋 [Pending Actions] Request received:', {
            accountId,
            extensionInstanceId: extensionInstanceId.substring(0, 20) + '...',
            validated: !!req.verifiedAccountId
        });

        if (!accountId) {
            console.error('❌ [Pending Actions] Missing accountId');
            return res.status(400).json({ 
                success: false, 
                message: 'accountId query parameter is required' 
            });
        }

        // CRITICAL: Validate ObjectId format to prevent injection
        if (!require('mongoose').Types.ObjectId.isValid(accountId)) {
            console.error('❌ [Pending Actions] Invalid accountId format:', accountId);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid accountId format' 
            });
        }

        // Find pending actions that are not locked or have stale locks
        const staleThreshold = new Date(Date.now() - STALE_LOCK_THRESHOLD);
        const pendingActions = await Action.find({
            accountId,
            $or: [
                { status: 'pending', nextRunAt: { $lte: new Date() } },
                { status: 'pending', nextRunAt: null },
                { 
                    status: 'processing', 
                    lockedAt: { $lte: staleThreshold } 
                }
            ]
        })
        .sort({ createdAt: 1 })
        .limit(5)
        .lean();

        console.log(`🔍 [Pending Actions] Found ${pendingActions.length} pending action(s) for account: ${accountId}`);

        // Atomically lock actions
        const actionIds = pendingActions.map(a => a._id);
        if (actionIds.length > 0) {
            await Action.updateMany(
                { _id: { $in: actionIds } },
                {
                    $set: {
                        status: 'processing',
                        lockedAt: new Date(),
                        lockOwner: extensionInstanceId
                    },
                    $inc: { attemptCount: 1 }
                }
            );
            console.log(`🔒 [Pending Actions] Locked ${actionIds.length} action(s)`);
        }

        // Return actions with formatted payload
        const actions = pendingActions.map(action => ({
            id: action._id.toString(),
            type: action.type,
            payload: action.payload
        }));

        if (actions.length > 0) {
            console.log(`✅ [Pending Actions] Returning ${actions.length} action(s) to extension`);
        }

        res.json({
            success: true,
            data: { actions }
        });
    } catch (error) {
        console.error('Get pending actions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

/**
 * Mark action as completed
 * @route POST /api/actions/:id/complete
 * @access Private (Extension Key)
 */
const completeAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { success, errorCode, errorMessage } = req.body;

        console.log('✅ [Complete Action] Request received:', {
            actionId: id,
            success,
            errorCode,
            errorMessage: errorMessage?.substring(0, 50)
        });

        // CRITICAL: Verify action belongs to the account making the request
        // Use validated accountId from middleware
        const accountId = req.verifiedAccountId || req.validatedAccountId || req.query.accountId;
        
        if (!accountId) {
            console.error('❌ [Complete Action] Missing accountId parameter');
            return res.status(400).json({ 
                success: false, 
                message: 'accountId query parameter is required' 
            });
        }

        // CRITICAL: Validate ObjectId format to prevent injection
        if (!require('mongoose').Types.ObjectId.isValid(accountId)) {
            console.error('❌ [Complete Action] Invalid accountId format:', accountId);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid accountId format' 
            });
        }

        // CRITICAL: Validate actionId format
        if (!require('mongoose').Types.ObjectId.isValid(id)) {
            console.error('❌ [Complete Action] Invalid actionId format:', id);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid actionId format' 
            });
        }

        // CRITICAL: Find action AND verify it belongs to the account
        const action = await Action.findOne({ 
            _id: id,
            accountId: accountId 
        });

        if (!action) {
            const securityAudit = require('../middleware/securityAudit');
            securityAudit.logCrossAccountAccess(
                req.path,
                accountId,
                null,
                'Action',
                id
            );
            console.error('❌ [Complete Action] Action not found or does not belong to account:', { 
                actionId: id, 
                accountId,
                attemptedAccess: true 
            });
            return res.status(404).json({ 
                success: false, 
                message: 'Action not found' 
            });
        }

        if (success) {
            console.log(`✅ [Complete Action] Action ${id} completed successfully`);
            // Mark action as completed
            action.status = 'completed';
            action.lockedAt = null;
            action.lockOwner = null;
            await action.save();

            // CRITICAL: Update message status if this is a sendMessage action
            // Must include accountId to prevent cross-account updates
            if (action.type === 'sendMessage' && action.payload.conversationId) {
                await Message.updateMany(
                    { 
                        conversationId: action.payload.conversationId,
                        clientId: action.clientId,
                        accountId: accountId, // CRITICAL: Ensure message belongs to this account
                        replyStatus: 'queued'
                    },
                    { replyStatus: 'sent' }
                );
            }

            res.json({
                success: true,
                message: 'Action completed successfully'
            });
        } else {
            // Handle failure
            console.log(`❌ [Complete Action] Action ${id} failed:`, {
                errorCode,
                attemptCount: action.attemptCount,
                maxAttempts: MAX_ATTEMPTS
            });

            action.lastErrorCode = errorCode || 'UNKNOWN';
            action.lastErrorMessage = errorMessage || 'Unknown error';

            const isRetryable = RETRYABLE_ERRORS.includes(errorCode);
            const isNonRetryable = NON_RETRYABLE_ERRORS.includes(errorCode);

            if (isNonRetryable || action.attemptCount >= MAX_ATTEMPTS) {
                // Mark as failed permanently
                action.status = 'failed';
                action.lockedAt = null;
                action.lockOwner = null;

                // CRITICAL: Update message status
                // Must include accountId to prevent cross-account updates
                if (action.type === 'sendMessage' && action.payload.conversationId) {
                    await Message.updateMany(
                        { 
                            conversationId: action.payload.conversationId,
                            clientId: action.clientId,
                            accountId: accountId, // CRITICAL: Ensure message belongs to this account
                            replyStatus: 'queued'
                        },
                        { replyStatus: 'failed' }
                    );
                }
            } else if (isRetryable) {
                // Calculate exponential backoff: 2^attemptCount minutes, max 60 minutes
                const backoffMinutes = Math.min(Math.pow(2, action.attemptCount), 60);
                const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
                
                action.status = 'pending';
                action.nextRunAt = nextRunAt;
                action.lockedAt = null;
                action.lockOwner = null;
            } else {
                // Unknown error - retry with backoff
                const backoffMinutes = Math.min(Math.pow(2, action.attemptCount), 60);
                const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
                
                action.status = 'pending';
                action.nextRunAt = nextRunAt;
                action.lockedAt = null;
                action.lockOwner = null;
            }

            await action.save();

            res.json({
                success: true,
                message: 'Action failure recorded',
                willRetry: action.status === 'pending'
            });
        }
    } catch (error) {
        console.error('Complete action error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

module.exports = {
    getPendingActions,
    completeAction
};

