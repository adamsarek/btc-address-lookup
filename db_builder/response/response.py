class Response:
	def __init__(self, response):
		self.__response = response

	def save(self, file, return_chunks=False):
		if return_chunks:
			chunks = []
			
			for chunk in self.__response.iter_content(chunk_size=4096):
				# Write file
				file.write(chunk)

				chunks.append(chunk)
			
			return chunks
		else:
			for chunk in self.__response.iter_content(chunk_size=4096):
				# Write file
				file.write(chunk)