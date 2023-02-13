// External imports
const BCRYPT = require('bcrypt');

class DatabaseConnection {
	constructor(connection) {
		this._connection = connection;
	}

	getConnection() {
		return this._connection;
	}

	#execute(query, args=[]) {
		let cursor = [];

		try {
			cursor = this._connection.query(query, args);
		}
		catch(error) {
			console.error(error);
		}

		return cursor;
	}

	getToken(token) {
		return this.#execute(`
			SELECT
				CAST(role_id AS INT),
				(
					SELECT name
					FROM role
					WHERE role_id = token.role_id
				) AS role_name,
				token,
				CAST(use_count AS INT),
				CAST(use_count_limit AS INT),
				created_at,
				last_used_at,
				reset_use_count_at
			FROM token
			WHERE token = '${token}'
		`);
	}

	setToken(token) {
		return this.#execute(`
			UPDATE token
			SET
				use_count = ${token.use_count},
				last_used_at = TO_TIMESTAMP(${token.last_used_at / 1000}),
				reset_use_count_at = TO_TIMESTAMP(${token.reset_use_count_at / 1000})
			WHERE token = '${token.token}'
		`);
	}

	#prepareSQL(sqlOption, roleId, havingData=false, sourceId=null, sourceLabelId=null, currencyId=null) {
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
					havingData ? (`
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
							havingData ? (`
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
				) AS data_ids
			${sql[5]}
			ORDER BY CAST(address_id AS INT)`;
		}
		else {
			return `SELECT COUNT(*) ${sql[5]}`;
		}
	}

	getAddresses(roleId, limit, offset, havingData=false, sourceId=null, sourceLabelId=null, currencyId=null) {
		return this.#execute(`
			${this.#prepareSQL(0, roleId, havingData, sourceId, sourceLabelId, currencyId)}
			LIMIT ${limit} OFFSET ${offset}
		`);
	}

	getAddressesCount(roleId, havingData=false, sourceId=null, sourceLabelId=null, currencyId=null) {
		return this.#execute(this.#prepareSQL(1, roleId, havingData, sourceId, sourceLabelId, currencyId));
	}

	getAddress(roleId, address) {
		return this.#execute(`
			SELECT
				address,
				COALESCE((
					SELECT ARRAY[name, code, logo]
					FROM currency
					WHERE currency.currency_id = address.currency_id
				), ARRAY['Pending', '_pending', '/src/img/_pending.svg']) AS currency,
				ARRAY_REMOVE(ARRAY_AGG(CAST(data_id AS INT) ORDER BY CAST(data_id AS INT)), NULL) AS data_ids
			FROM address
			LEFT JOIN address_data ON address_data.address_id = address.address_id AND '${roleId}' = ANY(roles)
			WHERE address = '${address}'
			GROUP BY address.address_id, currency_id, address
		`);
	}

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

	hasEmail(email) {
		return this.#execute(`
			SELECT 1
			FROM account
			WHERE email = '${email}'
		`);
	}

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

	getAccount(email) {
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
				password,
				signed_up_at,
				last_signed_in_at
			FROM account
			WHERE email = '${email}'
		`);
	}

	signInAccount(email, ip) {
		return this.#execute(`
			UPDATE account
			SET
				last_signed_in_by_ip = '${ip}',
				last_signed_in_at = CURRENT_TIMESTAMP
			WHERE email = '${email}'
		`);
	}
}

// Export
module.exports = DatabaseConnection