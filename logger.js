'use strict';

// Logger functions
function log(type, msg, args={}) {
	console.log(`${(new Date()).toISOString()}: [${type.toUpperCase()}] ${msg}${(args && Object.keys(args).length === 0 && args.constructor === Object ? '' : ` ${JSON.stringify(args)}`)}`);
}

// Exports
module.exports = { log };