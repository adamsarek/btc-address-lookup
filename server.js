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
const WORKER = require('worker_threads');
const WS = require('ws');

// Global functions
function log(type, msg, args={}) {
	console.log(`[${type.toUpperCase()}] ${msg}${(args && Object.keys(args).length === 0 && args.constructor === Object ? '' : ` ${JSON.stringify(args)}`)}`);
}

// Database class
class Database {
	// Database connection pool
	#connectionPool = MYSQL.createPool(CONFIG.mysql);

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

	createTables() {
		// Create database tables
		const queries = [
			`CREATE TABLE IF NOT EXISTS crawler_url (
				crawler_url_id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				crawler_root_url_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
				crawler_parent_url_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
				url VARCHAR(1024) NOT NULL,
				level SMALLINT(4) UNSIGNED NOT NULL DEFAULT 0,
				serial SMALLINT UNSIGNED NOT NULL DEFAULT 0,
				added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(crawler_url_id),
				UNIQUE(url)
			) ENGINE=InnoDB CHARACTER SET utf8`,
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

// Messenger class
class Messenger {
	// Messenger configuration
	config = null;
	
	constructor(config) {
		this.config = config;
		this.config.node.on('message', (msg) => {
			if(this.config.onMessageInitCondition()) {
				let msgJSON = null;
				let msgJSONValid = false;

				// Check for valid JSON
				try {
					msgJSON = JSON.parse(msg);

					if(msgJSON && typeof msgJSON === 'object' && msgJSON !== null) {
						msgJSONValid = true;
					}
				} catch(err) {}

				if(msgJSONValid) {
					if(msgJSON.length == 2 && Array.isArray(msgJSON[1])) {
						const iFn = msgJSON[0];
						if(iFn) {
							if(this.config.fn[iFn]) {
								const iArgs = msgJSON[1];
								if(iArgs) {
									if(iArgs.length == this.config.fn[iFn].length) {
										this.config.onMessageSuccess(msg);

										// Apply function
										this.config.fn[iFn].apply(this.config.fnData(msg), iArgs);
									}
									else { this.config.onMessageError('Message denied', { reason: 'The requested function does not exist!' }); }
								}
								else { this.config.onMessageError('Message denied', { reason: 'The request does not contain the required arguments!' }); }
							}
							else { this.config.onMessageError('Message denied', { reason: 'The requested function does not exist!' }); }
						}
						else { this.config.onMessageError('Message denied', { reason: 'The request does not contain the required function!' }); }
					}
					else { this.config.onMessageError('Message denied', { reason: 'The request does not meet the required format!' }); }
				}
				else { this.config.onMessageError('Message denied', { reason: 'The request does not come in valid JSON format!' }); }
			}
			else { this.config.onMessageError('Message denied', { reason: 'The request has been received under unexpected condition!' }); }
		});
	}

	sendJSON(msg) {
		this.config.send(msg);
	}

	send(msg) {
		this.sendJSON(JSON.stringify(msg));
	}

	sendFn(fn, args=[]) {
		this.send([fn, args]);
	}
}

// Main class
class Main {
	// Server configuration
	#protocol = process.env.PROTOCOL || 'wss';
	#host = process.env.HOST || process.env.HOSTNAME || 'localhost';
	#port = process.env.PORT || 3000;

	// Data
	#data = {
		clients: []
	};

	// Functions
	#fn = {
		// Functions (Client -> Server)
		addCrawlerURL: function(url, levelLimit, serialLimit, delayMS) {
			const preparedExecutions = {
				updateCrawlerURL: (results) => {
					database.execute([
						`UPDATE crawler_url SET crawler_root_url_id='${results[0].crawler_url_id}' WHERE crawler_url_id='${results[0].crawler_url_id}'`,
						`INSERT INTO crawler_url_settings(crawler_url_id, level_limit, serial_limit, delay_ms) VALUES('${results[0].crawler_url_id}', '${levelLimit}', '${serialLimit}', '${delayMS}')
						ON DUPLICATE KEY UPDATE level_limit='${levelLimit}', serial_limit='${serialLimit}', delay_ms='${delayMS}'`
					], 'Update [crawler_url], Insert or Update [crawler_url_settings]')
					.then(() => {
						// #TODO - Tell crawler worker to add it to its queue
					})
					.catch((error) => {
						main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
					});
				}
			};
			
			database.execute([
				`SELECT crawler_url_id FROM crawler_url WHERE crawler_url_id=crawler_root_url_id AND url='${url}' LIMIT 1`
			], 'Select [crawler_url]')
			.then((results) => {
				if(results.length == 0) {
					database.execute([
						`SELECT crawler_url_id FROM crawler_url WHERE url='${url}' LIMIT 1`
					], 'Select [crawler_url]')
					.then((results) => {
						if(results.length == 0) {
							database.execute([
								`INSERT INTO crawler_url(url) VALUES('${url}')`,
								`SELECT crawler_url_id FROM crawler_url WHERE url='${url}' LIMIT 1`
							], 'Insert [crawler_url], Select [crawler_url]')
							.then((results) => {
								preparedExecutions.updateCrawlerURL(results[1]);
							})
							.catch((error) => {
								main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
							});
						}
						else {
							preparedExecutions.updateCrawlerURL(results);
						}
					})
					.catch((error) => {
						main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
					});
				}
				else {
					database.execute([
						`INSERT INTO crawler_url_settings(crawler_url_id, level_limit, serial_limit, delay_ms) VALUES('${results.crawler_url_id}', '${levelLimit}', '${serialLimit}', '${delayMS}')
						ON DUPLICATE KEY UPDATE level_limit='${levelLimit}', serial_limit='${serialLimit}', delay_ms='${delayMS}'`
					], 'Insert or Update [crawler_url_settings]')
					.then(() => {
						// #TODO - Tell crawler worker to add it to its queue
					})
					.catch((error) => {
						main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
					});
				}
			})
			.catch((error) => {
				main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
			});
		},
		editCrawlerURLSettings: function(url, levelLimit, serialLimit, delayMS) {
			database.execute([
				`SELECT crawler_url_id FROM crawler_url WHERE url='${url}' LIMIT 1`
			], 'Select [crawler_url]')
			.then((results) => {
				if(results.length > 0) {
					database.execute([
						`INSERT INTO crawler_url_settings(crawler_url_id, level_limit, serial_limit, delay_ms) VALUES('${results.crawler_url_id}', '${levelLimit}', '${serialLimit}', '${delayMS}')
						ON DUPLICATE KEY UPDATE level_limit='${levelLimit}', serial_limit='${serialLimit}', delay_ms='${delayMS}'`
					], 'Insert or Update [crawler_url_settings]')
					.then(() => {
						// #TODO - Tell crawler worker to add it to its queue
					})
					.catch((error) => {
						main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
					});
				}
				else {
					main.terminateClient(this.client, 0, 'database', 'Query denied', { reason: 'The query has been executed under unexpected condition!' });
				}
			})
			.catch((error) => {
				main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
			});
		}
	};

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
			log('server', 'Started', { address: `${this.#protocol}://${this.#host}:${this.#port}` });

			database.createTables()
			.then(() => {
				// Create WebSocket server
				const wss = new WS.Server({ server }).on('connection', (ws, req) => {
					log('client', 'Connected', ws.data);

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

			log('client', 'Disconnected', ws.data);
		});
		ws.on('pong', () => {
			// Set alive state
			ws.isAlive = true;

			log('client', 'Pong', ws.data);
		});
		ws.messenger = new Messenger({
			node: ws,
			send: (msg) => { ws.send(msg); },
			fn: this.#fn,
			fnData: (msg) => { return { client: ws, msg: msg }; },
			onMessageInitCondition: () => { return (ws.readyState == WS.OPEN); },
			onMessageSuccess: (msg) => {
				this.resetKeepAliveInterval(ws);
				log('websocket', 'Message', { message: msg, client: ws.data });
			},
			onMessageError: (msg, args={}) => { this.terminateClient(ws, 0, 'websocket', msg, args); }
		});

		// Initialize client messaging
		this.#init(ws);
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

	terminateClient(ws, closeOption, type, msg, args={}) {
		this.clearKeepAliveInterval(ws);

		log(type, msg, args);
		log('client', 'Terminated', ws.data);

		switch(closeOption) {
			case 1: {
				// Terminate client (no waiting for buffered messages)
				ws.terminate();
				break;
			}
			case 2: {
				// Close client (allow reconnect)
				ws.messenger.sendFn('reconnect', []);
				ws.close();
				break;
			}
			default: {
				// Close client (disallow reconnect)
				ws.messenger.sendFn('noReconnect', []);
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
			log('server', 'Ping', ws.data);

			// Pong response latency timeout (max. 10s)
			setTimeout(() => {
				if(ws.isAlive === false) {
					this.terminateClient(ws, 1, 'server', 'Pong did not reach server within given timeout limit (10s)', ws.data);
				}
			}, 10000);
		}
	}

	// Functions (Server)
	#init(ws) {
		this.#addClient(ws);

		log('client', 'Joined', ws.data);

		ws.messenger.sendFn('init', []);
	}
}

// Worker class
class Worker {
	// Worker configuration
	config = null;
	
	// Messenger
	messenger = null;

	constructor(config, fn) {
		this.config = config;

		const workerThread = new WORKER.Worker(this.config.file);
		workerThread.on('error', (error) => {
			log(this.config.type, 'Error', { data: error });
		});
		workerThread.on('exit', (code) => {
			if(code !== 0) {
				log(this.config.type, 'Exit', { code: code });
			}
		});

		this.messenger = new Messenger({
			node: workerThread,
			send: (msg) => { workerThread.postMessage(msg); },
			fn: fn,
			fnData: (msg) => { return { msg: msg }; },
			onMessageInitCondition: () => { return true; },
			onMessageSuccess: (msg) => { log(this.config.type, 'Message', { message: msg }); },
			onMessageError: (msg, args={}) => { log(this.config.type, msg, args); }
		});
	}
}

// Crawler class
class Crawler extends Worker {
	constructor() {
		super(CONFIG.worker.crawler, {
			// Functions (Crawler -> Server)
			init: function() {
				log(crawler.config.type, 'Started', { file: crawler.config.file });
			}
		});
	}

	// Functions (Server -> Crawler)
}

// Scraper class
class Scraper extends Worker {
	constructor() {
		super(CONFIG.worker.scraper, {
			// Functions (Scraper -> Server)
			init: function() {
				log(scraper.config.type, 'Started', { file: scraper.config.file });
			}
		});
	}

	// Functions (Server -> Scraper)
}

// Start
const database = new Database();
const main = new Main();
const crawler = new Crawler();
const scraper = new Scraper();