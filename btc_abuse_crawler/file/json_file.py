# External imports
import json

# Internal imports
from file.file import File

class JsonFile(File):
	def __init__(self, file_path_parts):
		super().__init__(file_path_parts)
	
	def load(self, encoding=""):
		with super().open("r", encoding) as file:
			return json.load(file)

	def save(self, data, encoding=""):
		with super().open("w", encoding) as file:
			file.write(json.dumps(data, indent="\t"))