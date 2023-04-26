class Response:
	def __init__(self, response):
		self.__response = response

	def save(self, file, return_chunks=False):
		if return_chunks:
			chunks = []

			if self.__response.headers.get("transfer-encoding") == "chunked":
				for chunk in self.__response:
					# Write file
					file.write(chunk)

					chunks.append(chunk)
			else:
				for chunk in self.__response.iter_content(chunk_size=4096):
					# Write file
					file.write(chunk)

					chunks.append(chunk)

			return chunks
		else:
			if self.__response.headers.get("transfer-encoding") == "chunked":
				for chunk in self.__response:
					# Write file
					file.write(chunk)
			else:
				for chunk in self.__response.iter_content(chunk_size=4096):
					# Write file
					file.write(chunk)