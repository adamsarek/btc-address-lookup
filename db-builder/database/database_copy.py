class DatabaseCopy:
	def __init__(self, copy):
		self.__copy = copy
	
	def get_copy(self):
		return self.__copy
	
	def copy_row(self, row):
		self.__copy.write_row(row)

	def copy_rows(self, rows):
		for row in rows:
			self.copy_row(row)