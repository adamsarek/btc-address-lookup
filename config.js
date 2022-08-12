'use strict';

// Packages
const CRYPTO = require('crypto');
const FS = require('fs');

// Global configuration
let CONFIG = null;
const algorithm = 'aes-256-cbc';
const pubConfigFileName = './pub-config.json';
const configFileName = './config.json';
const keyFileName = './key.txt';
try {
	const pubConfigFileExists = FS.existsSync(pubConfigFileName);
	const configFileExists = FS.existsSync(configFileName);
	const keyFileExists = FS.existsSync(keyFileName);

	const key = (keyFileExists ? FS.readFileSync(keyFileName) : (process.env.KEY !== undefined ? process.env.KEY : null));

	const encrypt = (configFileStats, key='') => {
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
		
		// Encrypt original config
		const config = require(configFileName);
		const encryptedData = cipher.update(JSON.stringify(config), 'utf-8', 'hex') + cipher.final('hex');

		// Create public config
		const pubConfig = {
			mtimeMs: configFileStats.mtimeMs,
			iv: iv,
			data: encryptedData
		};

		// Save public config
		FS.writeFileSync(pubConfigFileName, JSON.stringify(pubConfig));

		// Use original config
		return config;
	};
	const decrypt = (key) => {
		// Load public config
		const pubConfig = require(pubConfigFileName);

		// Get initialization vector
		const iv = pubConfig.iv;

		// Get encrypted config
		const encryptedData = pubConfig.data;

		// Decipher
		const decipher = CRYPTO.createDecipheriv(algorithm, key, iv);

		// Decrypt encrypted config
		const decryptedData = decipher.update(encryptedData, 'hex', 'utf-8') + decipher.final('utf-8');

		// Use decrypted config
		return JSON.parse(decryptedData);
	};

	if(pubConfigFileExists) {
		if(configFileExists) {
			const pubConfig = require(pubConfigFileName);
			const configFileStats = FS.statSync(configFileName);
			
			if(pubConfig.mtimeMs >= configFileStats.mtimeMs) {
				// Use original config
				CONFIG = require(configFileName);
			}
			else if(key != null) {
				// Encrypt (with existing key)
				CONFIG = encrypt(configFileStats, key);
			}
			else {
				// Encrypt (with new generated key)
				CONFIG = encrypt(configFileStats);
			}
		}
		else if(key != null) {
			// Decrypt (with existing key)
			CONFIG = decrypt(key);
		}
		else {
			throw '[CONFIG] Key not found!';
		}
	}
	else if(configFileExists) {
		const configFileStats = FS.statSync(configFileName);

		if(key != null) {
			// Encrypt (with existing key)
			CONFIG = encrypt(configFileStats, key);
		}
		else {
			// Encrypt (with new generated key)
			CONFIG = encrypt(configFileStats);
		}
	}
	else {
		throw '[CONFIG] Configuration not found!';
	}
} catch(error) {
	throw error;
}

// Exports
module.exports = CONFIG;