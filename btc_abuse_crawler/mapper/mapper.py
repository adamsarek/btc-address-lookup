class Mapper:
	def __init__(self, table_name):
		self.__table_name = table_name
	
	def select(self, db_connection, column_names, joins=[], where="", order_by="", limit=""):
		return db_connection.select(self.__table_name, column_names, joins, where, order_by, limit)
	
	def select_count(self, db_connection, joins=[], where="", order_by="", limit=""):
		return db_connection.select_count(self.__table_name, joins, where, order_by, limit)

	def insert(self, db_connection, column_names, rows):
		db_connection.insert(self.__table_name, column_names, rows)

	def update(self, db_connection, column_names, rows, where):
		db_connection.update(self.__table_name, column_names, rows, where)

	def delete(self, db_connection, where):
		db_connection.delete(self.__table_name, where)
	
	def copy(self, db_copy, rows):
		db_copy.copy(rows)