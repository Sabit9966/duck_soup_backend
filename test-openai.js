/**
 * OpenAI Test Script
 * Tests OpenAI API connection and response generation
 * 
 * Usage: node test-openai.js
 */

require('dotenv').config();
const OpenAI = require('openai');

// Check if API key is set
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set in .env file');
    console.log('💡 Please add OPENAI_API_KEY=your_key_here to your .env file');
    process.exit(1);
}

console.log('🧪 Testing OpenAI API Connection...\n');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Test function
async function testOpenAI() {
    try {
        console.log('📡 Connecting to OpenAI API...');
        console.log('🔑 API Key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...' + process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4));
        console.log('🤖 Model:', process.env.OPENAI_MODEL || 'gpt-3.5-turbo');
        console.log('');

        // Test 1: Simple completion
        console.log('📝 Test 1: Simple Message Completion');
        console.log('─────────────────────────────────────────');
        
        const testMessage = "Say 'Hello, OpenAI is working!' in a friendly way.";
        
        console.log('Sending message:', testMessage);
        console.log('');

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: testMessage }
            ],
            temperature: 0.7,
            max_tokens: 100
        });

        const response = completion.choices[0].message.content;
        
        console.log('✅ Response received:');
        console.log('   ' + response);
        console.log('');
        console.log('📊 Usage Stats:');
        console.log('   Tokens used:', completion.usage.total_tokens);
        console.log('   Prompt tokens:', completion.usage.prompt_tokens);
        console.log('   Completion tokens:', completion.usage.completion_tokens);
        console.log('');

        // Test 2: With persona (simulating client persona)
        console.log('📝 Test 2: Message with Persona');
        console.log('─────────────────────────────────────────');
        
        const persona = "You are a professional LinkedIn networking expert. Be concise, friendly, and professional.";
        const userMessage = "Someone sent me a message saying 'Hi, I saw your profile and would like to connect.' How should I reply?";
        
        console.log('Persona:', persona);
        console.log('User message:', userMessage);
        console.log('');

        const completion2 = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: persona },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 200
        });

        const response2 = completion2.choices[0].message.content;
        
        console.log('✅ AI Generated Reply:');
        console.log('   ' + response2);
        console.log('');

        // Test 3: With documents (simulating client documents)
        console.log('📝 Test 3: Message with Documents Context');
        console.log('─────────────────────────────────────────');
        
        const documents = [
            { name: 'Company Info', content: 'We are a tech company specializing in AI automation. Founded in 2020.' },
            { name: 'Services', content: 'We offer LinkedIn automation, AI-powered messaging, and lead generation services.' }
        ];
        
        const systemPrompt = `You are responding to a LinkedIn message. 
        
Context Documents:
${documents.map((doc, i) => `Document ${i + 1} (${doc.name}):\n${doc.content}`).join('\n\n')}

Generate a professional, friendly response.`;
        
        const userMessage3 = "Hi, I'm interested in your services. Can you tell me more?";
        
        console.log('Documents:', documents.length);
        console.log('User message:', userMessage3);
        console.log('');

        const completion3 = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage3 }
            ],
            temperature: 0.7,
            max_tokens: 200
        });

        const response3 = completion3.choices[0].message.content;
        
        console.log('✅ AI Generated Reply (with context):');
        console.log('   ' + response3);
        console.log('');

        // Summary
        console.log('═════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED!');
        console.log('✅ OpenAI API is working correctly');
        console.log('✅ Ready to use in production');
        console.log('═════════════════════════════════════════');

    } catch (error) {
        console.error('\n❌ ERROR: OpenAI API test failed');
        console.error('─────────────────────────────────────────');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Error:', error.response.data);
        } else if (error.message) {
            console.error('Error Message:', error.message);
        } else {
            console.error('Full Error:', error);
        }
        
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Check if OPENAI_API_KEY is correct in .env file');
        console.error('   2. Verify your OpenAI account has credits');
        console.error('   3. Check your internet connection');
        console.error('   4. Verify the API key has proper permissions');
        
        process.exit(1);
    }
}

// Run the test
testOpenAI();

