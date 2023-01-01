# External imports
import math
import psycopg

# Internal imports
from console.console import Console
from database.database import Database

class DatabaseConnection:
	def __init__(self, connection):
		self.__connection = connection
	
	def get_connection(self):
		return self.__connection

	def __execute(self, query, args=[]):
		cursor = []

		try:
			cursor = self.__connection.cursor(row_factory=psycopg.rows.dict_row).execute(query, args)
		except (Exception, psycopg.DatabaseError) as error:
			Console().print_warn(str(error))
		
		return cursor
	
	def commit(self):
		self.__connection.commit()
	
	def alter_system(self, column):
		self.__execute(
			psycopg.sql.SQL(
				"ALTER SYSTEM SET " + column
			)
		)

	def create_user(self, user_name, password, superuser):
		if user_name != "postgres":
			if superuser:
				self.__execute(
					psycopg.sql.SQL(
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
						"""
					).format(
						psycopg.sql.Identifier(user_name)
					), [
						password
					]
				)
			else:
				self.__execute(
					psycopg.sql.SQL(
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
						"""
					).format(
						psycopg.sql.Identifier(user_name)
					), [
						password
					]
				)

	def alter_user(self, user_name, password, superuser):
		if superuser:
			self.__execute(
				psycopg.sql.SQL(
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
					"""
				).format(
					psycopg.sql.Identifier(user_name)
				), [
					password
				]
			)
		else:
			self.__execute(
				psycopg.sql.SQL(
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
					"""
				).format(
					psycopg.sql.Identifier(user_name)
				), [
					password
				]
			)

	def drop_user(self, user_name):
		if user_name != "postgres":
			self.__execute(
				psycopg.sql.SQL(
					"DROP USER {}"
				).format(
					psycopg.sql.Identifier(user_name)
				)
			)
	
	def disable_user(self, user_name):
		self.__execute(
			psycopg.sql.SQL(
				"ALTER USER {} NOLOGIN"
			).format(
				psycopg.sql.Identifier(user_name)
			)
		)
	
	def create_database(self, database_name, owner):
		if database_name != "postgres" and database_name != "template0" and database_name != "template1":
			self.__execute(
				psycopg.sql.SQL(
					"""
					CREATE DATABASE {}
					WITH
						OWNER = {}
						ENCODING = 'UTF8'
						CONNECTION_LIMIT = -1
						IS_TEMPLATE = False
					"""
				).format(
					psycopg.sql.Identifier(database_name),
					psycopg.sql.Identifier(owner)
				)
			)

	def alter_database(self, database_name, owner):
		if database_name != "postgres" and database_name != "template0" and database_name != "template1":
			self.__execute(
				psycopg.sql.SQL(
					"ALTER DATABASE {} OWNER TO {}"
				).format(
					psycopg.sql.Identifier(database_name),
					psycopg.sql.Identifier(owner)
				)
			)
			self.__execute(
				psycopg.sql.SQL(
					"ALTER DATABASE {} CONNECTION_LIMIT -1"
				).format(
					psycopg.sql.Identifier(database_name)
				)
			)

	def drop_database(self, database_name):
		if database_name != "postgres" and database_name != "template0" and database_name != "template1":
			self.__execute(
				psycopg.sql.SQL(
					"DROP DATABASE {} WITH (FORCE)"
				).format(
					psycopg.sql.Identifier(database_name)
				)
			)

	def create_table(self, table_name, columns=[]):
		table_name_parts = []
		for table_name_part in table_name.split("."):
			table_name_parts.append(psycopg.sql.Identifier(table_name_part))

		self.__execute(
			psycopg.sql.SQL(
				"CREATE TABLE IF NOT EXISTS {} (" + ", ".join(columns) + ")"
			).format(
				psycopg.sql.SQL(".").join(table_name_parts)
			)
		)

	def alter_table(self, table_name, columns):
		table_name_parts = []
		for table_name_part in table_name.split("."):
			table_name_parts.append(psycopg.sql.Identifier(table_name_part))

		self.__execute(
			psycopg.sql.SQL(
				"ALTER TABLE {} " + ", ".join(columns)
			).format(
				psycopg.sql.SQL(".").join(table_name_parts)
			)
		)

	def drop_table(self, table_name):
		table_name_parts = []
		for table_name_part in table_name.split("."):
			table_name_parts.append(psycopg.sql.Identifier(table_name_part))

		self.__execute(
			psycopg.sql.SQL(
				"DROP TABLE {} CASCADE"
			).format(
				psycopg.sql.SQL(".").join(table_name_parts)
			)
		)

	def select(self, table_name, column_names, joins=[], where="", order_by=""):
		query = "SELECT "
		query += ", ".join(["{}"] * len(column_names))
		query += " FROM {} "
		query += " ".join(joins)
		query += ((" WHERE " + where) if (where != "") else (""))
		query += ((" ORDER BY " + order_by) if (order_by != "") else (""))
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

		return self.__execute(
			psycopg.sql.SQL(
				query
			).format(
				*params
			)
		)

	def insert(self, table_name, column_names, rows):
		query = ""
		params = []

		for i in range(math.ceil(len(rows) / Database().SQL_VALUES_LIMIT)):
			rows_start = i * Database().SQL_VALUES_LIMIT
			rows_end = min((i + 1) * Database().SQL_VALUES_LIMIT, len(rows))

			query += "INSERT INTO {} ("
			query += ", ".join(["{}"] * len(column_names))
			query += ") VALUES ("
			
			table_name_parts = []
			for table_name_part in table_name.split("."):
				table_name_parts.append(psycopg.sql.Identifier(table_name_part))
			params.append(psycopg.sql.SQL(".").join(table_name_parts))

			for column_name in column_names:
				params.append(psycopg.sql.Identifier(str(column_name)))

			query_value_params = []
			for row in rows[rows_start:rows_end]:
				query_value_params.append(", ".join(["{}"] * len(row)))

				for col in row:
					params.append(psycopg.sql.Literal(col))
			
			query += "), (".join(query_value_params)
			query += ") ON CONFLICT DO NOTHING;"
		
		self.__execute(
			psycopg.sql.SQL(
				query
			).format(
				*params
			)
		)

	def update(self, table_name, column_names, rows, where):
		query = ""
		params = []

		for i in range(math.ceil(len(rows) / Database().SQL_VALUES_LIMIT)):
			rows_start = i * Database().SQL_VALUES_LIMIT
			rows_end = min((i + 1) * Database().SQL_VALUES_LIMIT, len(rows))

			query += "UPDATE {} AS t SET "
			query += ", ".join(["{} = {}"] * len(column_names))
			query += " FROM ( VALUES ("
			
			table_name_parts = []
			for table_name_part in table_name.split("."):
				table_name_parts.append(psycopg.sql.Identifier(table_name_part))
			params.append(psycopg.sql.SQL(".").join(table_name_parts))

			for column_name in column_names:
				params.append(psycopg.sql.Identifier(str(column_name)))
				params.append(psycopg.sql.Identifier("c", str(column_name)))

			query_value_params = []
			for row in rows[rows_start:rows_end]:
				query_value_params.append(", ".join(["{}"] * len(row)))

				for col in row:
					params.append(psycopg.sql.Literal(col))
			
			for column_name in column_names:
				params.append(psycopg.sql.Identifier(str(column_name)))
			
			query += "), (".join(query_value_params)
			query += ") ) AS c ("
			query += ", ".join(["{}"] * len(column_names))
			query += ")" + ((" WHERE " + where) if (where != "") else ("")) + ";"

		self.__execute(
			psycopg.sql.SQL(
				query
			).format(
				*params
			)
		)

	def delete(self, table_name, where):
		table_name_parts = []
		for table_name_part in table_name.split("."):
			table_name_parts.append(psycopg.sql.Identifier(table_name_part))

		self.__execute(
			psycopg.sql.SQL(
				"DELETE FROM {}" + ((" WHERE " + where) if (where != "") else (""))
			).format(
				psycopg.sql.SQL(".").join(table_name_parts)
			)
		)