# External imports
import datetime
import requests
import threading

# Internal imports
import file
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
			# Get weekly update request
			response = self.__request_stream(source_config["urls"][0])
			self.__crawl_response(source_config, source_last_crawled_at, file.get_file_path([source_config["name"], source_config["urls"][0].split("/")[-1]]), source_config["urls"][0], 1, 1, response)

			# Get daily update requests
			response = self.__request(source_config["urls"][1])
			daily_update_links = [response.url + node.get("href") for node in Parser(response.text).get_all_links() if node.get("href").endswith(".txt")]
			for daily_update_link in daily_update_links:
				response = self.__request_stream(daily_update_link)
				self.__crawl_response(source_config, source_last_crawled_at, file.get_file_path([source_config["name"], daily_update_link.split("/")[-2], daily_update_link.split("/")[-1]]), daily_update_link, 1, 1, response)
		elif source_config["name"] == "Bitcoin Generator Scam":
			for i in range(len(source_config["urls"])):
				response = self.__request_stream(source_config["urls"][i])
				currency_id = None if i > 1 else 1
				source_label_id = self.__database.get_source_label(["source_label_id"], "Scam Non-BTC Address List")[0] if i > 1 else None
				self.__crawl_response(source_config, source_last_crawled_at, file.get_file_path([source_config["name"], source_config["urls"][i].split("/")[-1]]), source_config["urls"][i], currency_id, source_label_id, response)
	
	def __crawl_response(self, source_config, source_last_crawled_at, source_path, source_url, currency_id, source_label_id, response):
		# Get response
		response_last_modified_at = datetime.datetime.strptime(response.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z")

		if source_config["name"] == "LoyceV":
			# Add BTC addresses (if not added yet)
			if(source_last_crawled_at is None or source_last_crawled_at < response_last_modified_at):
				self.__database.add_data_and_addresses(self.__configuration["sources_path"], source_path, source_config["name"], source_url, currency_id, source_label_id, response, response.headers.get("content-type"))
		elif source_config["name"] == "Bitcoin Generator Scam":
			# Add addresses (if not added yet)
			if(source_last_crawled_at is None or source_last_crawled_at < response_last_modified_at):
				if source_label_id is None:
					self.__database.add_data_only(self.__configuration["sources_path"], source_path, source_url, self.__database.get_source_label(["source_label_id"], "Scam BTC Address List")[0], response)
				else:
					self.__database.add_data_and_addresses(self.__configuration["sources_path"], source_path, source_config["name"], source_url, currency_id, source_label_id, response, response.headers.get("content-type"))
		
		self.__database.set_source(["last_crawled_at"], [response_last_modified_at], source_config["name"])
	
	def __request(self, url):
		return self.__session.get(url)
	
	def __request_stream(self, url):
		return self.__session.get(url, stream=True)