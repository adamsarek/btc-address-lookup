'use strict';

// https://blog.bitsrc.io/server-side-caching-in-expressjs-24038daec102

// https://remarkablemark.medium.com/server-side-rendering-with-react-46715f501651
// https://www.digitalocean.com/community/tutorials/react-server-side-rendering
// https://dev.to/juhanakristian/basics-of-react-server-side-rendering-with-expressjs-phd
// https://www.digitalocean.com/community/tutorials/how-to-use-ejs-to-template-your-node-application

// https://stackabuse.com/bytes/how-to-get-a-users-ip-address-in-express-js/
// https://heynode.com/blog/2020-04/salt-and-hash-passwords-bcrypt/
// https://security.stackexchange.com/questions/17207/recommended-of-rounds-for-bcrypt
// https://www.section.io/engineering-education/session-management-in-nodejs-using-expressjs-and-express-session/
// https://stackoverflow.com/questions/29506253/best-session-storage-middleware-for-express-postgresql
// https://www.npmjs.com/package/express-pg-session

// #TODO
// Overall
//   Currencies - With data / All (with + without data)
// Sources
//   Currencies - With data / All (with + without data)
// Source labels
//   Currencies - With data / All (with + without data)

// External imports
const BCRYPT = require('bcrypt');
const BODY_PARSER = require('body-parser');
const CONNECT_PG_SIMPLE = require('connect-pg-simple');
const CRYPTO = require('crypto');
const EXPRESS = require('express');
const EXPRESS_SESSION = require('express-session');
const FS = require('fs');
const PATH = require('path');

// Internal imports
const Database = require('./database/database.js');
const DatabaseConnection = require('./database/database_connection.js');

// Functions
function rotateSecret() {
	if(!FS.existsSync('./secret.json')) {
		SECRET = {
			session: {
				[CRYPTO.randomBytes(64).toString('hex')]: Date.now()
			}
		};
		FS.writeFileSync('./secret.json', JSON.stringify(SECRET));
	}
	else {
		SECRET = require('./secret.json');
		SECRET['session'] = {[CRYPTO.randomBytes(64).toString('hex')]: Date.now(), ...SECRET['session']};
		for(const secretSession of Object.keys(SECRET['session'])) {
			if(SECRET['session'][secretSession] + config.session.secret_timeout * 2 < Date.now()) {
				delete SECRET['session'][secretSession];
			}
		}
	}

	setTimeout(() => {
		rotateSecret();
	}, Object.values(SECRET['session'])[0] + config.session.secret_timeout - Date.now());
}

function preProcessAPI(req, res, next) {
	req.data = {};

	// Get client IP
	req.data.ip = (
		req.headers['cf-connecting-ip'] ||
		req.headers['x-real-ip'] ||
		req.headers['x-forwarded-for'] ||
		req.socket.remoteAddress || ''
	).split(',')[0].trim();

	// Get account
	if(typeof req.session.account !== 'undefined') {
		req.data.account = req.session.account;
	}

	next();
}

function useOffset(req, res, next) {
	// Offset is not set
	if(!req.query.hasOwnProperty('offset') || req.query.offset.length == 0) {
		req.data.offset = 0;
	}
	else {
		req.data.offset = parseInt(req.query.offset);

		// Offset does not have a numeric value
		if(isNaN(req.data.offset)) {
			return res.status(400).json({error: 'Offset has to have a numeric value!'});
		}
		// Offset is too low
		else if(req.data.offset <= -1) {
			return res.status(400).json({error: 'Offset has to be at least 0!'});
		}
	}

	next();
}

function useLimit(req, res, next) {
	// Limit is not set
	if(!req.query.hasOwnProperty('limit') || req.query.limit.length == 0) {
		return res.status(400).json({error: 'Limit has to be set!'});
	}
	else {
		req.data.limit = parseInt(req.query.limit);

		// Limit does not have a numeric value
		if(isNaN(req.data.limit)) {
			return res.status(400).json({error: 'Limit has to have a numeric value!'});
		}
		// Limit is too low
		else if(req.data.limit <= 0) {
			return res.status(400).json({error: 'Limit has to be at least 1!'});
		}
		// Limit is too high
		else if(req.data.limit > 100) {
			return res.status(400).json({error: 'Limit has to be at most 100!'});
		}
		else {
			next();
		}
	}
}

async function loadToken(req, res, next) {
	// Token is not set
	if(!req.query.hasOwnProperty('token') || req.query.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		req.data.token = req.query.token;
		next();
	}
}

