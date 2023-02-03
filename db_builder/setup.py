# External imports
import copy
import psutil
import shutil
import subprocess

# Internal imports
from console.console import Console
from database.database import Database
from database.database_connection import DatabaseConnection
from file.file import File
from file.json_file import JsonFile

class Setup:
	def __init__(self, config_data, reset, restart_db, delete_setup_config):
		self.__SETUP_CONFIG_FILE_PATH = "setup.json"

		# Delete crawled data
		if reset:
			if File(config_data["crawler"]["data_path"]).exists():
				shutil.rmtree(config_data["crawler"]["data_path"])
		
		if JsonFile(self.__SETUP_CONFIG_FILE_PATH).exists():
			# Load setup configuration
			self.__setup_config_data = JsonFile(self.__SETUP_CONFIG_FILE_PATH).load()
			
			# Reset / setup
			if reset:
				self.__reset()
			else:
				self.__setup()
			
			# Restart PostgreSQL database service
			self.__restart_db(restart_db)

			# Delete setup configuration
			if reset == False and delete_setup_config:
				JsonFile(self.__SETUP_CONFIG_FILE_PATH).delete()
		else:
			# Restart PostgreSQL database service
			self.__restart_db(restart_db)
	
	def __restart_db(self, restart_db):
		for service in list(psutil.win_service_iter()):
			if service.name().startswith("postgresql"):
				# Restart PostgreSQL database service
				if restart_db:
					subprocess.run(["net", "stop", service.name()])
					subprocess.run(["net", "start", service.name()])
				break

	def __setup_users_and_databases(self, db_connection):
		# Alter & create users
		for setup_config_user in self.__setup_config_data["users"]:
			if setup_config_user["user"] != self.__setup_config_data["default_connection"]["user"]:
				db_connection.alter_user(setup_config_user["user"], setup_config_user["password"], setup_config_user["superuser"])
				db_connection.create_user(setup_config_user["user"], setup_config_user["password"], setup_config_user["superuser"])
		
		# Alter & create databases
		for setup_config_database in self.__setup_config_data["databases"]:
			if setup_config_database["database"] != "postgres" and setup_config_database["database"] != "template0" and setup_config_database["database"] != "template1":
				db_connection.alter_database(setup_config_database["database"], setup_config_database["owner"])
				db_connection.create_database(setup_config_database["database"], setup_config_database["owner"])
		
		# Drop databases
		pg_databases = db_connection.select("pg_database", ["datname"], [], "datistemplate = false")
		for pg_database in pg_databases:
			if pg_database["datname"] != "postgres":
				setup_config_database_found = False

				for setup_config_database in self.__setup_config_data["databases"]:
					if pg_database["datname"] == setup_config_database["database"]:
						setup_config_database_found = True
						break
				
				if setup_config_database_found == False:
					db_connection.drop_database(pg_database["datname"])

		# Drop users
		pg_users = db_connection.select("pg_user", ["usename"])
		for pg_user in pg_users:
			if pg_user["usename"] != self.__setup_config_data["default_connection"]["user"] and pg_user["usename"] != "postgres":
				setup_config_user_found = False

				for setup_config_user in self.__setup_config_data["users"]:
					if pg_user["usename"] == setup_config_user["user"]:
						setup_config_user_found = True
						break
				
				if setup_config_user_found == False:
					db_connection.drop_user(pg_user["usename"])
	
	def __reset(self):
		Console().print_info("\nResetting...")

		# Save new setup configuration
		new_setup_config_data = copy.deepcopy(self.__setup_config_data)
		new_setup_config_data["default_connection"]["user"] = "postgres"
		new_setup_config_data["default_connection"]["password"] = "postgres"
		JsonFile(self.__SETUP_CONFIG_FILE_PATH).save(new_setup_config_data)

		# Set new setup configuration users & databases
		self.__setup_config_data["users"] = [
			{
				"user": "postgres",
				"password": "postgres",
				"superuser": True
			}
		]
		self.__setup_config_data["databases"] = []

		with Database().get_connection(self.__setup_config_data["default_connection"], connection_pool=False) as connection:
			db_connection = DatabaseConnection(connection)
			
			# PostgreSQL default parameters
			db_connection.alter_system("fsync=on")
			db_connection.alter_system("synchronous_commit=on")
			db_connection.alter_system("full_page_writes=on")
			db_connection.alter_system("bgwriter_lru_maxpages=100")
			db_connection.alter_system("archive_mode=off")
			db_connection.alter_system("log_checkpoints=off")
			db_connection.alter_system("min_wal_size=80")
			db_connection.alter_system("max_wal_size=1024")
			db_connection.alter_system("wal_level=replica")
			db_connection.alter_system("max_wal_senders=10")
			db_connection.alter_system("work_mem=4096")
			db_connection.alter_system("maintenance_work_mem=65536")
			db_connection.alter_system("shared_buffers=1024")
			db_connection.alter_system("temp_buffers=1024")

			# Create / alter / drop users & databases
			self.__setup_users_and_databases(db_connection)
	
	def __setup(self):
		Console().print_info("\nSetting up...")

		with Database().get_connection(self.__setup_config_data["default_connection"], connection_pool=False) as connection:
			db_connection = DatabaseConnection(connection)

			# Get device memory
			virtual_memory = psutil.virtual_memory().total
			work_memory = virtual_memory // 8192 // 8
			buffer_memory = virtual_memory // 8192 // 4
			
			# PostgreSQL performance parameters
			db_connection.alter_system("fsync=off")
			db_connection.alter_system("synchronous_commit=off")
			db_connection.alter_system("full_page_writes=off")
			db_connection.alter_system("bgwriter_lru_maxpages=0")
			db_connection.alter_system("archive_mode=off")
			db_connection.alter_system("log_checkpoints=off")
			db_connection.alter_system("min_wal_size=4096")
			db_connection.alter_system("max_wal_size=16384")
			db_connection.alter_system("wal_level=minimal")
			db_connection.alter_system("max_wal_senders=0")
			db_connection.alter_system("work_mem=" + str(work_memory))
			db_connection.alter_system("maintenance_work_mem=" + str(work_memory))
			db_connection.alter_system("shared_buffers=" + str(buffer_memory))
			db_connection.alter_system("temp_buffers=" + str(buffer_memory))

			# Create / alter / drop users & databases
			self.__setup_users_and_databases(db_connection)

		# Disable login to the default user (only if there is another superuser)
		for setup_config_user in self.__setup_config_data["users"]:
			if setup_config_user["superuser"] and setup_config_user["user"] != self.__setup_config_data["default_connection"]["user"]:
				# Save new setup configuration
				new_setup_config_data = copy.deepcopy(self.__setup_config_data)
				new_setup_config_data["default_connection"]["user"] = setup_config_user["user"]
				new_setup_config_data["default_connection"]["password"] = setup_config_user["password"]
				JsonFile(self.__SETUP_CONFIG_FILE_PATH).save(new_setup_config_data)

				with Database().get_connection(new_setup_config_data["default_connection"], connection_pool=False) as connection:
					db_connection = DatabaseConnection(connection)

					# Disable login to the default user
					db_connection.disable_user(self.__setup_config_data["default_connection"]["user"])
					
					# Drop the default user
					if self.__setup_config_data["default_connection"]["user"] != "postgres":
						db_connection.drop_user(self.__setup_config_data["default_connection"]["user"])

		for setup_config_database in self.__setup_config_data["databases"]:
			for setup_config_user in self.__setup_config_data["users"]:
				if setup_config_database["owner"] == setup_config_user["user"]:
					# Set new database configuration connection
					db_config_data = {
						"connection": copy.deepcopy(self.__setup_config_data["default_connection"])
					}
					db_config_data["connection"]["user"] = setup_config_user["user"]
					db_config_data["connection"]["password"] = setup_config_user["password"]
					db_config_data["connection"]["dbname"] = setup_config_database["database"]

					with Database().get_connection(db_config_data["connection"], connection_pool=False) as connection:
						db_connection = DatabaseConnection(connection)

						# Drop tables
						pg_tables = db_connection.select("information_schema.tables", ["table_name"], [], "table_schema = 'public'")
						for pg_table in pg_tables:
							setup_config_database_table_found = False

							for setup_config_database_table in setup_config_database["tables"]:
								if pg_table["table_name"] == setup_config_database_table["table_name"]:
									setup_config_database_table_found = True
									break
							
							if setup_config_database_table_found == False:
								db_connection.drop_table(pg_table["table_name"])
					
						# Create & insert into tables
						for setup_config_database_table in setup_config_database["tables"]:
							# Create tables
							db_connection.create_table(setup_config_database_table["table_name"], setup_config_database_table["create"])

							# Insert into tables
							if "insert" in setup_config_database_table:
								db_connection.insert(setup_config_database_table["table_name"], setup_config_database_table["insert"][0], setup_config_database_table["insert"][1])
							
							# Grant access into tables
							if "grant" in setup_config_database_table:
								db_connection.grant_table(setup_config_database_table["table_name"], setup_config_database_table["grant"])
								
								for i, grant in enumerate(setup_config_database_table["grant"]):
									setup_config_database_table["grant"][i]["privilege"] = "USAGE, SELECT"
								db_connection.grant_sequence(setup_config_database_table["table_name"] + "_" + setup_config_database_table["table_name"] + "_id_seq", setup_config_database_table["grant"])
					
					break