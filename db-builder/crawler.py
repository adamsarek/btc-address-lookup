# External imports
import datetime
import requests
import threading

class Crawler:
	def __init__(self, configuration, database):
		# Private properties
		self.__configuration = configuration
		self.__database = database

		# Start threads
		self.__threads = []
		for source_config in self.__configuration["sources"]:
			thread = threading.Thread(
				target = self.__crawl_source,
				args = (source_config,)
			)
			thread.start()
			self.__threads.append(thread)
		
		# Join threads
		for thread in self.__threads:
			thread.join()

	def __crawl_source(self, source_config):
		# Get source
		source = self.__database.get_source(["last_crawled_at"], source_config["name"])
		source_last_crawled_at = source[0]
		
		if source_config["name"] == "LoyceV":
			# Get request
			response_stream = self.__request_stream(source_config["urls"][0])
			response_last_modified_at = datetime.datetime.strptime(response_stream.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z")

			# Download all BTC addresses (if not downloaded yet)
			if(source_last_crawled_at is None or source_last_crawled_at < response_last_modified_at):
				self.__database.add_btc_addresses(response_stream, "GZIP")
				self.__database.set_source(["last_crawled_at"], [response_last_modified_at], source_config["name"])
	
	def __request_stream(self, url):
		return requests.Session().get(url, stream=True)