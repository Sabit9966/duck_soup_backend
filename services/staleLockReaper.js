const mongoose = require('mongoose');
const Action = require('../models/Action');

const STALE_LOCK_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

/**
 * Check if MongoDB is connected and ready
 */
const isDatabaseReady = () => {
    return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Reaper job to unlock stale actions
 * Should be called every 2 minutes
 */
const reapStaleLocks = async () => {
    try {
        // Check if database is connected before running query
        if (!isDatabaseReady()) {
            console.warn('[StaleLockReaper] Database not connected, skipping this run');
            return { processed: 0, skipped: true };
        }

        const staleThreshold = new Date(Date.now() - STALE_LOCK_THRESHOLD);

        // Find actions stuck in processing for too long
        const staleActions = await Action.find({
            status: 'processing',
            lockedAt: { $lte: staleThreshold }
        });

        console.log(`[StaleLockReaper] Found ${staleActions.length} stale locked actions`);

        for (const action of staleActions) {
            if (action.attemptCount >= MAX_ATTEMPTS) {
                // Max attempts reached, mark as failed
                action.status = 'failed';
                action.lockedAt = null;
                action.lockOwner = null;
                action.lastErrorCode = 'STALE_LOCK_MAX_ATTEMPTS';
                action.lastErrorMessage = 'Action stuck in processing and max attempts exceeded';
                await action.save();
                console.log(`[StaleLockReaper] Marked action ${action._id} as failed (max attempts)`);
            } else {
                // Unlock and requeue with exponential backoff
                const backoffMinutes = Math.min(Math.pow(2, action.attemptCount), 60);
                const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
                
                action.status = 'pending';
                action.nextRunAt = nextRunAt;
                action.lockedAt = null;
                action.lockOwner = null;
                await action.save();
                console.log(`[StaleLockReaper] Unlocked action ${action._id}, requeued for ${nextRunAt}`);
            }
        }

        return { processed: staleActions.length };
    } catch (error) {
        console.error('[StaleLockReaper] Error:', error);
        throw error;
    }
};

/**
 * Start the stale lock reaper job
 * Runs every 2 minutes
 * Only starts if database is connected
 */
const startReaper = () => {
    // Check if database is ready before starting
    if (!isDatabaseReady()) {
        console.warn('[StaleLockReaper] Database not ready, waiting for connection...');
        
        // Wait for database connection
        const checkConnection = setInterval(() => {
            if (isDatabaseReady()) {
                clearInterval(checkConnection);
                console.log('[StaleLockReaper] Database connected, starting reaper...');
                startReaperInterval();
            }
        }, 1000);
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (!isDatabaseReady()) {
                clearInterval(checkConnection);
                console.error('[StaleLockReaper] Database connection timeout, reaper not started');
            }
        }, 30000);
        
        return;
    }
    
    startReaperInterval();
};

/**
 * Start the actual reaper interval
 */
const startReaperInterval = () => {
    // Run immediately on start (with error handling)
    reapStaleLocks().catch(error => {
        console.error('[StaleLockReaper] Initial run error:', error);
    });

    // Then run every 2 minutes
    setInterval(() => {
        reapStaleLocks().catch(error => {
            console.error('[StaleLockReaper] Interval error:', error);
        });
    }, 2 * 60 * 1000);

    console.log('[StaleLockReaper] Started, running every 2 minutes');
};

module.exports = {
    reapStaleLocks,
    startReaper
};

