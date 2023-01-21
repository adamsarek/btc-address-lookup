'use strict';

// External imports
const express = require('express');

// Internal imports
const Database = require('./database/database.js');
const DatabaseConnection = require('./database/database_connection.js');

const config = require('./config.json');
const db = require('./db.json');
const databaseConnection = new DatabaseConnection(new Database().getConnection(db.connection));

const app = express();

app.get('/api/addresses', async (req, res) => {
	let token;
	
	// Token is not set
	if(!req.query.hasOwnProperty('token') || req.query.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		token = req.query.token;
	}

	const role = databaseConnection.getRoleFromToken(token);

	// Token does not exist
	if(role == null) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	
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

	const addresses = await databaseConnection.selectAddresses(role, limit, offset);

	return res.json(addresses.rows);
});

/*app.get("/api/addresses/:addressId([0-9]{1,})", (req, res) => {
	return res.send(`#1 GET addresses, addressId: ${req.params.addressId}, token: ${req.query.token}`);
});*/

/*app.get("/api/addresses/:address([a-zA-Z0-9]{1,})", (req, res) => {
	return res.send(`#2 GET addresses, address: ${req.params.address}, token: ${req.query.token}`);
});

app.get("/api/sources", (req, res) => {
	return res.json([
		{
			"source_id": 1,
			"name": "ABC",
			"source_labels": [
				{
					"source_label_id": 1,
					"name": "Reported ETH",
					"source_label_urls": [
						{
							"source_label_url_id": 1,
							"url": "https://adamsarek.eu"
						}
					]
				}
			]
		}
	]);

	if(req.query.source) {
		return res.send(`#3 GET reports, source: ${req.query.source}, token: ${req.query.token}`);
	}
	else if(req.query.source_label) {
		return res.send(`#3 GET reports, source_label: ${req.query.source_label}, token: ${req.query.token}`);
	}
	else if(req.query.source_label_url) {
		return res.send(`#3 GET reports, source_label_url: ${req.query.source_label_url}, token: ${req.query.token}`);
	}
});

app.get("/api/reports", (req, res) => {
	if(req.query.source) {
		return res.send(`#3 GET reports, source: ${req.query.source}, token: ${req.query.token}`);
	}
	else if(req.query.source_label) {
		return res.send(`#3 GET reports, source_label: ${req.query.source_label}, token: ${req.query.token}`);
	}
	else if(req.query.source_label_url) {
		return res.send(`#3 GET reports, source_label_url: ${req.query.source_label_url}, token: ${req.query.token}`);
	}
});*/

app.listen(config.connection.port, () => {
	console.log(`Example app listening on port ${config.connection.port}!`);
});