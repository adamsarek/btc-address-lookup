# External imports
import json
import os

# Internal imports
import file

def load(file_path_parts):
	with file.open(file_path_parts, "r") as f:
		config_data = json.load(f)

		return config_data

def save(file_path_parts, config_data={}):
	with file.open(file_path_parts, "w") as f:
		f.write(json.dumps(config_data, indent="\t"))

def delete(file_path_parts):
	os.remove(file.get_file_path(file_path_parts))