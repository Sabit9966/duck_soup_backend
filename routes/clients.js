const express = require('express');
const router = express.Router();
const { 
    getClients, 
    getClient, 
    createClient, 
    updateClient, 
    toggleAI, 
    deleteClient 
} = require('../controllers/clientController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getClients);
router.get('/:id', protect, getClient);
router.post('/', protect, createClient);
router.put('/:id', protect, updateClient);
router.patch('/:id/ai-toggle', protect, toggleAI);
router.delete('/:id', protect, deleteClient);

module.exports = router;

