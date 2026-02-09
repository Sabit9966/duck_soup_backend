// MongoDB Check Script - Check if connectedmessagetext is stored for user 'ali'
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('./models/User');
const AutomationData = require('./models/AutomationData');

async function checkMongoDB() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dux-soup';
        console.log('🔌 Connecting to MongoDB:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB\n');

        // Find user 'ali'
        const user = await User.findOne({ username: 'ali' });
        if (!user) {
            console.log('❌ User "ali" not found');
            console.log('Available users:', await User.find({}, 'username email'));
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log('✅ User found:');
        console.log('   ID:', user._id);
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('');

        // Find automation data for this user
        let automationData = await AutomationData.findOne({ userId: user._id });
        if (!automationData) {
            console.log('⚠️ No automation data found, creating new...');
            automationData = await AutomationData.create({ userId: user._id });
        }

        console.log('📋 Automation Settings:');
        console.log('================================');
        console.log('connectedmessageflag:', automationData.settings?.connectedmessageflag || false);
        console.log('connectedmessagetext length:', automationData.settings?.connectedmessagetext?.length || 0);
        console.log('');
        
        console.log('All message-related fields:');
        console.log('- autoconnectmessagetext:', automationData.settings?.autoconnectmessagetext ? 
            automationData.settings.autoconnectmessagetext.substring(0, 50) + '...' : '(empty)');
        console.log('- connectedmessagetext:', automationData.settings?.connectedmessagetext ? 
            automationData.settings.connectedmessagetext.substring(0, 50) + '...' : '(empty)');
        console.log('- sendinmailbody:', automationData.settings?.sendinmailbody ? 
            automationData.settings.sendinmailbody.substring(0, 50) + '...' : '(empty)');
        console.log('');
        
        const messageKeys = Object.keys(automationData.settings || {}).filter(k => 
            k.toLowerCase().includes('message') || k.toLowerCase().includes('connect')
        );
        console.log('📊 All message/connect related keys in settings:', messageKeys);
        console.log('');

        if (automationData.settings?.connectedmessagetext && automationData.settings.connectedmessagetext.trim().length > 0) {
            console.log('✅ connectedmessagetext IS stored in database!');
            console.log('Full text:');
            console.log('--------------------------------');
            console.log(automationData.settings.connectedmessagetext);
            console.log('--------------------------------');
            console.log('Length:', automationData.settings.connectedmessagetext.length, 'characters');
        } else {
            console.log('❌ connectedmessagetext is NOT stored or is empty in database!');
            console.log('Value:', automationData.settings?.connectedmessagetext || 'undefined');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

checkMongoDB();

