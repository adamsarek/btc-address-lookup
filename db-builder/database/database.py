# External imports
import psycopg
import psycopg_pool

class Database(object):
	def __new__(cls):
		if not hasattr(cls, "instance"):
			cls.instance = super(Database, cls).__new__(cls)
			cls.instance.__connection_pool = {}
			cls.instance.SQL_VALUES_LIMIT = 1000
		return cls.instance

	def __get_connection_string(self, connection_details):
		return " ".join(list(map("=".join, zip(
			map(str, connection_details.keys()),
			map(str, connection_details.values())
		))))

	def get_connection(self, connection_details, connection_pool=True):
		if connection_pool:
			connection_string = self.__get_connection_string(connection_details)
			if connection_string not in self.__connection_pool:
				self.__connection_pool[connection_string] = psycopg_pool.ConnectionPool(connection_string)
			
			return self.__connection_pool[connection_string].connection()
		else:
			return psycopg.connect(**connection_details, cursor_factory=psycopg.ClientCursor)

	def get_copy(self, connection, query, args=[]):
		return connection.cursor(row_factory=psycopg.rows.dict_row).copy(query, args)