# External imports
import copy
import math
import psycopg
import psycopg_pool

# Internal imports
import config

class DatabaseInitializer:
	def __init__(self, reset=False, delete_setup_config=False):
		# Private properties
		self.__SQL_VALUES_LIMIT = 1000
		
		# Setup
		self.__setup(reset, delete_setup_config)

		if not hasattr(self, "__pool") or self.__pool is None:
			# Load database configuration data
			self.__db_config_data = config.load("db.json")

			# Connection pool
			self.__pool = psycopg_pool.ConnectionPool(" ".join(list(map("=".join, zip(
				map(str, self.__db_config_data["connection"].keys()),
				map(str, self.__db_config_data["connection"].values())
			)))))
	
	def __del__(self):
		if not hasattr(self, "__pool") or self.__pool is None:
			self.__pool.close()
	
	def __insert(self, table_name, column_names=[], rows=[]):
		query = ""
		params = []
		
		for i in range(math.ceil(len(rows) / self.__SQL_VALUES_LIMIT)):
			rows_start = i * self.__SQL_VALUES_LIMIT
			rows_end = min((i + 1) * self.__SQL_VALUES_LIMIT, len(rows))

			query += "INSERT INTO {} ("
			query += ", ".join(["{}"] * len(column_names))
			query += ") VALUES ("
			
			params.append(psycopg.sql.Identifier(str(table_name)))
			
			for column_name in column_names:
				params.append(psycopg.sql.Identifier(str(column_name)))

			query_value_params = []
			for row in rows[rows_start:rows_end]:
				query_value_params.append(", ".join(["{}"] * len(row)))

				for col in row:
					params.append(str(col))
			
			query += "), (".join(query_value_params)
			query += ") ON CONFLICT DO NOTHING;"
		
		if len(column_names) > 0 and len(rows) > 0:
			self.__execute(psycopg.sql.SQL(query).format(*params))
	
	"""
	def update(self, table_name, column_names=[], rows=[], where=""):
		UPDATE_ROW_LIMIT = 1000
		query = ""
		params = []

		for i in range(math.ceil(len(rows) / UPDATE_ROW_LIMIT)):
			rows_start = i * UPDATE_ROW_LIMIT
			rows_end = min((i + 1) * UPDATE_ROW_LIMIT, len(rows))

			query += "UPDATE {} AS t SET "
			query += ", ".join(["{} = {}"] * len(column_names))
			query += " FROM ( VALUES ("
			
			params.append(psycopg.sql.Identifier(str(table_name)))
			
			for column_name in column_names:
				params.append(psycopg.sql.Identifier(str(column_name)))
				params.append(psycopg.sql.Identifier("c", str(column_name)))

			query_value_params = []
			for row in rows[rows_start:rows_end]:
				query_value_params.append(", ".join(["{}"] * len(row)))

				for col in row:
					params.append(col)
			
			for column_name in column_names:
				params.append(psycopg.sql.Identifier(str(column_name)))
			
			query += "), (".join(query_value_params)
			query += ") ) AS c ("
			query += ", ".join(["{}"] * len(column_names))
			query += ")" + ((" WHERE " + where) if (where != "") else ("")) + ";"
		
		if len(column_names) > 0 and len(rows) > 0:
			self.__execute(psycopg.sql.SQL(query).format(*params))
	"""

	def __execute(self, query, args=[]):
		with self.__pool.connection() as connection:
			return self.__execute_cursor(connection, query, args)

	def __execute_cursor(self, connection, query, args=[]):
		cursor = []

		try:
			cursor = connection.execute(query, args)
		except (Exception, psycopg.DatabaseError) as error:
			print(str(error))
		
		return cursor
	
	def __setup(self, reset=False, delete_setup_config=False):
		connection = None

		try:
			# Load setup configuration data
			setup_config_data = config.load("setup.json")
			#print("[SETUP] The setup configuration loaded.")

			# Save default configuration data & reset
			if reset:
				# Save default configuration data
				new_setup_config_data = copy.deepcopy(setup_config_data)
				new_setup_config_data["default_connection"]["user"] = "postgres"
				new_setup_config_data["default_connection"]["password"] = "postgres"
				config.save("setup.json", new_setup_config_data)
				#print("[SETUP] The new setup configuration saved.")

				# Reset
				setup_config_data["users"] = [
					{
						"user": "postgres",
						"password": "postgres",
						"superuser": True
					}
				]
				setup_config_data["databases"] = []

			# Connect
			connection = psycopg.connect(**setup_config_data["default_connection"], cursor_factory=psycopg.ClientCursor)
			#print("[SETUP] Connected to the PostgreSQL server.")

			# Create / alter users
			pg_users = self.__execute_cursor(connection, "SELECT usename FROM pg_user").fetchall()
			for setup_config_user in setup_config_data["users"]:
				if setup_config_user["user"] != setup_config_data["default_connection"]["user"]:
					if setup_config_user["superuser"]:
						self.__execute_cursor(connection, psycopg.sql.SQL(
							"""
							ALTER USER {}
							WITH
								LOGIN
								SUPERUSER
								CREATEDB
								CREATEROLE
								NOINHERIT
								REPLICATION
								CONNECTION LIMIT -1
								PASSWORD %s
							""").format(
								psycopg.sql.Identifier(setup_config_user["user"])
							), [
								setup_config_user["password"]
							]
						)
						#print("[SETUP] The superuser {0} has been altered.".format(setup_config_user["user"]))

						self.__execute_cursor(connection, psycopg.sql.SQL(
							"""
							CREATE USER {}
							WITH
								LOGIN
								SUPERUSER
								CREATEDB
								CREATEROLE
								NOINHERIT
								REPLICATION
								CONNECTION LIMIT -1
								PASSWORD %s
								IN GROUP postgres
							""").format(
								psycopg.sql.Identifier(setup_config_user["user"])
							), [
								setup_config_user["password"]
							]
						)
						#print("[SETUP] The superuser {0} has been created.".format(setup_config_user["user"]))
					else:
						self.__execute_cursor(connection, psycopg.sql.SQL(
							"""
							ALTER USER {}
							WITH
								LOGIN
								NOSUPERUSER
								NOCREATEDB
								NOCREATEROLE
								NOINHERIT
								NOREPLICATION
								CONNECTION LIMIT -1
								PASSWORD %s
							""").format(
								psycopg.sql.Identifier(setup_config_user["user"])
							), [
								setup_config_user["password"]
							]
						)
						#print("[SETUP] The user {0} has been altered.".format(setup_config_user["user"]))

						self.__execute_cursor(connection, psycopg.sql.SQL(
							"""
							CREATE USER {}
							WITH
								LOGIN
								NOSUPERUSER
								NOCREATEDB
								NOCREATEROLE
								NOINHERIT
								NOREPLICATION
								CONNECTION LIMIT -1
								PASSWORD %s
							""").format(
								psycopg.sql.Identifier(setup_config_user["user"])
							), [
								setup_config_user["password"]
							]
						)
						#print("[SETUP] The user {0} has been created.".format(setup_config_user["user"]))

			# Create / alter databases
			pg_databases = self.__execute_cursor(connection, "SELECT datname FROM pg_database WHERE datistemplate = false").fetchall()
			for setup_config_database in setup_config_data["databases"]:
				if setup_config_database["database"] != "postgres" and setup_config_database["database"] != "template0" and setup_config_database["database"] != "template1":
					self.__execute_cursor(connection, psycopg.sql.SQL(
						"""
						ALTER DATABASE {}
						OWNER TO {}
						""").format(
							psycopg.sql.Identifier(setup_config_database["database"]),
							psycopg.sql.Identifier(setup_config_database["owner"])
						)
					)
					self.__execute_cursor(connection, psycopg.sql.SQL(
						"""
						ALTER DATABASE {}
						CONNECTION_LIMIT -1
						""").format(
							psycopg.sql.Identifier(setup_config_database["database"])
						)
					)
					#print("[SETUP] The database {0} has been altered.".format(setup_config_database["database"]))

					self.__execute_cursor(connection, psycopg.sql.SQL(
						"""
						CREATE DATABASE {}
						WITH
							OWNER = {}
							ENCODING = 'UTF8'
							CONNECTION_LIMIT = -1
							IS_TEMPLATE = False
						""").format(
							psycopg.sql.Identifier(setup_config_database["database"]),
							psycopg.sql.Identifier(setup_config_database["owner"])
						)
					)
					#print("[SETUP] The database {0} has been created.".format(setup_config_database["database"]))

			# Drop databases
			for pg_database in pg_databases:
				if pg_database[0] != "postgres":
					setup_config_database_found = False
					
					for setup_config_database in setup_config_data["databases"]:
						if pg_database[0] == setup_config_database["database"]:
							setup_config_database_found = True
							break

					if setup_config_database_found == False:
						self.__execute_cursor(connection, psycopg.sql.SQL("DROP DATABASE {} WITH (FORCE)").format(psycopg.sql.Identifier(pg_database[0])))
						#print("[SETUP] The database {0} has been dropped.".format(pg_database[0]))
			
			# Drop users
			for pg_user in pg_users:
				if pg_user[0] != setup_config_data["default_connection"]["user"] and pg_user[0] != "postgres":
					setup_config_user_found = False
					
					for setup_config_user in setup_config_data["users"]:
						if pg_user[0] == setup_config_user["user"]:
							setup_config_user_found = True
							break

					if setup_config_user_found == False:
						self.__execute_cursor(connection, psycopg.sql.SQL("DROP USER {}").format(psycopg.sql.Identifier(pg_user[0])))
						#print("[SETUP] The user {0} has been dropped.".format(pg_user[0]))
			
			# Close connection
			connection.close()
			connection = None
			#print("[SETUP] The connection to the PostgreSQL server closed.")

			# Disable login to the default user (only if there is another superuser)
			for user in setup_config_data["users"]:
				if user["superuser"] and user["user"] != setup_config_data["default_connection"]["user"]:
					# New setup configuration data
					new_setup_config_data = copy.deepcopy(setup_config_data)
					new_setup_config_data["default_connection"]["user"] = user["user"]
					new_setup_config_data["default_connection"]["password"] = user["password"]
					
					# Save new setup configuration data
					if reset == False:
						config.save("setup.json", new_setup_config_data)
						#print("[SETUP] The new setup configuration saved.")

					# Connect
					connection = psycopg.connect(**new_setup_config_data["default_connection"], cursor_factory=psycopg.ClientCursor)
					#print("[SETUP] Connected to the PostgreSQL server.")
					
					# Disable login to the default user
					self.__execute_cursor(connection, psycopg.sql.SQL("ALTER USER {} NOLOGIN").format(psycopg.sql.Identifier(setup_config_data["default_connection"]["user"])))
					#print("[SETUP] Login to the default user {0} has been disabled.".format(setup_config_data["default_connection"]["user"]))

					# Drop default user
					if setup_config_data["default_connection"]["user"] != "postgres":
						self.__execute_cursor(connection, psycopg.sql.SQL("DROP USER {}").format(psycopg.sql.Identifier(setup_config_data["default_connection"]["user"])))
						#print("[SETUP] The default user {0} has been dropped.".format(setup_config_data["default_connection"]["user"]))
					
					# Close connection
					connection.close()
					connection = None
					#print("[SETUP] The connection to the PostgreSQL server closed.")
					break
			
			if reset == False:
				# Load database configuration data
				self.__db_config_data = config.load("db.json")

				# Connection pool
				self.__pool = psycopg_pool.ConnectionPool(" ".join(list(map("=".join, zip(
					map(str, self.__db_config_data["connection"].keys()),
					map(str, self.__db_config_data["connection"].values())
				)))))

				for setup_config_database in setup_config_data["databases"]:
					for setup_config_user in setup_config_data["users"]:
						if setup_config_database["owner"] == setup_config_user["user"]:
							# Database configuration data
							database_config_data = {
								"connection": copy.deepcopy(setup_config_data["default_connection"]),
								"database": setup_config_database
							}
							database_config_data["connection"]["user"] = setup_config_user["user"]
							database_config_data["connection"]["password"] = setup_config_user["password"]
							database_config_data["connection"]["dbname"] = setup_config_database["database"]

							# Connect
							connection = psycopg.connect(**database_config_data["connection"], cursor_factory=psycopg.ClientCursor)
							#print("[SETUP] Connected to the PostgreSQL server.")

							# Drop tables
							pg_tables = self.__execute_cursor(connection, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").fetchall()
							for pg_table in pg_tables:
								setup_config_database_table_found = False

								for setup_config_database_table in setup_config_database["tables"]:
									if pg_table[0] == setup_config_database_table["table_name"]:
										setup_config_database_table_found = True
										break
								
								if setup_config_database_table_found == False:
									self.__execute_cursor(connection, psycopg.sql.SQL("DROP TABLE {} CASCADE").format(psycopg.sql.Identifier(pg_table[0])))
									#print("[SETUP] The table {0} has been dropped.".format(pg_table[0]))
							
							# Tables
							for setup_config_database_table in setup_config_database["tables"]:
								# Create tables
								self.__execute_cursor(connection, psycopg.sql.SQL("CREATE TABLE IF NOT EXISTS {} (" + ", ".join(setup_config_database_table["create"]) + ")").format(psycopg.sql.Identifier(setup_config_database_table["table_name"])))
								#print("[SETUP] The table {0} has been created.".format(setup_config_database_table["table_name"]))

								# Insert data
								if "insert" in setup_config_database_table and len(setup_config_database_table["insert"]) == 2:
									self.__insert(setup_config_database_table["table_name"], setup_config_database_table["insert"][0], setup_config_database_table["insert"][1])
									#print("[SETUP] The data into the table {0} have been inserted.".format(setup_config_database_table["table_name"]))

			# Delete setup configuration data
			if delete_setup_config:
				config.delete("setup.json")
				#print("[SETUP] The setup configuration deleted.")
		except (Exception, psycopg.DatabaseError) as error:
			print(str(error))
		finally:
			if connection is not None:
				# Close connection
				connection.close()
				connection = None
				#print("[SETUP] The connection to the PostgreSQL server closed.")

class Database(DatabaseInitializer):
	def __init__(self, reset=False, delete_setup_config=False):
		# Initialize database
		super().__init__(reset, delete_setup_config)