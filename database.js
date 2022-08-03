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
	execute(queries=[], msg='') {
		return new Promise((resolve, reject) => {
			if(queries.length >= 1) {
				this.#connectionPool.getConnection((error, connection) => {
					if(error) {
						if(connection) { connection.release(); }
						
						reject(error);
					}

					if(connection) {
						connection.on('error', (error) => {
							connection.release();

							reject(error);
						});
	
						connection.query(queries.join(`; `), (error, results) => {
							connection.release();

							if(error) {
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

	createTables() {
		// Create database tables
		const tableOptions = `ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE ${CONFIG.mysql.charset}`;
		const queries = [
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
				updated_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				PRIMARY KEY(url_settings_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id),
				UNIQUE(url_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS html (
				html_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				url_id BIGINT(20) UNSIGNED NOT NULL,
				content LONGTEXT NOT NULL,
				added_at BIGINT(13) UNSIGNED NOT NULL DEFAULT (FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000)),
				finished_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(html_id),
				FOREIGN KEY(url_id) REFERENCES url(url_id)
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
				FOREIGN KEY(url_root_id) REFERENCES url(url_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS account (
				account_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
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
				PRIMARY KEY(account_id)
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
				PRIMARY KEY(currency_id),
				UNIQUE(name),
				UNIQUE(code),
				UNIQUE(symbol)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address_format (
				address_format_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				format CHAR(32) NOT NULL,
				PRIMARY KEY(address_format_id),
				UNIQUE(format)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS address (
				address_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				currency_id BIGINT(20) UNSIGNED,
				address_format_id BIGINT(20) UNSIGNED,
				address CHAR NOT NULL,
				valid TINYINT(1) UNSIGNED NOT NULL DEFAULT 2,
				validity_checked_at BIGINT(13) UNSIGNED,
				PRIMARY KEY(address_id),
				FOREIGN KEY(currency_id) REFERENCES currency(currency_id),
				FOREIGN KEY(address_format_id) REFERENCES address_format(address_format_id)
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
				FOREIGN KEY(html_id) REFERENCES html(html_id)
			) ${tableOptions}`,
			`CREATE TABLE IF NOT EXISTS user (
				user_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				account_id BIGINT(20) UNSIGNED NOT NULL,
				PRIMARY KEY(user_id),
				FOREIGN KEY(account_id) REFERENCES account(account_id)
			) ${tableOptions}`
		];
		let queryLogs = 'Create [url], Create [url_settings], Create [html], Create [url_link], Create [account], Create [account_occurrence], Create [currency], Create [address_format], Create [address], Create [address_occurrence], Create [user]';
		
		// Add currencies from configuration
		if(CONFIG.currencies.length > 0) {
			for(let i = 0; i < CONFIG.currencies.length; i++) {
				queries.push(`INSERT IGNORE INTO currency(name, unit, code, symbol, logo) VALUES('${CONFIG.currencies[i].name}', '${CONFIG.currencies[i].unit}', '${CONFIG.currencies[i].code}', '${CONFIG.currencies[i].symbol}', '${CONFIG.currencies[i].logo}') ON DUPLICATE KEY UPDATE name='${CONFIG.currencies[i].name}', unit='${CONFIG.currencies[i].unit}', code='${CONFIG.currencies[i].code}', symbol='${CONFIG.currencies[i].symbol}', logo='${CONFIG.currencies[i].logo}'`);
			}
			queryLogs += ', Insert or Update [currency]';
		}
		
		// Add address formats from configuration
		if(CONFIG.addressFormats.length > 0) {
			for(let i = 0; i < CONFIG.addressFormats.length; i++) {
				queries.push(`INSERT IGNORE INTO address_format(format) VALUES('${CONFIG.addressFormats[i]}')`);
			}
			queryLogs += ', Insert [address_format]';
		}
		
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