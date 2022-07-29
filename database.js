'use strict';

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Global classes
const { log } = require('./logger.js');

// Packages
const MYSQL = require('mysql2');

// Database class
class Database {
	// Database connection pool
	#connectionPool = MYSQL.createPool(CONFIG.mysql);

	// #TODO - Add tryExecute(), with loop trying to connect to database
	// #TODO - Change database class in crawler & scraper
	// #TODO - Database & Messenger classes in separate files (+ log() function)
	execute(queries=[], msg='') {
		return new Promise((resolve, reject) => {
			if(queries.length >= 1) {
				this.#connectionPool.getConnection((error, connection) => {
					if(error) {
						if(connection) { connection.release(); }
						
						setTimeout(() => {
							this.execute(queries, msg);
						}, CONFIG.mysql.connectTimeout);

						reject(error);
					}

					if(connection) {
						connection.on('error', (error) => {
							connection.release();

							setTimeout(() => {
								this.execute(queries, msg);
							}, CONFIG.mysql.connectTimeout);

							reject(error);
						});
	
						connection.query(queries.join(`; `), (error, results) => {
							connection.release();

							if(error) {
								setTimeout(() => {
									this.execute(queries, msg);
								}, CONFIG.mysql.connectTimeout);

								return reject(error);
							}

							log('database', (msg ? msg : `Queries(${queries.length}) executed`), results);
							resolve(results);
						});
					}
				});
			}
		});
	}
	/*
	execute(queries=[], msg='') {
		return new Promise((resolve, reject) => {
			if(queries.length >= 1) {
				this.#connectionPool.getConnection((error, connection) => {
					if(error) { reject(error); }
					connection.query(queries.join(`; `), (error, results) => {
						if(error) { reject(error); }
						log('database', (msg ? msg : `Queries(${queries.length}) executed`), results);
						connection.release();
						if(error) { reject(error); }
						resolve(results);
					});
				});
			}
		});
	}
	*/

	createTables() {
		// Create database tables
		const tableOptions = `ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE ${CONFIG.mysql.charset}`;
		const queries = [
			`CREATE TABLE IF NOT EXISTS crawler_url (
				crawler_url_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				crawler_root_url_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
				crawler_parent_url_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
				url VARCHAR(768) NOT NULL,
				level SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				serial SMALLINT UNSIGNED NOT NULL DEFAULT 0,
				added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(crawler_url_id),
				UNIQUE(url)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS crawler_url_settings (
				crawler_url_settings_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				crawler_url_id BIGINT(20) UNSIGNED NOT NULL,
				level_limit SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				serial_limit SMALLINT UNSIGNED NOT NULL DEFAULT 0,
				delay_ms MEDIUMINT UNSIGNED NOT NULL DEFAULT 1000,
				updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(crawler_url_settings_id),
				FOREIGN KEY(crawler_url_id) REFERENCES crawler_url(crawler_url_id),
				UNIQUE(crawler_url_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS crawler_html (
				crawler_html_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				crawler_url_id BIGINT(20) UNSIGNED NOT NULL,
				html LONGTEXT NOT NULL,
				crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(crawler_html_id),
				FOREIGN KEY(crawler_url_id) REFERENCES crawler_url(crawler_url_id)
			) ${tableOptions}`,
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
				PRIMARY KEY(scraper_account_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS scraper_account_occurrence (
				scraper_account_occurrence_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				scraper_account_id BIGINT(20) UNSIGNED NOT NULL,
				crawler_html_id BIGINT(20) UNSIGNED NOT NULL,
				scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(scraper_account_occurrence_id),
				FOREIGN KEY(scraper_account_id) REFERENCES scraper_account(scraper_account_id),
				FOREIGN KEY(crawler_html_id) REFERENCES crawler_html(crawler_html_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS scraper_address (
				scraper_address_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				address CHAR NOT NULL,
				format CHAR(32),
				currency CHAR(8),
				valid BIT(1),
				validity_checked_at TIMESTAMP,
				PRIMARY KEY(scraper_address_id)
			) ${tableOptions}`,
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
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS scraper_user (
				scraper_user_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				scraper_account_id BIGINT(20) UNSIGNED NOT NULL,
				PRIMARY KEY(scraper_user_id),
				FOREIGN KEY(scraper_account_id) REFERENCES scraper_account(scraper_account_id)
			) ${tableOptions}`
		];
		let queryLogs = 'Create [crawler_url], Create [crawler_url_settings], Create [crawler_html], Create [scraper_account], Create [scraper_account_occurrence], Create [scraper_address], Create [scraper_address_occurrence], Create [scraper_user]';
		
		// Delete database tables
		if(CONFIG.deleteTables === true) {
			queries.unshift(
				`SET FOREIGN_KEY_CHECKS = 0;
				SET GROUP_CONCAT_MAX_LEN=32768;
				SET @tables = NULL;
				SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
					FROM information_schema.tables
					WHERE table_schema = (SELECT DATABASE());
				SELECT IFNULL(@tables,'dummy') INTO @tables;
				SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables);
				PREPARE stmt FROM @tables;
				EXECUTE stmt;
				DEALLOCATE PREPARE stmt;
				SET FOREIGN_KEY_CHECKS = 1`
			);
			queryLogs = `Delete tables, ${queryLogs}`;
		}

		return this.execute(queries, queryLogs);
	}
}

// Exports
module.exports = Database;