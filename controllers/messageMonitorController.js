const Client = require('../models/Client');
const Message = require('../models/Message');
const Action = require('../models/Action');
const { generateReply: generateAIReply } = require('../services/aiReplyService');

// @desc    Check for new messages and auto-reply
// @route   POST /api/messages/check
// @access  Private
const checkMessages = async (req, res) => {
    try {
        const { clientId } = req.body;

        if (!clientId) {
            return res.status(400).json({ success: false, message: 'Client ID is required' });
        }

        const client = await Client.findOne({ 
            _id: clientId, 
            userId: req.user._id 
        });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        if (!client.aiActive) {
            return res.json({ 
                success: true, 
                message: 'AI is disabled for this client',
                data: { replied: 0 }
            });
        }

        // This endpoint is called by the extension to check messages
        // The actual message checking and replying happens in the content script
        // This just returns the client's AI configuration

        res.json({
            success: true,
            data: {
                clientId: client._id,
                aiActive: client.aiActive,
                aiProvider: client.aiProvider,
                persona: client.persona,
                documents: client.documents,
                hasCredentials: !!(client.linkedinPhoneNumber && client.linkedinPassword)
            }
        });
    } catch (error) {
        console.error('Check messages error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Generate AI reply for a message
// @route   POST /api/messages/generate-reply
// @access  Private
const generateReply = async (req, res) => {
    try {
        const { clientId, incomingMessage, senderName } = req.body;

        if (!clientId || !incomingMessage) {
            return res.status(400).json({ success: false, message: 'Client ID and message are required' });
        }

        // CRITICAL: Verify client belongs to authenticated user
        const client = await Client.findOne({ 
            _id: clientId, 
            userId: req.user._id 
        });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        if (!client.aiActive) {
            return res.status(400).json({ success: false, message: 'AI is disabled for this client' });
        }

        // CRITICAL: Pass accountId to AI service for validation
        const reply = await generateAIReply(clientId, incomingMessage, senderName, req.user._id.toString());

        // Update client stats
        client.totalReplies += 1;
        await client.save();

        res.json({
            success: true,
            data: {
                reply,
                provider: client.aiProvider
            }
        });
    } catch (error) {
        console.error('Generate reply error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Log sent reply
// @route   POST /api/messages/log-reply
// @access  Private
const logReply = async (req, res) => {
    try {
        const { clientId, senderName, originalMessage, reply } = req.body;

        const client = await Client.findOne({ 
            _id: clientId, 
            userId: req.user._id 
        });

        if (client) {
            client.lastMessageCheck = Date.now();
            await client.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Log reply error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Handle incoming message from extension
// @route   POST /api/messages/incoming
// @access  Private
const handleIncomingMessage = async (req, res) => {
    try {
        console.log('📬 [Incoming Message] Request received:', {
            clientId: req.body.clientId,
            accountId: req.body.accountId,
            conversationId: req.body.conversationId,
            senderName: req.body.senderName,
            messagePreview: req.body.incomingText?.substring(0, 50) + '...',
            idempotencyKey: req.body.idempotencyKey
        });

        // CRITICAL: Use validated accountId from middleware
        const accountId = req.verifiedAccountId || req.validatedAccountId || req.body.accountId;
        const { clientId, conversationId, senderName, incomingText, idempotencyKey } = req.body;

        if (!clientId || !accountId || !conversationId || !senderName || !incomingText || !idempotencyKey) {
            console.error('❌ [Incoming Message] Missing required fields:', {
                hasClientId: !!clientId,
                hasAccountId: !!accountId,
                hasConversationId: !!conversationId,
                hasSenderName: !!senderName,
                hasIncomingText: !!incomingText,
                hasIdempotencyKey: !!idempotencyKey
            });
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required: clientId, accountId, conversationId, senderName, incomingText, idempotencyKey' 
            });
        }

        // CRITICAL: Validate ObjectId formats to prevent injection
        if (!require('mongoose').Types.ObjectId.isValid(accountId)) {
            console.error('❌ [Incoming Message] Invalid accountId format:', accountId);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid accountId format' 
            });
        }

        if (!require('mongoose').Types.ObjectId.isValid(clientId)) {
            console.error('❌ [Incoming Message] Invalid clientId format:', clientId);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid clientId format' 
            });
        }

        // CRITICAL: Verify client belongs to account
        // This prevents users from accessing other accounts' clients
        const client = await Client.findOne({ 
            _id: clientId, 
            userId: accountId 
        });

        if (!client) {
            const securityAudit = require('../middleware/securityAudit');
            securityAudit.logCrossAccountAccess(
                req.path,
                accountId,
                null,
                'Client',
                clientId
            );
            console.error('❌ [Incoming Message] Client not found:', { clientId, accountId });
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        console.log(`✅ [Incoming Message] Client found: "${client.name}" (AI Active: ${client.aiActive})`);

        if (!client.aiActive) {
            console.warn('⚠️ [Incoming Message] AI is disabled for client:', client.name);
            return res.status(400).json({ 
                success: false, 
                message: 'AI is disabled for this client' 
            });
        }

        // Upsert message by idempotencyKey (prevent duplicates)
        const messageData = {
            clientId,
            accountId,
            conversationId,
            senderName,
            incomingText,
            receivedAt: new Date()
        };

        // CRITICAL: Check for duplicate message, but verify it belongs to the same account
        // This prevents cross-account data leakage
        let message = await Message.findOne({ 
            idempotencyKey,
            accountId: accountId  // Ensure message belongs to this account
        });

        if (message) {
            // Message already exists for this account, return existing data
            console.log(`⚠️ [Incoming Message] Duplicate message detected (idempotency key: ${idempotencyKey})`);
            return res.json({
                success: true,
                message: 'Message already processed',
                data: {
                    messageId: message._id.toString(),
                    actionId: null
                }
            });
        }

        // Create new message
        message = await Message.create({
            ...messageData,
            idempotencyKey,
            replyStatus: 'queued'
        });

        console.log(`💾 [Incoming Message] Message saved to database: ${message._id}`);

        // Generate AI reply
        let replyText;
        try {
            console.log(`🤖 [Incoming Message] Generating AI reply for client: ${client.name}`);
            console.log(`📝 [Incoming Message] Message from ${senderName}: "${incomingText.substring(0, 100)}..."`);
            
            // Check if OpenAI is configured
            if (!process.env.OPENAI_API_KEY) {
                console.error('❌ [Incoming Message] OPENAI_API_KEY not set in backend .env file');
                throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in backend .env file.');
            }
            
            // CRITICAL: Pass accountId to AI service for validation
            replyText = await generateAIReply(clientId, incomingText, senderName, accountId);
            
            if (!replyText || replyText.length === 0) {
                throw new Error('AI reply generation returned empty response');
            }
            
            message.replyText = replyText;
            await message.save();

            console.log(`✅ [Incoming Message] AI reply generated successfully (${replyText.length} chars)`);
            console.log(`💬 [Incoming Message] Reply: "${replyText.substring(0, 150)}..."`);

            // Update client stats
            client.totalReplies += 1;
            await client.save();
        } catch (error) {
            console.error('❌ [Incoming Message] Failed to generate AI reply:', error);
            console.error('❌ [Incoming Message] Error stack:', error.stack);
            message.replyStatus = 'failed';
            await message.save();
            return res.status(500).json({
                success: false,
                message: 'Failed to generate AI reply',
                error: error.message
            });
        }

        // Create action to send message
        const action = await Action.create({
            accountId,
            clientId,
            type: 'sendMessage',
            payload: {
                conversationId,
                messageText: replyText
            },
            status: 'pending'
        });

        console.log(`📤 [Incoming Message] Action created: ${action._id} for conversation: ${conversationId}`);
        console.log(`✅ [Incoming Message] Complete - Message ID: ${message._id}, Action ID: ${action._id}`);

        res.json({
            success: true,
            message: 'Message received and reply queued',
            data: {
                messageId: message._id.toString(),
                actionId: action._id.toString()
            }
        });
    } catch (error) {
        console.error('Handle incoming message error:', error);
        
        // Handle duplicate key error (idempotency)
        if (error.code === 11000) {
            // CRITICAL: Verify message belongs to the same account
            const accountId = req.verifiedAccountId || req.validatedAccountId || req.body.accountId;
            const existingMessage = await Message.findOne({ 
                idempotencyKey: req.body.idempotencyKey,
                accountId: accountId  // Ensure message belongs to this account
            });
            if (existingMessage) {
                return res.json({
                    success: true,
                    message: 'Message already processed',
                    data: {
                        messageId: existingMessage._id.toString(),
                        actionId: null
                    }
                });
            }
        }

        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// @desc    Log monitoring activity
// @route   POST /api/messages/monitoring-activity
// @access  Private
const logMonitoringActivity = async (req, res) => {
    try {
        const { activity, reason, count, error, timestamp } = req.body;
        const userId = req.user._id;
        const username = req.user.username || req.user.email;

        const activityMessages = {
            'monitoring_started': `🚀 [Message Monitoring] Started for user: ${username} (${userId})`,
            'monitoring_stopped': `⏹️ [Message Monitoring] Stopped for user: ${username} (${userId})`,
            'messages_processed': `📬 [Message Monitoring] Processed ${count} message(s) for user: ${username}`,
            'monitoring_error': `❌ [Message Monitoring] Error for user: ${username}: ${error}`
        };

        const logMessage = activityMessages[activity] || `ℹ️ [Message Monitoring] ${activity} for user: ${username}`;
        
        if (reason) {
            console.log(`${logMessage} (Reason: ${reason})`);
        } else {
            console.log(logMessage);
        }

        if (timestamp) {
            console.log(`   Timestamp: ${timestamp}`);
        }

        res.json({
            success: true,
            message: 'Activity logged'
        });
    } catch (error) {
        console.error('❌ [Message Monitoring] Error logging activity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// @desc    Process all pending messages for a client (scan and reply to all unread)
// @route   POST /api/messages/process-pending
// @access  Private
const processPendingMessages = async (req, res) => {
    try {
        const { clientId } = req.body;
        const accountId = req.user._id;

        if (!clientId) {
            return res.status(400).json({ success: false, message: 'Client ID is required' });
        }

        console.log(`🔄 [Process Pending] Processing all pending messages for client: ${clientId}`);

        const client = await Client.findOne({ 
            _id: clientId, 
            userId: accountId 
        });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        if (!client.aiActive) {
            return res.status(400).json({ 
                success: false, 
                message: 'AI is disabled for this client. Please enable AI first.' 
            });
        }

        // CRITICAL: Find all messages that haven't been replied to yet
        // Must filter by both clientId AND accountId to prevent cross-account access
        const pendingMessages = await Message.find({
            clientId: client._id,
            accountId: accountId, // CRITICAL: Ensure messages belong to this account
            $or: [
                { replyStatus: 'none' },
                { replyStatus: 'queued' },
                { replyStatus: 'failed' }
            ]
        }).sort({ receivedAt: 1 }).limit(50); // Process up to 50 at a time

        console.log(`📬 [Process Pending] Found ${pendingMessages.length} pending message(s) to process`);

        if (pendingMessages.length === 0) {
            return res.json({
                success: true,
                message: 'No pending messages found',
                data: { processed: 0 }
            });
        }

        let processed = 0;
        let failed = 0;

        // Process each pending message
        for (const message of pendingMessages) {
            try {
                // CRITICAL: Generate AI reply with accountId validation
                console.log(`🤖 [Process Pending] Generating reply for message from ${message.senderName}`);
                const replyText = await generateAIReply(clientId, message.incomingText, message.senderName, accountId);
                
                // Update message
                message.replyText = replyText;
                message.replyStatus = 'queued';
                await message.save();

                // Create action to send message
                const action = await Action.create({
                    accountId,
                    clientId,
                    type: 'sendMessage',
                    payload: {
                        conversationId: message.conversationId,
                        messageText: replyText
                    },
                    status: 'pending'
                });

                console.log(`✅ [Process Pending] Created action ${action._id} for conversation ${message.conversationId}`);
                processed++;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`❌ [Process Pending] Error processing message ${message._id}:`, error);
                message.replyStatus = 'failed';
                await message.save();
                failed++;
            }
        }

        // Update client stats
        client.totalReplies += processed;
        await client.save();

        console.log(`✅ [Process Pending] Complete - Processed: ${processed}, Failed: ${failed}`);

        res.json({
            success: true,
            message: `Processed ${processed} message(s)`,
            data: {
                processed,
                failed,
                total: pendingMessages.length
            }
        });
    } catch (error) {
        console.error('❌ [Process Pending] Process pending messages error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

module.exports = {
    checkMessages,
    generateReply,
    logReply,
    handleIncomingMessage,
    logMonitoringActivity,
    processPendingMessages
};

