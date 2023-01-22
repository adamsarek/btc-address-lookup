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
				ARRAY_REMOVE(ARRAY_AGG(CAST(data_id AS INT) ORDER BY CAST(data_id AS INT)), NULL) AS data_ids
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
				ARRAY_REMOVE(ARRAY_AGG(CAST(data_id AS INT) ORDER BY CAST(data_id AS INT)), NULL) AS data_ids
			FROM address
			LEFT JOIN address_data ON address_data.address_id = address.address_id AND '${role}' = ANY(roles)
			WHERE address = '${address}'
			GROUP BY address.address_id, currency_id, address
		`);
	}

	getData(role, dataId) {
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
				WHERE data_id = ${dataId} AND '${role}' = ANY(roles)
			)
		`);
	}

	getSources() {
		return this.#execute(`
			SELECT
				CAST(source.source_id AS INT),
				source.name,
				ARRAY_REMOVE(ARRAY_AGG(CAST(source_label_id AS INT) ORDER BY CAST(source_label_id AS INT)), NULL) AS source_label_ids
			FROM source
			LEFT JOIN source_label ON source_label.source_id = source.source_id
			GROUP BY source.source_id
		`);
	}

	getSource(sourceId) {
		
	}
}

// Export
module.exports = DatabaseConnection