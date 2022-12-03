# External imports
import datetime
import os
import requests
import zlib

# Internal imports
import file

class Crawler:
	def __init__(self, configuration, database):
		# Private properties
		self.__configuration = configuration
		self.__database = database

		# Crawl sources
		self.__crawl_sources()

	def __crawl_sources(self):
		for source_config in self.__configuration["sources"]:
			source = self.__database.get_source(["last_crawled_at"], source_config["name"])
			source_last_crawled_at = source[0]
			if source_config["name"] == "LoyceV":
				# Download all history of BTC addresses (only if not yet downloaded)
				if(not os.path.exists(os.path.join(self.__configuration["sources_path"], source_config["name"], source_config["urls"][0].split("/")[-1]))
				or source_last_crawled_at is None):
					response_stream = self.__request_stream(source_config["urls"][0])
					response_last_modified_at = datetime.datetime.strptime(response_stream.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z")
					
					decompress_obj = zlib.decompressobj(32 + zlib.MAX_WBITS)

					# Save stream
					with file.open([self.__configuration["sources_path"], source_config["name"], source_config["urls"][0].split("/")[-1]], "wb") as crawled_file:
						print(datetime.datetime.now().strftime("%H:%M:%S"))
						start = datetime.datetime.now().timestamp()
						print(start)
						prev_text = ""
						addresses = []
						address_add_limit = 1_000_000
						address_count = 0

						for chunk in response_stream:
							# Save chunk
							crawled_file.write(chunk)
							
							# Decompress
							bytes = decompress_obj.decompress(chunk)
							if bytes:
								text = prev_text + bytes.decode("ASCII")
								text_lines = text.splitlines()
								
								for text_line in text_lines[:-1]:
									addresses.append([text_line])

								prev_text = text_lines[-1]

								# Add BTC addresses to database
								if len(addresses) >= address_add_limit:
									end = datetime.datetime.now().timestamp() - start
									start = datetime.datetime.now().timestamp()
									print("1M! - " + datetime.datetime.now().strftime("%H:%M:%S") + " - " + str(address_add_limit / end))
									self.__database.add_btc_addresses(addresses[:address_add_limit])
									del addresses[:address_add_limit]

								address_count += text.count('\n')
						
						# Add BTC addresses to database
						if len(addresses) > 0:
							self.__database.add_btc_addresses(addresses)

						self.__database.set_source(["last_crawled_at"], [response_last_modified_at], source_config["name"])
						print("BTC addresses: " + str(address_count))
	
	def __request_stream(self, url):
		return requests.Session().get(url, stream=True)