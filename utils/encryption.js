const crypto = require('crypto');

// Encryption key from environment (should be 32 bytes for AES-256)
// Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Ensure key is 32 bytes (64 hex characters)
function getEncryptionKey() {
    const key = ENCRYPTION_KEY;
    if (!key || key.length < 64) {
        // If key is too short, hash it to get 64 characters
        return crypto.createHash('sha256').update(key || 'default-key').digest('hex');
    }
    return key.slice(0, 64);
}

// Generate IV (Initialization Vector)
function generateIV() {
    return crypto.randomBytes(16);
}

// Encrypt sensitive data
function encrypt(text) {
    if (!text) return null;
    
    try {
        const iv = generateIV();
        const key = Buffer.from(getEncryptionKey(), 'hex');
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Return IV + encrypted data (IV is needed for decryption)
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

// Decrypt sensitive data
function decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = Buffer.from(getEncryptionKey(), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

module.exports = {
    encrypt,
    decrypt
};
