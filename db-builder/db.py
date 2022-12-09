# External imports
import copy
import datetime
import json
import math
import psutil
import psycopg
import psycopg_pool
from isal import isal_zlib

# Internal imports
import config
import file

class DatabaseInitializer:
	def __init__(self, reset=False, delete_setup_config=False):
		# Private properties
		self._SQL_VALUES_LIMIT = 1000
		
		# Setup
		self.__setup(reset, delete_setup_config)

		if not hasattr(self, "_pool") or self._pool is None:
			# Load database configuration data
			self._db_config_data = config.load("db.json")

			# Connection pool
			self._pool = psycopg_pool.ConnectionPool(" ".join(list(map("=".join, zip(
				map(str, self._db_config_data["connection"].keys()),
				map(str, self._db_config_data["connection"].values())
			)))))
	
	def __del__(self):
		if not hasattr(self, "_pool") or self._pool is None:
			self._pool.close()
	
	def _select(self, table_name, column_names=[], where=""):
		with self._pool.connection() as connection:
			return self._select_cursor(connection, table_name, column_names, where)
	
	def _select_cursor(self, connection, table_name, column_names=[], where=""):
		query = "SELECT "
		params = []

		query += ", ".join(["{}"] * len(column_names))
		query += " FROM {}"

		for column_name in column_names:
			params.append(psycopg.sql.Identifier(str(column_name)))

		params.append(psycopg.sql.Identifier(str(table_name)))
		
		query += ((" WHERE " + where) if (where != "") else ("")) + ";"
		
		if len(column_names) > 0:
			return self._execute_cursor(connection, psycopg.sql.SQL(query).format(*params))

	def _insert(self, table_name, column_names=[], rows=[]):
		with self._pool.connection() as connection:
			self._insert_cursor(connection, table_name, column_names, rows)
	
	def _insert_cursor(self, connection, table_name, column_names=[], rows=[]):
		query = ""
		params = []
		
		for i in range(math.ceil(len(rows) / self._SQL_VALUES_LIMIT)):
			rows_start = i * self._SQL_VALUES_LIMIT
			rows_end = min((i + 1) * self._SQL_VALUES_LIMIT, len(rows))

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
			self._execute_cursor(connection, psycopg.sql.SQL(query).format(*params))
	
	def _update(self, table_name, column_names=[], rows=[], where=""):
		with self._pool.connection() as connection:
			self._update_cursor(connection, table_name, column_names, rows, where)
	
	def _update_cursor(self, connection, table_name, column_names=[], rows=[], where=""):
		query = ""
		params = []

		for i in range(math.ceil(len(rows) / self._SQL_VALUES_LIMIT)):
			rows_start = i * self._SQL_VALUES_LIMIT
			rows_end = min((i + 1) * self._SQL_VALUES_LIMIT, len(rows))

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
			self._execute_cursor(connection, psycopg.sql.SQL(query).format(*params))

	def _copy(self, query, args=[], rows=[]):
		with self._pool.connection() as connection:
			self._copy_cursor(connection, query, args, rows)
	
	def _copy_cursor(self, connection, query, args=[], rows=[]):
		with connection.cursor().copy(query, args) as copy:
				for row in rows:
					copy.write_row(row)
	
	def _execute(self, query, args=[]):
		with self._pool.connection() as connection:
			return self._execute_cursor(connection, query, args)

	def _execute_cursor(self, connection, query, args=[]):
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

			#if reset:
				# PostgreSQL performance parameters
				#self._execute_cursor(connection, "ALTER SYSTEM SET fsync=on")
				#self._execute_cursor(connection, "ALTER SYSTEM SET synchronous_commit=on")
				#self._execute_cursor(connection, "ALTER SYSTEM SET full_page_writes=on")
				#self._execute_cursor(connection, "ALTER SYSTEM SET bgwriter_lru_maxpages=100")
				#self._execute_cursor(connection, "ALTER SYSTEM SET archive_mode=off")
				#self._execute_cursor(connection, "ALTER SYSTEM SET log_checkpoints=off")
				#self._execute_cursor(connection, "ALTER SYSTEM SET min_wal_size=80")
				#self._execute_cursor(connection, "ALTER SYSTEM SET max_wal_size=1024")
				#self._execute_cursor(connection, "ALTER SYSTEM SET wal_level=replica")
				#self._execute_cursor(connection, "ALTER SYSTEM SET max_wal_senders=10")
				#self._execute_cursor(connection, "ALTER SYSTEM SET work_mem=4096")
				#self._execute_cursor(connection, "ALTER SYSTEM SET maintenance_work_mem=65536")
				#self._execute_cursor(connection, "ALTER SYSTEM SET shared_buffers=1024")
				#self._execute_cursor(connection, "ALTER SYSTEM SET temp_buffers=1024")
			#else:
			# Get device memory
			virtual_memory = psutil.virtual_memory().total
			work_memory = virtual_memory // 8192 // 8
			buffer_memory = virtual_memory // 8192 // 4

			# PostgreSQL performance parameters
			self._execute_cursor(connection, "ALTER SYSTEM SET fsync=off")
			self._execute_cursor(connection, "ALTER SYSTEM SET synchronous_commit=off")
			self._execute_cursor(connection, "ALTER SYSTEM SET full_page_writes=off")
			self._execute_cursor(connection, "ALTER SYSTEM SET bgwriter_lru_maxpages=0")
			self._execute_cursor(connection, "ALTER SYSTEM SET archive_mode=off")
			self._execute_cursor(connection, "ALTER SYSTEM SET log_checkpoints=off")
			self._execute_cursor(connection, "ALTER SYSTEM SET min_wal_size=4096")
			self._execute_cursor(connection, "ALTER SYSTEM SET max_wal_size=16384")
			self._execute_cursor(connection, "ALTER SYSTEM SET wal_level=minimal")
			self._execute_cursor(connection, "ALTER SYSTEM SET max_wal_senders=0")
			self._execute_cursor(connection, "ALTER SYSTEM SET work_mem=" + str(work_memory))
			self._execute_cursor(connection, "ALTER SYSTEM SET maintenance_work_mem=" + str(work_memory))
			self._execute_cursor(connection, "ALTER SYSTEM SET shared_buffers=" + str(buffer_memory))
			self._execute_cursor(connection, "ALTER SYSTEM SET temp_buffers=" + str(buffer_memory))

			# Create / alter users
			pg_users = self._execute_cursor(connection, "SELECT usename FROM pg_user").fetchall()
			for setup_config_user in setup_config_data["users"]:
				if setup_config_user["user"] != setup_config_data["default_connection"]["user"]:
					if setup_config_user["superuser"]:
						self._execute_cursor(connection, psycopg.sql.SQL(
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

						self._execute_cursor(connection, psycopg.sql.SQL(
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
						self._execute_cursor(connection, psycopg.sql.SQL(
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

						self._execute_cursor(connection, psycopg.sql.SQL(
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
			pg_databases = self._execute_cursor(connection, "SELECT datname FROM pg_database WHERE datistemplate = false").fetchall()
			for setup_config_database in setup_config_data["databases"]:
				if setup_config_database["database"] != "postgres" and setup_config_database["database"] != "template0" and setup_config_database["database"] != "template1":
					self._execute_cursor(connection, psycopg.sql.SQL(
						"""
						ALTER DATABASE {}
						OWNER TO {}
						""").format(
							psycopg.sql.Identifier(setup_config_database["database"]),
							psycopg.sql.Identifier(setup_config_database["owner"])
						)
					)
					self._execute_cursor(connection, psycopg.sql.SQL(
						"""
						ALTER DATABASE {}
						CONNECTION_LIMIT -1
						""").format(
							psycopg.sql.Identifier(setup_config_database["database"])
						)
					)
					#print("[SETUP] The database {0} has been altered.".format(setup_config_database["database"]))

					self._execute_cursor(connection, psycopg.sql.SQL(
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
						self._execute_cursor(connection, psycopg.sql.SQL("DROP DATABASE {} WITH (FORCE)").format(psycopg.sql.Identifier(pg_database[0])))
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
						self._execute_cursor(connection, psycopg.sql.SQL("DROP USER {}").format(psycopg.sql.Identifier(pg_user[0])))
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
					self._execute_cursor(connection, psycopg.sql.SQL("ALTER USER {} NOLOGIN").format(psycopg.sql.Identifier(setup_config_data["default_connection"]["user"])))
					#print("[SETUP] Login to the default user {0} has been disabled.".format(setup_config_data["default_connection"]["user"]))

					# Drop default user
					if setup_config_data["default_connection"]["user"] != "postgres":
						self._execute_cursor(connection, psycopg.sql.SQL("DROP USER {}").format(psycopg.sql.Identifier(setup_config_data["default_connection"]["user"])))
						#print("[SETUP] The default user {0} has been dropped.".format(setup_config_data["default_connection"]["user"]))
					
					# Close connection
					connection.close()
					connection = None
					#print("[SETUP] The connection to the PostgreSQL server closed.")
					break
			
			if reset == False:
				# Load database configuration data
				self._db_config_data = config.load("db.json")

				# Connection pool
				self._pool = psycopg_pool.ConnectionPool(" ".join(list(map("=".join, zip(
					map(str, self._db_config_data["connection"].keys()),
					map(str, self._db_config_data["connection"].values())
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
							pg_tables = self._execute_cursor(connection, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").fetchall()
							for pg_table in pg_tables:
								setup_config_database_table_found = False

								for setup_config_database_table in setup_config_database["tables"]:
									if pg_table[0] == setup_config_database_table["table_name"]:
										setup_config_database_table_found = True
										break
								
								if setup_config_database_table_found == False:
									self._execute_cursor(connection, psycopg.sql.SQL("DROP TABLE {} CASCADE").format(psycopg.sql.Identifier(pg_table[0])))
									#print("[SETUP] The table {0} has been dropped.".format(pg_table[0]))
							
							# Tables
							for setup_config_database_table in setup_config_database["tables"]:
								# Create tables
								self._execute_cursor(connection, psycopg.sql.SQL("CREATE TABLE IF NOT EXISTS {} (" + ", ".join(setup_config_database_table["create"]) + ")").format(psycopg.sql.Identifier(setup_config_database_table["table_name"])))
								#print("[SETUP] The table {0} has been created.".format(setup_config_database_table["table_name"]))

								# Insert data
								if "insert" in setup_config_database_table and len(setup_config_database_table["insert"]) == 2:
									self._insert(setup_config_database_table["table_name"], setup_config_database_table["insert"][0], setup_config_database_table["insert"][1])
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

	def get_source(self, column_names, source_name):
		return self._select("source", column_names, "name = '{}'".format(source_name)).fetchone()

	def set_source(self, column_names, row, source_name):
		self._update("source", column_names, [row], "t.name = '{}'".format(source_name))
	
	def get_source_label(self, column_names, source_id, source_label_name):
		return self._select("source_label", column_names, "source_id = '{}' AND name = '{}'".format(source_id, source_label_name)).fetchone()

	def get_url(self, column_names, url_address):
		return self._select("url", column_names, "address = '{}'".format(url_address)).fetchone()

	def add_url(self, column_names, row):
		self._insert("url", column_names, [row])
	
	def add_data(self, column_names, row):
		self._insert("data", column_names, [row])

	def add_addresses(self, connection, column_names, rows):
		self._insert_cursor(connection, "address", column_names, rows)

	def add_data_only(self, sources_path, source_path, source_url, source_label_id, response_stream):
		with file.open([sources_path, source_path], "wb") as f:
			for chunk in response_stream:
				# Write file
				f.write(chunk)
		
		# Add url and data
		self.__add_url_and_data(source_path, source_url, source_label_id)
	
	def add_data_and_addresses(self, sources_path, source_path, source_name, source_url, currency_id, source_label_id, response_stream, content_type=""):
		with self._pool.connection() as connection:
			with file.open([sources_path, source_path], "wb") as f:
				self.__pre_add_addresses(connection, currency_id, source_label_id)
				
				if source_name == "LoyceV":
					with connection.cursor().copy("COPY address (address) FROM STDIN") as copy:
						prev_text = ""
						
						if content_type == "application/x-gzip":
							# Decompress object
							decompress_obj = isal_zlib.decompressobj(32 + isal_zlib.MAX_WBITS)

							for chunk in response_stream:
								# Write file
								f.write(chunk)

								# Decompress
								bytes = decompress_obj.decompress(chunk)
								
								# Add BTC addresses
								prev_text = self.__add_some_btc_addresses(copy, bytes, prev_text)
						else:
							for chunk in response_stream:
								# Write file
								f.write(chunk)

								# Add BTC addresses
								prev_text = self.__add_some_btc_addresses(copy, chunk, prev_text)
						
						# Add last address
						if len(prev_text) > 0:
							copy.write_row([prev_text.strip()])
				elif source_name == "Bitcoin Generator Scam":
					prev_text = ""

					for chunk in response_stream:
						# Write file
						f.write(chunk)

						text = prev_text + chunk.decode("ASCII").replace("{'", "").replace("{ '", "").replace(" '", "").replace("',", "").replace("'}", "").replace("'", "")
						text_lines = text.splitlines(True)
						prev_text = text_lines[-1]
						
						# Add addresses
						addresses = []
						for text_line in text_lines[:-1]:
							addresses.append([text_line.strip()])
						self.add_addresses(connection, ["address"], addresses)

						# TODO: https://blockchair.com/search?q=
					# Add last address
					if len(prev_text) > 0:
						self.add_addresses(connection, ["address"], [[prev_text.strip()]])
				elif source_name == "CryptoScamDB":
					chunks = []
					for chunk in response_stream.iter_content(chunk_size=4096):
						# Write file
						f.write(chunk)
						
						chunks.append(chunk)
					text = b"".join(chunks)
					text_json = json.loads(text)

					# Add addresses
					addresses = []
					for address in text_json["result"].keys():
						addresses.append([address])
					self.add_addresses(connection, ["address"], addresses)
					
					# TODO: https://blockchair.com/search?q=

				self.__post_add_addresses(connection, currency_id)

		# Add url and data
		self.__add_url_and_data(source_path, source_url, source_label_id)
	
	def __pre_add_addresses(self, connection, currency_id, source_label_id):
		if currency_id is not None:
			self._execute_cursor(connection, psycopg.sql.SQL(
				"""
				ALTER TABLE {}
					ALTER {} SET DEFAULT {}
				""").format(
					psycopg.sql.Identifier("address"),
					psycopg.sql.Identifier("currency_id"),
					currency_id
			))
		if source_label_id is not None:
			self._execute_cursor(connection, psycopg.sql.SQL(
				"""
				ALTER TABLE {}
					ALTER {} SET DEFAULT {}
				""").format(
					psycopg.sql.Identifier("address"),
					psycopg.sql.Identifier("source_label_id"),
					source_label_id
			))
		self._execute_cursor(connection, psycopg.sql.SQL(
			"""
			ALTER TABLE {}
				ALTER {} DROP NOT NULL,
				ALTER {} DROP NOT NULL
			""").format(
				psycopg.sql.Identifier("address"),
				psycopg.sql.Identifier("source_label_id"),
				psycopg.sql.Identifier("address")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} DROP CONSTRAINT {}").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_address_id_pkey")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} DROP CONSTRAINT {}").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_currency_id_fkey")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} DROP CONSTRAINT {}").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_source_label_id_fkey")
		))
		if currency_id is not None:
			self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} DROP CONSTRAINT {}").format(
				psycopg.sql.Identifier("address"),
				psycopg.sql.Identifier("address_address_key")
			))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} DROP CONSTRAINT {}").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_currency_id_check")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} DROP CONSTRAINT {}").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_source_label_id_check")
		))

	def __add_some_btc_addresses(self, copy, bytes, prev_text):
		text = prev_text + bytes.decode("ASCII")
		text_lines = text.splitlines(True)
		prev_text = text_lines[-1]
		
		# Add BTC addresses
		for text_line in text_lines[:-1]:
			copy.write_row([text_line.strip()])
		
		return prev_text
	
	def __post_add_addresses(self, connection, currency_id):
		self._execute_cursor(connection, psycopg.sql.SQL(
			"""
			ALTER TABLE {}
				ALTER {} SET NOT NULL,
				ALTER {} SET NOT NULL,
				ALTER {} DROP DEFAULT,
				ALTER {} DROP DEFAULT
			""").format(
				psycopg.sql.Identifier("address"),
				psycopg.sql.Identifier("source_label_id"),
				psycopg.sql.Identifier("address"),
				psycopg.sql.Identifier("currency_id"),
				psycopg.sql.Identifier("source_label_id")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} PRIMARY KEY ({})").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_address_id_pkey"),
			psycopg.sql.Identifier("address_id")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} FOREIGN KEY ({}) REFERENCES {} ({})").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_currency_id_fkey"),
			psycopg.sql.Identifier("currency_id"),
			psycopg.sql.Identifier("currency"),
			psycopg.sql.Identifier("currency_id")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} FOREIGN KEY ({}) REFERENCES {} ({})").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_source_label_id_fkey"),
			psycopg.sql.Identifier("source_label_id"),
			psycopg.sql.Identifier("source_label"),
			psycopg.sql.Identifier("source_label_id")
		))
		if currency_id is not None:
			self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} UNIQUE ({})").format(
				psycopg.sql.Identifier("address"),
				psycopg.sql.Identifier("address_address_key"),
				psycopg.sql.Identifier("address")
			))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} CHECK ({} > 0)").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_currency_id_check"),
			psycopg.sql.Identifier("currency_id")
		))
		self._execute_cursor(connection, psycopg.sql.SQL("ALTER TABLE {} ADD CONSTRAINT {} CHECK ({} > 0)").format(
			psycopg.sql.Identifier("address"),
			psycopg.sql.Identifier("address_source_label_id_check"),
			psycopg.sql.Identifier("source_label_id")
		))
	
	def __add_url_and_data(self, source_path, source_url, source_label_id):
		# Add url
		self.add_url(["address"], [source_url])
		url_id = self.get_url(["url_id"], source_url)[0]

		# Add data
		self.add_data(
			[
				"source_label_id",
				"url_id",
				"roles",
				"path",
				"crawled_at"
			],
			[
				source_label_id,
				url_id,
				"{}",
				source_path,
				datetime.datetime.now()
			]
		)