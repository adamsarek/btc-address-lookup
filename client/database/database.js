// External imports
const pg = require('pg');

class Database {
	constructor() {
		if(!Database._instance) {
			Database._instance = this;
			Database._instance._connectionPool = {};
			Database._instance._SQL_VALUES_LIMIT = 1000;
		}
		return Database._instance;
	}

	#getConnectionString(connectionDetails) {
		return 'postgresql://' + connectionDetails.user
						 + ':' + connectionDetails.password
						 + '@' + connectionDetails.host
						 + ':' + connectionDetails.port
						 + '/' + connectionDetails.dbname;
	}

	getConnection(connectionDetails, connectionPool=true) {
		if(connectionPool) {
			const connectionString = this.#getConnectionString(connectionDetails);
			if(!this._connectionPool[connectionString]) {
				this._connectionPool[connectionString] = new pg.Pool({ connectionString });
			}

			return this._connectionPool[connectionString];
		}
		else {
			return new pg.Client({ connectionString });
		}
	}
}

// Export
module.exports = Database