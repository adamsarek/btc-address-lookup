'use strict';

// https://blog.bitsrc.io/server-side-caching-in-expressjs-24038daec102

// https://remarkablemark.medium.com/server-side-rendering-with-react-46715f501651
// https://www.digitalocean.com/community/tutorials/react-server-side-rendering
// https://dev.to/juhanakristian/basics-of-react-server-side-rendering-with-expressjs-phd
// https://www.digitalocean.com/community/tutorials/how-to-use-ejs-to-template-your-node-application

// External imports
const EXPRESS = require('express');
const FS = require('fs');
const PATH = require('path');

// Internal imports
const Database = require('./database/database.js');
const DatabaseConnection = require('./database/database_connection.js');

const config = require('./config.json');
const db = require('./db.json');
const { render } = require('ejs');
const databaseConnection = new DatabaseConnection(new Database().getConnection(db.connection));

const app = EXPRESS();

app.get('/api/tokens/:token([a-zA-Z0-9]{1,})', async (req, res) => {
	let token;
	
	// Token is not set
	if(!req.params.hasOwnProperty('token') || req.params.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		token = req.params.token;
	}

	token = await databaseConnection.getToken(token);

	// Token does not exist
	if(token.rows.length == 0) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	else {
		token = token.rows[0];
		const now = Date.now();
		const newResetUseCountAt = now + config.api.role[token.role_id].reset_use_count_after * 1000;
		
		if(token.reset_use_count_at != null) {
			const resetUseCountAt = Date.parse(token.reset_use_count_at);
			
			if(now < resetUseCountAt) {
				// Token use count limit reached
				if(token.use_count >= token.use_count_limit) {
					return res.status(400).json({error: 'Token use count limit reached!'});
				}
				else {
					token.use_count++;
				}
			}
			else {
				token.use_count = 1;
				token.reset_use_count_at = newResetUseCountAt;
			}
		}
		else {
			token.use_count = 1;
			token.reset_use_count_at = newResetUseCountAt;
		}
		token.last_used_at = now;

		await databaseConnection.setToken(token);

		token.last_used_at = new Date(token.last_used_at).toISOString();
		token.reset_use_count_at = new Date(token.reset_use_count_at).toISOString();

		return res.json(token);
	}
});

app.get('/api/addresses', async (req, res) => {
	let offset;
	
	// Offset is not set
	if(!req.query.hasOwnProperty('offset') || req.query.offset.length == 0) {
		offset = 0;
	}
	else {
		offset = parseInt(req.query.offset);

		// Offset does not have a numeric value
		if(isNaN(offset)) {
			return res.status(400).json({error: 'Offset has to have a numeric value!'});
		}
		// Offset is too low
		else if(offset <= -1) {
			return res.status(400).json({error: 'Offset has to be at least 0!'});
		}
	}

	let limit;
	
	// Limit is not set
	if(!req.query.hasOwnProperty('limit') || req.query.limit.length == 0) {
		return res.status(400).json({error: 'Limit has to be set!'});
	}
	else {
		limit = parseInt(req.query.limit);

		// Limit does not have a numeric value
		if(isNaN(limit)) {
			return res.status(400).json({error: 'Limit has to have a numeric value!'});
		}
		// Limit is too low
		else if(limit <= 0) {
			return res.status(400).json({error: 'Limit has to be at least 1!'});
		}
		// Limit is too high
		else if(limit > 100) {
			return res.status(400).json({error: 'Limit has to be at most 100!'});
		}
	}

	let token;
	
	// Token is not set
	if(!req.query.hasOwnProperty('token') || req.query.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		token = req.query.token;
	}

	token = await databaseConnection.getToken(token);

	// Token does not exist
	if(token.rows.length == 0) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	else {
		token = token.rows[0];
		const now = Date.now();
		const newResetUseCountAt = now + config.api.role[token.role_id].reset_use_count_after * 1000;
		
		if(token.reset_use_count_at != null) {
			const resetUseCountAt = Date.parse(token.reset_use_count_at);
			
			if(now < resetUseCountAt) {
				// Token use count limit reached
				if(token.use_count >= token.use_count_limit) {
					return res.status(400).json({error: 'Token use count limit reached!'});
				}
				else {
					token.use_count++;
				}
			}
			else {
				token.use_count = 1;
				token.reset_use_count_at = newResetUseCountAt;
			}
		}
		else {
			token.use_count = 1;
			token.reset_use_count_at = newResetUseCountAt;
		}
		token.last_used_at = now;

		await databaseConnection.setToken(token);
	}
	
	const addresses = await databaseConnection.getAddresses(token.role_id, limit, offset);

	// No address found
	if(addresses.rows.length == 0) {
		return res.status(404).json({error: 'No address has been found!'});
	}
	else {
		return res.json(addresses.rows);
	}
});

