// Server-side AES-GCM decryption using Node.js crypto module
const crypto = require('crypto');

const CRYPTO_KEY = process.env.CRYPTO_KEY || 'idn-book-default-key-32chars!!';

function getKey() {
    const salt = Buffer.from('idn-book-salt', 'utf8');
    return crypto.pbkdf2Sync(
        CRYPTO_KEY.padEnd(32, '!').slice(0, 32),
        salt,
        100000,
        32,
        'sha256'
    );
}

function decryptPayload(encrypted, iv) {
    const key = getKey();
    const ivBuffer = Buffer.from(iv, 'base64');
    const encryptedBuffer = Buffer.from(encrypted, 'base64');

    // AES-GCM: last 16 bytes are the auth tag
    const authTag = encryptedBuffer.slice(-16);
    const ciphertext = encryptedBuffer.slice(0, -16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
}

module.exports = { decryptPayload };
