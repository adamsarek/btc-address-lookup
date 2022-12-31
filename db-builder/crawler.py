# External imports
import datetime
from isal import isal_zlib
from isal import igzip
import json
import requests
import threading
import urllib.parse
import urllib.robotparser

# Internal imports
from console.console import Console
from database.database import Database
from database.database_connection import DatabaseConnection
from database.database_copy import DatabaseCopy
from file.file import File
from file.json_file import JsonFile
from mapper.address_mapper import AddressMapper
from mapper.data_mapper import DataMapper
from mapper.source_label_url_mapper import SourceLabelUrlMapper
from mapper.url_mapper import UrlMapper
from response.html_response import HtmlResponse

class Crawler:
	def __init__(self, config_data):
		self.__config_data = config_data
		self.__db_config_data = JsonFile("db.json").load()
		self.__session = requests.Session()

		with Database().get_connection(self.__db_config_data["connection"]) as connection:
			db_connection = DatabaseConnection(connection)

			# Get source label urls
			source_label_urls = SourceLabelUrlMapper().select(
				db_connection, [
					"source_label_url.source_label_url_id",
					"source_label_url.last_crawled_at",
					"source_label.source_label_id",
					"source_label.new_addresses_currency_id",
					"url.address",
					"source.name"
				], [
					"JOIN source_label ON source_label.source_label_id = source_label_url.source_label_id",
					"JOIN url ON url.url_id = source_label_url.url_id",
					"JOIN source ON source.source_id = source_label.source_id"
				],
				"",
				"source_label_url.source_label_url_id"
			).fetchall()

			# Get source label urls without new addresses
			source_label_urls_without_new_addresses = []
			for source_label_url in source_label_urls:
				if source_label_url["new_addresses_currency_id"] is not None:
					self.__crawl_source_label_url(db_connection, source_label_url)
				else:
					source_label_urls_without_new_addresses.append(source_label_url)
			
			# Start threads
			self.__threads = []
			for source_label_url in source_label_urls_without_new_addresses:
				thread = threading.Thread(
					target = self.__crawl_source_label_url,
					args = (db_connection, source_label_url,)
				)
				thread.start()
				self.__threads.append(thread)
			
			# Join threads
			for thread in self.__threads:
				thread.join()

	def __get_robots_parser(self, url):
		# Get robots.txt url
		parsed_url = urllib.parse.urlparse(url)
		robots_url = "{url.scheme}://{url.netloc}/robots.txt".format(url=parsed_url)
		robots_txt = self.__session.get(robots_url)

		# Robots.txt exists
		if robots_txt.status_code == 200 and len(robots_txt.text) > 0:
			robots_parser = urllib.robotparser.RobotFileParser()
			robots_parser.set_url(robots_url)
			robots_parser.disallow_all = False
			robots_parser.parse(robots_txt.text.splitlines())
			
			return robots_parser

		# Robots.txt does not exist
		return None

	def __request(self, url, stream=True):
		robots_parser = self.__get_robots_parser(url)

		# Robots.txt exists
		if robots_parser is not None:
			# Url can be requested
			if robots_parser.can_fetch(self.__config_data["crawler"]["user_agent"], url):
				return self.__session.get(url, stream=stream)
			
			# Url cannot be requested
			raise Exception("A request to the URL: {0} could not be sent because the URL is not allowed to be accessed by the robots.txt".format(url))
		
		# Robots.txt does not exist => Url can be requested
		return self.__session.get(url, stream=stream)
	
	def __crawl_source_label_url(self, db_connection, source_label_url):
		# LoyceV / All BTC Addresses - Weekly update
		# Bitcoin Generator Scam / Scam BTC Addresses - Scam addresses
		# Bitcoin Generator Scam / Scam BTC Addresses - Transactionless scam addresses
		# Bitcoin Generator Scam / Scam Non-BTC Addresses
		# CryptoScamDB / Reported Addresses
		if(source_label_url["source_label_url_id"] == 1
		or source_label_url["source_label_url_id"] == 7
		or source_label_url["source_label_url_id"] == 8
		or source_label_url["source_label_url_id"] == 9
		or source_label_url["source_label_url_id"] == 11):
			# Crawl response
			response = self.__request(source_label_url["address"])
			self.__crawl_response(db_connection, response, source_label_url)
		# LoyceV / All BTC Addresses - Daily update
		elif source_label_url["source_label_url_id"] == 2:
			# Get html response
			response = self.__request(source_label_url["address"], False)
			response_links = [response.url + node.get("href") for node in HtmlResponse(response.text).get_links() if node.get("href").endswith(".txt")]
			for response_link in response_links:
				# Crawl response
				response = self.__request(response_link.strip())
				self.__crawl_response(db_connection, response, source_label_url)
		# CryptoBlacklist / Last Reported Ethereum Addresses
		# Cryptscam / Last Reported Addresses
		elif(source_label_url["source_label_url_id"] == 6
		or   source_label_url["source_label_url_id"] == 13):
			# Crawl response
			response = self.__request(source_label_url["address"], False)
			self.__crawl_response(db_connection, response, source_label_url)
		else:
			Console().print_warn("TODO: " + str(source_label_url))

	def __save_file_from_response(self, response, file, return_chunks=False):
		if return_chunks:
			chunks = []
			
			for chunk in response.iter_content(chunk_size=4096):
				# Write file
				file.write(chunk)

				chunks.append(chunk)
			
			return chunks
		else:
			for chunk in response.iter_content(chunk_size=4096):
				# Write file
				file.write(chunk)
	
	def __get_text_from_chunk(self, prev_text, chunk, chunk_decode_option=0):
		# Decode chunk
		if chunk_decode_option == 0:
			chunk = chunk.decode("ASCII")
		elif chunk_decode_option == 1:
			chunk = chunk.decode("ASCII").replace("{'", "").replace("{ '", "").replace(" '", "").replace("',", "").replace("'}", "").replace("'", "")

		# Get text
		text = prev_text + chunk
		text_lines = text.splitlines(True)

		return (text_lines[-1], text_lines)
	
	def __add_addresses_from_text(self, db_connection, addresses_text):
		# Add addresses
		addresses = []
		for address in addresses_text:
			addresses.append([address.strip()])
		AddressMapper().insert(db_connection, ["address"], addresses)
	
	def __add_last_address_from_text(self, db_connection, prev_text):
		# Add last address
		if len(prev_text) > 0:
			AddressMapper().insert(db_connection, ["address"], [[prev_text.strip()]])
	
	def __add_addresses_from_response(self, db_connection, response, source_label_url, source_label_url_depth, file, add_address_option=0, chunk_decode_option=0, detect_address_currency=False):
		if add_address_option == 0:
			with Database().get_copy(db_connection.get_connection(), "COPY address (address) FROM STDIN") as copy:
				db_copy = DatabaseCopy(copy)

				# Decompress object
				decompress_obj = isal_zlib.decompressobj(32 + isal_zlib.MAX_WBITS)

				prev_text = ""
				
				for chunk in response:
					# Write file
					file.write(chunk)

					# Decompress
					chunk = decompress_obj.decompress(chunk)

					# Get text from chunk
					(prev_text, text_lines) = self.__get_text_from_chunk(prev_text, chunk)
					
					# Add addresses
					for text_line in text_lines[:-1]:
						db_copy.copy_row([text_line.strip()])
				
				# Add last address
				if len(prev_text) > 0:
					db_copy.copy_row([prev_text.strip()])
		elif add_address_option == 1:
			prev_text = ""

			for chunk in response:
				# Write file
				file.write(chunk)

				# Get text from chunk
				(prev_text, text_lines) = self.__get_text_from_chunk(prev_text, chunk, chunk_decode_option)
				
				# Add addresses
				self.__add_addresses_from_text(db_connection, text_lines[:-1])

				if detect_address_currency:
					# TODO: https://blockchair.com/search?q=
					pass
			# Add last address
			self.__add_last_address_from_text(db_connection, prev_text)
		elif add_address_option == 2:
			if source_label_url_depth == 0:
				response_links = [node.get("href") for node in HtmlResponse(response.text).get_links(class_="wp-block-latest-posts__post-title")]
				for response_link in response_links:
					# Crawl response
					response = self.__request(response_link.strip(), False)
					self.__crawl_response(db_connection, response, source_label_url, 1)
				
				# Save file from response
				self.__save_file_from_response(response, file)
			elif source_label_url_depth == 1:
				# Save file from response
				self.__save_file_from_response(response, file)

				# Add last address
				self.__add_last_address_from_text(db_connection, response.url.split("/")[-2].strip())
		elif add_address_option == 3:
			# Save file from response
			chunks = self.__save_file_from_response(response, file, True)

			text = b"".join(chunks)
			text_json = json.loads(text)

			# Add addresses
			self.__add_addresses_from_text(db_connection, text_json["result"].keys())
			
			# TODO: https://blockchair.com/search?q=
		elif add_address_option == 4:
			if source_label_url_depth < 50:
				response_url_parts = response.url.split("/en?page=")
				page_id = int(response_url_parts[1].strip())

				# Crawl response
				if (page_id + 1) < 50:
					response = self.__request("{0}/en?page={1}".format(response_url_parts[0].strip(), str(page_id + 1)), False)
					self.__crawl_response(db_connection, response, source_label_url, page_id)

				# Save file from response
				self.__save_file_from_response(response, file)

				response_links = [response_url_parts[0].strip() + node.get("href") for node in HtmlResponse(response.text).select("div.font-weight-bold a[href]")]
				for response_link in response_links:
					# Crawl response
					response = self.__request(response_link.strip(), False)
					self.__crawl_response(db_connection, response, source_label_url, 50)
			else:
				# Save file from response
				self.__save_file_from_response(response, file)

				# Add last address
				self.__add_last_address_from_text(db_connection, response.url.split("/")[-1].strip())
			
			# TODO: https://blockchair.com/search?q=
	
	def __add_addresses(self, db_connection, response, source_label_url, source_label_url_depth, file):
		# LoyceV / All BTC Addresses - Weekly update
		if source_label_url["source_label_url_id"] == 1:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 0, 0, None)
		# LoyceV / All BTC Addresses - Daily update
		elif source_label_url["source_label_url_id"] == 2:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 1, 0, False)
		# CryptoBlacklist / Last Reported Ethereum Addresses
		elif source_label_url["source_label_url_id"] == 6:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 2, None, None)
		# Bitcoin Generator Scam / Scam Non-BTC Addresses
		elif source_label_url["source_label_url_id"] == 9:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 1, 1, True)
		# CryptoScamDB / Reported Addresses
		elif source_label_url["source_label_url_id"] == 11:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 3, None, None)
		# Cryptscam / Last Reported Addresses
		elif source_label_url["source_label_url_id"] == 13:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 4, None, None)

	def __crawl_response(self, db_connection, response, source_label_url, source_label_url_depth=0):
		response_last_modified_at = datetime.datetime.fromtimestamp(0)
		if response.headers.get("last-modified"):
			response_last_modified_at = datetime.datetime.strptime(response.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z")
		
		# Add addresses (if not added yet)
		if(source_label_url["last_crawled_at"] is None or source_label_url["last_crawled_at"] < response_last_modified_at):
			# Get data file name
			data_file_name = response.url.split("/")[-1].strip()
			
			# CryptoBlacklist / Last Reported Ethereum Addresses
			if source_label_url["source_label_url_id"] == 6:
				if source_label_url_depth == 0:
					data_file_name = "last_reported_eth_addresses.html"
				elif source_label_url_depth == 1:
					data_file_name = response.url.split("/")[-2].strip() + ".html"
			# CryptoScamDB / Reported Addresses
			elif source_label_url["source_label_url_id"] == 11:
				data_file_name = "reported_addresses.json"
			# Cryptscam / Last Reported Addresses
			elif source_label_url["source_label_url_id"] == 13:
				if source_label_url_depth < 50:
					data_file_name = "last_reported_addresses_{0}.html".format(str(source_label_url_depth + 1))
				else:
					data_file_name = response.url.split("/")[-1].strip() + ".html"

				
			# Data & local file path parts
			data_file_path_parts = [str(source_label_url["source_label_url_id"]), data_file_name]
			local_data_file_path_parts = [self.__config_data["crawler"]["data_path"]] + data_file_path_parts
			
			with File(local_data_file_path_parts).open("wb") as file:
				# Only add local file
				if source_label_url["new_addresses_currency_id"] is None:
					for chunk in response:
						# Write file
						file.write(chunk)
				# Add local file & addresses
				else:
					if source_label_url_depth == 0:
						db_connection.alter_table(
							"address", [
								"ALTER source_label_id DROP NOT NULL",
								"ALTER address DROP NOT NULL",
								"ALTER source_label_id SET DEFAULT {}".format(source_label_url["source_label_id"]),
								"DROP CONSTRAINT address_address_id_pkey",
								"DROP CONSTRAINT address_currency_id_fkey",
								"DROP CONSTRAINT address_source_label_id_fkey",
								"DROP CONSTRAINT address_currency_id_check",
								"DROP CONSTRAINT address_source_label_id_check"
							]
						)

						# Single currency addresses
						if source_label_url["new_addresses_currency_id"] != 2:
							db_connection.alter_table("address", ["ALTER currency_id SET DEFAULT {}".format(source_label_url["new_addresses_currency_id"])])

							# LoyceV / All BTC Addresses - Weekly update
							if source_label_url["source_label_url_id"] == 1:
								db_connection.alter_table("address", ["DROP CONSTRAINT address_address_key"])
					
					self.__add_addresses(db_connection, response, source_label_url, source_label_url_depth, file)

					if source_label_url_depth == 0:
						db_connection.alter_table(
							"address", [
								"ALTER source_label_id SET NOT NULL",
								"ALTER address SET NOT NULL",
								"ALTER source_label_id DROP DEFAULT",
								"ADD CONSTRAINT address_address_id_pkey PRIMARY KEY (address_id)",
								"ADD CONSTRAINT address_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES currency (currency_id)",
								"ADD CONSTRAINT address_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES source_label (source_label_id)",
								"ADD CONSTRAINT address_currency_id_check CHECK (currency_id > 0)",
								"ADD CONSTRAINT address_source_label_id_check CHECK (source_label_id > 0)"
							]
						)

						# Single currency addresses
						if source_label_url["new_addresses_currency_id"] != 2:
							db_connection.alter_table("address", ["ALTER currency_id DROP DEFAULT"])
							
							# LoyceV / All BTC Addresses - Weekly update
							if source_label_url["source_label_url_id"] == 1:
								db_connection.alter_table("address", ["ADD CONSTRAINT address_address_key UNIQUE (address)"])

			# Add url
			UrlMapper().insert(db_connection, ["address"], [[response.url]])
			url = UrlMapper().select(db_connection, ["url_id"], [], "address = '{}'".format(response.url)).fetchone()

			# Add data
			DataMapper().insert(
				db_connection, [
					"source_label_url_id",
					"url_id",
					"roles",
					"path",
					"crawled_at"
				], [
					[
						source_label_url["source_label_url_id"],
						url["url_id"],
						"{}",
						File(data_file_path_parts).get_file_path(),
						datetime.datetime.now()
					]
				]
			)

			# Add source label url
			SourceLabelUrlMapper().update(
				db_connection, [
					"last_crawled_at"
				], [
					[response_last_modified_at]
				],
				"t.source_label_url_id = '{}'".format(source_label_url["source_label_url_id"])
			)