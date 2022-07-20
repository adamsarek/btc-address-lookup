'use strict';

/*// Crawling - finding URLs
// Scraping - extracting data

// Configuration details
const CONFIG = {
	mysql: {      // MySQL connection details
		host:     'remotemysql.com',
		port:     3306,
		user:     '32nIEe4efR',
		password: 'pA6NFofeyG',
		database: '32nIEe4efR',
		multipleStatements: true
	}
};

// Packages
const MySQL = require('mysql');
const DOMParser = require('node-html-parser').parse;

// Crawler
class Crawler {
	constructor() {
		this.#crawl('http://adamsarek.eu');

		// Create MySQL tables
		this.#execDBQueries([
			`CREATE TABLE IF NOT EXISTS crawler_url (
				crawler_url_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				crawler_parent_url_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
				url VARCHAR(2048) NOT NULL,
				added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(crawler_url_id),
				UNIQUE(url)
			) ENGINE=InnoDB CHARACTER SET utf8`,
			`CREATE TABLE IF NOT EXISTS crawler_html (
				crawler_html_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				crawler_url_id BIGINT(20) UNSIGNED NOT NULL,
				html LONGTEXT NOT NULL,
				crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(crawler_html_id),
				FOREIGN KEY(crawler_url_id) REFERENCES crawler_url(crawler_url_id)
			) ENGINE=InnoDB CHARACTER SET utf8`,
			`CREATE TABLE IF NOT EXISTS scraper_account (
				scraper_account_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				id CHAR,
				alias CHAR,
				nickname CHAR,
				name_tag CHAR,
				name_prefix CHAR,
				name_suffix CHAR,
				first_name CHAR,
				middle_name CHAR,
				last_name CHAR,
				display_name CHAR,
				email VARCHAR(320),
				phone_number CHAR(32),
				birthday DATE,
				city CHAR(58),
				country CHAR(3),
				fiat_currency CHAR(3),
				job CHAR,
				religion CHAR(32),
				race CHAR(32),
				sex CHAR(1),
				gender CHAR,
				picture VARCHAR(2048),
				website VARCHAR(2048),
				blog VARCHAR(2048),
				discord VARCHAR(2048),
				facebook VARCHAR(2048),
				flickr VARCHAR(2048),
				instagram VARCHAR(2048),
				linkedin VARCHAR(2048),
				pinterest VARCHAR(2048),
				quora VARCHAR(2048),
				reddit VARCHAR(2048),
				snapchat VARCHAR(2048),
				soundcloud VARCHAR(2048),
				spotify VARCHAR(2048),
				telegram VARCHAR(2048),
				tiktok VARCHAR(2048),
				tumblr VARCHAR(2048),
				twitch VARCHAR(2048),
				twitter VARCHAR(2048),
				vimeo VARCHAR(2048),
				vkontakte VARCHAR(2048),
				wattpad VARCHAR(2048),
				whatsapp VARCHAR(2048),
				youtube VARCHAR(2048),
				PRIMARY KEY(scraper_account_id)
			) ENGINE=InnoDB CHARACTER SET utf8`,
			`CREATE TABLE IF NOT EXISTS scraper_account_occurrence (
				scraper_account_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				scraper_account_id BIGINT(20) UNSIGNED NOT NULL,
				crawler_html_id BIGINT(20) UNSIGNED NOT NULL,
				scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(scraper_account_occurrence_id),
				FOREIGN KEY(scraper_account_id) REFERENCES scraper_account(scraper_account_id),
				FOREIGN KEY(crawler_html_id) REFERENCES crawler_html(crawler_html_id)
			) ENGINE=InnoDB CHARACTER SET utf8`,
			`CREATE TABLE IF NOT EXISTS scraper_address (
				scraper_address_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				address CHAR NOT NULL,
				type CHAR(32),
				currency CHAR(8),
				valid BIT(1),
				validity_checked_at TIMESTAMP,
				PRIMARY KEY(scraper_address_id)
			) ENGINE=InnoDB CHARACTER SET utf8`,
			`CREATE TABLE IF NOT EXISTS scraper_address_occurrence (
				scraper_address_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				scraper_address_id BIGINT(20) UNSIGNED NOT NULL,
				scraper_account_occurrence_id BIGINT(20) UNSIGNED NOT NULL,
				crawler_html_id BIGINT(20) UNSIGNED NOT NULL,
				scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(scraper_address_occurrence_id),
				FOREIGN KEY(scraper_address_id) REFERENCES scraper_address(scraper_address_id),
				FOREIGN KEY(scraper_account_occurrence_id) REFERENCES scraper_account_occurrence(scraper_account_occurrence_id),
				FOREIGN KEY(crawler_html_id) REFERENCES crawler_html(crawler_html_id)
			) ENGINE=InnoDB CHARACTER SET utf8`,
			`CREATE TABLE IF NOT EXISTS scraper_user (
				scraper_user_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				scraper_account_id BIGINT(20) UNSIGNED NOT NULL,
				PRIMARY KEY(scraper_user_id),
				FOREIGN KEY(scraper_account_id) REFERENCES scraper_account(scraper_account_id)
			) ENGINE=InnoDB CHARACTER SET utf8`
		], 'Create table [crawler_url], Create table [crawler_html], Create table [scraper_account], Create table [scraper_account_occurrence], Create table [scraper_address], Create table [scraper_address_occurrence], Create table [scraper_user]')
		.then(() => {
			
		});
	}

	// Private class functions
	#log(type, message, args={}) {
		console.log('[' + type.toUpperCase() + '] ' + message + (args && Object.keys(args).length === 0 && args.constructor === Object ? '' : ' ' + JSON.stringify(args)));
	}

	#execDBQueries(queries=[], message='') {
		return new Promise((resolve) => {
			if(queries.length >= 1) {
				const connection = MYSQL.createConnection(CONFIG.mysql);
				connection.connect();
				connection.query(queries.join(`; `), (error, results) => {
					if(error) { throw error; }
					this.#log('database', (message ? message : `Queries(${queries.length}) executed`), results);
					resolve(results);
				});
				connection.end();
			}
		});
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

	// Public class functions
}

// Execute
const crawler = new Crawler();*/

const WORKER = require('worker_threads');

WORKER.parentPort.on('message', (msg) => {
	console.log(msg);
});
WORKER.parentPort.postMessage(JSON.stringify(['init', []]));