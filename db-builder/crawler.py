# External imports
import datetime
import requests
import threading

# Internal imports
from parser import Parser

class Crawler:
	def __init__(self, configuration, database):
		# Private properties
		self.__configuration = configuration
		self.__database = database
		self.__session = requests.Session()

		# Start threads
		self.__threads = []
		for source_config in self.__configuration["sources"]:
			if source_config["active"]:
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
			responses = []
			
			# Get weekly update request
			responses.append(self.__request_stream(source_config["urls"][0]))

			# Get daily update requests
			response = self.__request(source_config["urls"][1])
			daily_update_links = [response.url + node.get("href") for node in Parser(response.text).get_all_links() if node.get("href").endswith(".txt")]
			for daily_update_link in daily_update_links:
				responses.append(self.__request_stream(daily_update_link))

			for response in responses:
				self.__crawl_response(source_config, source_last_crawled_at, response)
	
	def __crawl_response(self, source_config, source_last_crawled_at, response):
		# Get response
		response_last_modified_at = datetime.datetime.strptime(response.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z")

		if source_config["name"] == "LoyceV":
			# Add BTC addresses (if not added yet)
			if(source_last_crawled_at is None or source_last_crawled_at < response_last_modified_at):
				self.__database.add_btc_addresses(response, response.headers.get("content-type"))
		
		self.__database.set_source(["last_crawled_at"], [response_last_modified_at], source_config["name"])
	
	def __request(self, url):
		return self.__session.get(url)
	
	def __request_stream(self, url):
		return self.__session.get(url, stream=True)