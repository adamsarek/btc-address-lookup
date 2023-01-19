class DatabaseConnection {
	constructor(connection) {
		this._connection = connection;
	}

	getConnection() {
		return this.connection;
	}

	#execute(query, args=[]) {
		cursor = [];

		try {
			cursor = this.connection.cursor().execute(query, args);
		}
		catch(error) {
			console.error(error);
		}

		return cursor;
	}

	commit() {
		this.connection.commit();
	}

	select(tableName, columnNames, joins=[], where="", orderBy="", limit="") {
		console.log(tableName + " - " + columnNames.join(", "));
		/*query = "SELECT "
		query += ", ".join(["{}"] * len(column_names))
		query += " FROM {} "
		query += " ".join(joins)
		query += ((" WHERE " + where) if (where != "") else (""))
		query += ((" ORDER BY " + order_by) if (order_by != "") else (""))
		query += ((" LIMIT " + limit) if (limit != "") else (""))
		params = []

		for column_name in column_names:
			column_name_parts = []
			for column_name_part in column_name.split("."):
				column_name_parts.append(psycopg.sql.Identifier(str(column_name_part)))
			params.append(psycopg.sql.SQL(".").join(column_name_parts))
		
		table_name_parts = []
		for table_name_part in table_name.split("."):
			table_name_parts.append(psycopg.sql.Identifier(table_name_part))
		params.append(psycopg.sql.SQL(".").join(table_name_parts))

		cursor = self.__execute(
			psycopg.sql.SQL(
				query
			).format(
				*params
			)
		)
		if cursor == []:
			return cursor
		else:
			return cursor.fetchall()*/
	}

	selectCount(tableName, joins=[], where="", orderBy="", limit="") {
		/*query = "SELECT COUNT(*)"
		query += " FROM {} "
		query += " ".join(joins)
		query += ((" WHERE " + where) if (where != "") else (""))
		query += ((" ORDER BY " + order_by) if (order_by != "") else (""))
		query += ((" LIMIT " + limit) if (limit != "") else (""))
		params = []

		table_name_parts = []
		for table_name_part in table_name.split("."):
			table_name_parts.append(psycopg.sql.Identifier(table_name_part))
		params.append(psycopg.sql.SQL(".").join(table_name_parts))

		cursor = self.__execute(
			psycopg.sql.SQL(
				query
			).format(
				*params
			)
		)
		if cursor == []:
			return cursor
		else:
			return cursor.fetchall()*/
	}
}

// Export
module.exports = DatabaseConnection