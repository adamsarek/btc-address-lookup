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
	// Messenger
	#messenger = null;

	// Crawling
	urlToCrawl;
	urlToCrawlCount = 0;

	// Functions
	#fn = {
		// Functions (Server -> Crawler)
		run: function() {
			log('crawler', 'Running');

			// #TODO - start crawling here
			// 1. Get all crawler_url_settings
			// 2. Find crawler_url which are below limits (level_limit, serial_limit, delay_ms)
			// 3. Start crawling
			
			// Get URL which does not have HTML
			// Below is better solution including expiration
			//SELECT crawler_url_id, crawler_root_url_id, url, level, serial FROM crawler_url WHERE NOT EXISTS (SELECT 1 FROM crawler_html WHERE crawler_html.crawler_url_id = crawler_url.crawler_url_id) LIMIT 1

			// If all URLs have HTML, then find those who are expired
			// Detects both not having HTML and expired HTML
			//SELECT crawler_url_id, crawler_root_url_id, url, level, serial FROM crawler_url WHERE NOT EXISTS (SELECT 1 FROM crawler_html WHERE crawler_html.crawler_url_id = crawler_url.crawler_url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - crawler_html.crawled_at < ${CONFIG.crawler.expirationTimeout}) LIMIT 1

			// Get URL settings
			// Code above + gets also settings and only if limit for level and serial is met
			/*
			SELECT crawler_url_expired.crawler_url_id, crawler_root_url_id, url, level, serial, level_limit, serial_limit, delay_ms FROM (
		SELECT crawler_url_id, crawler_root_url_id, url, level, serial
		FROM crawler_url
		WHERE NOT EXISTS (
			SELECT 1
			FROM crawler_html
			WHERE crawler_html.crawler_url_id = crawler_url.crawler_url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - crawler_html.crawled_at < ${CONFIG.crawler.expirationTimeout}
		)
	) crawler_url_expired
	INNER JOIN crawler_url_settings ON crawler_url_settings.crawler_url_id = crawler_url_expired.crawler_root_url_id AND crawler_url_settings.level_limit >= crawler_url_expired.level AND crawler_url_settings.serial_limit >= crawler_url_expired.serial
	LIMIT 1
			*/
			/*
			crawler_url_id	crawler_root_url_id	url					level	serial	level_limit	serial_limit	delay_ms
			1				1					http://adamsarek.eu	16		256		16			256				1000
			*/
			// #TODO - change limit 1 to whatever concurrent crawls can happen
			// #TODO - delay_ms will be setTimeout and when it fires it should perform above code but without limit and with WHERE crawler_root_url_id
			// #TODO - SQL multiline
			
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
		// #TODO - Check HTMLs that doesn't have finished_at column set (saving links was interrupted)
		// #TODO - Before executing this:
		database.execute([
			/*
			`SELECT crawler_url_expired.crawler_url_id, crawler_root_url_id, url, level, serial, level_limit, serial_limit, delay_ms FROM (
				SELECT crawler_url_id, crawler_root_url_id, url, level, serial
				FROM crawler_url
				WHERE NOT EXISTS (
					SELECT 1
					FROM crawler_html
					WHERE crawler_html.crawler_url_id = crawler_url.crawler_url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - crawler_html.crawled_at < ${CONFIG.crawler.expirationTimeout}
				)
			) crawler_url_expired
			INNER JOIN crawler_url_settings ON crawler_url_settings.crawler_url_id = crawler_url_expired.crawler_root_url_id AND crawler_url_settings.level_limit >= crawler_url_expired.level AND crawler_url_settings.serial_limit >= crawler_url_expired.serial
			LIMIT 1`
			*/
			`DROP TABLE IF EXISTS url_expired`,
			`CREATE TABLE IF NOT EXISTS url_expired
			SELECT url_id, address
			FROM url
			WHERE NOT EXISTS (
				SELECT 1
				FROM html
				WHERE html.url_id = url.url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - html.added_at < ${CONFIG.crawler.expirationTimeout}
			)`,
			`SELECT url_to_crawl.url_id, address, url_root_id, level, serial, level_limit, serial_limit
			FROM (
				SELECT url_expired.url_id, address, url_expired.url_id AS url_root_id, 0 AS level, 0 AS serial, level_limit, serial_limit, delay
				FROM url_expired
				INNER JOIN url_settings ON url_settings.url_id = url_expired.url_id AND url_settings.level_limit >= 0 AND url_settings.serial_limit >= 0
				UNION ALL
				SELECT url_expired.url_id, address, url_root_id, level, serial, level_limit, serial_limit, delay
				FROM url_expired
				INNER JOIN url_link ON url_link.url_id = url_expired.url_id
				INNER JOIN url_settings ON url_settings.url_id = url_link.url_root_id AND url_settings.level_limit >= url_link.level AND url_settings.serial_limit >= url_link.serial
			) url_to_crawl
			WHERE NOT EXISTS (
				SELECT 1
				FROM html
				WHERE html.url_id = url_root_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - html.added_at < delay
			)`,
			`DROP TABLE IF EXISTS url_expired`
		], 'Select [url_expired_settings]')
		.then((results) => {
			if(results[2].length == 0) {
				setTimeout(() => {
					main.crawl();
				}, CONFIG.crawler.noURLRetryTimeout);
			}
			else {
				// Get highest limit for crawling (makes sure to get links for the highest limit)
				main.urlToCrawl = {};
				main.urlToCrawlCount = 0;
				for(let i = 0; i < results[2].length; i++) {
					if(main.urlToCrawl[results[2][i].address] !== undefined) {
						if(results[2][i].level_limit >= main.urlToCrawl[results[2][i].address].highestLimit.level_limit
						&& results[2][i].serial_limit >= main.urlToCrawl[results[2][i].address].highestLimit.serial_limit) {
							main.urlToCrawl[results[2][i].address].highestLimit = results[2][i];
						}
						main.urlToCrawl[results[2][i].address].list.push(results[2][i]);
						main.urlToCrawlCount++;
					}
					else {
						main.urlToCrawl[results[2][i].address] = {
							highestLimit: results[2][i],
							list: [
								results[2][i]
							],
							urlsToSave: [],
							urlsToSaveCount: 0,
							urlLinksToSave: [],
							urlLinksSavedCount: 0
						};
						main.urlToCrawlCount = 1;
					}
				}
				
				// Crawl
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

	// #TODO - Test it
	#crawlURL(urlToCrawl) {
		fetch(urlToCrawl.highestLimit.address, {
			cache: 'no-cache'
		})
		.then(response => {
			const { url, status, headers } = response;
			return response.text().then(body => {
				return { url, status, body, headers };
			});
		})
		.then(response => {
			const encodedHTML = (encodeURIComponent(response.body).replace(/'/g, '%27')).toString('base64');

			// Save HTML
			database.execute([
				`INSERT IGNORE INTO html(url_id, content) VALUES('${urlToCrawl.highestLimit.url_id}', '${encodedHTML}')`,
				`SELECT html_id FROM html WHERE url_id = '${urlToCrawl.highestLimit.url_id}' AND content = '${encodedHTML}' ORDER BY added_at DESC LIMIT 1`
			], 'Insert [html], Select [html]')
			.then((htmlResults) => {
				const decrementURLToCrawlCount = () => {
					main.urlToCrawlCount--;

					console.log('urlToCrawlCount: ' + main.urlToCrawlCount);

					// All HTML URLs saved
					if(main.urlToCrawlCount == 0) {
						main.crawl();
					}
				};
				const decrementURLsToSaveCount = (urlToCrawl) => {
					main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSaveCount--;

					console.log('urlsToSaveCount: ' + main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSaveCount);

					// Current HTML URLs saved
					if(main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSaveCount == 0) {
						decrementURLToCrawlCount();
					}
				};

				// Check if current URL is still below limits and links can be added
				if(urlToCrawl.highestLimit.level < urlToCrawl.highestLimit.level_limit
				&& urlToCrawl.highestLimit.serial < urlToCrawl.highestLimit.serial_limit) {
					const linkSet = new Set();
					const document = new DOMParser(response.body);
					const linkElements = document.querySelectorAll('a');
					linkElements.forEach(linkElement => {
						if(linkElement.hasAttribute('href') && linkElement.getAttribute('href').length > 0) {
							const absoluteURL = new URL(linkElement.getAttribute('href'), response.url).href;
							linkSet.add(absoluteURL);
						}
					});
					main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSave = Array.from(linkSet).slice(0, urlToCrawl.highestLimit.serial_limit - urlToCrawl.highestLimit.serial);
					main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSaveCount = main.urlToCrawl[urlToCrawl.highestLimit.address].list.length;
					
					// Current HTML doesn't contain URLs
					if(main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSave.length == 0) {
						decrementURLToCrawlCount();
					}
					else {
						// Save URLs
						for(let i = 0; i < main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSave.length; i++) {
							database.execute([
								`INSERT IGNORE INTO url(address) VALUES('${main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSave[i]}')`,
								`SELECT url_id FROM url WHERE address = '${main.urlToCrawl[urlToCrawl.highestLimit.address].urlsToSave[i]}'`
							], 'Insert [url], Select [url]')
							.then((urlResults) => {
								// #TODO - problem with saving url_link
								
								for(let j = 0; j < urlToCrawl.list.length; j++) {
									// Check if current URL is still below limits and links can be added
									if(urlToCrawl.list[j].level < urlToCrawl.list[j].level_limit
									&& urlToCrawl.list[j].serial + i < urlToCrawl.list[j].serial_limit) {
										main.urlToCrawl[urlToCrawl.highestLimit.address].urlLinksToSave.push(false);
										
										// Save links
										database.execute([
											`INSERT IGNORE INTO url_link(html_id, url_id, url_parent_id, url_root_id, level, serial) VALUES('${htmlResults[1][0].html_id}', '${urlResults[1][0].url_id}', '${urlToCrawl.highestLimit.url_id}', '${urlToCrawl.list[j].url_root_id}', '${urlToCrawl.list[j].level + 1}', '${urlToCrawl.list[j].serial + 1 + i}')`
										], 'Insert [url_link]')
										.then(() => {
											main.urlToCrawl[urlToCrawl.highestLimit.address].urlLinksToSave[main.urlToCrawl[urlToCrawl.highestLimit.address].urlLinksSavedCount] = true;
											main.urlToCrawl[urlToCrawl.highestLimit.address].urlLinksSavedCount++;

											console.log(main.urlToCrawl[urlToCrawl.highestLimit.address].urlLinksToSave);

											// Current HTML URL links saved
											if(!main.urlToCrawl[urlToCrawl.highestLimit.address].urlLinksToSave.includes(false)) {
												decrementURLsToSaveCount(urlToCrawl);
											}
										})
										.catch((error) => {
											log('database', 'Error', { data: error });
										});
									}
									else {
										decrementURLsToSaveCount(urlToCrawl);
									}
								}
							})
							.catch((error) => {
								log('database', 'Error', { data: error });
							});
						}
					}
				}
				else {
					decrementURLToCrawlCount();
				}
			})
			.catch((error) => {
				log('database', 'Error', { data: error });
			});
		})
		.catch(error => console.error(error));
	}
}

// Start
const database = new Database();
const main = new Main();