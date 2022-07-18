'use strict';

// Crawling - finding URLs
// Scraping - extracting data

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Packages
const EXPRESS = require('express');
const FS = require('fs');
const HTTP = require('http');
const MYSQL = require('mysql2');
const PATH = require('path');
const WS = require('ws');

// Functions
const fn = {
	addCrawlerURL: function(url) {
		main.execDBQueries([
			`INSERT INTO crawler_url(url) VALUES('${url}')`
		], 'Insert [crawler_url]')
		.then(() => {
			// #TODO - Tell crawler worker to add it to its queue
		})
		.catch((error) => {
			main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
		});
	}
};

// Server
class Main {
	// Server configuration
	#protocol = process.env.PROTOCOL || 'wss';
	#host = process.env.HOST || process.env.HOSTNAME || 'localhost';
	#port = process.env.PORT || 3000;

	// WebSockets
	ws = null;

	// Data
	#data = {
		clients: []
	};

	// MySQL connection pool
	#mysqlConnectionPool = MYSQL.createPool(CONFIG.mysql);

	constructor() {
		// Start HTTP server
		const server = (CONFIG.localHTML ? EXPRESS().use((req, res) => {
			const filePath = PATH.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
			const extName = PATH.extname(filePath);
			let contentType = 'text/html';
			
			switch(extName) {
				case '.css':
					contentType = 'text/css';
					break;
				case '.ico':
					contentType = 'image/x-icon';
					break;
				case '.js':
					contentType = 'text/javascript';
					break;
			}
			
			res.writeHead(200, { 'Content-Type': contentType });
			
			const readStream = FS.createReadStream(filePath);
			readStream.pipe(res);
		}) : HTTP.createServer())
		.listen(this.#port, () => {
			this.log('server', 'Started', { address: `${this.#protocol}://${this.#host}:${this.#port}` });

			// Create database tables
			const queries = [
				`CREATE TABLE IF NOT EXISTS crawler_url (
					crawler_url_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
					crawler_parent_url_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
					url VARCHAR(1024) NOT NULL,
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
					picture VARCHAR(1024),
					website VARCHAR(1024),
					blog VARCHAR(1024),
					discord VARCHAR(1024),
					facebook VARCHAR(1024),
					instagram VARCHAR(1024),
					linkedin VARCHAR(1024),
					reddit VARCHAR(1024),
					snapchat VARCHAR(1024),
					telegram VARCHAR(1024),
					tiktok VARCHAR(1024),
					tumblr VARCHAR(1024),
					twitch VARCHAR(1024),
					twitter VARCHAR(1024),
					whatsapp VARCHAR(1024),
					youtube VARCHAR(1024),
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
			];
			let queryLogs = 'Create table [crawler_url], Create table [crawler_html], Create table [scraper_account], Create table [scraper_account_occurrence], Create table [scraper_address], Create table [scraper_address_occurrence], Create table [scraper_user]';
			
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
			
			// Create MySQL tables
			this.#execDBQueries(queries, queryLogs)
			.then(() => {
				// Create WebSocket server
				this.ws = new WS.Server({ server }).on('connection', (ws, req) => {
					this.log('client', 'Connected', ws.data);

					// Check request origin
					const origin = new URL(req.headers.origin);
					let originAllowed = false;
					for(let i = 0; i < CONFIG.allowedOrigins.length; i++) {
						if(origin.protocol == `${CONFIG.allowedOrigins[i].protocol}:` && origin.hostname == CONFIG.allowedOrigins[i].hostname) {
							originAllowed = true;
							this.access(ws, req);
							break;
						}
					}
					if(!originAllowed) {
						this.terminateClient(ws, 0, 'client', 'Access denied', { reason: 'Disallowed origin!', protocol: origin.protocol.slice(0, -1), host: origin.hostname });
					}
				});
			});
		});
	}

	log(type, message, args={}) {
		console.log(`[${type.toUpperCase()}] ${message}${(args && Object.keys(args).length === 0 && args.constructor === Object ? '' : ` ${JSON.stringify(args)}`)}`);
	}

	#execDBQueries(queries=[], message='') {
		return new Promise((resolve) => {
			if(queries.length >= 1) {
				this.#mysqlConnectionPool.getConnection((error, connection) => {
					if(error) { throw error; }
					connection.query(queries.join(`; `), (error, results) => {
						if(error) { throw error; }
						this.log('database', (message ? message : `Queries(${queries.length}) executed`), results);
						connection.release();
						if(error) { throw error; }
						resolve(results);
					});
				});
			}
		});
	}

	access(ws, req) {
		// Set alive state
		ws.isAlive = true;
		this.resetKeepAliveInterval(ws);

		// Set client data
		ws.data = {
			ip: req.socket.remoteAddress
		};

		// WebSocket listeners
		ws.on('close', () => {
			this.clearKeepAliveInterval(ws);
			this.deleteClient(ws);

			this.log('client', 'Disconnected', ws.data);
		});
		ws.on('pong', () => {
			// Set alive state
			ws.isAlive = true;

			this.log('client', 'Pong', ws.data);
		});
		ws.on('message', (msg) => {
			if(ws.readyState == WS.OPEN) {
				let msgJSON = null;
				let msgJSONValid = false;

				// Check for valid JSON
				try {
					msgJSON = JSON.parse(msg);

					if(msgJSON && typeof msgJSON === 'object' && msgJSON !== null) {
						msgJSONValid = true;
					}
				} catch(err) {
					this.log('client', 'Message is not valid JSON', { error: err });
				}

				if(msgJSONValid) {
					if(msgJSON.length == 2 && Array.isArray(msgJSON[1])) {
						const iFn = msgJSON[0];
						if(iFn) {
							if(fn[iFn]) {
								const iArgs = msgJSON[1];
								if(iArgs) {
									if(iArgs.length == fn[iFn].length) {
										this.resetKeepAliveInterval(ws);

										this.log('client', 'Message', { message: msg, client: ws.data });

										// Apply function
										fn[iFn].apply({ client: ws, msg: msg }, iArgs);
									}
									else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The requested function does not exist!' }); }
								}
								else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The request does not contain the required arguments!' }); }
							}
							else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The requested function does not exist!' }); }
						}
						else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The request does not contain the required function!' }); }
					}
					else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The request does not meet the required format!' }); }
				}
				else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The request does not come in valid JSON format!' }); }
			}
			else { this.terminateClient(ws, 0, 'websocket', 'Message denied', { reason: 'The request has been received under unexpected condition!' }); }
		});

		// Initialize client messaging
		this.#init(ws);
	}

	#init(ws) {
		this.#addClient(ws);

		this.log('client', 'Joined', ws.data);

		this.#sendFn(ws, 'init', []);
	}

	#addClient(ws) {
		// Add client
		this.#data.clients.push(ws);
	}

	deleteClient(ws) {
		for(let i = 0; i < this.#data.clients.length; i++) {
			if(this.#data.clients[i] == ws) {
				// Delete client
				this.#data.clients.splice(i, 1);
				break;
			}
		}
	}

	terminateClient(ws, closeOption, type, message, args={}) {
		this.clearKeepAliveInterval(ws);

		this.log(type, message, args);
		this.log('client', 'Terminated', ws.data);

		switch(closeOption) {
			case 1: {
				// Terminate client (no waiting for buffered messages)
				ws.terminate();
				break;
			}
			case 2: {
				// Close client (allow reconnect)
				this.#sendFn(ws, 'reconnect', []);
				ws.close();
				break;
			}
			default: {
				// Close client (disallow reconnect)
				this.#sendFn(ws, 'noReconnect', []);
				ws.close();
				break;
			}
		}
	}

	clearKeepAliveInterval(ws) {
		if(ws.keepAliveInterval) { clearInterval(ws.keepAliveInterval); }
		ws.isAlive = false;
	}

	resetKeepAliveInterval(ws) {
		if(ws.keepAliveInterval) { clearInterval(ws.keepAliveInterval); }
		ws.isAlive = true;
		ws.keepAliveInterval = setInterval(() => {
			this.keepAlive(ws);
		}, 45000);
	}

	keepAlive(ws) {
		if(ws.readyState == WS.OPEN) {
			// Set alive state
			ws.isAlive = false;

			// Send ping request
			ws.ping();
			this.log('server', 'Ping', ws.data);

			// Pong response latency timeout (max. 10s)
			setTimeout(() => {
				if(ws.isAlive === false) {
					this.terminateClient(ws, 1, 'server', 'Pong did not reach server within given timeout limit (10s)', ws.data);
				}
			}, 10000);
		}
	}

	#sendJSON(ws, msg) {
		ws.send(msg);
	}

	#send(ws, msg) {
		this.#sendJSON(ws, JSON.stringify(msg));
	}

	#sendFn(ws, fn, args=[]) {
		this.#send(ws, [fn, args]);
	}
}

const main = new Main();