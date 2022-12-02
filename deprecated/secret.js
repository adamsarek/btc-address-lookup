'use strict';

// Packages
const CRYPTO = require('crypto');
const FS = require('fs');

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Secret class
class Secret {
	// Algorithms - hash, encrypt
	#hashAlgorithm = CONFIG.secret.hashAlgorithm;
	#encryptAlgorithm = CONFIG.secret.encryptAlgorithm;
	#encryptedFiles = CONFIG.secret.encryptedFiles;

	constructor() {
		// Update encrypted files (generate new public files if necessary)
		const encryptedFileKeys = Object.keys(this.#encryptedFiles);
		for(let i = 0; i < encryptedFileKeys.length; i++) {
			this.#updateEncryptedFileData(encryptedFileKeys[i]);
		}
	}

	getDataHash(data) {
		const dataHash = CRYPTO.createHash(this.#hashAlgorithm);
		dataHash.update(data);

		return dataHash.digest('hex');
	}

	getFileHash(filePath) {
		const data = FS.readFileSync(filePath);

		return this.getDataHash(data);
	}

	verifyDataIntegrity(data, dataHash) {
		return (this.getDataHash(data) == dataHash);
	}

	verifyFileIntegrity(filePath, fileHash) {
		return (this.getFileHash(filePath) == fileHash);
	}

	getDataByHash(data, fileHash) {
		if(this.verifyDataIntegrity(data, fileHash)) {
			return data;
		}
		else if(this.verifyFileIntegrity(`${CONFIG.crawler.htmlFilePath}/${fileHash}.html`, fileHash)) {
			return FS.readFileSync(`${CONFIG.crawler.htmlFilePath}/${fileHash}.html`).toString();
		}
		else {
			throw '[SECRET] Neither data & file could be verified!';
		}
	}

	#encryptData(data, key) {
		// Generate initialization vector
		const iv = CRYPTO.randomBytes(16).toString('hex').slice(0, 16);

		// Cipher
		const cipher = CRYPTO.createCipheriv(this.#encryptAlgorithm, key, iv);

		// Encrypt data
		const encryptedData = cipher.update(data, 'utf-8', 'hex') + cipher.final('hex');

		// Return encrypted JSON
		return {
			iv: iv,
			data: encryptedData
		};
	}

	#decryptData(encryptedJSON, key) {
		// Get initialization vector
		const iv = encryptedJSON.iv;

		// Get encrypted data
		const encryptedData = encryptedJSON.data;

		// Decipher
		const decipher = CRYPTO.createDecipheriv(this.#encryptAlgorithm, key, iv);

		// Decrypt encrypted data
		const decryptedData = decipher.update(encryptedData, 'hex', 'utf-8') + decipher.final('utf-8');

		// Return decrypted data
		return decryptedData;
	}

	#encryptFile(filePath, fileStats, publicFilePath, keyFilePath, key) {
		// Generate key
		if(key.length == 0) {
			key = CRYPTO.randomBytes(32).toString('hex').slice(0, 32);

			// Save key
			FS.writeFileSync(keyFilePath, key);
		}

		// Load original JSON
		const originalJSON = require(filePath);

		// Encrypt original JSON
		const encryptedJSON = this.#encryptData(JSON.stringify(originalJSON), key);

		// Create public JSON
		const publicJSON = {
			mtimeMs: fileStats.mtimeMs,
			iv: encryptedJSON.iv,
			data: encryptedJSON.data
		};

		// Save public JSON
		FS.writeFileSync(publicFilePath, JSON.stringify(publicJSON));

		// Return original JSON
		return originalJSON;
	}

	#decryptFile(publicFilePath, key) {
		// Load public JSON
		const publicJSON = require(publicFilePath);

		// Decrypt public JSON
		const decryptedData = this.#decryptData(publicJSON, key);

		// Return decrypted JSON
		return JSON.parse(decryptedData);
	}