async function useToken(req, res, next) {
	req.data.token = await databaseConnection.getToken(req.data.token);

	// Token does not exist
	if(req.data.token.rows.length == 0) {
		return res.status(400).json({error: 'Token does not exist!'});
	}
	else {
		req.data.token = req.data.token.rows[0];
		const now = Date.now();
		const newResetUseCountAt = now + config.api.role[req.data.token.role_id].reset_use_count_after * 1000;
		
		if(req.data.token.reset_use_count_at != null) {
			const resetUseCountAt = Date.parse(req.data.token.reset_use_count_at);
			
			if(now < resetUseCountAt) {
				// Token use count limit reached
				if(req.data.token.use_count >= req.data.token.use_count_limit) {
					return res.status(400).json({error: 'Token use count limit reached!'});
				}
				else {
					req.data.token.use_count++;
				}
			}
			else {
				req.data.token.use_count = 1;
				req.data.token.reset_use_count_at = newResetUseCountAt;
			}
		}
		else {
			req.data.token.use_count = 1;
			req.data.token.reset_use_count_at = newResetUseCountAt;
		}
		req.data.token.last_used_at = now;

		await databaseConnection.setToken(req.data.token);

		next();
	}
}

function preProcess(req, res, next) {
	req.data = {};

	// Get title
	req.data.title = config.router.title;

	// Get client IP
	req.data.ip = (
		req.headers['cf-connecting-ip'] ||
		req.headers['x-real-ip'] ||
		req.headers['x-forwarded-for'] ||
		req.socket.remoteAddress || ''
	).split(',')[0].trim();

	// Get account
	if(typeof req.session.account !== 'undefined') {
		req.data.account = req.session.account;
	}

	// Get page
	const page = '/' + req.url.split('/')[1];
	if(typeof config.router.page[page] !== 'undefined') {
		req.data.page = { ...config.router.page[page] };
	}
	else {
		req.data.page = config.router.page['*'];
	}

	next();
}

