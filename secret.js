'use strict';

// Packages
const CRYPTO = require('crypto');
const FS = require('fs');

// Global secret
let SECRET = null;
const algorithm = 'aes-256-cbc';
const pubSecretFileName = './pub-secret.json';
const secretFileName = './secret.json';
const keyFileName = './key.txt';
try {
	const pubSecretFileExists = FS.existsSync(pubSecretFileName);
	const secretFileExists = FS.existsSync(secretFileName);
	const keyFileExists = FS.existsSync(keyFileName);

	const key = (keyFileExists ? FS.readFileSync(keyFileName) : (process.env.KEY !== undefined ? process.env.KEY : null));

	const encrypt = (secretFileStats, key='') => {
		// Generate key
		if(key.length == 0) {
			key = CRYPTO.randomBytes(32).toString('hex').slice(0, 32);

			// Save key
			FS.writeFileSync(keyFileName, key);
		}

		// Generate initialization vector
		const iv = CRYPTO.randomBytes(16).toString('hex').slice(0, 16);

		// Cipher
		const cipher = CRYPTO.createCipheriv(algorithm, key, iv);
		
		// Encrypt original secret
		const secret = require(secretFileName);
		const encryptedData = cipher.update(JSON.stringify(secret), 'utf-8', 'hex') + cipher.final('hex');

		// Create public secret
		const pubSecret = {
			mtimeMs: secretFileStats.mtimeMs,
			iv: iv,
			data: encryptedData
		};

		// Save public secret
		FS.writeFileSync(pubSecretFileName, JSON.stringify(pubSecret));

		// Use original secret
		return secret;
	};
	const decrypt = (key) => {
		// Load public secret
		const pubSecret = require(pubSecretFileName);

		// Get initialization vector
		const iv = pubSecret.iv;

		// Get encrypted secret
		const encryptedData = pubSecret.data;

		// Decipher
		const decipher = CRYPTO.createDecipheriv(algorithm, key, iv);

		// Decrypt encrypted secret
		const decryptedData = decipher.update(encryptedData, 'hex', 'utf-8') + decipher.final('utf-8');

		// Use decrypted secret
		return JSON.parse(decryptedData);
	};

	if(pubSecretFileExists) {
		if(secretFileExists) {
			const pubSecret = require(pubSecretFileName);
			const secretFileStats = FS.statSync(secretFileName);
			
			if(pubSecret.mtimeMs >= secretFileStats.mtimeMs) {
				// Use original secret
				SECRET = require(secretFileName);
			}
			else if(key != null) {
				// Encrypt (with existing key)
				SECRET = encrypt(secretFileStats, key);
			}
			else {
				// Encrypt (with new generated key)
				SECRET = encrypt(secretFileStats);
			}
		}
		else if(key != null) {
			// Decrypt (with existing key)
			SECRET = decrypt(key);
		}
		else {
			throw '[SECRET] Key not found!';
		}
	}
	else if(secretFileExists) {
		const secretFileStats = FS.statSync(secretFileName);

		if(key != null) {
			// Encrypt (with existing key)
			SECRET = encrypt(secretFileStats, key);
		}
		else {
			// Encrypt (with new generated key)
			SECRET = encrypt(secretFileStats);
		}
	}
	else {
		throw '[SECRET] Secret not found!';
	}
} catch(error) {
	throw error;
}

// Exports
module.exports = SECRET;