app.get('/api/addresses/:address([a-zA-Z0-9]{1,})', async (req, res) => {
	let address;
	
	// Address is not set
	if(!req.params.hasOwnProperty('address') || req.params.address.length == 0) {
		return res.status(400).json({error: 'Address has to be set!'});
	}
	else {
		address = req.params.address;
	}

	let token;
	
	// Token is not set
	if(!req.query.hasOwnProperty('token') || req.query.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		token = req.query.token;
	}

	token = await databaseConnection.getToken(token);

	// Token does not exist
	if(token.rows.length == 0) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	else {
		token = token.rows[0];
		const now = Date.now();
		const newResetUseCountAt = now + config.api.role[token.role_id].reset_use_count_after * 1000;
		
		if(token.reset_use_count_at != null) {
			const resetUseCountAt = Date.parse(token.reset_use_count_at);
			
			if(now < resetUseCountAt) {
				// Token use count limit reached
				if(token.use_count >= token.use_count_limit) {
					return res.status(400).json({error: 'Token use count limit reached!'});
				}
				else {
					token.use_count++;
				}
			}
			else {
				token.use_count = 1;
				token.reset_use_count_at = newResetUseCountAt;
			}
		}
		else {
			token.use_count = 1;
			token.reset_use_count_at = newResetUseCountAt;
		}
		token.last_used_at = now;

		await databaseConnection.setToken(token);
	}
	
	address = await databaseConnection.getAddress(token.role_id, address);

	// Address not found
	if(address.rows.length == 0) {
		return res.status(404).json({error: 'Address has not been found!'});
	}
	else {
		return res.json(address.rows[0]);
	}
});

app.get('/api/data/:data_id([0-9]{1,})', async (req, res) => {
	let dataId;
	
	// Data ID is not set
	if(!req.params.hasOwnProperty('data_id') || req.params.data_id.length == 0) {
		return res.status(400).json({error: 'Data ID has to be set!'});
	}
	else {
		dataId = req.params.data_id;
	}

	let token;
	
	// Token is not set
	if(!req.query.hasOwnProperty('token') || req.query.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		token = req.query.token;
	}

	token = await databaseConnection.getToken(token);

	// Token does not exist
	if(token.rows.length == 0) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	else {
		token = token.rows[0];
		const now = Date.now();
		const newResetUseCountAt = now + config.api.role[token.role_id].reset_use_count_after * 1000;
		
		if(token.reset_use_count_at != null) {
			const resetUseCountAt = Date.parse(token.reset_use_count_at);
			
			if(now < resetUseCountAt) {
				// Token use count limit reached
				if(token.use_count >= token.use_count_limit) {
					return res.status(400).json({error: 'Token use count limit reached!'});
				}
				else {
					token.use_count++;
				}
			}
			else {
				token.use_count = 1;
				token.reset_use_count_at = newResetUseCountAt;
			}
		}
		else {
			token.use_count = 1;
			token.reset_use_count_at = newResetUseCountAt;
		}
		token.last_used_at = now;

		await databaseConnection.setToken(token);
	}
	
	let data = await databaseConnection.getData(token.role_id, dataId);

	// Data not found
	if(data.rows.length == 0) {
		return res.status(404).json({error: 'Data has not been found!'});
	}
	else {
		data = data.rows[0];
		const path = PATH.join(config.crawler.data_path, data.path);
		
		if(!FS.existsSync(path)) {
			return res.status(404).json({error: 'Data file is missing!'});
		}
		else {
			data.content = FS.readFileSync(path, { encoding: 'utf-8' });
			return res.json(data);
		}
	}
});

app.get('/api/sources', async (req, res) => {
	const sources = await databaseConnection.getSources();

	// No source found
	if(sources.rows.length == 0) {
		return res.status(404).json({error: 'No source has been found!'});
	}
	else {
		return res.json(sources.rows);
	}
});

