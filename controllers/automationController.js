const AutomationData = require('../models/AutomationData');

// @desc    Get automation statistics
// @route   GET /api/automation/stats
// @access  Private
const getStats = async (req, res) => {
    try {
        let automationData = await AutomationData.findOne({ userId: req.user._id });

        if (!automationData) {
            automationData = await AutomationData.create({ userId: req.user._id });
        }

        res.json({ success: true, data: automationData.statistics });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Update automation statistics
// @route   PUT /api/automation/stats
// @access  Private
const updateStats = async (req, res) => {
    try {
        const { statType } = req.body;

        let automationData = await AutomationData.findOne({ userId: req.user._id });

        if (!automationData) {
            automationData = await AutomationData.create({ userId: req.user._id });
        }

        if (statType === 'profileVisit') {
            automationData.statistics.profilesVisited++;
        } else if (statType === 'connection') {
            automationData.statistics.connectionsRequested++;
        } else if (statType === 'message') {
            automationData.statistics.messagesSent++;
        }

        await automationData.save();

        res.json({ success: true, data: automationData.statistics });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get automation settings
// @route   GET /api/automation/settings
// @access  Private
const getSettings = async (req, res) => {
    try {
        let automationData = await AutomationData.findOne({ userId: req.user._id });

        if (!automationData) {
            automationData = await AutomationData.create({ userId: req.user._id });
        }

        // Log what was retrieved - ALL toggle states and messages
        console.log('📥 Settings retrieved from MongoDB:', {
            // Toggle States
            toggleStates: {
                autoconnect: automationData.settings.autoconnect,
                autoconnectmessageflag: automationData.settings.autoconnectmessageflag,
                connectedmessageflag: automationData.settings.connectedmessageflag,
                sendinmailflag: automationData.settings.sendinmailflag,
                autofollow: automationData.settings.autofollow,
                autodisconnect: automationData.settings.autodisconnect,
                autosaveaslead: automationData.settings.autosaveaslead,
                autopdf: automationData.settings.autopdf,
                autoendorse: automationData.settings.autoendorse,
                autotagflag: automationData.settings.autotagflag,
                webhookprofileflag: automationData.settings.webhookprofileflag,
                messagebridgeflag: automationData.settings.messagebridgeflag,
                remotecontrolflag: automationData.settings.remotecontrolflag,
                warning: automationData.settings.warning,
                snooze: automationData.settings.snooze
            },
            // Message Fields
            messageFields: {
                autoconnectmessagetext: automationData.settings.autoconnectmessagetext || '(empty)',
                connectedmessagetext: automationData.settings.connectedmessagetext || '(empty)',
                sendinmailbody: automationData.settings.sendinmailbody || '(empty)',
                sendinmailsubject: automationData.settings.sendinmailsubject || '(empty)'
            },
            // Other important fields
            webhooksCount: automationData.settings.webhooks?.length || 0,
            totalSettingsKeys: Object.keys(automationData.settings || {}).length,
            // Legacy fields
            messageTemplatesCount: automationData.settings.messageTemplates?.length || 0,
            killwords: automationData.settings.killwords || ''
        });

        res.json({ success: true, data: automationData.settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Update automation settings
// @route   PUT /api/automation/settings
// @access  Private
const updateSettings = async (req, res) => {
    try {
        let automationData = await AutomationData.findOne({ userId: req.user._id });

        if (!automationData) {
            automationData = await AutomationData.create({ userId: req.user._id });
        }

        // Initialize settings if it doesn't exist
        if (!automationData.settings || typeof automationData.settings !== 'object') {
            automationData.settings = {};
        }

        // Update ALL settings fields dynamically from request body
        // This allows any field to be saved, including all toggle states
        const settingsToUpdate = req.body;
        
        // Special handling for arrays and objects
        Object.keys(settingsToUpdate).forEach(key => {
            const value = settingsToUpdate[key];
            
            // Skip undefined values
            if (value === undefined) return;
            
            // Log important message fields being saved
            if (key === 'connectedmessagetext') {
                console.log('💾 Saving connectedmessagetext:', {
                    valueType: typeof value,
                    valueLength: typeof value === 'string' ? value.length : 'N/A',
                    isEmpty: typeof value === 'string' && value.trim() === '',
                    valuePreview: typeof value === 'string' ? value.substring(0, 50) + '...' : value
                });
            }
            
            // Handle arrays (like webhooks)
            if (Array.isArray(value)) {
                automationData.settings[key] = value;
            }
            // Handle objects
            else if (value !== null && typeof value === 'object') {
                automationData.settings[key] = value;
            }
            // Handle primitives (strings, numbers, booleans)
            else {
                automationData.settings[key] = value;
            }
        });

        // Special validation for numeric fields
        if (automationData.settings.pageLimit !== undefined) {
            automationData.settings.pageLimit = Math.min(Math.max(parseInt(automationData.settings.pageLimit) || 25, 1), 100);
        }
        if (automationData.settings.autoLikeMaxPosts !== undefined) {
            automationData.settings.autoLikeMaxPosts = Math.min(Math.max(parseInt(automationData.settings.autoLikeMaxPosts) || 20, 1), 100);
        }

        // IMPORTANT: Mark settings as modified for Mongoose Mixed type
        // This ensures nested object changes are properly saved
        automationData.markModified('settings');

        // Log before save
        if (settingsToUpdate.connectedmessagetext) {
            console.log('💾 Before save - connectedmessagetext in automationData.settings:', {
                exists: 'connectedmessagetext' in automationData.settings,
                value: automationData.settings.connectedmessagetext ? 
                    automationData.settings.connectedmessagetext.substring(0, 50) + '... (length: ' + automationData.settings.connectedmessagetext.length + ')' : 
                    'undefined',
                type: typeof automationData.settings.connectedmessagetext,
                settingsKeys: Object.keys(automationData.settings).filter(k => k.includes('message') || k.includes('connect'))
            });
        }
        
        await automationData.save();
        
        // Reload from database to verify save
        // Use lean() to get plain JavaScript object and ensure fresh data
        const savedData = await AutomationData.findOne({ userId: req.user._id }).lean();
        if (savedData && settingsToUpdate.connectedmessagetext) {
            console.log('💾 After save - connectedmessagetext in database:', {
                exists: savedData.settings && 'connectedmessagetext' in savedData.settings,
                value: savedData.settings?.connectedmessagetext ? 
                    savedData.settings.connectedmessagetext.substring(0, 50) + '... (length: ' + savedData.settings.connectedmessagetext.length + ')' : 
                    'undefined',
                type: typeof savedData.settings?.connectedmessagetext,
                settingsKeys: savedData.settings ? Object.keys(savedData.settings).filter(k => k.includes('message') || k.includes('connect')) : []
            });
        }

        // Log important fields that were saved
        console.log('✅ Settings saved to MongoDB:', {
            toggleStates: {
                autoconnect: automationData.settings.autoconnect,
                connectedmessageflag: automationData.settings.connectedmessageflag,
                autofollow: automationData.settings.autofollow,
                autodisconnect: automationData.settings.autodisconnect,
                webhookprofileflag: automationData.settings.webhookprofileflag,
                messagebridgeflag: automationData.settings.messagebridgeflag,
                remotecontrolflag: automationData.settings.remotecontrolflag
            },
            messageFields: {
                autoconnectmessagetext: automationData.settings.autoconnectmessagetext?.substring(0, 50) || '(empty)',
                connectedmessagetext: automationData.settings.connectedmessagetext ? 
                    automationData.settings.connectedmessagetext.substring(0, 50) + '... (length: ' + automationData.settings.connectedmessagetext.length + ')' : 
                    '(empty)',
                connectedmessagetextLength: automationData.settings.connectedmessagetext?.length || 0
            },
            webhooksCount: automationData.settings.webhooks?.length || 0,
            totalFieldsSaved: Object.keys(settingsToUpdate).length,
            connectedmessagetextInRequest: 'connectedmessagetext' in settingsToUpdate,
            connectedmessagetextValue: settingsToUpdate.connectedmessagetext ? 
                settingsToUpdate.connectedmessagetext.substring(0, 50) + '... (length: ' + settingsToUpdate.connectedmessagetext.length + ')' : 
                '(not in request)'
        });
        
        res.json({ success: true, data: automationData.settings });
    } catch (error) {
        console.error('❌ Update settings error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get automation status
// @route   GET /api/automation/status
// @access  Private
const getStatus = async (req, res) => {
    try {
        let automationData = await AutomationData.findOne({ userId: req.user._id });

        if (!automationData) {
            automationData = await AutomationData.create({ userId: req.user._id });
        }

        res.json({ success: true, data: { status: automationData.automationStatus } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Update automation status
// @route   PUT /api/automation/status
// @access  Private
const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        let automationData = await AutomationData.findOne({ userId: req.user._id });

        if (!automationData) {
            automationData = await AutomationData.create({ userId: req.user._id });
        }

        automationData.automationStatus = status;
        await automationData.save();

        res.json({ success: true, data: { status: automationData.automationStatus } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getStats,
    updateStats,
    getSettings,
    updateSettings,
    getStatus,
    updateStatus
};
