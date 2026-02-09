const ProfileData = require('../models/ProfileData');

// @desc    Get all profile data for user
// @route   GET /api/profile-data
// @access  Private
const getProfileData = async (req, res) => {
    try {
        const { page = 1, limit = 50, actionType, search } = req.query;
        const userId = req.user._id;

        // Build query
        const query = { userId };
        if (actionType) {
            query.actionType = actionType;
        }
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { headline: { $regex: search, $options: 'i' } },
                { currentCompany: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        const profiles = await ProfileData.find(query)
            .sort({ visitedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await ProfileData.countDocuments(query);

        res.json({
            success: true,
            data: profiles,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count
        });
    } catch (error) {
        console.error('Error getting profile data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile data',
            error: error.message
        });
    }
};

// @desc    Get single profile data
// @route   GET /api/profile-data/:id
// @access  Private
const getProfileById = async (req, res) => {
    try {
        const profile = await ProfileData.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};

// @desc    Save profile data
// @route   POST /api/profile-data
// @access  Private
const saveProfileData = async (req, res) => {
    try {
        const {
            profileUrl,
            profileId,
            fullName,
            headline,
            location,
            about,
            email,
            phone,
            website,
            currentCompany,
            currentPosition,
            industry,
            experience,
            education,
            skills,
            connections,
            followers,
            languages,
            certifications,
            actionType,
            connected,
            rawData
        } = req.body;

        if (!profileUrl || !profileId) {
            return res.status(400).json({
                success: false,
                message: 'Profile URL and Profile ID are required'
            });
        }

        const userId = req.user._id;

        // Check if profile already exists (by profileId globally, since it's unique)
        // Use findOneAndUpdate with upsert to handle duplicates gracefully
        const updateData = {
            userId,
            profileUrl,
            profileId,
            fullName: fullName || '',
            headline: headline || '',
            location: location || '',
            about: about || '',
            email: email || '',
            phone: phone || '',
            website: website || '',
            currentCompany: currentCompany || '',
            currentPosition: currentPosition || '',
            industry: industry || req.body.Industry || '',
            address: req.body.Address || req.body.address || '',
            experience: experience || [],
            education: education || [],
            skills: skills || [],
            connections: connections || '',
            followers: followers || '',
            languages: languages || [],
            certifications: certifications || [],
            actionType: actionType || 'visit',
            connected: connected || false,
            connectionDate: connected ? new Date() : null,
            rawData: rawData || null,
            visitedAt: new Date(),
            // Update new fields if provided
            ...(req.body.firstName && { firstName: req.body.firstName }),
            ...(req.body.lastName && { lastName: req.body.lastName }),
            ...(req.body.country && { country: req.body.country }),
            ...(req.body.aboutSection && { aboutSection: req.body.aboutSection }),
            ...(req.body.profilePhotoUrl && { profilePhotoUrl: req.body.profilePhotoUrl }),
            ...(req.body.bannerImageUrl && { bannerImageUrl: req.body.bannerImageUrl }),
            ...(req.body.linkedinId && { linkedinId: req.body.linkedinId }),
            ...(req.body.companyLink && { companyLink: req.body.companyLink }),
            ...(req.body.experienceCount !== undefined && { experienceCount: req.body.experienceCount }),
            ...(req.body.educationCount !== undefined && { educationCount: req.body.educationCount }),
            ...(req.body.totalYearsExperience !== undefined && { totalYearsExperience: req.body.totalYearsExperience }),
            ...(req.body.experienceDetails && { experienceDetails: req.body.experienceDetails }),
            ...(req.body.educationDetails && { educationDetails: req.body.educationDetails }),
            ...(req.body.skillsArray && { skillsArray: req.body.skillsArray }),
            ...(req.body.connectionsCount && { connectionsCount: req.body.connectionsCount }),
            ...(req.body.followersCount && { followersCount: req.body.followersCount }),
            ...(req.body.profileViewsVisible !== undefined && { profileViewsVisible: req.body.profileViewsVisible }),
            ...(req.body.recentActivity && { recentActivity: req.body.recentActivity }),
            ...(req.body.dataSource && { dataSource: req.body.dataSource }),
            ...(req.body.profileVisited !== undefined && { profileVisited: req.body.profileVisited }),
            ...(req.body.visitedTimestamp && { visitedTimestamp: req.body.visitedTimestamp }),
            ...(req.body.connectionStatus && { connectionStatus: req.body.connectionStatus }),
            ...(req.body.connectClicked !== undefined && { connectClicked: req.body.connectClicked })
        };

        // Use findOneAndUpdate with upsert to handle duplicates
        // CRITICAL: Must filter by both userId AND profileId to prevent cross-user data leakage
        // This ensures each user only updates their own profiles
        const profile = await ProfileData.findOneAndUpdate(
            { userId: userId, profileId: profileId }, // Find by userId AND profileId (compound unique index)
            { $set: updateData },
            { 
                new: true, // Return updated document
                upsert: true, // Create if doesn't exist
                runValidators: true // Run schema validators
            }
        );

        res.status(201).json({
            success: true,
            data: profile,
            message: 'Profile saved/updated'
        });
    } catch (error) {
        console.error('Error saving profile data:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving profile data',
            error: error.message
        });
    }
};

// @desc    Delete profile data
// @route   DELETE /api/profile-data/:id
// @access  Private
const deleteProfileData = async (req, res) => {
    try {
        const profile = await ProfileData.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting profile',
            error: error.message
        });
    }
};

// @desc    Delete all profile data for user (optional: by actionType for fresh-run-only)
// @route   DELETE /api/profile-data
// @route   DELETE /api/profile-data?actionType=scanAllProfiles
// @access  Private
const deleteAllProfileData = async (req, res) => {
    try {
        const filter = { userId: req.user._id };
        if (req.query.actionType) {
            filter.actionType = req.query.actionType;
        }
        const result = await ProfileData.deleteMany(filter);

        res.json({
            success: true,
            message: req.query.actionType
                ? `Deleted ${result.deletedCount} profiles (actionType: ${req.query.actionType})`
                : `Deleted ${result.deletedCount} profiles`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting all profiles:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting profiles',
            error: error.message
        });
    }
};

// @desc    Get statistics
// @route   GET /api/profile-data/stats
// @access  Private
const getProfileStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const stats = await ProfileData.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    connected: { $sum: { $cond: ['$connected', 1, 0] } },
                    visited: { $sum: { $cond: [{ $eq: ['$actionType', 'visit'] }, 1, 0] } },
                    visitAndConnect: { $sum: { $cond: [{ $eq: ['$actionType', 'visitAndConnect'] }, 1, 0] } }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                total: 0,
                connected: 0,
                visited: 0,
                visitAndConnect: 0
            }
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};

module.exports = {
    getProfileData,
    getProfileById,
    saveProfileData,
    deleteProfileData,
    deleteAllProfileData,
    getProfileStats
};

