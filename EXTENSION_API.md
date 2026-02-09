# Extension API Documentation

This document describes how the Chrome extension should interact with the backend for the auto-reply system.

## Authentication

The extension uses an API key for authentication instead of JWT tokens. This allows the extension to call endpoints without requiring user login credentials.

**Header Required:**
```
X-EXTENSION-KEY: <your_extension_api_key>
```

Set `EXTENSION_API_KEY` in your `.env` file and use the same value in the extension.

## Endpoints

### 1. POST /api/messages/incoming

Called by the extension when a new LinkedIn message is detected.

**Headers:**
```
X-EXTENSION-KEY: <api_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "accountId": "507f1f77bcf86cd799439012",
  "conversationId": "linkedin_conversation_id_123",
  "senderName": "John Doe",
  "incomingText": "Hello, I'm interested in your services.",
  "idempotencyKey": "unique_key_per_message_12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message received and reply queued",
  "data": {
    "messageId": "507f1f77bcf86cd799439013",
    "actionId": "507f1f77bcf86cd799439014"
  }
}
```

**Notes:**
- `idempotencyKey` must be unique per message. Use a combination of `conversationId` + `timestamp` or a hash of the message content.
- If the same `idempotencyKey` is sent twice, the second request will return the existing message data without creating duplicates.
- The backend will automatically generate an AI reply and create an action to send it.

### 2. GET /api/actions/pending

Called by the extension to get pending actions (messages to send).

**Headers:**
```
X-EXTENSION-KEY: <api_key>
X-EXTENSION-INSTANCE-ID: <unique_instance_id> (optional)
```

**Query Parameters:**
- `accountId` (required): The user's account ID

**Example:**
```
GET /api/actions/pending?accountId=507f1f77bcf86cd799439012
```

**Response:**
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "id": "507f1f77bcf86cd799439014",
        "type": "sendMessage",
        "payload": {
          "conversationId": "linkedin_conversation_id_123",
          "messageText": "Thank you for your interest! I'd be happy to help."
        }
      }
    ]
  }
}
```

**Behavior:**
- Returns up to 5 pending actions
- Actions are atomically locked when returned (status changes from `pending` to `processing`)
- Stale locks (>5 minutes) are automatically released by the reaper job
- Actions with `nextRunAt` in the future are not returned until that time

**Polling Recommendation:**
- Poll this endpoint every 30-60 seconds when the extension is active
- Only poll when on LinkedIn messages page
- Stop polling when extension is inactive

### 3. POST /api/actions/:id/complete

Called by the extension after attempting to send a message.

**Headers:**
```
X-EXTENSION-KEY: <api_key>
Content-Type: application/json
```

**Request Body (Success):**
```json
{
  "success": true
}
```

**Request Body (Failure):**
```json
{
  "success": false,
  "errorCode": "TEMP_DOM_FAIL",
  "errorMessage": "Message input field not found"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action completed successfully"
}
```

**Error Codes:**

Retryable errors (will retry with exponential backoff):
- `TEMP_DOM_FAIL` - Temporary DOM element not found
- `NETWORK` - Network error
- `RATE_LIMIT` - LinkedIn rate limit hit

Non-retryable errors (will mark as failed):
- `AUTH_REQUIRED` - LinkedIn authentication required (OTP needed)
- `CHECKPOINT` - LinkedIn security checkpoint
- `PERMISSION_DENIED` - Permission denied

**Retry Behavior:**
- Maximum 5 attempts per action
- Exponential backoff: 2^attemptCount minutes (max 60 minutes)
- Failed actions after max attempts are marked as permanently failed

## Extension Implementation Flow

### 1. Message Detection (content.js)

When a new message is detected on LinkedIn:

```javascript
// Generate idempotency key (e.g., hash of conversationId + message text + timestamp)
const idempotencyKey = generateIdempotencyKey(conversationId, messageText);

// Send to backend
const response = await fetch(`${API_BASE_URL}/messages/incoming`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-EXTENSION-KEY': EXTENSION_API_KEY
  },
  body: JSON.stringify({
    clientId: currentClientId,
    accountId: userAccountId,
    conversationId: conversationId,
    senderName: senderName,
    incomingText: messageText,
    idempotencyKey: idempotencyKey
  })
});
```

### 2. Polling for Actions (background.js or content.js)

Set up a polling interval:

```javascript
// Poll every 30 seconds
setInterval(async () => {
  // Only poll if on LinkedIn messages page
  if (!isOnLinkedInMessagesPage()) return;

  const response = await fetch(
    `${API_BASE_URL}/actions/pending?accountId=${userAccountId}`,
    {
      headers: {
        'X-EXTENSION-KEY': EXTENSION_API_KEY,
        'X-EXTENSION-INSTANCE-ID': getExtensionInstanceId()
      }
    }
  );

  const { data } = await response.json();
  
  for (const action of data.actions) {
    if (action.type === 'sendMessage') {
      await sendMessage(action.payload);
    }
  }
}, 30000);
```

### 3. Sending Messages (content.js)

When executing a `sendMessage` action:

```javascript
async function sendMessage(payload) {
  const { conversationId, messageText } = payload;
  
  try {
    // Open conversation in LinkedIn
    await openConversation(conversationId);
    
    // Find message input and send
    const sent = await sendLinkedInMessage(messageText);
    
    if (sent) {
      // Mark action as completed
      await fetch(`${API_BASE_URL}/actions/${actionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EXTENSION-KEY': EXTENSION_API_KEY
        },
        body: JSON.stringify({ success: true })
      });
    } else {
      // Mark as failed with error code
      await fetch(`${API_BASE_URL}/actions/${actionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EXTENSION-KEY': EXTENSION_API_KEY
        },
        body: JSON.stringify({
          success: false,
          errorCode: 'TEMP_DOM_FAIL',
          errorMessage: 'Could not find message input field'
        })
      });
    }
  } catch (error) {
    // Handle different error types
    let errorCode = 'NETWORK';
    if (error.message.includes('auth')) errorCode = 'AUTH_REQUIRED';
    if (error.message.includes('checkpoint')) errorCode = 'CHECKPOINT';
    
    await fetch(`${API_BASE_URL}/actions/${actionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EXTENSION-KEY': EXTENSION_API_KEY
      },
      body: JSON.stringify({
        success: false,
        errorCode: errorCode,
        errorMessage: error.message
      })
    });
  }
}
```

## Stale Lock Reaper

The backend runs a reaper job every 2 minutes that:
- Finds actions stuck in `processing` status for more than 5 minutes
- Unlocks them and requeues with exponential backoff
- Marks as failed if max attempts (5) exceeded

This ensures actions don't get permanently stuck if the extension crashes or disconnects.

## Security Notes

- Keep `EXTENSION_API_KEY` secret and change it from the default
- Use HTTPS in production
- Consider rate limiting extension endpoints
- Monitor for unusual activity

## Error Handling

- Always handle network errors gracefully
- Implement retry logic for transient failures
- Log errors for debugging
- Notify user if authentication is required