app.get('/api/sources/:source_id([0-9]{1,})', async (req, res) => {
	let sourceId;
	
	// Source ID is not set
	if(!req.params.hasOwnProperty('source_id') || req.params.source_id.length == 0) {
		return res.status(400).json({error: 'Source ID has to be set!'});
	}
	else {
		sourceId = req.params.source_id;
	}

	const source = await databaseConnection.getSource(sourceId);

	// Source not found
	if(source.rows.length == 0) {
		return res.status(404).json({error: 'Source has not been found!'});
	}
	else {
		return res.json(source.rows[0]);
	}
});

app.get('/api/source_labels/:source_label_id([0-9]{1,})', async (req, res) => {
	let addressOffset;
	
	// Address offset is not set
	if(!req.query.hasOwnProperty('address_offset') || req.query.address_offset.length == 0) {
		addressOffset = 0;
	}
	else {
		addressOffset = parseInt(req.query.address_offset);

		// Address offset does not have a numeric value
		if(isNaN(addressOffset)) {
			return res.status(400).json({error: 'Address offset has to have a numeric value!'});
		}
		// Address offset is too low
		else if(addressOffset <= -1) {
			return res.status(400).json({error: 'Address offset has to be at least 0!'});
		}
	}

	let addressLimit;
	
	// Address limit is not set
	if(!req.query.hasOwnProperty('address_limit') || req.query.address_limit.length == 0) {
		return res.status(400).json({error: 'Address limit has to be set!'});
	}
	else {
		addressLimit = parseInt(req.query.address_limit);

		// Address limit does not have a numeric value
		if(isNaN(addressLimit)) {
			return res.status(400).json({error: 'Address limit has to have a numeric value!'});
		}
		// Address limit is too low
		else if(addressLimit <= 0) {
			return res.status(400).json({error: 'Address limit has to be at least 1!'});
		}
		// Address limit is too high
		else if(addressLimit > 100) {
			return res.status(400).json({error: 'Address limit has to be at most 100!'});
		}
	}

	let sourceLabelId;
	
	// Source label ID is not set
	if(!req.params.hasOwnProperty('source_label_id') || req.params.source_label_id.length == 0) {
		return res.status(400).json({error: 'Source label ID has to be set!'});
	}
	else {
		sourceLabelId = req.params.source_label_id;
	}

	let token;
	
	// Token is not set
	if(!req.query.hasOwnProperty('token') || req.query.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		token = req.query.token;
	}

	token = await databaseConnection.getToken(token);

	// Token does not exist
	if(token.rows.length == 0) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	else {
		token = token.rows[0];
		const now = Date.now();
		const newResetUseCountAt = now + config.api.role[token.role_id].reset_use_count_after * 1000;
		
		if(token.reset_use_count_at != null) {
			const resetUseCountAt = Date.parse(token.reset_use_count_at);
			
			if(now < resetUseCountAt) {
				// Token use count limit reached
				if(token.use_count >= token.use_count_limit) {
					return res.status(400).json({error: 'Token use count limit reached!'});
				}
				else {
					token.use_count++;
				}
			}
			else {
				token.use_count = 1;
				token.reset_use_count_at = newResetUseCountAt;
			}
		}
		else {
			token.use_count = 1;
			token.reset_use_count_at = newResetUseCountAt;
		}
		token.last_used_at = now;

		await databaseConnection.setToken(token);
	}

	const sourceLabel = await databaseConnection.getSourceLabel(token.role_id, sourceLabelId, addressLimit, addressOffset);

	// Source label not found
	if(sourceLabel.rows.length == 0) {
		return res.status(404).json({error: 'Source label has not been found!'});
	}
	else {
		return res.json(sourceLabel.rows[0]);
	}
});

function renderPage(res, page, data) {
	// Set data
	data.title = 'BTC Address Lookup';
	
	// Render page
	res.render(`pages/${page}`, data);
}

app.use(EXPRESS.static('public'));

app.set('view engine', 'ejs');

app.get('', async (req, res) => {
	renderPage(res, 'index', {
		/*search: {
			q: "x"
		}*/
		/*page: {
			title: 'Index'
		}*/
	});
});

app.listen(config.connection.port, () => {
	console.log(`Client server started listening on port ${config.connection.port}!`);
});