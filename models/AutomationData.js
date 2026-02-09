const mongoose = require('mongoose');

const automationDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    statistics: {
        profilesVisited: {
            type: Number,
            default: 0
        },
        connectionsRequested: {
            type: Number,
            default: 0
        },
        messagesSent: {
            type: Number,
            default: 0
        }
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {
            // Legacy fields (for backward compatibility)
            delayMin: 3,
            delayMax: 8,
            dailyLimit: 50,
            connectionMessage: 'Hi {firstName},',
            messageTemplates: [
                'Hi {firstName}, I came across your profile and would love to connect!',
                'Hello {firstName}, I noticed we share similar interests. Let\'s connect!',
                'Hi {firstName}, I\'d like to add you to my professional network on LinkedIn.'
            ],
            selectedMessageTemplate: '',
            secondDegreeMessageTemplates: [],
            selectedSecondDegreeTemplate: '',
            groupMembersMessageTemplates: [],
            selectedGroupMembersTemplate: '',
            autoStop: true,
            autoPagination: false,
            pageLimit: 25,
            autoLikeMaxPosts: 20,
            killwords: '',
            
            // All Dux-Soup settings fields (will be stored dynamically)
            // Actions Tab
            autoconnect: false,
            autoconnectmessageflag: false,
            autoconnectmessagetext: '',
            connectedmessageflag: false,
            connectedmessagetext: '',
            sendinmailflag: false,
            sendinmailsubject: '',
            sendinmailbody: '',
            autofollow: false,
            autodisconnect: false,
            autosaveaslead: false,
            autopdf: false,
            autoendorse: false,
            autoendorsetarget: '5',
            autotagflag: false,
            autotagvalue: '',
            runautomationsonmanualvisits: false,
            expand: false,
            excludelowconnectioncountaction: false,
            excludelowconnectioncountvalue: 0,
            excludeblacklistedaction: false,
            excludetagskippedaction: false,
            expirependinginvitesflag: false,
            expirependinginvitesvalue: 7,
            followupflag: false,
            followupforallflag: false,
            activefollowupcampaignid: '',
            
            // Skipping Tab
            skip3plus: false,
            skipnopremium: false,
            skipnolion: false,
            skipnoinfluencer: false,
            skipnojobseeker: false,
            skipincrm: false,
            skipnoimage: false,
            skiptaggedflag: false,
            skiptaggedvalue: '',
            skipcustomflag: false,
            skipcustomvalue: '',
            skipdays: '31',
            
            // Throttling Tab
            throttletime: '1',
            scanthrottletime: '3000',
            waitminutes: 5,
            waitvisits: 20,
            linkedinlimitsnooze: 3,
            linkedinlimitalert: '',
            warning: false,
            maxvisits: '0',
            maxinvites: '20',
            maxmessages: '50',
            randomrange: false,
            snooze: true,
            
            // Integration Tab
            webhookprofileflag: false,
            webhooks: [],
            messagebridgeflag: false,
            messagebridgeinterval: 1,
            remotecontrolflag: false,
            rcurl: '',
            rckey: '',
            
            // Planner Tab
            robotscheduleplan: '',
            
            // User Tab
            useremail: '',
            userid: '',
            clientid: '',
            xlicensekey: '',
            xlicenseexpiry: '',
            simplegui: true,
            
            // Browser Tab
            csvseparator: ',',
            infonotifications: true,
            actionnotifications: true,
            warningnotifications: true,
            badgedisplay: 'visits',
            pageinitdelay: '2500',
            ignoreunknown: false,
            uselocalstorage: false,
            startdisabled: false
        }
    },
    automationStatus: {
        type: String,
        enum: ['idle', 'running', 'paused'],
        default: 'idle'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AutomationData', automationDataSchema);