function getForm(req, inputs) {
	const form = {
		_error: '',
		_success: {
			formValidation: true
		}
	};

	// Load form data
	for(const input of inputs) {
		form[input] = {
			data: (req.body[input] !== 'undefined' ? req.body[input] : ''),
			error: ''
		};
	}

	// Email validation
	if(typeof form.email !== 'undefined') {
		if(form.email.data.length == 0) {
			form.email.error = 'Email is empty.';
			form._success.formValidation = false;
		}
		else if(form.email.data.length > 128) {
			form.email.error = 'Email is too long.';
			form._success.formValidation = false;
		}
		else if(!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(form.email.data)) {
			form.email.error = 'Email is not valid.';
			form._success.formValidation = false;
		}
	}

	// Password validation
	if(typeof form.password !== 'undefined') {
		if(form.password.data.length == 0) {
			form.password.error = 'Password is empty.';
			form._success.formValidation = false;
		}
		else if(form.password.data.length < 8) {
			form.password.error = 'Password is too short.';
			form._success.formValidation = false;
		}
		else if(form.password.data.length > 128) {
			form.password.error = 'Password is too long.';
			form._success.formValidation = false;
		}
		else if(!/^[a-zA-Z0-9.!@#$%^&'*+/=?^_`{|}~-]*$/.test(form.password.data)) {
			form.password.error = 'Password is not valid.';
			form._success.formValidation = false;
		}
		else if(!/^(?=.*[0-9])[a-zA-Z0-9.!@#$%^&'*+/=?^_`{|}~-]*$/.test(form.password.data)) {
			form.password.error = 'Password does not contain number.';
			form._success.formValidation = false;
		}
		else if(!/^(?=.*[.!@#$%^&'*+/=?^_`{|}~-])[a-zA-Z0-9.!@#$%^&'*+/=?^_`{|}~-]*$/.test(form.password.data)) {
			form.password.error = 'Password does not contain special character.';
			form._success.formValidation = false;
		}
	}

	// Confirm password validation
	if(typeof form.confirm_password !== 'undefined') {
		if(form.confirm_password.data == '') {
			form.confirm_password.error = 'Confirm password is empty.';
			form._success.formValidation = false;
		}
		else if(form.password.data != form.confirm_password.data) {
			form.confirm_password.error = 'Passwords do not match.';
			form._success.formValidation = false;
		}
	}
	
	return form;
}

async function signIn(req, res, next) {
	req.data.form._success.overall = false;
	
	let account = await databaseConnection.getAccount(req.data.form.email.data);
	
	// Account found
	if(account.rows.length > 0) {
		if(BCRYPT.compareSync(req.data.form.password.data, account.rows[0].password)) {
			await databaseConnection.signInAccount(req.data.form.email.data, req.data.ip);

			account = await databaseConnection.getAccount(req.data.form.email.data);

			req.session.account = account.rows[0];
			req.session.save(() => {
				req.data.form._success.overall = true;
				return res.redirect('/account');
			});
		}
		else {
			req.data.form._error = 'Account does not exist.';
			next();
		}
	}
	else {
		req.data.form._error = 'Account does not exist.';
		next();
	}
}

function postProcess(req, res, next) {
	if(typeof req.data.form !== 'undefined') {
		if(typeof req.data.form.password !== 'undefined') { req.data.form.password.data = ''; }
		if(typeof req.data.form.confirm_password !== 'undefined') { req.data.form.confirm_password.data = ''; }
		if(typeof req.data.form.current_password !== 'undefined') { req.data.form.current_password.data = ''; }
	}

	next();
}

function render(req, res) {
	if(res.statusCode == 404) {
		req.data.page = config.router.page['*'];
	}

	res.render('index', req.data);
}



const config = require('./config.json');
const db = require('./db.json');
const databaseConnection = new DatabaseConnection(new Database().getConnection(db.connection));

let SECRET;
rotateSecret();

const app = EXPRESS();
app.use(BODY_PARSER.json());
app.use(BODY_PARSER.urlencoded({ extended: true }));
app.use(EXPRESS.static('public'));
app.use(EXPRESS_SESSION({
	store: new (CONNECT_PG_SIMPLE(EXPRESS_SESSION))({
		pool: databaseConnection.getConnection()
	}),
	secret: Object.keys(SECRET['session']),
	resave: false,
	saveUninitialized: false,
	cookie: { maxAge: config.session.cookie_timeout }
}));
app.set('view engine', 'ejs');



// REST API
app.get('/api/tokens/:token([a-zA-Z0-9]{1,})', preProcessAPI, (req, res, next) => {
	// Token is not set
	if(!req.params.hasOwnProperty('token') || req.params.token.length == 0) {
		return res.status(400).json({error: 'Token has to be set!'});
	}
	else {
		req.data.token = req.params.token;
		next();
	}
}, useToken, (req, res) => {
	req.data.token.last_used_at = new Date(req.data.token.last_used_at).toISOString();
	req.data.token.reset_use_count_at = new Date(req.data.token.reset_use_count_at).toISOString();
	
	return res.json(req.data.token);
});

app.get('/api/addresses', preProcessAPI, useOffset, useLimit, loadToken, useToken, async (req, res) => {
	const addresses = await databaseConnection.getAddresses(req.data.token.role_id, req.data.limit, req.data.offset);

	// No address found
	if(addresses.rows.length == 0) {
		return res.status(404).json({error: 'No address has been found!'});
	}
	else {
		return res.json(addresses.rows);
	}
});

app.get('/api/addresses/:address([a-zA-Z0-9]{1,})', preProcessAPI, (req, res, next) => {
	// Address is not set
	if(!req.params.hasOwnProperty('address') || req.params.address.length == 0) {
		return res.status(400).json({error: 'Address has to be set!'});
	}
	else {
		req.data.address = req.params.address;
		next();
	}
}, loadToken, useToken, async (req, res) => {
	const address = await databaseConnection.getAddress(req.data.token.role_id, req.data.address);

	// Address not found
	if(address.rows.length == 0) {
		return res.status(404).json({error: 'Address has not been found!'});
	}
	else {
		return res.json(address.rows[0]);
	}
});

app.get('/api/data/:data_id([0-9]{1,})', preProcessAPI, (req, res, next) => {
	// Data ID is not set
	if(!req.params.hasOwnProperty('data_id') || req.params.data_id.length == 0) {
		return res.status(400).json({error: 'Data ID has to be set!'});
	}
	else {
		req.data.dataId = req.params.data_id;
		next();
	}
}, loadToken, useToken, async (req, res) => {
	let data = await databaseConnection.getData(req.data.token.role_id, req.data.dataId);

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

app.get('/api/sources/:source_id([0-9]{1,})', preProcessAPI, async (req, res) => {
	// Source ID is not set
	if(!req.params.hasOwnProperty('source_id') || req.params.source_id.length == 0) {
		return res.status(400).json({error: 'Source ID has to be set!'});
	}
	else {
		req.data.sourceId = req.params.source_id;
	}

	const source = await databaseConnection.getSource(req.data.sourceId);

	// Source not found
	if(source.rows.length == 0) {
		return res.status(404).json({error: 'Source has not been found!'});
	}
	else {
		return res.json(source.rows[0]);
	}
});

app.get('/api/source_labels/:source_label_id([0-9]{1,})', preProcessAPI, (req, res, next) => {
	// Address offset is not set
	if(!req.query.hasOwnProperty('address_offset') || req.query.address_offset.length == 0) {
		req.data.addressOffset = 0;
	}
	else {
		req.data.addressOffset = parseInt(req.query.address_offset);

		// Address offset does not have a numeric value
		if(isNaN(req.data.addressOffset)) {
			return res.status(400).json({error: 'Address offset has to have a numeric value!'});
		}
		// Address offset is too low
		else if(req.data.addressOffset <= -1) {
			return res.status(400).json({error: 'Address offset has to be at least 0!'});
		}
	}

	// Address limit is not set
	if(!req.query.hasOwnProperty('address_limit') || req.query.address_limit.length == 0) {
		return res.status(400).json({error: 'Address limit has to be set!'});
	}
	else {
		req.data.addressLimit = parseInt(req.query.address_limit);

		// Address limit does not have a numeric value
		if(isNaN(req.data.addressLimit)) {
			return res.status(400).json({error: 'Address limit has to have a numeric value!'});
		}
		// Address limit is too low
		else if(req.data.addressLimit <= 0) {
			return res.status(400).json({error: 'Address limit has to be at least 1!'});
		}
		// Address limit is too high
		else if(req.data.addressLimit > 100) {
			return res.status(400).json({error: 'Address limit has to be at most 100!'});
		}
	}

	// Source label ID is not set
	if(!req.params.hasOwnProperty('source_label_id') || req.params.source_label_id.length == 0) {
		return res.status(400).json({error: 'Source label ID has to be set!'});
	}
	else {
		req.data.sourceLabelId = req.params.source_label_id;
	}

	next();
}, loadToken, useToken, async (req, res) => {
	const sourceLabel = await databaseConnection.getSourceLabel(req.data.token.role_id, req.data.sourceLabelId, req.data.addressLimit, req.data.addressOffset);

	// Source label not found
	if(sourceLabel.rows.length == 0) {
		return res.status(404).json({error: 'Source label has not been found!'});
	}
	else {
		return res.json(sourceLabel.rows[0]);
	}
});

app.get('/api/*', (req, res) => {
	return res.status(404).json({error: 'Page not found'});
});



// Web pages
app.get('/', preProcess, render);

app.get('/sign-up', preProcess, render);

app.post('/sign-up', preProcess, async (req, res, next) => {
	req.data.form = getForm(req, ['email', 'password', 'confirm_password']);

	// Form successfully validated
	if(req.data.form._success.formValidation) {
		try {
			req.data.form._success.dataValidation = true;
			
			// Email exists
			if((await databaseConnection.hasEmail(req.data.form.email.data)).rows.length > 0) {
				req.data.form.email.error = 'Email already exists.';
				req.data.form._success.dataValidation = false;
				next();
			}

			// Data successfully validated
			if(req.data.form._success.dataValidation) {
				await databaseConnection.addAccount(req.data.form.email.data, req.data.form.password.data, req.data.ip);

				signIn(req, res, next);
			}
		}
		catch(error) {
			req.data.form._error = 'Account could not be created. Try again later.';
			next();
		}
	}
}, postProcess, render);

app.get('/sign-in', preProcess, render);

app.post('/sign-in', preProcess, (req, res, next) => {
	req.data.form = getForm(req, ['email', 'password']);

	// Form successfully validated
	if(req.data.form._success.formValidation) {
		try {
			signIn(req, res, next);
		}
		catch(error) {
			req.data.form._error = 'Could not sign into the account. Try again later.';
			next();
		}
	}
}, postProcess, render);

app.get('/sign-out', (req, res) => {
	delete req.session.account;
	req.session.destroy(() => {
		return res.redirect('/');
	});
});

app.get('/forgotten-password', preProcess, render);

app.get('/reset-password', preProcess, render);

app.get('/change-password', preProcess, render);

app.get('/account', preProcess, (req, res, next) => {
	if(typeof req.data.account === 'undefined') {
		return res.redirect('/sign-in');
	}
	else {
		next();
	}
}, render);

app.get('/addresses', preProcess, async (req, res, next) => {
	// Page is not set
	if(!req.query.hasOwnProperty('page') || req.query.page.length == 0) {
		req.data.pageId = 1;
	}
	else {
		req.data.pageId = parseInt(req.query.page);

		// Page does not have a numeric value or is too low
		if(isNaN(req.data.pageId) || req.data.pageId <= 0) {
			res.status(404);
			return render(req, res);
		}
	}

	req.data.limit = config.router.address_limit;
	req.data.offset = (req.data.pageId - 1) * req.data.limit;

	// Currency code is not set
	if(!req.query.hasOwnProperty('currency_code') || req.query.currency_code.length == 0) {
		req.data.currencyId = null;
	}
	else if(req.query.currency_code == '_pending') {
		req.data.currencyId = 0;
	}
	else if(req.query.currency_code == '_unknown') {
		req.data.currencyId = 2;
	}
	else {
		const currency = (await databaseConnection.getCurrency(req.query.currency_code)).rows;

		// Currency found
		if(currency.length > 0) {
			req.data.currencyId = currency[0].currency_id;
		}
		else {
			res.status(404);
			return render(req, res);
		}
	}

	// Having data is not set or is not true
	if(!req.query.hasOwnProperty('having_data') || req.query.having_data.length == 0 || req.query.having_data != '1') {
		req.data.havingData = false;
	}
	else {
		req.data.havingData = true;
	}

	// Source ID is not set
	if(!req.query.hasOwnProperty('source_id') || req.query.source_id.length == 0) {
		req.data.sourceId = null;
	}
	else {
		req.data.sourceId = req.query.source_id;
	}

	// Source label ID is not set
	if(!req.query.hasOwnProperty('source_label_id') || req.query.source_label_id.length == 0) {
		req.data.sourceLabelId = null;
	}
	else {
		req.data.sourceLabelId = req.query.source_label_id;
	}

	const roleId = typeof req.data.account !== 'undefined' ? req.data.account.role_id : 1;
	
	req.data.addresses = (await databaseConnection.getAddresses(roleId, req.data.limit, req.data.offset, req.data.currencyId, req.data.havingData, req.data.sourceId, req.data.sourceLabelId)).rows;
	
	// No address found
	if(req.data.addresses.length == 0) {
		res.status(404);
		return render(req, res);
	}
	else {
		req.data.addressesCount = (await databaseConnection.getAddressesCount(roleId, req.data.currencyId, req.data.havingData, req.data.sourceId, req.data.sourceLabelId)).rows[0].count;
		req.data.pageCount = Math.ceil(req.data.addressesCount / req.data.limit);
		
		req.data.page.title += ` (${new Intl.NumberFormat().format(req.data.pageId)} / ${new Intl.NumberFormat().format(req.data.pageCount)})`;
		next();
	}
}, render);

app.get('*', preProcess, (req, res) => {
	res.status(404);
	return render(req, res);
});



app.listen(config.connection.port, () => {
	console.log(`Client server started listening on port ${config.connection.port}!`);

	// getAddresses(roleId, limit, offset, currencyId=null, havingData=false, sourceId=null, sourceLabelId=null)
	/*let addresses_a, addresses_b, addresses_c;
	addresses_a = await databaseConnection.getAddresses(3, 5, 10, null, true, null, 4);
	console.log(addresses_a.rows);
	addresses_b = await databaseConnection.getAddresses(3, 5, 10, null, true, 4, 4);
	console.log(addresses_b.rows);
	addresses_c = await databaseConnection.getAddresses(3, 5, 10, null, true, 4, null);
	console.log(addresses_c.rows);

	console.log(JSON.stringify(addresses_a.rows) == JSON.stringify(addresses_b.rows));
	console.log(JSON.stringify(addresses_b.rows) == JSON.stringify(addresses_c.rows));

	addresses_a = await databaseConnection.getAddressesCount(3, null, true, null, 4);
	console.log(addresses_a.rows);
	addresses_b = await databaseConnection.getAddressesCount(3, null, true, 4, 4);
	console.log(addresses_b.rows);
	addresses_c = await databaseConnection.getAddressesCount(3, null, true, 4, null);
	console.log(addresses_c.rows);*/
});