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

	getRoleFromToken(token) {
		return 1;
	}

	getAddresses(role, limit, offset) {
		return this.#execute(`
			SELECT
				address,
				COALESCE((
					SELECT REPLACE(code, 'N/A', '_unknown')
					FROM currency
					WHERE currency.currency_id = address.currency_id
				), '_pending') AS currency,
				CASE WHEN (
					SELECT COUNT(*)
					FROM address_data
					WHERE address_id = address.address_id AND '${role}' = ANY(roles)
				) > 0 THEN TRUE ELSE FALSE END AS has_data,
				ARRAY_REMOVE(ARRAY_AGG(data_id ORDER BY data_id), NULL) AS data_ids
			FROM address
			LEFT JOIN address_data ON address_data.address_id = address.address_id AND '${role}' = ANY(roles)
			GROUP BY address.address_id, currency_id, address
			ORDER BY address.address_id
			LIMIT ${limit} OFFSET ${offset}
		`);
	}

	getAddress(role, address) {
		return this.#execute(`
			SELECT
				address,
				COALESCE((
					SELECT REPLACE(code, 'N/A', '_unknown')
					FROM currency
					WHERE currency.currency_id = address.currency_id
				), '_pending') AS currency,
				CASE WHEN (
					SELECT COUNT(*)
					FROM address_data
					WHERE address_id = address.address_id AND '${role}' = ANY(roles)
				) > 0 THEN TRUE ELSE FALSE END AS has_data,
				ARRAY_REMOVE(ARRAY_AGG(data_id ORDER BY data_id), NULL) AS data_ids
			FROM address
			LEFT JOIN address_data ON address_data.address_id = address.address_id AND '${role}' = ANY(roles)
			WHERE address = '${address}'
			GROUP BY address.address_id, currency_id, address
		`);
	}
	
	getData(role, dataId) {

	}
}

// Export
module.exports = DatabaseConnection