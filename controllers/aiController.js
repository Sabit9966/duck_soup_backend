const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const AIContext = require('../models/AIContext');

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

// @desc    Send AI message
// @route   POST /api/ai/message
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { message, provider, persona, documents } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Get user's AI context
        let aiContext = await AIContext.findOne({ userId: req.user._id });
        const contextPersona = persona || (aiContext ? aiContext.persona : '');
        const contextDocuments = documents.length > 0 ? documents : (aiContext ? aiContext.documents : []);

        // Build context prompt
        let systemPrompt = 'You are a helpful AI assistant for LinkedIn automation.';
        
        if (contextPersona) {
            systemPrompt += `\n\nPersona:\n${contextPersona}`;
        }
        
        if (contextDocuments.length > 0) {
            systemPrompt += '\n\nContext Documents:';
            contextDocuments.forEach((doc, index) => {
                systemPrompt += `\n\nDocument ${index + 1} (${doc.name || 'Untitled'}):\n${doc.content || doc}`;
            });
        }

        const results = {};

        // OpenAI
        if ((provider === 'openai' || provider === 'both') && openaiClient) {
            try {
                const completion = await openaiClient.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                });
                results.openai = completion.choices[0].message.content;
            } catch (error) {
                console.error('OpenAI error:', error);
                results.openai = `Error: ${error.message}`;
            }
        }

        // Google Gemini
        if ((provider === 'gemini' || provider === 'both') && geminiClient) {
            try {
                const model = geminiClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-pro' });
                
                const prompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                results.gemini = response.text();
            } catch (error) {
                console.error('Gemini error:', error);
                results.gemini = `Error: ${error.message}`;
            }
        }

        if (Object.keys(results).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No AI provider configured. Please set OPENAI_API_KEY or GEMINI_API_KEY in .env' 
            });
        }

        res.json({
            success: true,
            data: provider === 'both' ? results : { response: results[provider] || results.openai || results.gemini }
        });
    } catch (error) {
        console.error('AI message error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Upload persona
// @route   POST /api/ai/persona
// @access  Private
const uploadPersona = async (req, res) => {
    try {
        const { persona } = req.body;

        let aiContext = await AIContext.findOne({ userId: req.user._id });
        
        if (aiContext) {
            aiContext.persona = persona;
            await aiContext.save();
        } else {
            aiContext = await AIContext.create({
                userId: req.user._id,
                persona,
                documents: []
            });
        }

        res.json({ success: true, data: aiContext });
    } catch (error) {
        console.error('Upload persona error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Upload documents
// @route   POST /api/ai/documents
// @access  Private
const uploadDocuments = async (req, res) => {
    try {
        const { documents } = req.body;

        let aiContext = await AIContext.findOne({ userId: req.user._id });
        
        if (aiContext) {
            aiContext.documents = documents;
            await aiContext.save();
        } else {
            aiContext = await AIContext.create({
                userId: req.user._id,
                persona: '',
                documents
            });
        }

        res.json({ success: true, data: aiContext });
    } catch (error) {
        console.error('Upload documents error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get AI context
// @route   GET /api/ai/context
// @access  Private
const getContext = async (req, res) => {
    try {
        const aiContext = await AIContext.findOne({ userId: req.user._id });
        
        res.json({
            success: true,
            data: aiContext || { persona: '', documents: [] }
        });
    } catch (error) {
        console.error('Get context error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    sendMessage,
    uploadPersona,
    uploadDocuments,
    getContext
};

