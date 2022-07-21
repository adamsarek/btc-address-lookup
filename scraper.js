'use strict';

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Packages
const DOMParser = require('node-html-parser').parse;
const MYSQL = require('mysql2');
const WORKER = require('worker_threads');

// Global functions
function log(type, msg, args={}) {
	console.log(`[${type.toUpperCase()}] ${msg}${(args && Object.keys(args).length === 0 && args.constructor === Object ? '' : ` ${JSON.stringify(args)}`)}`);
}

// Database class
class Database {
	// Database connection pool
	#connectionPool = MYSQL.createPool(CONFIG.mysql);

	execute(queries=[], msg='') {
		return new Promise((resolve, reject) => {
			if(queries.length >= 1) {
				this.#connectionPool.getConnection((error, connection) => {
					if(error) { reject(error); }
					connection.query(queries.join(`; `), (error, results) => {
						if(error) { reject(error); }
						log('database', (msg ? msg : `Queries(${queries.length}) executed`), results);
						connection.release();
						if(error) { reject(error); }
						resolve(results);
					});
				});
			}
		});
	}
}

// Messenger class
class Messenger {
	// Messenger configuration
	config = null;
	
	constructor(config) {
		this.config = config;
		this.config.node.on('message', (msg) => {
			if(this.config.onMessageInitCondition()) {
				let msgJSON = null;
				let msgJSONValid = false;

				// Check for valid JSON
				try {
					msgJSON = JSON.parse(msg);

					if(msgJSON && typeof msgJSON === 'object' && msgJSON !== null) {
						msgJSONValid = true;
					}
				} catch(err) {}

				if(msgJSONValid) {
					if(msgJSON.length == 2 && Array.isArray(msgJSON[1])) {
						const iFn = msgJSON[0];
						if(iFn) {
							if(this.config.fn[iFn]) {
								const iArgs = msgJSON[1];
								if(iArgs) {
									if(iArgs.length == this.config.fn[iFn].length) {
										this.config.onMessageSuccess(msg);

										// Apply function
										this.config.fn[iFn].apply(this.config.fnData(msg), iArgs);
									}
									else { this.config.onMessageError('Message denied', { reason: 'The requested function does not exist!' }); }
								}
								else { this.config.onMessageError('Message denied', { reason: 'The request does not contain the required arguments!' }); }
							}
							else { this.config.onMessageError('Message denied', { reason: 'The requested function does not exist!' }); }
						}
						else { this.config.onMessageError('Message denied', { reason: 'The request does not contain the required function!' }); }
					}
					else { this.config.onMessageError('Message denied', { reason: 'The request does not meet the required format!' }); }
				}
				else { this.config.onMessageError('Message denied', { reason: 'The request does not come in valid JSON format!' }); }
			}
			else { this.config.onMessageError('Message denied', { reason: 'The request has been received under unexpected condition!' }); }
		});
	}

	sendJSON(msg) {
		this.config.send(msg);
	}

	send(msg) {
		this.sendJSON(JSON.stringify(msg));
	}

	sendFn(fn, args=[]) {
		this.send([fn, args]);
	}
}

// Main class
class Main {
	#messenger = null;

	// Functions
	#fn = {
		// Functions (Server -> Scraper)
		
	};

	constructor() {
		this.#messenger = new Messenger({
			node: WORKER.parentPort,
			send: (msg) => { WORKER.parentPort.postMessage(msg); },
			fn: this.#fn,
			fnData: (msg) => { return { msg: msg }; },
			onMessageInitCondition: () => { return true; },
			onMessageSuccess: (msg) => { log('scraper', 'Message', { message: msg }); },
			onMessageError: (msg, args={}) => { log('scraper', msg, args); }
		});
		
		// Initialize server messaging
		this.#init();
	}

	// Functions (Scraper -> Server)
	#init() {
		this.#messenger.sendFn('init', []);

		// #TODO - start scraping here
	}
}

// Start
const database = new Database();
const main = new Main();