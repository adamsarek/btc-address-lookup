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

function usePage(req, res, next) {
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

	req.data.limit = config.router.page_limit;
	req.data.offset = (req.data.pageId - 1) * req.data.limit;

	next();
}

async function useCurrency(req, res, next) {
	// Currency code is not set
	if(!req.query.hasOwnProperty('currency') || req.query.currency.length == 0) {
		req.data.currencyId = null;
		req.data.currencyCode = null;
	}
	else {
		const currency = (await databaseConnection.getCurrency(req.query.currency)).rows;

		// Currency found
		if(currency.length > 0) {
			req.data.currencyId = currency[0].currency_id;
			req.data.currencyCode = currency[0].currency_code;
		}
		else {
			res.status(404);
			return render(req, res);
		}
	}

	next();
}

async function loadSource(req, res, next) {
	req.data.sources = [
		{ name: 'All (with data)', sourceId: null, sourceLabelId: null }
	];
	
	const sources = (await databaseConnection.getSources()).rows;

	const promises = [];

	for(const source of sources) {
		if(source.source_label_ids.length > 1) {
			req.data.sources.push({
				name: source.source_name,
				sourceId: source.source_id,
				sourceLabelId: null
			});
		}
		for(const sourceLabelId of source.source_label_ids) {
			const data = {
				name: source.source_name + ' / ',
				sourceId: source.source_id,
				sourceLabelId: null
			};
			req.data.sources.push(data);
			promises.push(databaseConnection.getSourceLabel(sourceLabelId).then((result) => {
				for(let i = 0; i < req.data.sources.length; i++) {
					if(req.data.sources[i] == data) {
						req.data.sources[i].name += result.rows[0].source_label_name;
						req.data.sources[i].sourceLabelId = result.rows[0].source_label_id;
						break;
					}
				}
			}));
		}
	}

	Promise.all(promises).then(() => {
		next();
	});
}

function useSource(req, res, next) {
	// Source is not set
	if(!req.query.hasOwnProperty('source') || req.query.source.length == 0) {
		req.data.source = '';
		req.data.withData = false;
		req.data.sourceId = null;
		req.data.sourceLabelId = null;
	}
	else {
		const source = parseInt(req.query.source);

		// Source does not have a numeric value or is too low or is too high
		if(isNaN(source) || source < 0 || source >= req.data.sources.length) {
			res.status(404);
			return render(req, res);
		}
		else {
			req.data.source = req.query.source;
			req.data.withData = true;
			req.data.sourceId = req.data.sources[source].sourceId;
			req.data.sourceLabelId = req.data.sources[source].sourceLabelId;
		}
	}

	next();
}

function loadToken(req, res, next) {
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
				if(req.data.token.use_count >= config.api.role[req.data.token.role_id].use_count_limit) {
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

		await databaseConnection.setToken(req.data.token, req.data.ip);

		next();
	}
}

