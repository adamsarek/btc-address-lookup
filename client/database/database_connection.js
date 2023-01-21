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

	selectAddresses(role, limit, offset) {
		return this.#execute(`
			SELECT address, COALESCE((
				SELECT REPLACE(code, 'N/A', '_unknown')
				FROM currency
				WHERE currency.currency_id = address.currency_id
			), '_pending') AS currency
			FROM address
			WHERE EXISTS (
				SELECT 1
				FROM address_data
				WHERE address_id = address.address_id AND '${role}' = ANY(roles)
			)
			ORDER BY address_id
			LIMIT ${limit} OFFSET ${offset}
		`);
	}
}

// Export
module.exports = DatabaseConnection