# External imports
import builtins
import os

class File:
	def __init__(self, file_path_parts):
		self.__file_path = self.__get_file_path(file_path_parts)
	
	def __get_file_path(self, file_path_parts):
		if type(file_path_parts) is list:
			return os.path.join(*file_path_parts)
		else:
			return file_path_parts
	
	def get_file_path(self):
		return self.__file_path
	
	def open(self, mode, encoding=""):
		dir_name = os.path.dirname(self.__file_path)

		if dir_name != "" and not os.path.exists(dir_name):
			os.makedirs(dir_name)
		
		if encoding == "":
			return builtins.open(self.__file_path, mode)
		else:
			return builtins.open(self.__file_path, mode, encoding)
	
	def delete(self):
		os.remove(self.__file_path)
	
	def exists(self):
		return os.path.exists(self.__file_path)