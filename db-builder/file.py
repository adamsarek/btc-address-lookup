# External imports
import builtins
import os

def open(file_path_parts, mode, encoding=""):
	file_path = get_file_path(file_path_parts)
	dir_name = os.path.dirname(file_path)

	if dir_name != "" and not os.path.exists(dir_name):
		os.makedirs(dir_name)
	
	if encoding == "":
		return builtins.open(file_path, mode)
	else:
		return builtins.open(file_path, mode, encoding)

def get_file_path(file_path_parts):
	if type(file_path_parts) is list:
		return os.path.join(*file_path_parts)
	else:
		return file_path_parts

def exists(file_path):
	return os.path.exists(file_path)