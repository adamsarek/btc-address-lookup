// External imports
const BCRYPT = require('bcrypt');

/**
 * Database connection class
 */
class DatabaseConnection {
	constructor(connection, config) {
		this._connection = connection;
		this._config = config;
		this._sql = {};
	}

	/**
	 * Gets connection object
	 * @returns {Object} Connection object
	 */
	getConnection() {
		return this._connection;
	}

	/**
	 * Executes SQL query
	 * @param {String} query SQL query
	 * @param {Boolean} cache Use cache
	 * @param {Object} args Arguments array
	 * @returns {Object} Cursor object
	 */
	#execute(query, cache=false, args=[]) {
		let cursor = [];

		try {
			if(cache) {
				if(typeof this._sql[query] === 'undefined' || this._sql[query].updatedAt + this._config.db.cache_timeout < Date.now()) {
					this._sql[query] = {
						updatedAt: Date.now(),
						cursor: this._connection.query(query, args)
					};
				}
	
				cursor = this._sql[query].cursor;
			}
			else {
				cursor = this._connection.query(query, args);
			}
		}
		catch(error) {
			console.error(error);
		}

		return cursor;
	}

	/**
	 * Adds token to the database
	 * @param {Number} accountId Account ID
	 * @param {String} token API token
	 * @param {String} ip Client IP address
	 * @returns {Object} Cursor object
	 */
	addToken(accountId, token, ip) {
		return this.#execute(`
			INSERT INTO token (account_id, token, created_by_ip)
			VALUES (
				${accountId},
				'${token}',
				'${ip}'
			)
		`);
	}

	/**
	 * Gets token from the database
	 * @param {String} token API token
	 * @returns {Object} Cursor object
	 */
	getToken(token) {
		return this.#execute(`
			SELECT
				CAST(role_id AS INT),
				(
					SELECT name
					FROM role
					WHERE role_id = account.role_id
				) AS role_name,
				token,
				CAST(use_count AS INT),
				created_at,
				last_used_at,
				reset_use_count_at
			FROM token
			JOIN account ON account.account_id = token.account_id
			WHERE token = '${token}'
		`);
	}

	/**
	 * Sets token to the database
	 * @param {String} token API token
	 * @param {String} ip Client IP address
	 * @returns {Object} Cursor object
	 */
	setToken(token, ip) {
		return this.#execute(`
			UPDATE token
			SET
				use_count = ${token.use_count},
				last_used_by_ip = '${ip}',
				last_used_at = TO_TIMESTAMP(${token.last_used_at / 1000}),
				reset_use_count_at = TO_TIMESTAMP(${token.reset_use_count_at / 1000})
			WHERE token = '${token.token}'
		`);
	}

	/**
	 * Prepares SQL query
	 * @param {Number} sqlOption SQL preparation option
	 * @param {Number} roleId Role ID
	 * @param {Boolean} withData Get address with data
	 * @param {Number} sourceId Source ID
	 * @param {Number} sourceLabelId Source label ID
	 * @param {Number} currencyId Currency ID
	 * @returns {String} Prepared SQL query
	 */
	#prepareSQL(sqlOption, roleId, withData=false, sourceId=null, sourceLabelId=null, currencyId=null) {
		const sql = [];
		sql[0] = `WHERE ${currencyId != null ? 'currency_id ' + (currencyId > 0 ? '= ' + currencyId : 'IS NULL') + ' AND ' : ''}`;
		sql[1] = `address_data.address_id = address.address_id`;
		sql[2] = ` AND '${roleId}' = ANY(roles)`;
		sql[3] = `EXISTS (
			SELECT 1 FROM address_data WHERE ${sql[1]}${sql[2]}`;
		sql[4] = `EXISTS (
			SELECT 1 FROM data WHERE data.data_id = address_data.data_id AND EXISTS (
				SELECT 1 FROM source_label_url WHERE source_label_url.source_label_url_id = data.source_label_url_id`;
		sql[5] = `FROM address
			${sourceLabelId != null ? (`
				${sql[0]}${sql[3]} AND ${sql[4]} AND source_label_url.source_label_id = ${sourceLabelId}
						)
					)
				)
			`) : (
				sourceId != null ? (`
					${sql[0]}${sql[3]} AND ${sql[4]} AND EXISTS (
						SELECT 1 FROM source_label WHERE source_label.source_label_id = source_label_url.source_label_id AND source_label.source_id = ${sourceId}
					))))
				`) : (
					withData ? (`
						${sql[0]}${sql[3]}
						)
					`) : (
						currencyId != null ? (`
							WHERE currency_id ${currencyId > 0 ? '= ' + currencyId : 'IS NULL'}
						`) : ''
					)
				)
			)}`;

		if(sqlOption == 0) {
			return `SELECT
				address,
				COALESCE((
					SELECT ARRAY[name, code, logo]
					FROM currency
					WHERE currency.currency_id = address.currency_id
				), ARRAY['Pending', '_pending', '/src/img/_pending.svg']) AS currency,
				ARRAY (
					SELECT CAST(address_data.data_id AS INT)
					FROM address_data
					${sourceLabelId != null ? (`
						${sql[0]}${sql[1]}${sql[2]} AND ${sql[4]} AND source_label_url.source_label_id = ${sourceLabelId}
							)
						)
					`) : (
						sourceId != null ? (`
							${sql[0]}${sql[1]}${sql[2]} AND ${sql[4]} AND EXISTS (
								SELECT 1 FROM source_label WHERE source_label.source_label_id = source_label_url.source_label_id AND source_label.source_id = ${sourceId}
							)))
						`) : (
							withData ? (`
								${sql[0]}${sql[1]}${sql[2]}
							`) : (
								currencyId != null ? (`
									WHERE currency_id ${currencyId > 0 ? '= ' + currencyId : 'IS NULL'} AND ${sql[1]}${sql[2]}
								`) : (`
									WHERE ${sql[1]}${sql[2]}
								`)
							)
						)
					)}
					ORDER BY CAST(address_data.data_id AS INT)
				) AS data_ids,
				(
					SELECT crawled_at
					FROM address_data
					JOIN data ON data.data_id = address_data.data_id
					WHERE address_data.address_id = address.address_id
					ORDER BY crawled_at DESC
					LIMIT 1
				)
			${sql[5]}
			ORDER BY crawled_at DESC`;
		}
		else {
			return `SELECT COUNT(*) ${sql[5]}`;
		}
	}

	/**
	 * Gets addresses from the database
	 * @param {Number} roleId Role ID
	 * @param {Number} limit Limit
	 * @param {Number} offset Offset
	 * @param {Boolean} withData Get address with data
	 * @param {Number} sourceId Source ID
	 * @param {Number} sourceLabelId Source label ID
	 * @param {Number} currencyId Currency ID
	 * @returns {Object} Cursor object
	 */
	getAddresses(roleId, limit, offset, withData=false, sourceId=null, sourceLabelId=null, currencyId=null) {
		return this.#execute(`
			${this.#prepareSQL(0, roleId, withData, sourceId, sourceLabelId, currencyId)}
			LIMIT ${limit} OFFSET ${offset}
		`, true);
	}

	/**
	 * Gets addresses count from the database
	 * @param {Number} roleId Role ID
	 * @param {Boolean} withData Get address with data
	 * @param {Number} sourceId Source ID
	 * @param {Number} sourceLabelId Source label ID
	 * @param {Number} currencyId Currency ID
	 * @returns {Object} Cursor object
	 */
	getAddressesCount(roleId, withData=false, sourceId=null, sourceLabelId=null, currencyId=null) {
		return this.#execute(this.#prepareSQL(1, roleId, withData, sourceId, sourceLabelId, currencyId), true);
	}

	/**
	 * Gets address from the database
	 * @param {Number} roleId Role ID
	 * @param {String} address Address
	 * @returns {Object} Cursor object
	 */
	getAddress(roleId, address) {
		return this.#execute(`
			SELECT
				address,
				COALESCE((
					SELECT ARRAY[name, code, logo]
					FROM currency
					WHERE currency.currency_id = address.currency_id
				), ARRAY['Pending', '_pending', '/src/img/_pending.svg']) AS currency,
				ARRAY_REMOVE(ARRAY_AGG(CAST(address_data.data_id AS INT) ORDER BY CAST(address_data.data_id AS INT)), NULL) AS data_ids,
				crawled_at
			FROM address
			LEFT JOIN address_data ON address_data.address_id = address.address_id AND '${roleId}' = ANY(roles)
			LEFT JOIN data ON data.data_id = address_data.data_id
			WHERE address = '${address}'
			GROUP BY address.address_id, currency_id, address, data.crawled_at
		`);
	}

	/**
	 * Gets data from the database
	 * @param {Number} roleId Role ID
	 * @param {Number} dataId Data ID
	 * @returns {Object} Cursor object
	 */
	getData(roleId, dataId) {
		return this.#execute(`
			SELECT
				CAST(data_id AS INT),
				(
					SELECT source.source_id
					FROM source_label_url
					JOIN source_label ON source_label.source_label_id = source_label_url.source_label_id
					JOIN source ON source.source_id = source_label.source_id
					WHERE source_label_url.source_label_url_id = data.source_label_url_id
				) AS source_id,
				(
					SELECT source.name
					FROM source_label_url
					JOIN source_label ON source_label.source_label_id = source_label_url.source_label_id
					JOIN source ON source.source_id = source_label.source_id
					WHERE source_label_url.source_label_url_id = data.source_label_url_id
				) AS source_name,
				(
					SELECT source_label.source_label_id
					FROM source_label_url
					JOIN source_label ON source_label.source_label_id = source_label_url.source_label_id
					WHERE source_label_url.source_label_url_id = data.source_label_url_id
				) AS source_label_id,
				(
					SELECT source_label.name
					FROM source_label_url
					JOIN source_label ON source_label.source_label_id = source_label_url.source_label_id
					WHERE source_label_url.source_label_url_id = data.source_label_url_id
				) AS source_label_name,
				(
					SELECT address
					FROM url
					WHERE url.url_id = data.url_id
				) AS url,
				path,
				CAST(content_length AS INT),
				crawled_at
			FROM data
			WHERE data_id = ${dataId} AND EXISTS (
				SELECT 1
				FROM address_data
				WHERE data_id = ${dataId} AND '${roleId}' = ANY(roles)
			)
		`);
	}

	/**
	 * Gets sources from the database
	 * @returns {Object} Cursor object
	 */
	getSources() {
		return this.#execute(`
			SELECT
				CAST(source.source_id AS INT),
				source.name AS source_name,
				ARRAY_REMOVE(ARRAY_AGG(CAST(source_label_id AS INT) ORDER BY CAST(source_label_id AS INT)), NULL) AS source_label_ids
			FROM source
			LEFT JOIN source_label ON source_label.source_id = source.source_id
			GROUP BY source.source_id
			ORDER BY CAST(source.source_id AS INT)
		`);
	}

	/**
	 * Gets source from the database
	 * @param {Number} sourceId Source ID
	 * @returns {Object} Cursor object
	 */
	getSource(sourceId) {
		return this.#execute(`
			SELECT
				CAST(source.source_id AS INT),
				source.name AS source_name,
				ARRAY_REMOVE(ARRAY_AGG(CAST(source_label_id AS INT) ORDER BY CAST(source_label_id AS INT)), NULL) AS source_label_ids
			FROM source
			LEFT JOIN source_label ON source_label.source_id = source.source_id
			WHERE source.source_id = ${sourceId}
			GROUP BY source.source_id
		`);
	}

	/**
	 * Gets source labels from the database
	 * @returns {Object} Cursor object
	 */
	getSourceLabels() {
		return this.#execute(`
			SELECT
				CAST(source_label_id AS INT),
				source_label.name AS source_label_name,
				CAST(source.source_id AS INT),
				source.name AS source_name
			FROM source_label
			JOIN source ON source.source_id = source_label.source_id
			ORDER BY CAST(source_label.source_label_id AS INT)
		`);
	}

	/**
	 * Gets source label from the database
	 * @param {Number} sourceLabelId Source label ID
	 * @returns {Object} Cursor object
	 */
	getSourceLabel(sourceLabelId) {
		return this.#execute(`
			SELECT
				CAST(source_label_id AS INT),
				source_label.name AS source_label_name,
				CAST(source.source_id AS INT),
				source.name AS source_name
			FROM source_label
			JOIN source ON source.source_id = source_label.source_id
			WHERE source_label_id = ${sourceLabelId}
		`);
	}

	/**
	 * Gets currencies from the database
	 * @returns {Object} Cursor object
	 */
	getCurrencies() {
		return this.#execute(`
			SELECT
				0 AS currency_id,
				'Pending' AS currency_name,
				'_pending' AS currency_code,
				'/src/img/_pending.svg' AS logo
			UNION
			SELECT
				CAST(currency_id AS INT),
				name AS currency_name,
				code AS currency_code,
				logo
			FROM currency
			ORDER BY CAST(currency_id AS INT)
		`);
	}

	/**
	 * Gets currency from the database
	 * @param {String} currencyCode Currency code
	 * @returns {Object} Cursor object
	 */
	getCurrency(currencyCode) {
		if(currencyCode == '_pending') {
			return this.#execute(`
				SELECT
					0 AS currency_id,
					'Pending' AS currency_name,
					'_pending' AS currency_code,
					'/src/img/_pending.svg' AS logo
			`);
		}
		else {
			return this.#execute(`
				SELECT
					CAST(currency_id AS INT),
					name AS currency_name,
					code AS currency_code,
					logo
				FROM currency
				WHERE code = '${currencyCode}'
			`);
		}
	}

	/**
	 * Checks if account with given email exists in the database
	 * @param {String} email Email address
	 * @returns {Object} Cursor object
	 */
	hasEmail(email) {
		return this.#execute(`
			SELECT 1
			FROM account
			WHERE email = '${email}'
		`);
	}

	/**
	 * Adds account to the database
	 * @param {String} email Email address
	 * @param {String} password Raw password
	 * @param {String} ip IP address
	 * @returns {Object} Cursor object
	 */
	addAccount(email, password, ip) {
		const passwordHash = BCRYPT.hashSync(password, 12);

		return this.#execute(`
			INSERT INTO account (role_id, email, password, signed_up_by_ip)
			VALUES (
				COALESCE((SELECT 2 FROM account LIMIT 1), 4),
				'${email}',
				'${passwordHash}',
				'${ip}'
			)
		`);
	}

	/**
	 * Gets accounts from the database
	 * @param {Number} limit Limit
	 * @param {Number} offset Offset
	 * @param {String} email Email address
	 * @param {Number} roleId Role ID
	 * @returns {Object} Cursor object
	 */
	getAccounts(limit, offset, email='', roleId=null) {
		return this.#execute(`
			SELECT
				CAST(account_id AS INT),
				CAST(role_id AS INT),
				(
					SELECT name
					FROM role
					WHERE role.role_id = account.role_id
				) AS role_name,
				email,
				signed_up_at,
				last_signed_in_at
			FROM account
			${email != '' && roleId != null ? (`
				WHERE email = '${email}' AND role_id = ${roleId}
			`) : (
				email != '' ? (`
					WHERE email = '${email}'
				`) : (
					roleId != null ? (`
						WHERE role_id = ${roleId}
					`) : ''
				)
			)}
			ORDER BY CAST(account_id AS INT)
			LIMIT ${limit} OFFSET ${offset}
		`);
	}

	/**
	 * Gets accounts count from the database
	 * @param {String} email Email address
	 * @param {Number} roleId Role ID
	 * @returns {Object} Cursor object
	 */
	getAccountsCount(email='', roleId=null) {
		return this.#execute(`
			SELECT COUNT(*)
			FROM account
			${email != '' && roleId != null ? (`
				WHERE email = '${email}' AND role_id = ${roleId}
			`) : (
				email != '' ? (`
					WHERE email = '${email}'
				`) : (
					roleId != null ? (`
						WHERE role_id = ${roleId}
					`) : ''
				)
			)}
		`);
	}

	/**
	 * Gets account from the database
	 * @param {String} email Email address
	 * @returns {Object} Cursor object
	 */
	getAccount(email) {
		return this.#execute(`
			SELECT
				CAST(account.account_id AS INT),
				CAST(role_id AS INT),
				(
					SELECT name
					FROM role
					WHERE role.role_id = account.role_id
				) AS role_name,
				email,
				password,
				signed_up_at,
				last_signed_in_at,
				token
			FROM account
			LEFT JOIN token ON token.account_id = account.account_id
			WHERE email = '${email}'
		`);
	}

	/**
	 * Signs in account in the database
	 * @param {String} email Email address
	 * @param {String} ip IP address
	 * @returns {Object} Cursor object
	 */
	signInAccount(email, ip) {
		return this.#execute(`
			UPDATE account
			SET
				last_signed_in_by_ip = '${ip}',
				last_signed_in_at = CURRENT_TIMESTAMP
			WHERE email = '${email}'
		`);
	}

	/**
	 * Edits account role in the database
	 * @param {String} email Email address
	 * @param {Number} roleId Role ID
	 * @returns {Object} Cursor object
	 */
	editAccountRole(email, roleId) {
		return this.#execute(`
			UPDATE account
			SET role_id = ${roleId}
			WHERE email = '${email}'
		`);
	}

	/**
	 * Checks if role with given role ID exists in the database
	 * @param {Number} roleId Role ID
	 * @returns {Object} Cursor object
	 */
	hasRole(roleId) {
		return this.#execute(`
			SELECT 1
			FROM role
			WHERE role_id = ${roleId}
		`);
	}

	/**
	 * Gets roles from the database
	 * @returns {Object} Cursor object
	 */
	getRoles() {
		return this.#execute(`
			SELECT
				CAST(role_id AS INT),
				name AS role_name
			FROM role
			ORDER BY CAST(role_id AS INT)
		`);
	}
}

// Export
module.exports = DatabaseConnection