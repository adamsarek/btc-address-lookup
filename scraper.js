'use strict';

// Packages
const BTCAddressValidation = require('bitcoin-address-validation');
const DOMParser = require('node-html-parser').parse;
const WORKER = require('worker_threads');

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Global classes
const { log } = require('./logger.js');
const Database = require('./database.js');
const Messenger = require('./messenger.js');
const Secret = require('./secret.js');

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
						content: new Secret().getDataByHash(results[i].content, results[i].file_hash),
						fileHash: results[i].file_hash,
						account: {},
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
		// DOM Parse
		const document = new DOMParser(htmlToScrape.content);

		// #TODO - Search again using all HTML tags from body to the deepest layer
		// https://github.com/steven2358/BitcoinSneakPeek/blob/master/src/content_script.js
		// #TODO - Search accounts: htmlToScrape.account
		// #TODO - Search addresses: htmlToScrape.address

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
					currency: null,
					format: null,
					valid: BTCAddressValidation.validate(matches[i][0], BTCAddressValidation.Network.mainnet),
					account: null,
					count: 1
				};

				if(htmlToScrape.address[matches[i][0]].valid) {
					htmlToScrape.address[matches[i][0]].currency = 'BTC';
					htmlToScrape.address[matches[i][0]].format = BTCAddressValidation.getAddressInfo(matches[i][0]).type.toUpperCase();
				}
			}
		}
		console.log(htmlToScrape.address);
		console.log(Object.keys(htmlToScrape.address).length);

		// #TODO - Problem
		// Found incomplete BTC addresses that match the regular expression.
		// The complete address is in the code separated by HTML tags).
		// E.g. the address "bc1qd4ysezhmypwty5dnw7c8nqy5h5nxg0xqsvaefd0qn5kq32vwnwqqgv4rzr"
		// was found as       "1qd4ysezhmypwty5dnw7c8nqy5h5"
		// on the website "https://bitinfocharts.com/top-100-richest-bitcoin-addresses.html" in the code:
		// <span style="white-space:nowrap">
		//     bc1qd4ysezhmypwty5dnw7c8nqy5h5
		//     <span class="hidden-phone">nxg0xqsvaefd0qn5kq32vwnwqqgv</span>
		//     <span class="hidden-desktop">..</span>
		//     4rzr
		// </span>

		// #TODO - Get all transactions (of the selected address)
		// https://blockchain.info/rawaddr/34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo
	}
}

// Start
const database = new Database();
const main = new Main();