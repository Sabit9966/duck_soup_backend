const mongoose = require('mongoose');

const profileDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false,
        index: true
    },
    profileUrl: {
        type: String,
        required: true,
        index: true
    },
    profileId: {
        type: String,
        required: true,
        unique: true
        // Note: unique: true automatically creates an index, so index: true is not needed
    },
    // Basic Information
    fullName: {
        type: String,
        default: ''
    },
    firstName: {
        type: String,
        default: ''
    },
    lastName: {
        type: String,
        default: ''
    },
    headline: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    country: {
        type: String,
        default: ''
    },
    about: {
        type: String,
        default: ''
    },
    aboutSection: {
        type: String,
        default: ''
    },
    profilePhotoUrl: {
        type: String,
        default: ''
    },
    bannerImageUrl: {
        type: String,
        default: ''
    },
    // Contact Information
    email: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        default: ''
    },
    linkedinId: {
        type: String,
        default: ''
    },
    // Professional Information
    currentCompany: {
        type: String,
        default: ''
    },
    currentPosition: {
        type: String,
        default: ''
    },
    companyLink: {
        type: String,
        default: ''
    },
    industry: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    companyId: {
        type: String,
        default: ''
    },
    // Profile URL variants (for different LinkedIn products)
    salesProfile: {
        type: String,
        default: ''
    },
    publicProfile: {
        type: String,
        default: ''
    },
    recruiterProfile: {
        type: String,
        default: ''
    },
    experience: [{
        company: String,
        position: String,
        duration: String,
        description: String,
        companyLink: String
    }],
    experienceCount: {
        type: Number,
        default: 0
    },
    experienceDetails: {
        type: String, // JSON string for Excel compatibility
        default: ''
    },
    totalYearsExperience: {
        type: Number,
        default: 0
    },
    education: [{
        school: String,
        degree: String,
        field: String,
        duration: String
    }],
    educationCount: {
        type: Number,
        default: 0
    },
    educationDetails: {
        type: String, // JSON string for Excel compatibility
        default: ''
    },
    skills: [{
        type: String
    }],
    skillsArray: [{
        type: String
    }],
    // Social Information
    connections: {
        type: String,
        default: ''
    },
    connectionsCount: {
        type: String,
        default: ''
    },
    followers: {
        type: String,
        default: ''
    },
    followersCount: {
        type: String,
        default: ''
    },
    profileViewsVisible: {
        type: Boolean,
        default: false
    },
    recentActivity: {
        type: String,
        default: ''
    },
    // Additional Data
    languages: [{
        type: String
    }],
    certifications: [{
        name: String,
        issuer: String,
        date: String
    }],
    // Metadata
    actionType: {
        type: String,
        enum: ['visit', 'connect', 'visitAndConnect', 'visitAndMessage1stDegree', 'visitAndMessage2ndDegree', 'message', 'scanConnectionsProfiles', 'scanAllProfiles'],
        default: 'visit'
    },
    visitedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    visitedTimestamp: {
        type: String, // ISO timestamp string for Excel compatibility
        default: ''
    },
    connected: {
        type: Boolean,
        default: false
    },
    connectionStatus: {
        type: String,
        enum: ['Not Connected', 'Pending', 'Connected'],
        default: 'Not Connected'
    },
    connectClicked: {
        type: Boolean,
        default: false
    },
    connectionDate: {
        type: Date
    },
    dataSource: {
        type: String,
        enum: ['full_profile_page', 'search_card', 'sales_navigator_card'],
        default: 'full_profile_page'
    },
    profileVisited: {
        type: Boolean,
        default: true
    },
    campaignId: {
        type: String,
        default: ''
    },
    automationRunId: {
        type: String,
        default: ''
    },
    // Raw HTML data for future extraction
    rawData: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
profileDataSchema.index({ userId: 1, visitedAt: -1 });
profileDataSchema.index({ userId: 1, actionType: 1 });

// Prevent duplicate profiles for same user
// Note: profileId already has unique: true in schema, and this compound index covers profileId queries
profileDataSchema.index({ userId: 1, profileId: 1 }, { unique: true });

module.exports = mongoose.model('ProfileData', profileDataSchema);

