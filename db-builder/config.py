# External imports
import json
import os

def load(file_name):
	with open(file_name, "r") as f:
		config_data = json.load(f)

		return config_data

def save(file_name, config_data={}):
	with open(file_name, "w") as f:
		f.write(json.dumps(config_data, indent="\t"))

def delete(file_name=""):
	os.remove(file_name)