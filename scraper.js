'use strict';

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Global classes
const { log } = require('./logger.js');
const Database = require('./database.js');
const Messenger = require('./messenger.js');

// Packages
const DOMParser = require('node-html-parser').parse;
const WORKER = require('worker_threads');

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
const main = new Main();