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
		// Functions (Server -> Crawler)
		
	};

	constructor() {
		this.#messenger = new Messenger({
			node: WORKER.parentPort,
			send: (msg) => { WORKER.parentPort.postMessage(msg); },
			fn: this.#fn,
			fnData: (msg) => { return { msg: msg }; },
			onMessageInitCondition: () => { return true; },
			onMessageSuccess: (msg) => { log('crawler', 'Message', { message: msg }); },
			onMessageError: (msg, args={}) => { log('crawler', msg, args); }
		});
		
		// Initialize server messaging
		this.#init();
	}

	// Functions (Crawler -> Server)
	#init() {
		this.#messenger.sendFn('init', []);

		// #TODO - start crawling here
		// 1. Get all crawler_url_settings
		// 2. Find crawler_url which are below limits (level_limit, serial_limit, delay_ms)
		// 3. Start crawling
	}

	#crawl(url) {
		fetch(url, {
			cache: 'no-cache'
		})
		.then(response => {
			const { url, status, headers } = response;
			return response.text().then(body => {
				return { url, status, body, headers };
			});
		})
		.then(response => {
			const urls = new Set();
			
			const document = new DOMParser(response.body);
			const links = document.querySelectorAll('a');
			links.forEach(link => {
				if(link.hasAttribute('href') && link.getAttribute('href').length > 0) {
					const absoluteURL = new URL(link.getAttribute('href'), response.url).href;
					urls.add(absoluteURL);
				}
			});
	
			console.log(urls);
			// #TODO: Save URLs to Database
		})
		.catch(error => console.error(error));
	}
}

// Start
const main = new Main();