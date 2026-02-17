const Client = require('../models/Client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize AI clients
let openaiClient = null;
let geminiClient = null;

if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Generate AI reply for a message
 * @param {String} clientId - Client ID
 * @param {String} incomingMessage - Incoming message text
 * @param {String} senderName - Sender's name
 * @param {String} accountId - Account ID (optional, for validation)
 * @returns {Promise<String>} Generated reply text
 */
const generateReply = async (clientId, incomingMessage, senderName, accountId = null) => {
    try {
        // CRITICAL: If accountId provided, verify client belongs to account
        const query = accountId 
            ? { _id: clientId, userId: accountId }
            : { _id: clientId };
        
        const client = await Client.findOne(query);
        
        if (!client) {
            throw new Error('Client not found');
        }

        // CRITICAL: If accountId provided but doesn't match, this is a security violation
        if (accountId && client.userId.toString() !== accountId.toString()) {
            console.error('❌ [AI Service] SECURITY VIOLATION: Client does not belong to account:', {
                clientId,
                clientUserId: client.userId,
                requestedAccountId: accountId
            });
            throw new Error('Unauthorized: Client does not belong to this account');
        }

        if (!client.aiActive) {
            throw new Error('AI is disabled for this client');
        }

        // Build context prompt
        let systemPrompt = `You are responding to a LinkedIn message on behalf of ${client.name}. `;
        
        if (client.persona) {
            systemPrompt += `\n\nPersona:\n${client.persona}`;
        }
        
        if (client.documents && client.documents.length > 0) {
            systemPrompt += '\n\nContext Documents:';
            client.documents.forEach((doc, index) => {
                systemPrompt += `\n\nDocument ${index + 1} (${doc.name || 'Untitled'}):\n${doc.content || doc}`;
            });
        }

        systemPrompt += `\n\nYou received a message from ${senderName || 'someone'}: "${incomingMessage}"`;
        systemPrompt += '\n\nGenerate a professional, friendly, and appropriate response. Keep it concise (2-3 sentences).';

        // Always use OpenAI from backend .env (no client-level API keys)
        if (!openaiClient) {
            console.error('❌ [AI Service] OpenAI client not initialized');
            console.error('❌ [AI Service] Check if OPENAI_API_KEY is set in backend .env file');
            throw new Error('OpenAI API key not configured in backend .env file. Please set OPENAI_API_KEY.');
        }

        console.log(`🤖 [AI Service] Generating reply using OpenAI (model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'})`);
        console.log(`📝 [AI Service] System prompt length: ${systemPrompt.length} chars`);
        console.log(`📝 [AI Service] Incoming message: "${incomingMessage.substring(0, 100)}..."`);

        let reply;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Generate a reply to this message.' }
                ],
                temperature: 0.7,
                max_tokens: 200
            });
            
            reply = completion.choices[0].message.content.trim();
            console.log(`✅ [AI Service] Reply generated successfully (${reply.length} chars)`);
            console.log(`💬 [AI Service] Reply preview: "${reply.substring(0, 100)}..."`);
        } catch (error) {
            console.error('❌ [AI Service] OpenAI API error:', error);
            console.error('❌ [AI Service] Error details:', {
                message: error.message,
                status: error.status,
                code: error.code,
                type: error.type
            });
            throw new Error(`Failed to generate reply: ${error.message}`);
        }

        if (!reply) {
            console.error('❌ [AI Service] Reply is empty after generation');
            throw new Error('Failed to generate reply. Please check OpenAI API key in backend .env file.');
        }

        return reply;
    } catch (error) {
        console.error('AI reply generation error:', error);
        throw error;
    }
};

module.exports = {
    generateReply
};

