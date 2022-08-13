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
		// #TODO - Add tryExecute(), with loop trying to connect to database
		// #TODO - HTML url filter - general filter (all), twitter filter (remove faq, contact, etc.)

		// Get all HTMLs that:
		// - already exist but are their crawling is not yet finished
		database.getHTMLToCrawl()
		.then((results) => {
			if(results.length > 0) {
				main.htmlToCrawl = {};

				for(let i = 0; i < results.length; i++) {
					let canSaveURLs = results[i].level_max < results[i].level_limit && results[i].serial_max < results[i].serial_limit;
					
					if(main.htmlToCrawl[results[i].html_id] !== undefined) {
						if(canSaveURLs) {
							main.htmlToCrawl[results[i].html_id].branches.push({
								url_root_id: results[i].url_root_id,
								level: results[i].level,
								serial: results[i].serial,
								level_max: results[i].level_max,
								serial_max: results[i].serial_max,
								level_limit: results[i].level_limit,
								serial_limit: results[i].serial_limit
							});

							if(!main.htmlToCrawl[results[i].html_id].canSaveURLs) {
								main.htmlToCrawl[results[i].html_id].canSaveURLs = canSaveURLs;
							}
						}
					}
					else {
						let branches = [];
						if(canSaveURLs) {
							branches = [{
								url_root_id: results[i].url_root_id,
								level: results[i].level,
								serial: results[i].serial,
								level_max: results[i].level_max,
								serial_max: results[i].serial_max,
								level_limit: results[i].level_limit,
								serial_limit: results[i].serial_limit
							}];
						}

						main.htmlToCrawl[results[i].html_id] = {
							html_id: results[i].html_id,
							url_id: results[i].url_id,
							address: results[i].address,
							content: results[i].content,
							branches: branches,
							canSaveURLs: canSaveURLs,
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
			else {
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
							let canSaveURLs = results[i].level_max < results[i].level_limit && results[i].serial_max < results[i].serial_limit;
							
							if(main.urlToCrawl[results[i].address] !== undefined) {
								if(canSaveURLs) {
									main.urlToCrawl[results[i].address].branches.push({
										url_root_id: results[i].url_root_id,
										level: results[i].level,
										serial: results[i].serial,
										level_max: results[i].level_max,
										serial_max: results[i].serial_max,
										level_limit: results[i].level_limit,
										serial_limit: results[i].serial_limit
									});

									if(!main.urlToCrawl[results[i].address].canSaveURLs) {
										main.urlToCrawl[results[i].address].canSaveURLs = canSaveURLs;
									}
								}
							}
							else {
								let branches = [];
								if(canSaveURLs) {
									branches = [{
										url_root_id: results[i].url_root_id,
										level: results[i].level,
										serial: results[i].serial,
										level_max: results[i].level_max,
										serial_max: results[i].serial_max,
										level_limit: results[i].level_limit,
										serial_limit: results[i].serial_limit
									}];
								}

								main.urlToCrawl[results[i].address] = {
									url_id: results[i].url_id,
									address: results[i].address,
									branches: branches,
									canSaveURLs: canSaveURLs,
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
			}
		})
		.catch((error) => {
			log('database', 'Error', { data: error });
		});
	}

	#filterURLsToSave(urlsToSave) {
		const deleteURLToSave = (id) => {
			urlsToSave.splice(id, 1);
			i--;
		}
		
		let i = 0;
		for(; i < urlsToSave.length; i++) {
			// Filter - ignored URL
			let ignoredURL = false;
			for(let j = 0; j < CONFIG.crawler.ignoredURLs.length; j++) {
				if(urlsToSave[i] == CONFIG.crawler.ignoredURLs[j]) {
					ignoredURL = true;
					break;
				}
			}
			if(ignoredURL) {
				deleteURLToSave(i);
			}
			else {
				const url = new URL(urlsToSave[i]);
				
				// Filter - allowed protocol
				let allowedProtocol = false;
				for(let j = 0; j < CONFIG.crawler.allowedProtocols.length; j++) {
					if(url.protocol == `${CONFIG.crawler.allowedProtocols[j]}:`) {
						allowedProtocol = true;
						break;
					}
				}
				if(!allowedProtocol) {
					deleteURLToSave(i);
				}
			}
		}

		return urlsToSave;
	}

	#crawlHTML(htmlToCrawl) {
		const htmlToCrawlFinish = (htmlID) => {
			database.finishHTML(htmlID)
			.catch((error) => {
				log('database', 'Error', { data: error });
			})
			.finally(() => {
				delete main.htmlToCrawl[htmlID];

				console.log('htmlToCrawlFinish() -> ' + Object.keys(main.htmlToCrawl).length);
				
				// No HTML to crawl left
				if(Object.keys(main.htmlToCrawl).length === 0) {
					main.crawl();
				}
			});
		};

		if(htmlToCrawl.canSaveURLs) {
			const linkSet = new Set();
			const document = new DOMParser(htmlToCrawl.content);
			const linkElements = document.querySelectorAll('a[href]');
			
			// HTML has at least 1 <a href> element
			if(linkElements.length > 0) {
				linkElements.forEach(linkElement => {
					if(linkElement.getAttribute('href').length > 0) {
						const absoluteURL = new URL(linkElement.getAttribute('href'), htmlToCrawl.address).href;
						linkSet.add(absoluteURL);
					}
				});

				// HTML has at least 1 URL link
				if(linkSet.size > 0) {
					const urlToSaveFinish = (htmlID, urlToSaveAddress) => {
						delete htmlToCrawl.urlToSave[urlToSaveAddress];
	
						console.log('urlToSaveFinish() -> ' + Object.keys(htmlToCrawl.urlToSave).length);
	
						// No URL to save left (all branches)
						if(Object.keys(htmlToCrawl.urlToSave).length === 0) {
							htmlToCrawlFinish(htmlID);
						}
					};
					
					// Set URLs to save for all branches
					const urlsToSave = this.#filterURLsToSave(Array.from(linkSet));
					for(let i = 0; i < urlsToSave.length; i++) {
						htmlToCrawl.urlToSave[urlsToSave[i]] = true; // True is just a placeholder, no other meaning

						// Save URLs
						database.addURL(urlsToSave[i], htmlToCrawl.html_id, htmlToCrawl.url_id, htmlToCrawl.branches)
						.then(() => {
							urlToSaveFinish(htmlToCrawl.html_id, urlsToSave[i]);
						})
						.catch((error) => {
							log('database', 'Error', { data: error });
							urlToSaveFinish(htmlToCrawl.html_id, urlsToSave[i]);
						});
					}
				}
				else {
					htmlToCrawlFinish(htmlToCrawl.html_id);
				}
			}
			else {
				htmlToCrawlFinish(htmlToCrawl.html_id);
			}
		}
		else {
			htmlToCrawlFinish(htmlToCrawl.html_id);
		}
	}

	#crawlURL(urlToCrawl) {
		const urlToCrawlFinish = (urlToCrawlAddress, htmlID='') => {
			database.finishHTML(htmlID)
			.catch((error) => {
				log('database', 'Error', { data: error });
			})
			.finally(() => {
				delete main.urlToCrawl[urlToCrawlAddress];

				console.log('urlToCrawlFinish() -> ' + Object.keys(main.urlToCrawl).length);
				
				// No URL to crawl left
				if(Object.keys(main.urlToCrawl).length === 0) {
					main.crawl();
				}
			});
		};

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
							const urlToSaveFinish = (urlToCrawlAddress, htmlID, urlToSaveAddress) => {
								delete urlToCrawl.urlToSave[urlToSaveAddress];
			
								console.log('urlToSaveFinish() -> ' + Object.keys(urlToCrawl.urlToSave).length);
			
								// No URL to save left (all branches)
								if(Object.keys(urlToCrawl.urlToSave).length === 0) {
									urlToCrawlFinish(urlToCrawlAddress, htmlID);
								}
							};
							
							// Set URLs to save for all branches
							const urlsToSave = this.#filterURLsToSave(Array.from(linkSet));
							for(let i = 0; i < urlsToSave.length; i++) {
								urlToCrawl.urlToSave[urlsToSave[i]] = true; // True is just a placeholder, no other meaning

								// Save URLs
								database.addURL(urlsToSave[i], htmlResults[1][0].html_id, urlToCrawl.url_id, urlToCrawl.branches)
								.then(() => {
									urlToSaveFinish(urlToCrawl.address, htmlResults[1][0].html_id, urlsToSave[i]);
								})
								.catch((error) => {
									log('database', 'Error', { data: error });
									urlToSaveFinish(urlToCrawl.address, htmlResults[1][0].html_id, urlsToSave[i]);
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