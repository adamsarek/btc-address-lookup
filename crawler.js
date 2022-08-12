'use strict';

// Packages
const DOMParser = require('node-html-parser').parse;
const { Buffer } = require('node:buffer');
const MINIFY_HTML = require('@minify-html/node');
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

	// Crawling
	htmlToCrawl;
	urlToCrawl;

	// Functions
	#fn = {
		// Functions (Server -> Crawler)
		run: function() {
			log('crawler', 'Running');

			// #TODO - start crawling here
			// 1. Get all crawler_url_settings
			// 2. Find crawler_url which are below limits (level_limit, serial_limit, delay_ms)
			// 3. Start crawling
			
			main.crawl();
		}
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
	}

	crawl() {
		// #TODO - Allow only HTTP and HTTPS links
		// #TODO - Merge URL link queries
		// #TODO - encrypt CONFIG with private key
		// #TODO - HTML finished_at
		// #TODO - Do not save URL that already exists in branch
		// #TODO - SQL injection - prepared statements (no multiple statements)
		// #TODO - all SQL only in Database class
		// #TODO - Add tryExecute(), with loop trying to connect to database
		// #TODO - HTML url filter - general filter (all), twitter filter (remove faq, contact, etc.)
		// #TODO - insert into select ---- získat serial ze stromu v insertu (neomezovat počet URL v JS)

		// #TODO - Check HTMLs that doesn't have finished_at column set (saving links was interrupted)
		// #TODO - Before executing this:
		/*database.getHTMLToCrawl()
		.then((results) => {
			if(results.length > 0) {
				main.htmlToCrawl = {};

				for(let i = 0; i < results.length; i++) {
					if(main.htmlToCrawl[results[i].html_id] !== undefined) {
						main.htmlToCrawl[results[i].html_id].branches.push({
							url_root_id: results[i].url_root_id,
							level: results[i].level,
							serial: results[i].serial,
							level_limit: results[i].level_limit,
							serial_limit: results[i].serial_limit,
							urlToSave: {}
						});
						if(!main.htmlToCrawl[results[i].html_id].canSaveURLs) {
							main.htmlToCrawl[results[i].html_id].canSaveURLs = (results[i].level < results[i].level_limit && results[i].serial < results[i].serial_limit);
						}
						if((results[i].serial_limit - results[i].serial) > main.htmlToCrawl[results[i].html_id].highest_serial_range) {
							main.htmlToCrawl[results[i].html_id].highest_serial_range = (results[i].serial_limit - results[i].serial);
						}
					}
					else {
						main.htmlToCrawl[results[i].html_id] = {
							html_id: results[i].html_id,
							url_id: results[i].url_id,
							content: results[i].content,
							branches: [{
								url_root_id: results[i].url_root_id,
								level: results[i].level,
								serial: results[i].serial,
								level_limit: results[i].level_limit,
								serial_limit: results[i].serial_limit,
								urlToSave: {}
							}],
							highest_serial_range: (results[i].serial_limit - results[i].serial),
							canSaveURLs: (results[i].level < results[i].level_limit && results[i].serial < results[i].serial_limit),
							urlToSave: {}
						};
					}
				}
				
				// Crawl all HTMLs
				const htmlToCrawlIDs = Object.keys(main.htmlToCrawl);
				for(let i = 0; i < htmlToCrawlIDs.length; i++) {
					this.#crawlHTML(main.htmlToCrawl[htmlToCrawlIDs[i]]);
				}
			}
			else {*/
				// Get all URLs that:
				// - does not have HTML or only the expired one
				// - does not exceed set delay since last fetch request on the current crawling branch
				database.getURLToCrawl()
				.then((results) => {
					if(results.length == 0) {
						setTimeout(() => {
							main.crawl();
						}, CONFIG.crawler.noURLRetryTimeout);
					}
					else {
						main.urlToCrawl = {};

						for(let i = 0; i < results.length; i++) {
							if(main.urlToCrawl[results[i].address] !== undefined) {
								main.urlToCrawl[results[i].address].branches.push({
									url_root_id: results[i].url_root_id,
									level: results[i].level,
									serial: results[i].serial,
									level_limit: results[i].level_limit,
									serial_limit: results[i].serial_limit,
									urlToSave: {}
								});
								if(!main.urlToCrawl[results[i].address].canSaveURLs) {
									main.urlToCrawl[results[i].address].canSaveURLs = (results[i].level < results[i].level_limit && results[i].serial < results[i].serial_limit);
								}
								if((results[i].serial_limit - results[i].serial) > main.urlToCrawl[results[i].address].highest_serial_range) {
									main.urlToCrawl[results[i].address].highest_serial_range = (results[i].serial_limit - results[i].serial);
								}
							}
							else {
								main.urlToCrawl[results[i].address] = {
									url_id: results[i].url_id,
									address: results[i].address,
									branches: [{
										url_root_id: results[i].url_root_id,
										level: results[i].level,
										serial: results[i].serial,
										level_limit: results[i].level_limit,
										serial_limit: results[i].serial_limit,
										urlToSave: {}
									}],
									highest_serial_range: (results[i].serial_limit - results[i].serial),
									canSaveURLs: (results[i].level < results[i].level_limit && results[i].serial < results[i].serial_limit),
									urlToSave: {}
								};
							}
						}
						
						// Crawl all URLs
						const urlToCrawlAddresses = Object.keys(main.urlToCrawl);
						for(let i = 0; i < urlToCrawlAddresses.length; i++) {
							this.#crawlURL(main.urlToCrawl[urlToCrawlAddresses[i]]);
						}
					}
				})
				.catch((error) => {
					log('database', 'Error', { data: error });
				});
			/*}
		})
		.catch((error) => {
			log('database', 'Error', { data: error });
		});*/
	}

	#crawlHTML(htmlToCrawl) {
		console.log(htmlToCrawl);
	}

	// #TODO - Missing IDs
	#crawlURL(urlToCrawl) {
		fetch(urlToCrawl.address, {
			cache: 'no-cache'
		})
		.then(response => {
			const { url, status, headers } = response;
			return response.text().then(body => {
				return { url, status, body, headers };
			});
		})
		.then(response => {
			const html = response.body;
			const minifiedHTML = MINIFY_HTML.minify(Buffer.from(html), {
				do_not_minify_doctype: true,
				ensure_spec_compliant_unquoted_attribute_values: true,
				keep_closing_tags: true,
				keep_html_and_head_opening_tags: true,
				keep_spaces_between_attributes: true,
				keep_comments: true,
				minify_css: true,
				minify_js: true,
				remove_bangs: false,
				remove_processing_instructions: false
			}).toString();

			// Save HTML
			database.addHTML(urlToCrawl.url_id, minifiedHTML)
			.then((htmlResults) => {
				const urlToCrawlFinish = (urlToCrawlAddress, htmlID='') => {
					// #TODO - Send MySQL update with finished_at
					database.finishHTML(htmlID)
					.catch((error) => {
						log('database', 'Error', { data: error });
					})
					.finally(() => {
						delete main.urlToCrawl[urlToCrawlAddress];

						console.log('urlToCrawlFinish() -> ' + Object.keys(main.urlToCrawl).length);
						
						// No URLs to crawl left
						if(Object.keys(main.urlToCrawl).length === 0) {
							main.crawl();
						}
					});
				};
				const urlToSaveFinish = (urlToCrawlAddress, htmlID, urlToSaveAddress) => {
					delete urlToCrawl.urlToSave[urlToSaveAddress];

					console.log('urlToSaveFinish() -> ' + Object.keys(urlToCrawl.urlToSave).length);

					// No URLs to save left (all branches)
					if(Object.keys(urlToCrawl.urlToSave).length === 0) {
						urlToCrawlFinish(urlToCrawlAddress, htmlID);
					}
				};
				const branchUrlToSaveFinish = (urlToCrawlAddress, htmlID, urlToSaveAddress, branchUrlToSave) => {
					delete branchUrlToSave[urlToSaveAddress];
					urlToCrawl.urlToSave[urlToSaveAddress]--;

					console.log('branchUrlToSaveFinish() -> ' + urlToCrawl.urlToSave[urlToSaveAddress]);

					if(urlToCrawl.urlToSave[urlToSaveAddress] == 0) {
						urlToSaveFinish(urlToCrawlAddress, htmlID, urlToSaveAddress);
					}
				};

				if(urlToCrawl.canSaveURLs) {
					const linkSet = new Set();
					const document = new DOMParser(minifiedHTML);
					const linkElements = document.querySelectorAll('a[href]');
					
					// HTML has at least 1 <a href> element
					if(linkElements.length > 0) {
						linkElements.forEach(linkElement => {
							if(linkElement.getAttribute('href').length > 0) {
								const absoluteURL = new URL(linkElement.getAttribute('href'), response.url).href;
								linkSet.add(absoluteURL);
							}
						});

						// HTML has at least 1 URL link
						if(linkSet.size > 0) {
							// Set URLs to save for all branches and their highest serial range
							const urlsToSave = Array.from(linkSet).slice(0, (urlToCrawl.highest_serial_range < linkSet.size ? urlToCrawl.highest_serial_range : linkSet.size));
							for(let i = 0; i < urlsToSave.length; i++) {
								urlToCrawl.urlToSave[urlsToSave[i]] = 0;
							}

							// Set URLs to save for every branch and its serial limit
							for(let i = 0; i < urlToCrawl.branches.length; i++) {
								for(let j = 0; j < (urlToCrawl.branches[i].serial_limit - urlToCrawl.branches[i].serial < urlsToSave.length ? urlToCrawl.branches[i].serial_limit - urlToCrawl.branches[i].serial : urlsToSave.length); j++) {
									urlToCrawl.branches[i].urlToSave[urlsToSave[j]] = 1;
									urlToCrawl.urlToSave[urlsToSave[j]]++;
								}
							}

							// Save URLs
							const htmlUrlsToSave = Object.keys(urlToCrawl.urlToSave);
							for(let i = 0; i < htmlUrlsToSave.length; i++) {
								database.addURL(htmlUrlsToSave[i])
								.then((urlResults) => {
									// Save URL links for every branch
									for(let j = 0; j < urlToCrawl.branches.length; j++) {
										// Check if branch can save this URL link
										if(urlToCrawl.branches[j].urlToSave[htmlUrlsToSave[i]] !== undefined) {
											// Save branch URL links
											database.addURLLink(
												htmlResults[1][0].html_id,
												urlResults[1][0].url_id,
												urlToCrawl.url_id,
												urlToCrawl.branches[j].url_root_id,
												urlToCrawl.branches[j].level + 1,
												urlToCrawl.branches[j].serial + 1 + i
											)
											.then(() => {
												branchUrlToSaveFinish(urlToCrawl.address, htmlResults[1][0].html_id, htmlUrlsToSave[i], urlToCrawl.branches[j].urlToSave);
											})
											.catch((error) => {
												log('database', 'Error', { data: error });
												branchUrlToSaveFinish(urlToCrawl.address, htmlResults[1][0].html_id, htmlUrlsToSave[i], urlToCrawl.branches[j].urlToSave);
											});
										}
									}
								})
								.catch((error) => {
									log('database', 'Error', { data: error });
									urlToSaveFinish(urlToCrawl.address, htmlResults[1][0].html_id, htmlUrlsToSave[i]);
								});
							}
						}
						else {
							urlToCrawlFinish(urlToCrawl.address, htmlResults[1][0].html_id);
						}
					}
					else {
						urlToCrawlFinish(urlToCrawl.address, htmlResults[1][0].html_id);
					}
				}
				else {
					urlToCrawlFinish(urlToCrawl.address, htmlResults[1][0].html_id);
				}
			})
			.catch((error) => {
				log('database', 'Error', { data: error });
				urlToCrawlFinish(urlToCrawl.address);
			});
		})
		.catch((error) => {
			console.error(error);
			urlToCrawlFinish(urlToCrawl.address);
		});
	}
}

// Start
const database = new Database();
const main = new Main();