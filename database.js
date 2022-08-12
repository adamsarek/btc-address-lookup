'use strict';

// Packages
const MYSQL = require('mysql2');

// Global configuration
const CONFIG = Object.freeze(require('./config.js'));

// Global classes
const { log } = require('./logger.js');

// Database class
class Database {
	// Database connection pool
	#connectionPool = MYSQL.createPool(CONFIG.database.mysql);

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
				level_limit SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				serial_limit SMALLINT UNSIGNED NOT NULL DEFAULT 0,
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
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				finished_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(html_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id),
				CHECK(added_at <= finished_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS url_link (
				url_link_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				html_id BIGINT(20) UNSIGNED NOT NULL,
				url_id BIGINT(20) UNSIGNED NOT NULL,
				url_parent_id BIGINT(20) UNSIGNED NOT NULL,
				url_root_id BIGINT(20) UNSIGNED NOT NULL,
				level SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				serial SMALLINT UNSIGNED NOT NULL DEFAULT 0,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(url_link_id),
				FOREIGN KEY(html_id) REFERENCES html(html_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id),
				FOREIGN KEY(url_parent_id) REFERENCES url(url_id),
				FOREIGN KEY(url_root_id) REFERENCES url(url_id),
				UNIQUE (url_id, url_root_id),
				CHECK(level <= serial)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS user (
				user_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(user_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS account (
				account_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				user_id BIGINT(20) UNSIGNED,
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
				picture VARCHAR(768),
				website VARCHAR(768),
				blog VARCHAR(768),
				discord VARCHAR(768),
				facebook VARCHAR(768),
				instagram VARCHAR(768),
				linkedin VARCHAR(768),
				reddit VARCHAR(768),
				snapchat VARCHAR(768),
				telegram VARCHAR(768),
				tiktok VARCHAR(768),
				tumblr VARCHAR(768),
				twitch VARCHAR(768),
				twitter VARCHAR(768),
				whatsapp VARCHAR(768),
				youtube VARCHAR(768),
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(account_id),
				FOREIGN KEY(user_id) REFERENCES user(user_id),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS account_occurrence (
				account_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				account_id BIGINT(20) UNSIGNED NOT NULL,
				html_id BIGINT(20) UNSIGNED NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(account_occurrence_id),
				FOREIGN KEY(account_id) REFERENCES account(account_id),
				FOREIGN KEY(html_id) REFERENCES html(html_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS currency (
				currency_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				name CHAR(32) NOT NULL,
				unit CHAR(32) NOT NULL,
				code CHAR(8) NOT NULL,
				symbol CHAR(8) NOT NULL,
				logo VARCHAR(768),
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(currency_id),
				UNIQUE(name),
				UNIQUE(code),
				UNIQUE(symbol),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address_format (
				address_format_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				format CHAR(32) NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(address_format_id),
				UNIQUE(format),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address (
				address_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				currency_id BIGINT(20) UNSIGNED,
				address_format_id BIGINT(20) UNSIGNED,
				address CHAR NOT NULL,
				valid TINYINT(1) UNSIGNED NOT NULL DEFAULT 2,
				validity_checked_at BIGINT(13) UNSIGNED,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				updated_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(address_id),
				FOREIGN KEY(currency_id) REFERENCES currency(currency_id),
				FOREIGN KEY(address_format_id) REFERENCES address_format(address_format_id),
				UNIQUE(address),
				CHECK(added_at <= updated_at)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address_occurrence (
				address_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				address_id BIGINT(20) UNSIGNED NOT NULL,
				account_occurrence_id BIGINT(20) UNSIGNED,
				html_id BIGINT(20) UNSIGNED NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(address_occurrence_id),
				FOREIGN KEY(address_id) REFERENCES address(address_id),
				FOREIGN KEY(account_occurrence_id) REFERENCES account_occurrence(account_occurrence_id),
				FOREIGN KEY(html_id) REFERENCES html(html_id),
				UNIQUE(account_occurrence_id, html_id)
			) ${tableOptions}`
		];
		let once = Array(queries.length).fill(true);
		let params = Array(queries.length).fill([]);
		let msg = [
			'Create table [url]',
			'Create table [url_settings]',
			'Create table [html]',
			'Create table [url_link]',
			'Create table [user]',
			'Create table [account]',
			'Create table [account_occurrence]',
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
					account,
					account_occurrence,
					currency,
					address_format,
					address,
					address_occurrence,
					user`,
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
	addURLSettings(address, levelLimit, serialLimit, delay) {
		return this.#transact([
			false,
			false,
			false
		], [
			`INSERT IGNORE INTO url(address) VALUES(?)`,
			`SELECT url_id INTO @url_id FROM url WHERE address = ? LIMIT 1`,
			`INSERT INTO url_settings(url_id, level_limit, serial_limit, delay) VALUES(@url_id, ?, ?, ?)
			ON DUPLICATE KEY UPDATE level_limit = ?, serial_limit = ?, delay = ?, updated_at = (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000))`
		], [
			[
				address
			],
			[
				address
			],
			[
				levelLimit,
				serialLimit,
				delay,
				levelLimit,
				serialLimit,
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
			`SELECT html_id, html_to_crawl.url_id, content, url_root_id, (
				SELECT COALESCE(MAX(level), 0)
				FROM url_link
				WHERE url_link.url_root_id = html_to_crawl.url_root_id
			) AS level, (
				SELECT COALESCE(MAX(serial), 0)
				FROM url_link
				WHERE url_link.url_root_id = html_to_crawl.url_root_id
			) AS serial, level_limit, serial_limit, delay
			FROM (
				SELECT url_unfinished.url_id, url_unfinished.url_id AS url_root_id, level_limit, serial_limit
				FROM (
					SELECT url_id
					FROM url
					WHERE EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND finished_at IS NULL
					)
				) url_unfinished
				JOIN url_settings ON url_settings.url_id = url_unfinished.url_id
				UNION ALL
				SELECT url_unfinished.url_id, url_root_id, level_limit, serial_limit
				FROM (
					SELECT url_id
					FROM url
					WHERE EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND finished_at IS NULL
					)
				) url_unfinished
				JOIN url_link ON url_link.url_id = url_unfinished.url_id
				JOIN url_settings ON url_settings.url_id = url_link.url_root_id AND url_settings.level_limit >= url_link.level AND url_settings.serial_limit >= url_link.serial
			) html_to_crawl
			JOIN html ON html.url_id = html_to_crawl.url_id
			WHERE EXISTS (
				SELECT 1
				FROM (
					SELECT html.url_id
					FROM html
					UNION ALL
					SELECT url_link.url_id
					FROM url_link
					JOIN url_link AS branch_url_link ON branch_url_link.url_root_id = url_link.url_root_id
					JOIN html ON html.url_id = branch_url_link.url_id OR html.url_id = branch_url_link.url_root_id
				) branch_html
				WHERE branch_html.url_id = html_to_crawl.url_id
			)`,
			'Select [html_to_crawl]'
		);
	}

	// Get URL to crawl
	getURLToCrawl() {
		return this.#query(
			`SELECT url_id, address, url_root_id, (
				SELECT COALESCE(MAX(level), 0)
				FROM url_link
				WHERE url_link.url_root_id = url_to_crawl.url_root_id
			) AS level, (
				SELECT COALESCE(MAX(serial), 0)
				FROM url_link
				WHERE url_link.url_root_id = url_to_crawl.url_root_id
			) AS serial, level_limit, serial_limit, delay
			FROM (
				SELECT url_expired.url_id, address, url_expired.url_id AS url_root_id, level_limit, serial_limit, delay
				FROM (
					SELECT url_id, address
					FROM url
					WHERE NOT EXISTS (
						SELECT 1
						FROM html
						WHERE html.url_id = url.url_id AND FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) - html.added_at < ${CONFIG.crawler.expirationTimeout}
					)
				) url_expired
				JOIN url_settings ON url_settings.url_id = url_expired.url_id
				UNION ALL
				SELECT url_expired.url_id, address, url_root_id, level_limit, serial_limit, delay
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
				JOIN url_settings ON url_settings.url_id = url_link.url_root_id AND url_settings.level_limit >= url_link.level AND url_settings.serial_limit >= url_link.serial
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
	addHTML(urlID, content) {
		return this.#executeAll(
			[
				false,
				false
			],
			[
				`INSERT IGNORE INTO html(url_id, content) VALUES(?, ?)`,
				`SELECT html_id FROM html WHERE url_id = ? AND content = ? ORDER BY added_at DESC LIMIT 1`
			],
			[
				[
					urlID,
					content
				],
				[
					urlID,
					content
				]
			],
			[
				'Insert [html]',
				'Select [html]'
			]
		);
	}

	// Save URL
	addURL(address) {
		return this.#executeAll(
			[
				false,
				false
			],
			[
				`INSERT IGNORE INTO url(address) VALUES(?)`,
				`SELECT url_id FROM url WHERE address = ?`
			],
			[
				[
					address
				],
				[
					address
				]
			],
			[
				'Insert [url]',
				'Select [url]'
			]
		);
	}

	// Save branch URL link
	addURLLink(htmlID, urlID, urlParentID, urlRootID, level, serial) {
		return this.#execute(
			`INSERT IGNORE INTO url_link(html_id, url_id, url_parent_id, url_root_id, level, serial) VALUES(?, ?, ?, ?, ?, ?)`,
			[
				htmlID,
				urlID,
				urlParentID,
				urlRootID,
				level,
				serial
			],
			'Insert [url_link]'
		);
	}

	// Finish HTML
	finishHTML(htmlID) {
		return this.#execute(
			`UPDATE html SET finished_at = FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000) WHERE html_id = ?`,
			[
				htmlID
			],
			'Update [html]'
		);
	}
}

// Exports
module.exports = Database;