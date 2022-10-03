'use strict';

// Crawling - finding URLs
// Scraping - extracting data
//["addURLSettings",["http://adamsarek.eu",16,256,1000]]
//["addURLSettings",["https://bitinfocharts.com/top-100-richest-bitcoin-addresses.html",0,0,1000]]
// #TODO - Crawling options - twitter, reddit

// Packages
const EXPRESS = require('express');
const FS = require('fs');
const HTTP = require('http');
const PATH = require('path');
const WORKER = require('worker_threads');
const WS = require('ws');

// Global configuration
const CONFIG = Object.freeze(require('./config.json'));

// Global classes
const { log } = require('./logger.js');
const Database = require('./database.js');
const Messenger = require('./messenger.js');

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
		addURLSettings: function(address, depthLimit, queueLimit, delay) {
			database.addURLSettings(address, depthLimit, queueLimit, delay)
			.then(() => {
				// #TODO - Tell crawler worker to add it to its queue
			})
			.catch((error) => {
				main.terminateClient(this.client, 1, 'database', 'Error', { data: error });
			});
		},
		editURLSettings: function(address, depthLimit, queueLimit, delay) {
			this.#fn.addURLSettings(address, depthLimit, queueLimit, delay);
		}
	};

	constructor() {
		// Start HTTP server
		const server = (CONFIG.server.localHTML ? EXPRESS().use((req, res) => {
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

			// Delete crawled HTML files
			if(CONFIG.database.deleteTables === true) {
				FS.rmSync(CONFIG.crawler.htmlFilePath, { recursive: true, force: true });
			}

			// Create database tables
			database.createTables()
			.then(() => {
				// Run workers
				crawler.run();
				scraper.run();

				// Create WebSocket server
				const wss = new WS.Server({ server }).on('connection', (ws, req) => {
					log('client', 'Connected', ws.data);

					// Check request origin
					const origin = new URL(req.headers.origin);
					let originAllowed = false;
					for(let i = 0; i < CONFIG.websocket.allowedOrigins.length; i++) {
						if(origin.protocol == `${CONFIG.websocket.allowedOrigins[i].protocol}:` && origin.hostname == CONFIG.websocket.allowedOrigins[i].hostname) {
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

	run() {
		this.messenger.sendFn('run', []);
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