	// Update encrypted files (generate new public files if necessary)
	#updateEncryptedFileData(encryptedFileKey) {
		// Get paths from key
		const filePath = this.#encryptedFiles[encryptedFileKey].filePath;
		const publicFilePath = this.#encryptedFiles[encryptedFileKey].publicFilePath;
		const keyFilePath = this.#encryptedFiles[encryptedFileKey].keyFilePath;
		
		// File exist checks
		const fileExists = FS.existsSync(filePath);
		const publicFileExists = FS.existsSync(publicFilePath);
		const keyFileExists = FS.existsSync(keyFilePath);

		// Get key from path / process environment
		const key = (keyFileExists ? FS.readFileSync(keyFilePath) : (process.env.KEY !== undefined ? process.env.KEY : null));

		if(publicFileExists) {
			if(fileExists) {
				const publicJSON = require(publicFilePath);
				const fileStats = FS.statSync(filePath);
				
				if(publicJSON.mtimeMs < fileStats.mtimeMs) {
					// Encrypt
					return this.#encryptFile(filePath, fileStats, publicFilePath, keyFilePath, key);
				}
			}
			else if(key.length == 0) {
				throw '[SECRET] Encryption key not found!';
			}
		}
		else if(fileExists) {
			const fileStats = FS.statSync(filePath);

			// Encrypt
			return this.#encryptFile(filePath, fileStats, publicFilePath, keyFilePath, key);
		}
		else {
			throw '[SECRET] File not found!';
		}
	}

	getEncryptedFileData(encryptedFileKey) {
		// Get paths from key
		const filePath = this.#encryptedFiles[encryptedFileKey].filePath;
		const publicFilePath = this.#encryptedFiles[encryptedFileKey].publicFilePath;
		const keyFilePath = this.#encryptedFiles[encryptedFileKey].keyFilePath;

		// File exist checks
		const fileExists = FS.existsSync(filePath);
		const publicFileExists = FS.existsSync(publicFilePath);
		const keyFileExists = FS.existsSync(keyFilePath);

		// Get key from path / process environment
		const key = (keyFileExists ? FS.readFileSync(keyFilePath) : (process.env.KEY !== undefined ? process.env.KEY : null));

		if(publicFileExists) {
			if(fileExists) {
				const publicJSON = require(publicFilePath);
				const fileStats = FS.statSync(filePath);
				
				if(publicJSON.mtimeMs >= fileStats.mtimeMs) {
					// Get original JSON
					return require(filePath);
				}
				else {
					// Encrypt
					return this.#encryptFile(filePath, fileStats, publicFilePath, keyFilePath, key);
				}
			}
			else if(key != null) {
				// Decrypt
				return this.#decryptFile(publicFilePath, key);
			}
			else {
				throw '[SECRET] Encryption key not found!';
			}
		}
		else if(fileExists) {
			const fileStats = FS.statSync(filePath);

			// Encrypt
			return this.#encryptFile(filePath, fileStats, publicFilePath, keyFilePath, key);
		}
		else {
			throw '[SECRET] File not found!';
		}
	}

	/*
	getEncryptedFileData(encryptedFileKey) {
		// Get paths from key
		const filePath = this.#encryptedFiles[encryptedFileKey].filePath;
		const publicFilePath = this.#encryptedFiles[encryptedFileKey].publicFilePath;
		const keyFilePath = this.#encryptedFiles[encryptedFileKey].keyFilePath;

		// File exist checks
		const fileExists = FS.existsSync(filePath);
		const publicFileExists = FS.existsSync(publicFilePath);
		const keyFileExists = FS.existsSync(keyFilePath);

		// Get key from path / process environment
		const key = (keyFileExists ? FS.readFileSync(keyFilePath) : (process.env.KEY !== undefined ? process.env.KEY : null));

		if(fileExists) {
			// Get original JSON
			return require(filePath);
		}
		else if(publicFileExists) {
			if(key != null) {
				// Decrypt
				return this.#decryptFile(publicFilePath, key);
			}
			else {
				throw '[SECRET] Encryption key not found!';
			}
		}
		else {
			throw '[SECRET] File not found!';
		}
	}
	*/
}

// Exports
module.exports = Secret;