const Client = require('../models/Client');

// @desc    Get all clients for user
// @route   GET /api/clients
// @access  Private
const getClients = async (req, res) => {
    try {
        const clients = await Client.find({ userId: req.user._id })
            .select('-linkedinPhoneNumber -linkedinPassword') // Don't send credentials
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: clients
        });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
const getClient = async (req, res) => {
    try {
        // For editing purposes, include phone and password since user owns the client
        const client = await Client.findOne({ 
            _id: req.params.id, 
            userId: req.user._id 
        });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        // Return all fields including credentials for editing (user owns this client)
        res.json({
            success: true,
            data: client
        });
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Create new client
// @route   POST /api/clients
// @access  Private
const createClient = async (req, res) => {
    try {
        const { name, linkedinPhoneNumber, linkedinPassword, aiProvider } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Client name is required' });
        }

        // Check if client name already exists for this user
        const existingClient = await Client.findOne({ 
            userId: req.user._id, 
            name: name.trim() 
        });

        if (existingClient) {
            return res.status(400).json({ success: false, message: 'Client with this name already exists' });
        }

        // Create client object
        const clientDataToCreate = {
            userId: req.user._id,
            name: name.trim(),
            aiProvider: aiProvider || 'openai',
            aiActive: false
        };
        
        // Only add credentials if provided
        if (linkedinPhoneNumber && linkedinPhoneNumber.trim()) {
            clientDataToCreate.linkedinPhoneNumber = linkedinPhoneNumber.trim();
        }
        
        if (linkedinPassword && linkedinPassword.trim()) {
            clientDataToCreate.linkedinPassword = linkedinPassword;
        }
        
        const client = await Client.create(clientDataToCreate);

        // Return without credentials
        const clientData = client.toObject();
        delete clientData.linkedinPhoneNumber;
        delete clientData.linkedinPassword;

        res.status(201).json({
            success: true,
            data: clientData
        });
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
const updateClient = async (req, res) => {
    try {
        const { name, linkedinPhoneNumber, linkedinPassword, aiActive, aiProvider, persona, documents } = req.body;

        const client = await Client.findOne({ 
            _id: req.params.id, 
            userId: req.user._id 
        });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        // Update fields
        if (name !== undefined) client.name = name.trim();
        if (linkedinPhoneNumber !== undefined) client.linkedinPhoneNumber = linkedinPhoneNumber;
        if (linkedinPassword !== undefined) client.linkedinPassword = linkedinPassword;
        if (aiActive !== undefined) client.aiActive = aiActive;
        if (aiProvider !== undefined) client.aiProvider = aiProvider;
        if (persona !== undefined) client.persona = persona;
        if (documents !== undefined) client.documents = documents;

        await client.save();

        // Return without credentials
        const clientData = client.toObject();
        delete clientData.linkedinPhoneNumber;
        delete clientData.linkedinPassword;

        res.json({
            success: true,
            data: clientData
        });
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Toggle AI active status
// @route   PATCH /api/clients/:id/ai-toggle
// @access  Private
const toggleAI = async (req, res) => {
    try {
        const clientId = req.params.id;
        const userId = req.user._id;
        const username = req.user.username || req.user.email;
        
        console.log(`\n🔄 [Toggle AI] Request received:`);
        console.log(`   Client ID: ${clientId}`);
        console.log(`   User ID: ${userId} (${username})`);
        
        const client = await Client.findOne({ 
            _id: clientId, 
            userId: userId
        });

        if (!client) {
            console.log(`❌ [Toggle AI] Client not found for ID: ${clientId}`);
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const oldStatus = client.aiActive;
        client.aiActive = !client.aiActive;
        await client.save();

        console.log(`✅ [Toggle AI] Client "${client.name}" AI status changed:`);
        console.log(`   Old status: ${oldStatus ? 'Active' : 'Inactive'}`);
        console.log(`   New status: ${client.aiActive ? 'Active' : 'Inactive'}`);
        console.log(`   Client ID: ${client._id}`);
        
        // Log message monitoring status change
        if (client.aiActive) {
            console.log(`🚀 [Message Monitoring] AI activated - Message monitoring should start automatically`);
            console.log(`   Extension will begin monitoring LinkedIn messages for client: ${client.name}`);
        } else {
            console.log(`⏹️ [Message Monitoring] AI deactivated - Message monitoring will stop`);
        }
        console.log('');

        res.json({
            success: true,
            data: {
                _id: client._id,
                aiActive: client.aiActive
            }
        });
    } catch (error) {
        console.error('❌ [Toggle AI] Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
const deleteClient = async (req, res) => {
    try {
        const client = await Client.findOneAndDelete({ 
            _id: req.params.id, 
            userId: req.user._id 
        });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json({
            success: true,
            message: 'Client deleted successfully'
        });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getClients,
    getClient,
    createClient,
    updateClient,
    toggleAI,
    deleteClient
};

