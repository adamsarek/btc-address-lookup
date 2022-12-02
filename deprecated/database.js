'use strict';

// Packages
const MYSQL = require('mysql2');

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Global classes
const { log } = require('./logger.js');
const Secret = require('./secret.js');

// Database class
class Database {
	// Database connection pool
	#connectionPool = MYSQL.createPool({
		...(new Secret().getEncryptedFileData('database')).mysql,
		...CONFIG.database.mysql
	});

	// Raw functions (connection needed)
	#rawQuery(connection, query, msg='') {
		return new Promise((resolve, reject) => {
			if(query.length > 0) {
				connection.query(query, (error, results) => {
					if(error) { return reject(error); }
		
					log('database', (msg.length > 0 ? msg : `Query`), results);
					resolve(results);
				});
			}
			else {
				log('database', `No query provided`);
			}
		});
	}

	#rawExecute(connection, query, params=[], msg='') {
		return new Promise((resolve, reject) => {
			if(query.length > 0) {
				connection.execute(query, params, (error, results) => {
					if(error) { return reject(error); }
		
					log('database', (msg.length > 0 ? msg : `Query executed`), results);
					resolve(results);
				});
			}
			else {
				log('database', `No query provided for the execution`);
			}
		});
	}

	#rawExecuteOnce(connection, query, params=[], msg='') {
		return new Promise((resolve, reject) => {
			if(query.length > 0) {
				connection.execute(query, params, (error, results) => {
					if(error) { return reject(error); }
		
					log('database', (msg.length > 0 ? msg : `Query executed once`), results);
					resolve(results);
				});
				connection.unprepare(query);
			}
			else {
				log('database', `No query provided for the once execution`);
			}
		});
	}

	// Query
	#query(query, msg='') {
		return new Promise((resolve, reject) => {
			if(query.length > 0) {
				this.#connectionPool.query(query, (error, results) => {
					if(error) { return reject(error); }
		
					log('database', (msg.length > 0 ? msg : `Query`), results);
					resolve(results);
				});
			}
			else {
				log('database', `No query provided`);
			}
		});
	}

	// Executes the statement and keeps the statement cached
	#execute(query, params=[], msg='') {
		return new Promise((resolve, reject) => {
			if(query.length > 0) {
				this.#connectionPool.execute(query, params, (error, results) => {
					if(error) { return reject(error); }
		
					log('database', (msg.length > 0 ? msg : `Query executed`), results);
					resolve(results);
				});
			}
			else {
				log('database', `No query provided for the execution`);
			}
		});
	}

	// Executes the statement and closes cached statement
	#executeOnce(query, params=[], msg='') {
		return new Promise((resolve, reject) => {
			if(query.length > 0) {
				this.#connectionPool.execute(query, params, (error, results) => {
					if(error) { return reject(error); }
		
					log('database', (msg.length > 0 ? msg : `Query executed once`), results);
					resolve(results);
				});
				this.#connectionPool.unprepare(query);
			}
			else {
				log('database', `No query provided for the once execution`);
			}
		});
	}

	// Executes multiple queries
	#queryAll(queries=[], msg=[]) {
		return new Promise(async (resolve, reject) => {
			const results = [];
			
			// Get connection
			this.#connectionPool.getConnection(async (error, connection) => {
				if(error) {
					if(connection) { connection.release(); }
					
					reject(error);
				}

				if(connection) {
					connection.on('error', (error) => {
						connection.release();

						reject(error);
					});

					try {
						// Executions
						for(let i = 0; i < queries.length; i++) {
							results[i] = await this.#rawQuery(connection, queries[i], msg[i]);
						}
					} catch(error) {
						log('database', 'Error', { data: error });
						reject(error);
					} finally {
						// Return data from executions
						resolve(results);
					}
				}
			});
		});
	}

	// Executes multiple queries
	#executeAll(once=[], queries=[], params=[], msg=[]) {
		return new Promise(async (resolve, reject) => {
			const results = [];
			
			// Get connection
			this.#connectionPool.getConnection(async (error, connection) => {
				if(error) {
					if(connection) { connection.release(); }
					
					reject(error);
				}

				if(connection) {
					connection.on('error', (error) => {
						connection.release();

						reject(error);
					});

					try {
						// Executions
						for(let i = 0; i < queries.length; i++) {
							if(once[i]) {
								results[i] = await this.#rawExecuteOnce(connection, queries[i], params[i], msg[i]);
							}
							else {
								results[i] = await this.#rawExecute(connection, queries[i], params[i], msg[i]);
							}
						}
					} catch(error) {
						log('database', 'Error', { data: error });
						reject(error);
					} finally {
						// Return data from executions
						resolve(results);
					}
				}
			});
		});
	}

	// Executes the transaction on multiple queries
	#transact(once=[], queries=[], params=[], msg=[]) {
		return new Promise(async (resolve, reject) => {
			const results = [];
			
			// Get connection
			this.#connectionPool.getConnection(async (error, connection) => {
				if(error) {
					if(connection) { connection.release(); }
					
					reject(error);
				}

				if(connection) {
					connection.on('error', (error) => {
						connection.release();

						reject(error);
					});

					try {
						// Begin transaction
						connection.beginTransaction();
						
						// Executions
						for(let i = 0; i < queries.length; i++) {
							if(once[i]) {
								results[i] = await this.#rawExecuteOnce(connection, queries[i], params[i], msg[i]);
							}
							else {
								results[i] = await this.#rawExecute(connection, queries[i], params[i], msg[i]);
							}
						}
		
						// Commit transaction
						connection.commit();
					} catch(error) {
						// Rollback transaction
						if(connection) { connection.rollback(); }
		
						log('database', 'Error', { data: error });
						reject(error);
					} finally {
						// Release connection
						if(connection) { connection.release(); }

						// Return data from executions
						resolve(results);
					}
				}
			});
		});
	}

	// (Delete +) Create tables
	createTables() {
		// #TODO - remove keywords from table & column names
		// level   -> *depth
		// serial  -> *queue / sequence / item / count
		// user    -> *person
		// account -> *user_account
		// name    -> *currency_name / concept / network / blockchain
		// code    -> *currency_code (unit -> *currency_unit, symbol -> *currency_symbol)
		// format  -> *address_format_name
		// https://dev.mysql.com/doc/refman/8.0/en/keywords.html

		// Create database tables
		const tableOptions = `ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE ${CONFIG.database.mysql.charset}`;
		let queries = [
			`CREATE TABLE IF NOT EXISTS url (
				url_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				address VARCHAR(768) NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(url_id),
				UNIQUE(address)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS url_settings (
				url_settings_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				url_id BIGINT(20) UNSIGNED NOT NULL,
				depth_limit SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				queue_limit SMALLINT UNSIGNED NOT NULL DEFAULT 0,
				delay MEDIUMINT UNSIGNED NOT NULL DEFAULT 1000,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(url_settings_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id),
				UNIQUE(url_id),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS html (
				html_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				url_id BIGINT(20) UNSIGNED NOT NULL,
				content LONGTEXT NOT NULL,
				file_hash CHAR(64) NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				crawled_at BIGINT(13) UNSIGNED,
				scraped_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(html_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id),
				CHECK(added_at <= crawled_at),
				CHECK(crawled_at <= scraped_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS url_link (
				url_link_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				html_id BIGINT(20) UNSIGNED NOT NULL,
				url_id BIGINT(20) UNSIGNED NOT NULL,
				url_parent_id BIGINT(20) UNSIGNED NOT NULL,
				url_root_id BIGINT(20) UNSIGNED NOT NULL,
				depth SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				queue SMALLINT UNSIGNED NOT NULL DEFAULT 0,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(url_link_id),
				FOREIGN KEY(html_id) REFERENCES html(html_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id),
				FOREIGN KEY(url_parent_id) REFERENCES url(url_id),
				FOREIGN KEY(url_root_id) REFERENCES url(url_id),
				UNIQUE (url_id, url_root_id),
				UNIQUE (url_root_id, queue),
				CHECK(depth <= queue)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS person (
				person_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(person_id),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS user_account (
				user_account_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				person_id BIGINT(20) UNSIGNED,
				id TINYTEXT,
				alias TINYTEXT,
				nickname TINYTEXT,
				name_tag TINYTEXT,
				name_prefix TINYTEXT,
				name_suffix TINYTEXT,
				first_name TINYTEXT,
				middle_name TINYTEXT,
				last_name TINYTEXT,
				display_name TINYTEXT,
				email VARCHAR(320),
				phone_number CHAR(32),
				birthdate DATE,
				city CHAR(58),
				country CHAR(3),
				sex CHAR(1),
				picture VARCHAR(768),
				website VARCHAR(768),
				discord VARCHAR(768),
				facebook VARCHAR(768),
				instagram VARCHAR(768),
				linkedin VARCHAR(768),
				reddit VARCHAR(768),
				snapchat VARCHAR(768),
				telegram VARCHAR(768),
				tiktok VARCHAR(768),
				twitch VARCHAR(768),
				twitter VARCHAR(768),
				youtube VARCHAR(768),
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(user_account_id),
				FOREIGN KEY(person_id) REFERENCES person(person_id),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS user_account_occurrence (
				user_account_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				user_account_id BIGINT(20) UNSIGNED NOT NULL,
				html_id BIGINT(20) UNSIGNED NOT NULL,
				occurrence_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(user_account_occurrence_id),
				FOREIGN KEY(user_account_id) REFERENCES user_account(user_account_id),
				FOREIGN KEY(html_id) REFERENCES html(html_id),
				UNIQUE(user_account_id, html_id),
				CHECK(occurrence_count > 0)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS currency (
				currency_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				currency_name CHAR(32) NOT NULL,
				currency_unit CHAR(32) NOT NULL,
				currency_code CHAR(8) NOT NULL,
				currency_symbol CHAR(8) NOT NULL,
				currency_logo VARCHAR(768),
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(currency_id),
				UNIQUE(currency_name),
				UNIQUE(currency_code),
				UNIQUE(currency_symbol),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address_format (
				address_format_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				address_format_name CHAR(32) NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(address_format_id),
				UNIQUE(address_format_name),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address (
				address_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				currency_id BIGINT(20) UNSIGNED,
				address_format_id BIGINT(20) UNSIGNED,
				address CHAR(255) NOT NULL,
				valid BIT(1) NOT NULL DEFAULT 0,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(address_id),
				FOREIGN KEY(currency_id) REFERENCES currency(currency_id),
				FOREIGN KEY(address_format_id) REFERENCES address_format(address_format_id),
				UNIQUE(address)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address_occurrence (
				address_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				address_id BIGINT(20) UNSIGNED NOT NULL,
				user_account_occurrence_id BIGINT(20) UNSIGNED,
				html_id BIGINT(20) UNSIGNED NOT NULL,
				occurrence_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(address_occurrence_id),
				FOREIGN KEY(address_id) REFERENCES address(address_id),
				FOREIGN KEY(user_account_occurrence_id) REFERENCES user_account_occurrence(user_account_occurrence_id),
				FOREIGN KEY(html_id) REFERENCES html(html_id),
				UNIQUE(address_id, user_account_occurrence_id, html_id),
				CHECK(occurrence_count > 0)
			) ${tableOptions}`
		];
		let once = Array(queries.length).fill(true);
		let params = Array(queries.length).fill([]);
		let msg = [
			'Create table [url]',
			'Create table [url_settings]',
			'Create table [html]',
			'Create table [url_link]',
			'Create table [person]',
			'Create table [user_account]',
			'Create table [user_account_occurrence]',
			'Create table [currency]',
			'Create table [address_format]',
			'Create table [address]',
			'Create table [address_occurrence]'
		];
		
		// Add initial data
		const databaseData = Object.keys(CONFIG.database.data);
		for(let i = 0; i < databaseData.length; i++) {
			const databaseDataTableName = databaseData[i];
			const databaseDataTableRows = CONFIG.database.data[databaseDataTableName];
			for(let j = 0; j < databaseDataTableRows.length; j++) {
				const databaseDataTableColNames = Object.keys(CONFIG.database.data[databaseData[i]][j]);
				const databaseDataTableColValues = Object.values(CONFIG.database.data[databaseData[i]][j]);
				const updateCols = [];
				for(let k = 0; k < databaseDataTableColNames.length; k++) {
					updateCols.push(`${databaseDataTableColNames[k]} = ?`);
				}
				once.push(true);
				queries.push(`
					INSERT IGNORE INTO ${databaseDataTableName}(${databaseDataTableColNames.join(', ')})
					VALUES(${Array(databaseDataTableColNames.length).fill('?').join(', ')})
					ON DUPLICATE KEY UPDATE ${updateCols.join(', ')}`);
				params.push(databaseDataTableColValues.concat(databaseDataTableColValues));
				msg.push(`Insert or Update [${databaseDataTableName}]`);
			}
		}
		
		// Delete database tables
		if(CONFIG.database.deleteTables === true) {
			const deleteQueries = [
				`SET FOREIGN_KEY_CHECKS = 0`,
				`DROP TABLE IF EXISTS
					url,
					url_settings,
					html,
					url_link,
					person,
					user_account,
					user_account_occurrence,
					currency,
					address_format,
					address,
					address_occurrence`,
				`SET FOREIGN_KEY_CHECKS = 1`
			];
			once = Array(deleteQueries.length).fill(true).concat(once);
			queries = deleteQueries.concat(queries);
			params = Array(deleteQueries.length).fill([]).concat(params);
			msg = Array(deleteQueries.length).fill('Deleting tables').concat(msg);
		}

		return this.#executeAll(once, queries, params, msg);
	}

	// Add / Edit URL + URL settings
	addURLSettings(address, depthLimit, queueLimit, delay) {
		return this.#transact([
			false,
			false,
			false
		], [
			`INSERT IGNORE INTO url(address) VALUES(?)`,
			`SELECT url_id INTO @url_id FROM url WHERE address = ? LIMIT 1`,
			`INSERT INTO url_settings(url_id, depth_limit, queue_limit, delay) VALUES(@url_id, ?, ?, ?)
			ON DUPLICATE KEY UPDATE depth_limit = ?, queue_limit = ?, delay = ?, updated_at = (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000))`
		], [
			[
				address
			],
			[
				address
			],
			[
				depthLimit,
				queueLimit,
				delay,
				depthLimit,
				queueLimit,
				delay
			]
		], [
			'Insert [url]',
			'Select [url]',
			'Insert or Update [url_settings]'
		]);
	}

	// Get HTML to crawl
	getHTMLToCrawl() {
		return this.#query(
			`SELECT html_id, html_to_crawl.url_id, address, content, file_hash, url_root_id, depth, queue, (
				SELECT COALESCE(MAX(depth), 0)
				FROM url_link
				WHERE url_link.url_root_id = html_to_crawl.url_root_id
			) AS depth_max, (
				SELECT COALESCE(MAX(queue), 0)
				FROM url_link
				WHERE url_link.url_root_id = html_to_crawl.url_root_id
			) AS queue_max, depth_limit, queue_limit
			FROM (
				SELECT url_unfinished.url_id, address, url_unfinished.url_id AS url_root_id, 0 AS depth, 0 AS queue, depth_limit, queue_limit
				FROM (
					SELECT url_id, address
					FROM url
					WHERE EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND crawled_at IS NULL
					)
				) url_unfinished
				JOIN url_settings ON url_settings.url_id = url_unfinished.url_id AND url_settings.depth_limit >= 0 AND url_settings.queue_limit >= 0
				UNION ALL
				SELECT url_unfinished.url_id, address, url_root_id, depth, queue, depth_limit, queue_limit
				FROM (
					SELECT url_id, address
					FROM url
					WHERE EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND crawled_at IS NULL
					)
				) url_unfinished
				JOIN url_link ON url_link.url_id = url_unfinished.url_id
				JOIN url_settings ON url_settings.url_id = url_link.url_root_id AND url_settings.depth_limit >= url_link.depth AND url_settings.queue_limit >= url_link.queue
			) html_to_crawl
			JOIN html ON html.url_id = html_to_crawl.url_id`,
			'Select [html_to_crawl]'
		);
	}

	// Get URL to crawl
	getURLToCrawl() {
		return this.#query(
			`SELECT url_id, address, url_root_id, depth, queue, (
				SELECT COALESCE(MAX(depth), 0)
				FROM url_link
				WHERE url_link.url_root_id = url_to_crawl.url_root_id
			) AS depth_max, (
				SELECT COALESCE(MAX(queue), 0)
				FROM url_link
				WHERE url_link.url_root_id = url_to_crawl.url_root_id
			) AS queue_max, depth_limit, queue_limit, delay
			FROM (
				SELECT url_expired.url_id, address, url_expired.url_id AS url_root_id, 0 AS depth, 0 AS queue, depth_limit, queue_limit, delay
				FROM (
					SELECT url_id, address
					FROM url
					WHERE NOT EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - html.added_at < ${CONFIG.crawler.expirationTimeout}
					)
				) url_expired
				JOIN url_settings ON url_settings.url_id = url_expired.url_id AND url_settings.depth_limit >= 0 AND url_settings.queue_limit >= 0
				UNION ALL
				SELECT url_expired.url_id, address, url_root_id, depth, queue, depth_limit, queue_limit, delay
				FROM (
					SELECT url_id, address
					FROM url
					WHERE NOT EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - html.added_at < ${CONFIG.crawler.expirationTimeout}
					)
				) url_expired
				JOIN url_link ON url_link.url_id = url_expired.url_id
				JOIN url_settings ON url_settings.url_id = url_link.url_root_id AND url_settings.depth_limit >= url_link.depth AND url_settings.queue_limit >= url_link.queue
			) url_to_crawl
			WHERE NOT EXISTS (
				SELECT 1
				FROM (
					SELECT html.url_id, html.added_at
					FROM html
					UNION ALL
					SELECT url_link.url_id, html.added_at
					FROM url_link
					JOIN url_link AS branch_url_link ON branch_url_link.url_root_id = url_link.url_root_id
					JOIN html ON html.url_id = branch_url_link.url_id OR html.url_id = branch_url_link.url_root_id
				) branch_html
				WHERE branch_html.url_id = url_to_crawl.url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - branch_html.added_at < url_to_crawl.delay
			)`,
			'Select [url_to_crawl]'
		);
	}

	// Add HTML
	addHTML(urlID, content, fileHash) {
		return this.#executeAll(
			[
				false,
				false
			],
			[
				`INSERT IGNORE INTO html(url_id, content, file_hash) VALUES(?, ?, ?)`,
				`SELECT html_id FROM html WHERE url_id = ? AND content = ? AND file_hash = ? ORDER BY added_at DESC LIMIT 1`
			],
			[
				[
					urlID,
					content,
					fileHash
				],
				[
					urlID,
					content,
					fileHash
				]
			],
			[
				'Insert [html]',
				'Select [html]'
			]
		);
	}

	// Save URL
	addURL(address, htmlID, urlParentID, branches) {
		const once = [false];
		const queries = [`INSERT IGNORE INTO url(address) VALUES(?)`];
		const params = [[address]];
		const msg = ['Insert [url]'];

		// Save URL links
		for(let i = 0; i < branches.length; i++) {
			once.push(false);
			queries.push(
				`INSERT INTO url_link(html_id, url_id, url_parent_id, url_root_id, depth, queue)
				SELECT ? AS html_id, (SELECT url_id FROM url WHERE address = ? LIMIT 1) AS url_id, ? AS url_parent_id, ? AS url_root_id, ? AS depth, (COALESCE(MAX(queue), 0) + 1) AS queue_max
				FROM url_settings
				LEFT JOIN url_link ON url_link.url_root_id = url_settings.url_id
				WHERE (
					url_settings.url_id = (SELECT url_id FROM url WHERE address = ? LIMIT 1)
					OR url_settings.url_id = ?
				) AND (COALESCE(queue, 0) < queue_limit)
				LIMIT 1`);
			params.push([
				htmlID,
				address,
				urlParentID,
				branches[i].url_root_id,
				branches[i].depth + 1,
				address,
				branches[i].url_root_id
			]);
			msg.push('Insert [url_link]');
		}
		
		return this.#transact(
			once,
			queries,
			params,
			msg
		);
	}

	// Finish HTML to crawl
	finishHTMLToCrawl(htmlID) {
		return this.#execute(
			`UPDATE html SET crawled_at = FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) WHERE html_id = ?`,
			[
				htmlID
			],
			'Update [html]'
		);
	}

	// Get HTML to scrape
	getHTMLToScrape() {
		return this.#query(
			`SELECT html_id, content, file_hash
			FROM html
			WHERE crawled_at IS NOT NULL AND scraped_at IS NULL`,
			'Select [html_to_scrape]'
		);
	}

	// Finish HTML to scrape
	finishHTMLToScrape(htmlID) {
		return this.#execute(
			`UPDATE html SET scraped_at = FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) WHERE html_id = ?`,
			[
				htmlID
			],
			'Update [html]'
		);
	}
}

// Exports
module.exports = Database;