'use strict';

// External imports
const express = require('express');

// Internal imports
const Database = require("./database/database.js");
const DatabaseConnection = require("./database/database_connection.js");

const database = new Database();
const db = require('./db.json');
//console.log(db.connection);
const c = database.getConnection(db.connection);
const databaseConnection = new DatabaseConnection(c);
databaseConnection.select("table", ["columns"]);
c.query("SELECT * FROM source").then((t) => {
	console.log(t.rows);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/addresses", (req, res) => {
	return res.send(`#0 GET addresses, limit: ${req.query.limit}, offset: ${req.query.offset}, token: ${req.query.token}`);
});

/*app.get("/api/addresses/:addressId([0-9]{1,})", (req, res) => {
	return res.send(`#1 GET addresses, addressId: ${req.params.addressId}, token: ${req.query.token}`);
});*/

app.get("/api/addresses/:address([a-zA-Z0-9]{1,})", (req, res) => {
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
});

app.listen(PORT, () => {
	console.log(`Example app listening on port ${PORT}!`);
});