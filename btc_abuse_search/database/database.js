// External imports
const PG = require('pg');

/**
 * Database class
 */
class Database {
	/**
	 * Constructor
	 * @returns {Object} Database instance
	 */
	constructor() {
		if(!Database._instance) {
			Database._instance = this;
			Database._instance._connectionPool = {};
			Database._instance._SQL_VALUES_LIMIT = 1000;
		}
		return Database._instance;
	}

	/**
	 * Gets connection string
	 * @param {Object} connectionDetails Connection details object
	 * @returns {String} Connection string
	 */
	#getConnectionString(connectionDetails) {
		return 'postgresql://' + connectionDetails.user
						 + ':' + connectionDetails.password
						 + '@' + connectionDetails.host
						 + ':' + connectionDetails.port
						 + '/' + connectionDetails.dbname;
	}

	/**
	 * Gets connection object
	 * @param {Object} connectionDetails Connection details object
	 * @param {Boolean} connectionPool Use connection pool
	 * @returns {Object} Connection object
	 */
	getConnection(connectionDetails, connectionPool=true) {
		if(connectionPool) {
			const connectionString = this.#getConnectionString(connectionDetails);
			if(!this._connectionPool[connectionString]) {
				this._connectionPool[connectionString] = new PG.Pool({ connectionString });
			}

			return this._connectionPool[connectionString];
		}
		else {
			return new PG.Client({ connectionString });
		}
	}
}

// Export
module.exports = Database