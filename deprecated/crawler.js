'use strict';

// Packages
const DOMParser = require('node-html-parser').parse;
const { Buffer } = require('node:buffer');
const FS = require('fs');
const MINIFY_HTML = require('@minify-html/node');
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
					let canSaveURLs = results[i].depth_max < results[i].depth_limit && results[i].queue_max < results[i].queue_limit;
					
					if(main.htmlToCrawl[results[i].html_id] !== undefined) {
						if(canSaveURLs) {
							main.htmlToCrawl[results[i].html_id].branches.push({
								url_root_id: results[i].url_root_id,
								depth: results[i].depth,
								queue: results[i].queue,
								depth_max: results[i].depth_max,
								queue_max: results[i].queue_max,
								depth_limit: results[i].depth_limit,
								queue_limit: results[i].queue_limit
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
								depth: results[i].depth,
								queue: results[i].queue,
								depth_max: results[i].depth_max,
								queue_max: results[i].queue_max,
								depth_limit: results[i].depth_limit,
								queue_limit: results[i].queue_limit
							}];
						}

						main.htmlToCrawl[results[i].html_id] = {
							html_id: results[i].html_id,
							url_id: results[i].url_id,
							address: results[i].address,
							content: new Secret().getDataByHash(results[i].content, results[i].file_hash),
							fileHash: results[i].file_hash,
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
							let canSaveURLs = results[i].depth_max < results[i].depth_limit && results[i].queue_max < results[i].queue_limit;
							
							if(main.urlToCrawl[results[i].address] !== undefined) {
								if(canSaveURLs) {
									main.urlToCrawl[results[i].address].branches.push({
										url_root_id: results[i].url_root_id,
										depth: results[i].depth,
										queue: results[i].queue,
										depth_max: results[i].depth_max,
										queue_max: results[i].queue_max,
										depth_limit: results[i].depth_limit,
										queue_limit: results[i].queue_limit
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
										depth: results[i].depth,
										queue: results[i].queue,
										depth_max: results[i].depth_max,
										queue_max: results[i].queue_max,
										depth_limit: results[i].depth_limit,
										queue_limit: results[i].queue_limit
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

	htmlToCrawlFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID='') {
		database.finishHTMLToCrawl(htmlID)
		.catch((error) => {
			log('database', 'Error', { data: error });
		})
		.finally(() => {
			delete htmlToCrawlProperty[htmlToCrawlKey];

			// No HTML to crawl left
			if(Object.keys(htmlToCrawlProperty).length === 0) {
				main.crawl();
			}
		});
	}

	urlToSaveFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID, urlToSaveAddress) {
		delete htmlToCrawlProperty[htmlToCrawlKey].urlToSave[urlToSaveAddress];

		// No URL to save left (all branches)
		if(Object.keys(htmlToCrawlProperty[htmlToCrawlKey].urlToSave).length === 0) {
			main.htmlToCrawlFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID);
		}
	}

	crawlHTMLContent(htmlToCrawlProperty, htmlToCrawlKey, htmlContent, htmlAddress, htmlID) {
		if(htmlToCrawlProperty[htmlToCrawlKey].canSaveURLs) {
			const linkSet = new Set();
			const document = new DOMParser(htmlContent);
			const linkElements = document.querySelectorAll('a[href]');
			
			// HTML has at least 1 <a href> element
			if(linkElements.length > 0) {
				linkElements.forEach(linkElement => {
					if(linkElement.getAttribute('href').length > 0) {
						const absoluteURL = new URL(linkElement.getAttribute('href'), htmlAddress).href;
						linkSet.add(absoluteURL);
					}
				});

				// HTML has at least 1 URL link
				if(linkSet.size > 0) {
					// Set URLs to save for all branches
					const urlsToSave = this.#filterURLsToSave(Array.from(linkSet));
					for(let i = 0; i < urlsToSave.length; i++) {
						htmlToCrawlProperty[htmlToCrawlKey].urlToSave[urlsToSave[i]] = true; // True is just a placeholder, no other meaning

						// Save URLs
						database.addURL(urlsToSave[i], htmlID, htmlToCrawlProperty[htmlToCrawlKey].url_id, htmlToCrawlProperty[htmlToCrawlKey].branches)
						.then(() => {
							main.urlToSaveFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID, urlsToSave[i]);
						})
						.catch((error) => {
							log('database', 'Error', { data: error });
							main.urlToSaveFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID, urlsToSave[i]);
						});
					}
				}
				else {
					main.htmlToCrawlFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID);
				}
			}
			else {
				main.htmlToCrawlFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID);
			}
		}
		else {
			main.htmlToCrawlFinish(htmlToCrawlProperty, htmlToCrawlKey, htmlID);
		}
	}

	#crawlHTML(htmlToCrawl) {
		// Crawl HTML content
		main.crawlHTMLContent(main.htmlToCrawl, htmlToCrawl.html_id, htmlToCrawl.content, htmlToCrawl.address, htmlToCrawl.html_id);
	}

	#crawlURL(urlToCrawl) {
		fetch(urlToCrawl.address, {
			method: 'GET',
			mode: 'cors',
			cache: 'no-cache',
			redirect: 'follow',
			referrerPolicy: 'no-referrer'
		})
		.then(response => {
			const { url, status, headers } = response;
			return response.text().then(body => {
				return { url, status, body, headers };
			});
		})
		.then(response => {
			const html = response.body;
			
			// Minify HTML
			if(CONFIG.crawler.minifyHTML) {
				html = MINIFY_HTML.minify(Buffer.from(html), {
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
			}

			// Get HTML hash
			const htmlHash = new Secret().getDataHash(html);

			// Save HTML file
			FS.mkdirSync(CONFIG.crawler.htmlFilePath, { recursive: true });
			FS.writeFileSync(`${CONFIG.crawler.htmlFilePath}/${htmlHash}.html`, html);

			// Save HTML hash
			database.addHTML(urlToCrawl.url_id, html, htmlHash)
			.then((htmlResults) => {
				// Crawl HTML content
				main.crawlHTMLContent(main.urlToCrawl, urlToCrawl.address, html, response.url, htmlResults[1][0].html_id);
			})
			.catch((error) => {
				log('database', 'Error', { data: error });
				main.htmlToCrawlFinish(main.urlToCrawl, urlToCrawl.address);
			});
		})
		.catch((error) => {
			console.error(error);
			main.htmlToCrawlFinish(main.urlToCrawl, urlToCrawl.address);
		});
	}
}

// Start
const database = new Database();
const main = new Main();