# Backend-Driven Auto-Reply Implementation Summary

## Overview

Implemented a backend-driven LinkedIn auto-reply system where:
- **Backend** manages message intake, AI reply generation, action queue, retries, locking, and status tracking
- **Chrome Extension** only executes DOM manipulation to send messages (no LinkedIn scraping or login on backend)

## Files Created

### Models
- `backend/models/Message.js` - Stores incoming messages and reply status
- `backend/models/Action.js` - Action queue for extension to execute

### Controllers
- `backend/controllers/actionController.js` - Handles action queue operations (get pending, complete)

### Services
- `backend/services/aiReplyService.js` - AI reply generation service (extracted from controller)
- `backend/services/staleLockReaper.js` - Background job to unlock stale actions

### Routes
- `backend/routes/actions.js` - Action queue endpoints

### Documentation
- `backend/EXTENSION_API.md` - Complete API documentation for extension integration

## Files Modified

1. **backend/server.js**
   - Added `actionRoutes` import and route registration
   - Added stale lock reaper startup

2. **backend/routes/messages.js**
   - Added `/incoming` endpoint with `verifyExtensionKey` middleware

3. **backend/controllers/messageMonitorController.js**
   - Refactored to use `aiReplyService`
   - Added `handleIncomingMessage` function

4. **backend/middleware/auth.js**
   - Added `verifyExtensionKey` middleware for extension API key authentication

## New Endpoints

### 1. POST /api/messages/incoming
- Receives incoming messages from extension
- Generates AI replies
- Creates actions for extension to execute
- Uses idempotency keys to prevent duplicates

### 2. GET /api/actions/pending?accountId=...
- Returns up to 5 pending actions
- Atomically locks actions when returned
- Filters by stale locks

### 3. POST /api/actions/:id/complete
- Marks actions as completed/failed
- Implements retry logic with exponential backoff
- Handles retryable vs non-retryable errors

## Database Schema

### Message Model
```javascript
{
  clientId: ObjectId,
  accountId: ObjectId,
  conversationId: String,
  senderName: String,
  incomingText: String,
  receivedAt: Date,
  replyText: String,
  replyStatus: 'none'|'queued'|'sent'|'failed',
  idempotencyKey: String (UNIQUE)
}
```

### Action Model
```javascript
{
  accountId: ObjectId,
  clientId: ObjectId,
  type: 'sendMessage'|'refreshSession',
  payload: Mixed,
  status: 'pending'|'processing'|'completed'|'failed',
  attemptCount: Number,
  lastErrorCode: String,
  lastErrorMessage: String,
  lockedAt: Date,
  lockOwner: String,
  nextRunAt: Date
}
```

## Features Implemented

✅ **Idempotency**: Prevents duplicate message processing via `idempotencyKey`

✅ **Action Locking**: Atomic locking prevents concurrent processing of same action

✅ **Retry Logic**: Exponential backoff for retryable errors (max 5 attempts)

✅ **Error Classification**: Retryable vs non-retryable error codes

✅ **Stale Lock Reaper**: Background job runs every 2 minutes to unlock stale actions

✅ **Extension Authentication**: API key-based auth (separate from user JWT)

✅ **Status Tracking**: Message and action status tracking throughout lifecycle

## Security

- Extension endpoints use `X-EXTENSION-KEY` header authentication
- Extension key must be set in `EXTENSION_API_KEY` environment variable
- User endpoints continue using JWT Bearer tokens (unchanged)

## Environment Variables

Add to `.env`:
```
EXTENSION_API_KEY=your_extension_api_key_here_change_this
```

## Stale Lock Reaper

- Runs every 2 minutes
- Finds actions stuck in `processing` for >5 minutes
- Unlocks and requeues with exponential backoff
- Marks as failed if max attempts exceeded

## Error Codes

### Retryable
- `TEMP_DOM_FAIL` - Temporary DOM element not found
- `NETWORK` - Network error
- `RATE_LIMIT` - LinkedIn rate limit

### Non-Retryable
- `AUTH_REQUIRED` - LinkedIn authentication required
- `CHECKPOINT` - LinkedIn security checkpoint
- `PERMISSION_DENIED` - Permission denied

## Next Steps (Extension Side)

1. Implement message detection and POST to `/api/messages/incoming`
2. Poll `/api/actions/pending` every 30-60 seconds
3. Execute `sendMessage` actions via DOM manipulation
4. POST to `/api/actions/:id/complete` with success/failure status

See `EXTENSION_API.md` for complete integration guide.

