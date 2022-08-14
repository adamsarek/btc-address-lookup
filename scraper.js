'use strict';

// Packages
const DOMParser = require('node-html-parser').parse;
const WORKER = require('worker_threads');

// Global configuration
const CONFIG = Object.freeze(require('./config.js'));

// Global classes
const { log } = require('./logger.js');
const Database = require('./database.js');
const Messenger = require('./messenger.js');

// Main class
class Main {
	// Messenger
	#messenger = null;

	// Scraping
	htmlToScrape;

	// Functions
	#fn = {
		// Functions (Server -> Scraper)
		run: function() {
			log('scraper', 'Running');

			main.scrape();
		}
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
	}

	scrape() {
		database.getHTMLToScrape()
		.then((results) => {
			if(results.length == 0) {
				setTimeout(() => {
					main.scrape();
				}, CONFIG.scraper.noHTMLRetryTimeout);
			}
			else {
				main.htmlToScrape = {};

				for(let i = 0; i < results.length; i++) {
					main.htmlToScrape[results[i].html_id] = {
						html_id: results[i].html_id,
						content: results[i].content,
						address: {}
					};
				}
				
				// Scrape all HTMLs
				const htmlToScrapeIDs = Object.keys(main.htmlToScrape);
				for(let i = 0; i < htmlToScrapeIDs.length; i++) {
					this.#scrapeHTML(main.htmlToScrape[htmlToScrapeIDs[i]]);
				}
			}
		});
	}

	htmlToScrapeFinish(htmlToScrapeProperty, htmlToScrapeKey, htmlID='') {
		database.finishHTMLToScrape(htmlID)
		.catch((error) => {
			log('database', 'Error', { data: error });
		})
		.finally(() => {
			delete htmlToScrapeProperty[htmlToScrapeKey];

			// No HTML to scrape left
			if(Object.keys(htmlToScrapeProperty).length === 0) {
				main.scrape();
			}
		});
	}

	#scrapeHTML(htmlToScrape) {
		const document = new DOMParser(htmlToScrape.content);

		// Search addresses
		const regExp = new RegExp(CONFIG.scraper.regularExpressions.BTC, 'g');
		const matches = [...htmlToScrape.content.matchAll(regExp)];
		for(let i = 0; i < matches.length; i++) {
			if(htmlToScrape.address[matches[i][0]] !== undefined) {
				htmlToScrape.address[matches[i][0]].count++;
			}
			else {
				htmlToScrape.address[matches[i][0]] = {
					address: matches[i][0],
					count: 1
				};
			}
		}
		console.log(htmlToScrape.address);
		console.log(Object.keys(htmlToScrape.address).length);

		// #TODO - Problem
		// bc1qd4ysezhmypwty5dnw7c8nqy5h5nxg0xqsvaefd0qn5kq32vwnwqqgv4rzr
		// 1qd4ysezhmypwty5dnw7c8nqy5h5 (doesn't exist but is found because the above is splitted by HTML tags)
	}
}

// Start
const database = new Database();
const main = new Main();