function preProcess(req, res, next) {
	req.data = {};

	// Get timestamp
	req.data.startedAt = Date.now();

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
	const page = '/' + req.url.split('/')[1].split('?')[0];
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

	// Role validation
	if(typeof form.role !== 'undefined') {
		if(form.role.data.length == 0) {
			form.role.error = 'Role is empty.';
			form._success.formValidation = false;
		}
		else {
			form.role.data = parseInt(form.role.data);

			// Role does not have a numeric value or is too low
			if(isNaN(form.role.data) || form.role.data <= 0) {
				form.role.error = 'Role is too low.';
				form._success.formValidation = false;
			}
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
			// Account does not have token
			if(account.rows[0].token == null) {
				while(true) {
					try {
						const token = CRYPTO.randomBytes(64).toString('hex');
						await databaseConnection.addToken(account.rows[0].account_id, token, req.data.ip);
						break;
					}
					catch(error) {}
				}
			}

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

async function editAccountRole(req, res, next) {
	req.data.form._success.overall = false;
	
	let account = await databaseConnection.getAccount(req.data.form.email.data);
	
	// Account found
	if(account.rows.length > 0) {
		// Account is admin
		if(account.rows[0].role_id == 4) {
			const adminCount = (await databaseConnection.getAccountsCount('', 4)).rows[0].count;

			// Edit role of last admin
			if(adminCount <= 1) {
				req.data.form._error = 'Your role could not be changed because there has to be at least 1 admin.';
				return res.redirect('/accounts');
			}
		}
		
		await databaseConnection.editAccountRole(req.data.form.email.data, req.data.form.role.data);

		account = await databaseConnection.getAccount(req.data.account.email);

		req.session.account = account.rows[0];
		req.session.save(() => {
			if(req.data.account.role_id == req.session.account.role_id) {
				req.data.form._success.overall = true;
				return res.redirect('/accounts');
			}
			else {
				return res.redirect('/account');
			}
		});
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
const databaseConnection = new DatabaseConnection(new Database().getConnection(db.connection), config);

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
app.get('/api/tokens/:token([a-zA-Z0-9]{0,})', preProcessAPI, (req, res, next) => {
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
	delete req.data.token.role_id;
	delete req.data.token.role_name;
	
	return res.json(req.data.token);
});

app.get('/api/currencies', preProcessAPI, loadToken, useToken, async (req, res) => {
	const currencies = await databaseConnection.getCurrencies();

	for(let i = 0; i < currencies.rows.length; i++) {
		delete currencies.rows[i].currency_id;
		delete currencies.rows[i].logo;
	}

	return res.json(currencies.rows);
});

app.get('/api/sources', preProcessAPI, loadToken, useToken, loadSource, (req, res) => {
	for(let i = 0; i < req.data.sources.length; i++) {
		req.data.sources[i].source_id = i;
		req.data.sources[i].source_name = req.data.sources[i].name;
		delete req.data.sources[i].name;
		delete req.data.sources[i].sourceId;
		delete req.data.sources[i].sourceLabelId;
	}

	return res.json(req.data.sources);
});

app.get('/api/addresses', preProcessAPI, usePage, loadSource, useSource, useCurrency, loadToken, useToken, async (req, res) => {
	const addresses = (await databaseConnection.getAddresses(req.data.token.role_id, req.data.limit, req.data.offset, req.data.withData, req.data.sourceId, req.data.sourceLabelId, req.data.currencyId)).rows;

	for(let i = 0; i < addresses.length; i++) {
		addresses[i].currency.pop();
	}
	
	return res.json(addresses);
});

app.get('/api/addresses/:address([a-zA-Z0-9]{0,})', preProcessAPI, (req, res, next) => {
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
		address.rows[0].currency.pop();

		return res.json(address.rows[0]);
	}
});

app.get('/api/data/:data([0-9]{0,})', preProcessAPI, (req, res, next) => {
	// Data is not set
	if(!req.params.hasOwnProperty('data') || req.params.data.length == 0) {
		return res.status(400).json({error: 'Data has to be set!'});
	}
	else {
		req.data.data = parseInt(req.params.data);

		// Data does not have a numeric value or is too low
		if(isNaN(req.data.data) || req.data.data <= 0) {
			return res.status(400).json({error: 'Data is too low!'});
		}
		
		next();
	}
}, loadToken, useToken, async (req, res) => {
	let data = await databaseConnection.getData(req.data.token.role_id, req.data.data);

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
			delete data.source_id;
			delete data.source_name;
			delete data.source_label_id;
			delete data.source_label_name;
			delete data.path;
			return res.json(data);
		}
	}
});

app.get('/api/*', (req, res) => {
	return res.status(404).json({error: 'Page not found'});
});



// Web pages
app.get('/', preProcess, render);

app.get('/search', (req, res) => {
	// Q is not set
	if(!req.query.hasOwnProperty('q') || req.query.q.trim().length == 0) {
		return res.redirect('/');
	}
	else {
		return res.redirect('/address/' + req.query.q.trim());
	}
});

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

app.get('/accounts', preProcess, (req, res, next) => {
	if(typeof req.data.account === 'undefined' || req.data.account.role_id < 4) {
		return res.redirect('/sign-in');
	}
	else {
		next();
	}
}, usePage, async (req, res, next) => {
	// Email is not set
	if(!req.query.hasOwnProperty('email') || req.query.email.length == 0) {
		req.data.email = '';
	}
	else {
		req.data.email = req.query.email;
	}
	
	// Role is not set
	if(!req.query.hasOwnProperty('role') || req.query.role.length == 0) {
		req.data.role = null;
	}
	else {
		req.data.role = parseInt(req.query.role);

		// Role does not have a numeric value or is too low
		if(isNaN(req.data.role) || req.data.role <= 0) {
			res.status(404);
			return render(req, res);
		}
	}

	req.data.accountsCount = (await databaseConnection.getAccountsCount(req.data.email, req.data.role)).rows[0].count;
	req.data.pageCount = Math.ceil(req.data.accountsCount / req.data.limit);
	req.data.pageCount = req.data.pageCount > 0 ? req.data.pageCount : 1;

	// Page is too high
	if(req.data.pageId > req.data.pageCount) {
		res.status(404);
		return render(req, res);
	}

	req.data.accounts = (await databaseConnection.getAccounts(req.data.limit, req.data.offset, req.data.email, req.data.role)).rows;
	req.data.roles = (await databaseConnection.getRoles()).rows;
	
	next();
}, render);

app.post('/accounts', preProcess, async (req, res, next) => {
	if(typeof req.data.account === 'undefined' || req.data.account.role_id < 4) {
		return res.redirect('/sign-in');
	}
	else {
		req.data.form = getForm(req, ['email', 'role']);

		// Form successfully validated
		if(req.data.form._success.formValidation) {
			try {
				req.data.form._success.dataValidation = true;
			
				// Role does not exist
				if((await databaseConnection.hasRole(req.data.form.role.data)).rows.length <= 0) {
					req.data.form.role.error = 'Role does not exist.';
					req.data.form._success.dataValidation = false;
					next();
				}

				// Data successfully validated
				if(req.data.form._success.dataValidation) {
					editAccountRole(req, res, next);
				}
			}
			catch(error) {
				req.data.form._error = 'Could not edit the account role. Try again later.';
				next();
			}
		}
	}
}, render);

app.get('/addresses', preProcess, usePage, loadSource, useSource, useCurrency, async (req, res, next) => {
	const roleId = typeof req.data.account !== 'undefined' ? req.data.account.role_id : 1;

	req.data.addressesCount = (await databaseConnection.getAddressesCount(roleId, req.data.withData, req.data.sourceId, req.data.sourceLabelId, req.data.currencyId)).rows[0].count;
	req.data.pageCount = Math.ceil(req.data.addressesCount / req.data.limit);
	req.data.pageCount = req.data.pageCount > 0 ? req.data.pageCount : 1;

	// Page is too high
	if(req.data.pageId > req.data.pageCount) {
		res.status(404);
		return render(req, res);
	}

	req.data.addresses = (await databaseConnection.getAddresses(roleId, req.data.limit, req.data.offset, req.data.withData, req.data.sourceId, req.data.sourceLabelId, req.data.currencyId)).rows;
	req.data.currencies = (await databaseConnection.getCurrencies()).rows;
	
	next();
}, render);

/*app.get('/data', preProcess, (req, res, next) => {
	const roleId = typeof req.data.account !== 'undefined' ? req.data.account.role_id : 1;

	const promises = [];
	const nextPromises = [];
	
	req.data.currencies = (await databaseConnection.getCurrencies()).rows;

	req.data.data = [
		{
			name: 'All',
			sourceId: null,
			sourceLabelId: null,
			link: '/addresses',
			currencies: []
		},
		{
			name: 'All sources',
			sourceId: null,
			sourceLabelId: null,
			link: '/addresses?data=0',
			currencies: []
		}
	];

	promises.push(databaseConnection.getAddressesCount(roleId, false, req.data.data[0].sourceId, req.data.data[0].sourceLabelId, null).then((result) => {
		req.data.data[0].addressesCount = result.rows[0].count;
	}));
	for(let i = 0; i < req.data.currencies.length; i++) {
		req.data.data[0].currencies[i] = { ...req.data.currencies[i] };
		req.data.data[0].currencies[i].link = '/addresses?currency_code=' + req.data.currencies[i].currency_code;
		const dataCurrency = req.data.data[0].currencies[i];
		promises.push(databaseConnection.getAddressesCount(roleId, false, req.data.data[0].sourceId, req.data.data[0].sourceLabelId, req.data.currencies[i].currency_id).then((result) => {
			for(let j = 0; j < req.data.data[0].currencies.length; j++) {
				if(req.data.data[0].currencies[j] == dataCurrency) {
					req.data.data[0].currencies[j].addressesCount = result.rows[0].count;
					break;
				}
			}
		}));
	}

	promises.push(databaseConnection.getAddressesCount(roleId, true, req.data.data[1].sourceId, req.data.data[1].sourceLabelId, null).then((result) => {
		req.data.data[1].addressesCount = result.rows[0].count;
	}));
	for(let i = 0; i < req.data.currencies.length; i++) {
		req.data.data[1].currencies[i] = { ...req.data.currencies[i] };
		req.data.data[1].currencies[i].link = '/addresses?currency_code=' + req.data.currencies[i].currency_code + '&data=0';
		const dataCurrency = req.data.data[1].currencies[i];
		promises.push(databaseConnection.getAddressesCount(roleId, true, req.data.data[1].sourceId, req.data.data[1].sourceLabelId, req.data.currencies[i].currency_id).then((result) => {
			for(let j = 0; j < req.data.data[1].currencies.length; j++) {
				if(req.data.data[1].currencies[j] == dataCurrency) {
					req.data.data[1].currencies[j].addressesCount = result.rows[0].count;
					break;
				}
			}
		}));
	}
	
	const sources = (await databaseConnection.getSources()).rows;
	for(const source of sources) {
		if(source.source_label_ids.length > 1) {
			req.data.data.push({
				name: source.source_name,
				sourceId: source.source_id,
				sourceLabelId: null,
				link: '/addresses?data=' + (req.data.data.length - 1),
				currencies: []
			});
			let data = req.data.data[req.data.data.length - 1];
			promises.push(databaseConnection.getAddressesCount(roleId, true, req.data.data[req.data.data.length - 1].sourceId, req.data.data[req.data.data.length - 1].sourceLabelId, null).then((result) => {
				for(let i = 0; i < req.data.data.length; i++) {
					if(req.data.data[i] == data) {
						req.data.data[i].addressesCount = result.rows[0].count;
						break;
					}
				}
			}));
		}
		for(const sourceLabelId of source.source_label_ids) {
			let data = {
				name: source.source_name + ' / ',
				sourceId: source.source_id,
				sourceLabelId: null
			};
			req.data.data.push(data);
			promises.push(databaseConnection.getSourceLabel(sourceLabelId).then((result) => {
				for(let i = 0; i < req.data.data.length; i++) {
					if(req.data.data[i] == data) {
						req.data.data[i].name += result.rows[0].source_label_name;
						req.data.data[i].sourceLabelId = result.rows[0].source_label_id;
						req.data.data[i].link = i > 0 ? '/addresses?data=' + (i - 1) : '/addresses';
						req.data.data[i].currencies = [];
						let data = req.data.data[i];
						nextPromises.push(databaseConnection.getAddressesCount(roleId, true, req.data.data[i].sourceId, req.data.data[i].sourceLabelId, null).then((result) => {
							for(let j = 0; j < req.data.data.length; j++) {
								if(req.data.data[j] == data) {
									req.data.data[j].addressesCount = result.rows[0].count;
									break;
								}
							}
						}));
						for(let j = 0; j < req.data.currencies.length; j++) {
							req.data.data[i].currencies[j] = { ...req.data.currencies[j] };
							const dataCurrency = req.data.data[i].currencies[j];
							nextPromises.push(databaseConnection.getAddressesCount(roleId, true, req.data.data[i].sourceId, req.data.data[i].sourceLabelId, req.data.currencies[j].currency_id).then((result) => {
								for(let k = 0; k < req.data.data.length; k++) {
									if(req.data.data[k] == data) {
										for(let l = 0; l < req.data.data[k].currencies.length; l++) {
											if(req.data.data[k].currencies[l] == dataCurrency) {
												req.data.data[k].currencies[l].addressesCount = result.rows[0].count;
												break;
											}
										}
										break;
									}
								}
							}));
						}
						break;
					}
				}
			}));
		}
	}

	Promise.all(promises).then(() => {
		Promise.all(nextPromises).then(() => {
			for(let i = 0; i < req.data.data.length; i++) {
				req.data.data[i].currencies = req.data.data[i].currencies.sort((a, b) => {
					if(a.addressesCount != b.addressesCount) { return b.addressesCount - a.addressesCount; }
					if(a.currency_code > b.currency_code) { return 1; }
					if(a.currency_code < b.currency_code) { return -1; }
					return 0;
				});
			}
		
			req.data.data = req.data.data.sort((a, b) => {
				if(a.addressesCount != b.addressesCount) { return b.addressesCount - a.addressesCount; }
				if(a.sourceId != b.sourceId) { return a.sourceId - b.sourceId; }
				if(a.sourceLabelId != b.sourceLabelId) { return a.sourceLabelId - b.sourceLabelId; }
				return 0;
			});

			next();
		});
	});
}, render);*/

app.get('/statistics', preProcess, loadSource, async (req, res, next) => {
	const roleId = typeof req.data.account !== 'undefined' ? req.data.account.role_id : 1;

	req.data.currencies = (await databaseConnection.getCurrencies()).rows;
	
	for(let i = 0; i < req.data.sources.length; i++) {
		req.data.sources[i].withData = true;
		req.data.sources[i].addressesCount = (await databaseConnection.getAddressesCount(roleId, true, req.data.sources[i].sourceId, req.data.sources[i].sourceLabelId, null)).rows[0].count;
		req.data.sources[i].link = '/addresses?data=' + i;
		req.data.sources[i].currencies = [];

		let addressesCount = 0;

		for(let j = 0; j < req.data.currencies.length; j++) {
			if(addressesCount >= req.data.sources[i].addressesCount) {
				for(let k = j; k < req.data.currencies.length; k++) {
					req.data.sources[i].currencies[k] = { ...req.data.currencies[k] };
					req.data.sources[i].currencies[k].addressesCount = 0;
					req.data.sources[i].currencies[k].link = '/addresses?currency=' + req.data.currencies[k].currency_code + '&source=' + i;
				}
				break;
			}

			req.data.sources[i].currencies[j] = { ...req.data.currencies[j] };
			req.data.sources[i].currencies[j].addressesCount = (await databaseConnection.getAddressesCount(roleId, true, req.data.sources[i].sourceId, req.data.sources[i].sourceLabelId, req.data.currencies[j].currency_id)).rows[0].count;
			req.data.sources[i].currencies[j].link = '/addresses?currency=' + req.data.currencies[j].currency_code + '&source=' + i;
			addressesCount += req.data.sources[i].currencies[j].addressesCount;
		}
	}

	req.data.sources.unshift({
		name: 'All',
		withData: false,
		sourceId: null,
		sourceLabelId: null,
		addressesCount: (await databaseConnection.getAddressesCount(roleId, false, null, null, null)).rows[0].count,
		link: '/addresses',
		currencies: []
	});

	let addressesCount = 0;

	for(let i = 0; i < req.data.currencies.length; i++) {
		if(addressesCount >= req.data.sources[0].addressesCount) {
			for(let j = i; j < req.data.currencies.length; j++) {
				req.data.sources[0].currencies[j] = { ...req.data.currencies[j] };
				req.data.sources[0].currencies[j].addressesCount = 0;
				req.data.sources[0].currencies[j].link = '/addresses?currency=' + req.data.currencies[j].currency_code;
			}
			break;
		}
		
		req.data.sources[0].currencies[i] = { ...req.data.currencies[i] };
		req.data.sources[0].currencies[i].addressesCount = (await databaseConnection.getAddressesCount(roleId, false, null, null, req.data.currencies[i].currency_id)).rows[0].count;
		req.data.sources[0].currencies[i].link = '/addresses?currency=' + req.data.currencies[i].currency_code;
		addressesCount += req.data.sources[0].currencies[i].addressesCount;
	}

	for(let i = 0; i < req.data.sources.length; i++) {
		req.data.sources[i].currencies = req.data.sources[i].currencies.sort((a, b) => {
			if(a.addressesCount != b.addressesCount) { return b.addressesCount - a.addressesCount; }
			if(a.currency_code > b.currency_code) { return 1; }
			if(a.currency_code < b.currency_code) { return -1; }
			return 0;
		});
	}

	req.data.sources = req.data.sources.sort((a, b) => {
		if(a.addressesCount != b.addressesCount) { return b.addressesCount - a.addressesCount; }
		if(a.sourceId != b.sourceId) { return a.sourceId - b.sourceId; }
		if(a.sourceLabelId != b.sourceLabelId) { return a.sourceLabelId - b.sourceLabelId; }
		return 0;
	});

	next();
}, render);

app.get('/api', preProcess, loadSource, async (req, res, next) => {
	req.data.currencies = (await databaseConnection.getCurrencies()).rows;
	next();
}, render);

app.get('/faq', preProcess, render);

app.get('*', preProcess, (req, res) => {
	res.status(404);
	return render(req, res);
});



app.listen(config.connection.port, () => {
	console.log(`Client server started listening on port ${config.connection.port}!`);
});