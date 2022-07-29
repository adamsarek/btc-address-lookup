'use strict';

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

// Exports
module.exports = Messenger;