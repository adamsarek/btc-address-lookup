# External imports
import datetime
from isal import isal_zlib
from isal import igzip
import json
import math
import threading

# Internal imports
from database.database import Database
from database.database_connection import DatabaseConnection
from database.database_copy import DatabaseCopy
from file.file import File
from file.json_file import JsonFile
from mapper.address_mapper import AddressMapper
from mapper.currency_mapper import CurrencyMapper
from mapper.data_mapper import DataMapper
from mapper.source_label_url_mapper import SourceLabelUrlMapper
from mapper.url_mapper import UrlMapper
from request.request import Request
from response.response import Response
from response.html_response import HtmlResponse

class Crawler:
	def __init__(self, config_data):
		self.__config_data = config_data
		self.__db_config_data = JsonFile("db.json").load()
		
		with Database().get_connection(self.__db_config_data["connection"]) as connection:
			db_connection = DatabaseConnection(connection)

			# Get currencies
			self.__currencies = CurrencyMapper().select(
				db_connection, [
					"currency_id",
					"name",
					"code",
					"blockchair_request_name"
				],
				[],
				"blockchair_request_name IS NOT NULL"
			)

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
			)

			# Sort out source label urls
			source_label_urls_with_known_new_addresses = []
			source_label_urls_with_unknown_new_addresses = []
			source_label_urls_without_new_addresses = []
			for source_label_url in source_label_urls:
				if source_label_url["new_addresses_currency_id"] is None:
					source_label_urls_without_new_addresses.append(source_label_url)
				elif source_label_url["new_addresses_currency_id"] == 2:
					source_label_urls_with_unknown_new_addresses.append(source_label_url)
				elif source_label_url["source_label_url_id"] != 1:
					source_label_urls_with_known_new_addresses.append(source_label_url)
				# LoyceV / All BTC Addresses - Weekly update
				else:
					self.__crawl_source_label_url(db_connection, source_label_url)
			
			# Crawl source label urls
			db_connection.alter_table(
				"address", [
					"ALTER source_label_id DROP NOT NULL",
					"ALTER address DROP NOT NULL",
					"DROP CONSTRAINT address_address_id_pkey",
					"DROP CONSTRAINT address_currency_id_fkey",
					"DROP CONSTRAINT address_source_label_id_fkey",
					"DROP CONSTRAINT address_address_key",
					"DROP CONSTRAINT address_currency_id_check",
					"DROP CONSTRAINT address_source_label_id_check"
				]
			)
			
			self.__crawl_source_label_urls_in_threads(db_connection, source_label_urls_with_known_new_addresses)
			
			db_connection.alter_table("address", ["ADD CONSTRAINT address_address_key UNIQUE (address)"])
			
			self.__crawl_source_label_urls_in_threads(db_connection, source_label_urls_with_unknown_new_addresses)
			
			db_connection.alter_table(
				"address", [
					"ALTER source_label_id SET NOT NULL",
					"ALTER address SET NOT NULL",
					"ADD CONSTRAINT address_address_id_pkey PRIMARY KEY (address_id)",
					"ADD CONSTRAINT address_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES currency (currency_id)",
					"ADD CONSTRAINT address_source_label_id_fkey FOREIGN KEY (source_label_id) REFERENCES source_label (source_label_id)",
					"ADD CONSTRAINT address_currency_id_check CHECK (currency_id > 0)",
					"ADD CONSTRAINT address_source_label_id_check CHECK (source_label_id > 0)"
				]
			)
			
			self.__crawl_source_label_urls_in_threads(db_connection, source_label_urls_without_new_addresses)

	def __crawl_source_label_urls_in_threads(self, db_connection, source_label_urls):
		# Start threads
		threads = []
		
		for source_label_url in source_label_urls:
			thread = threading.Thread(
				target = self.__crawl_source_label_url,
				args = (db_connection, source_label_url,)
			)
			thread.start()
			threads.append(thread)
		
		# Join threads
		for thread in threads:
			thread.join()
	
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
			with Request().request(source_label_url["address"]) as response:
				self.__crawl_response(db_connection, response, source_label_url)
		# LoyceV / All BTC Addresses - Daily update
		elif source_label_url["source_label_url_id"] == 2:
			# Get html response
			with Request().request(source_label_url["address"], False) as response:
				response_links = [response.url + node.get("href") for node in HtmlResponse(response.text).get_links() if node.get("href").endswith(".txt")]
				for response_link in response_links:
					# Crawl response
					response = Request().request(response_link.strip())
					self.__crawl_response(db_connection, response, source_label_url)
		# BitcoinAbuse / Reported Addresses
		# CheckBitcoinAddress / Reported Addresses
		# Cryptscam / Last Reported Addresses
		elif(source_label_url["source_label_url_id"] == 3
		or   source_label_url["source_label_url_id"] == 4
		or   source_label_url["source_label_url_id"] == 13):
			# Get html response
			with Request().request(source_label_url["address"], False) as response:
				response_links = [node.get("href") for node in HtmlResponse(response.text).select(".pagination a")]
				last_page_id = 1
				for response_link in response_links:
					page_id = int(response_link.split("?page=")[1])
					if page_id > last_page_id:
						last_page_id = page_id
					
				for i in range(math.ceil(last_page_id / self.__config_data["crawler"]["thread_count"])):
					# Start threads
					threads = []

					page_thread_count = self.__config_data["crawler"]["thread_count"] if self.__config_data["crawler"]["thread_count"] * (i + 1) < last_page_id else last_page_id - self.__config_data["crawler"]["thread_count"] * i

					for j in range(page_thread_count):
						page_id = self.__config_data["crawler"]["thread_count"] * i + j

						# Crawl response
						with Request().request(response.url.split("?page=")[0] + "?page=" + str(page_id + 1), False) as response:
							# BitcoinAbuse / Reported Addresses
							if source_label_url["source_label_url_id"] == 3:
								self.__crawl_responses_in_threads(
									db_connection,
									["https://www.bitcoinabuse.com" + node.get("href") for node in HtmlResponse(response.text).select(".row div > a")],
									source_label_url,
									-1
								)
							# CheckBitcoinAddress / Reported Addresses
							elif source_label_url["source_label_url_id"] == 4:
								self.__crawl_responses_in_threads(
									db_connection,
									["https://checkbitcoinaddress.com/" + node.get("href") for node in HtmlResponse(response.text).select(".ml-3 > a")],
									source_label_url,
									-1
								)
							# Cryptscam / Last Reported Addresses
							elif source_label_url["source_label_url_id"] == 13:
								self.__crawl_responses_in_threads(
									db_connection,
									[response.url.split("/en?page=")[0].strip() + node.get("href") for node in HtmlResponse(response.text).select("div.font-weight-bold a[href]")],
									source_label_url,
									-1
								)
							
							thread = threading.Thread(
								target = self.__crawl_response,
								args = (db_connection, response, source_label_url, page_id,)
							)
							thread.start()
							threads.append(thread)
					
					# Join threads
					for thread in threads:
						thread.join()
		# CryptoBlacklist / Searched Reported BTC Addresses
		# Cryptscam / Searched Reported BTC Addresses
		# BitcoinWhosWho / Searched Reported BTC Addresses
		elif(source_label_url["source_label_url_id"] == 5
		or   source_label_url["source_label_url_id"] == 12
		or   source_label_url["source_label_url_id"] == 15):
			# Get BTC addresses
			btc_address_count = AddressMapper().select_count(
				db_connection,
				[],
				"currency_id = 1"
			)[0]["count"]
			
			for i in range(math.ceil(btc_address_count / self.__config_data["crawler"]["thread_count"])):
				# Start threads
				threads = []

				btc_addresses = AddressMapper().select(
					db_connection, [
						"address_id",
						"address"
					],
					[],
					"currency_id = 1",
					"",
					"{0} OFFSET {1}".format(
						self.__config_data["crawler"]["thread_count"],
						self.__config_data["crawler"]["thread_count"] * i
					)
				)
				
				for btc_address in btc_addresses:
					# Crawl response
					with Request().request(source_label_url["address"] + btc_address["address"]) as response:
						thread = threading.Thread(
							target = self.__crawl_response,
							args = (db_connection, response, source_label_url,)
						)
						thread.start()
						threads.append(thread)
				
				# Join threads
				for thread in threads:
					thread.join()
		# CryptoBlacklist / Last Reported Ethereum Addresses
		elif source_label_url["source_label_url_id"] == 6:
			# Crawl response
			with Request().request(source_label_url["address"], False) as response:
				self.__crawl_response(db_connection, response, source_label_url)

				self.__crawl_responses_in_threads(
					db_connection,
					[node.get("href") for node in HtmlResponse(response.text).get_links(class_="wp-block-latest-posts__post-title")],
					source_label_url,
					-1
				)
		# BitcoinAIS / Reported Addresses
		elif source_label_url["source_label_url_id"] == 10:
			# Crawl response
			with Request().request(source_label_url["address"], False) as response:
				self.__crawl_response(db_connection, response, source_label_url)

				source_label_url_depth = 0
				
				while(True):
					self.__crawl_responses_in_threads(
						db_connection,
						["https://bitcoinais.com" + node.get("href") for node in HtmlResponse(response.text).select("#commentaar a") if node.get("href") != "/cdn-cgi/l/email-protection"],
						source_label_url,
						-1
					)

					response_links = [response.url.split("/page/")[0] + node.get("href") for node in HtmlResponse(response.text).select(".paginas > a") if "/page/" in node.get("href") and int(node.get("href").split("/page/")[1]) > int(response.url.split("/page/")[1])]

					if len(response_links) > 0:
						# Crawl response
						with Request().request(response_links[0].strip(), False) as response:
							self.__crawl_response(db_connection, response, source_label_url, source_label_url_depth + 1)
						
						source_label_url_depth += 1
					else:
						break
		# SeeKoin / Reported BTC Addresses
		elif source_label_url["source_label_url_id"] == 14:
			# Crawl response
			with Request().request(source_label_url["address"], False) as response:
				self.__crawl_response(db_connection, response, source_label_url)

				source_label_url_depth = 0
				
				while(True):
					self.__crawl_responses_in_threads(
						db_connection,
						[node.get("href") for node in HtmlResponse(response.text).select("a[href*=\"addr-\"]")],
						source_label_url,
						-1
					)

					response_links = [node.get("href") for node in HtmlResponse(response.text).select("a[href*=\"?d=\"]")]

					if len(response_links) > 0:
						# Crawl response
						with Request().request(response_links[0].strip(), False) as response:
							self.__crawl_response(db_connection, response, source_label_url, source_label_url_depth + 1)
						
						source_label_url_depth += 1
					else:
						break

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
	
	def __get_currency_from_address(self, address):
		currency_id = 2

		for currency in self.__currencies:
			# Crawl Blockchair
			with Request().request("https://blockchair.com/{0}/address/{1}".format(currency["blockchair_request_name"], address), False) as response:
				if response.status_code == 200:
					if HtmlResponse(response.text).select(".address-aside-wrap > .transaction-costs .transaction-costs__value .wb-ba")[0].text != "–":
						currency_id = currency["currency_id"]
						break
		
		return currency_id
	
	def __add_addresses_from_text(self, db_connection, source_label_url, addresses_text, detect_address_currency=False):
		currency_id = source_label_url["new_addresses_currency_id"]
		source_label_id = source_label_url["source_label_id"]
		
		addresses = []
		
		if detect_address_currency:
			for address in addresses_text:
				currency_id = self.__get_currency_from_address(address.strip())
				addresses.append([currency_id, source_label_id, address.strip()])
		else:
			for address in addresses_text:
				addresses.append([currency_id, source_label_id, address.strip()])
		
		AddressMapper().insert(db_connection, ["currency_id", "source_label_id", "address"], addresses)
	
	def __add_last_address_from_text(self, db_connection, source_label_url, prev_text, detect_address_currency=False):
		if len(prev_text) > 0:
			currency_id = source_label_url["new_addresses_currency_id"]
			source_label_id = source_label_url["source_label_id"]

			if detect_address_currency:
				currency_id = self.__get_currency_from_address(prev_text.strip())
			address = [currency_id, source_label_id, prev_text.strip()]

			AddressMapper().insert(db_connection, ["currency_id", "source_label_id", "address"], [address])
	
	def __add_addresses_from_response(self, db_connection, response, source_label_url, source_label_url_depth, file, add_address_option=0, chunk_decode_option=0, detect_address_currency=False):
		# LoyceV / All BTC Addresses - Weekly update
		if add_address_option == 0:
			if source_label_url_depth == 0:
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
							db_copy.copy_row([source_label_url["new_addresses_currency_id"], source_label_url["source_label_id"], text_line.strip()])
					
					# Add last address
					if len(prev_text) > 0:
						db_copy.copy_row([source_label_url["new_addresses_currency_id"], source_label_url["source_label_id"], prev_text.strip()])
			else:
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
					self.__add_addresses_from_text(db_connection, source_label_url, text_lines[:-1], detect_address_currency)
				
				# Add last address
				self.__add_last_address_from_text(db_connection, source_label_url, prev_text, detect_address_currency)
		# LoyceV / All BTC Addresses - Daily update
		# Bitcoin Generator Scam / Scam Non-BTC Addresses
		elif add_address_option == 1:
			prev_text = ""

			for chunk in response:
				# Write file
				file.write(chunk)

				# Get text from chunk
				(prev_text, text_lines) = self.__get_text_from_chunk(prev_text, chunk, chunk_decode_option)
				
				# Add addresses
				self.__add_addresses_from_text(db_connection, source_label_url, text_lines[:-1], detect_address_currency)
			
			# Add last address
			self.__add_last_address_from_text(db_connection, source_label_url, prev_text, detect_address_currency)
		# BitcoinAbuse / Reported Addresses
		elif add_address_option == 2:
			# Save file from response
			Response(response).save(file)
			
			if source_label_url_depth < 0:
				# Add last address
				self.__add_last_address_from_text(db_connection, source_label_url, response.url.split("/")[-1].strip(), detect_address_currency)
		# CheckBitcoinAddress / Reported Addresses
		elif add_address_option == 3:
			# Save file from response
			Response(response).save(file)
			
			if source_label_url_depth < 0:
				# Add last address
				self.__add_last_address_from_text(db_connection, source_label_url, response.url.split("?address=")[1].strip(), detect_address_currency)
		# CryptoBlacklist / Last Reported Ethereum Addresses
		elif add_address_option == 4:
			# Save file from response
			Response(response).save(file)

			if source_label_url_depth < 0:
				# Add last address
				self.__add_last_address_from_text(db_connection, source_label_url, response.url.split("/")[-2].strip())
		# BitcoinAIS / Reported Addresses
		elif add_address_option == 5:
			# Save file from response
			Response(response).save(file)

			if source_label_url_depth < 0:
				# Add last address
				self.__add_last_address_from_text(db_connection, source_label_url, response.url.split("/")[-1].strip(), detect_address_currency)
		# CryptoScamDB / Reported Addresses
		elif add_address_option == 6:
			# Save file from response
			chunks = Response(response).save(file, True)

			text = b"".join(chunks)
			text_json = json.loads(text)

			# Add addresses
			self.__add_addresses_from_text(db_connection, source_label_url, text_json["result"].keys(), detect_address_currency)
		# Cryptscam / Last Reported Addresses
		elif add_address_option == 7:
			# Save file from response
			Response(response).save(file)
			
			if source_label_url_depth < 0:
				# Add last address
				self.__add_last_address_from_text(db_connection, source_label_url, response.url.split("/")[-1].strip(), detect_address_currency)
	
	def __add_addresses(self, db_connection, response, source_label_url, source_label_url_depth, file):
		# LoyceV / All BTC Addresses - Weekly update
		if source_label_url["source_label_url_id"] == 1:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 0, None, False)
		# LoyceV / All BTC Addresses - Daily update
		elif source_label_url["source_label_url_id"] == 2:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 1, 0, False)
		# BitcoinAbuse / Reported Addresses
		elif source_label_url["source_label_url_id"] == 3:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 2, None, True)
		# CheckBitcoinAddress / Reported Addresses
		elif source_label_url["source_label_url_id"] == 4:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 3, None, True)
		# CryptoBlacklist / Last Reported Ethereum Addresses
		elif source_label_url["source_label_url_id"] == 6:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 4, None, False)
		# Bitcoin Generator Scam / Scam Non-BTC Addresses
		elif source_label_url["source_label_url_id"] == 9:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 1, 1, True)
		# BitcoinAIS / Reported Addresses
		elif source_label_url["source_label_url_id"] == 10:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 5, None, True)
		# CryptoScamDB / Reported Addresses
		elif source_label_url["source_label_url_id"] == 11:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 6, None, True)
		# Cryptscam / Last Reported Addresses
		elif source_label_url["source_label_url_id"] == 13:
			self.__add_addresses_from_response(db_connection, response, source_label_url, source_label_url_depth, file, 7, None, True)
	
	def __get_data_file_name(self, response, source_label_url, source_label_url_depth):
		if "?" in response.url.split("/")[-1].strip():
			data_file_name = response.url.split("/")[-1].split("?")[0].strip()
		else:
			data_file_name = response.url.split("/")[-1].strip()
		
		# LoyceV / All BTC Addresses - Weekly update
		if source_label_url["source_label_url_id"] == 1:
			if source_label_url["last_crawled_at"] is not None:
				source_label_url_depth = 1
		# BitcoinAbuse / Reported Addresses
		# BitcoinAIS / Reported Addresses
		elif(source_label_url["source_label_url_id"] == 3
		or   source_label_url["source_label_url_id"] == 10):
			if source_label_url_depth >= 0:
				data_file_name = "reported_btc_addresses_{0}.html".format(str(source_label_url_depth + 1))
			else:
				data_file_name += ".html"
		# CheckBitcoinAddress / Reported Addresses
		elif source_label_url["source_label_url_id"] == 4:
			if source_label_url_depth >= 0:
				data_file_name = "abuse_reports_to_bitcoin_address_{0}.html".format(str(source_label_url_depth + 1))
			else:
				data_file_name = response.url.split("?address=")[1].strip() + ".html"
		# CryptoBlacklist / Searched Reported BTC Addresses
		# Cryptscam / Searched Reported BTC Addresses
		# BitcoinWhosWho / Searched Reported BTC Addresses
		elif(source_label_url["source_label_url_id"] == 5
		or   source_label_url["source_label_url_id"] == 12
		or   source_label_url["source_label_url_id"] == 15):
			data_file_name += ".html"
		# CryptoBlacklist / Last Reported Ethereum Addresses
		elif source_label_url["source_label_url_id"] == 6:
			if source_label_url_depth >= 0:
				data_file_name = "last_reported_eth_addresses.html"
			else:
				data_file_name = response.url.split("/")[-2].strip() + ".html"
		# CryptoScamDB / Reported Addresses
		elif source_label_url["source_label_url_id"] == 11:
			data_file_name = "reported_addresses.json"
		# Cryptscam / Last Reported Addresses
		elif source_label_url["source_label_url_id"] == 13:
			if source_label_url_depth >= 0:
				data_file_name = "last_reported_addresses_{0}.html".format(str(source_label_url_depth + 1))
			else:
				data_file_name += ".html"
		# SeeKoin / Reported BTC Addresses
		elif source_label_url["source_label_url_id"] == 14:
			if source_label_url_depth >= 0:
				data_file_name = "reported_btc_addresses_{0}.html".format(str(source_label_url_depth + 1))
			else:
				data_file_name = response.url.split("/addr-")[1].strip() + ".html"
		
		return data_file_name
	
	def __crawl_responses_in_threads(self, db_connection, response_links, source_label_url, source_label_url_depth=0):
		# Start threads
		threads = []
		
		for response_link in response_links:
			# Crawl response
			with Request().request(response_link.strip(), False) as response:
				thread = threading.Thread(
					target = self.__crawl_response,
					args = (db_connection, response, source_label_url, source_label_url_depth,)
				)
				thread.start()
				threads.append(thread)
		
		# Join threads
		for thread in threads:
			thread.join()

	def __crawl_response(self, db_connection, response, source_label_url, source_label_url_depth=0):
		response_last_modified_at = datetime.datetime.fromtimestamp(0)
		if response.headers.get("last-modified"):
			response_last_modified_at = datetime.datetime.strptime(response.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z")
		
		response_content_length = int(response.headers.get("content-length")) if "content-length" in response.headers.keys() else len(response.text)
		
		ok_file = response.status_code == 200
		new_file = source_label_url["last_crawled_at"] is None or source_label_url["last_crawled_at"] < response_last_modified_at
		not_empty_file = response_content_length > 0
		allowed_file = True

		if source_label_url["source_label_url_id"] == 14:
			allowed_file = response.text != "Your IP was blacklisted"

		# Add addresses (if not added yet)
		if ok_file and new_file and not_empty_file and allowed_file:
			# LoyceV / All BTC Addresses - Weekly update
			if source_label_url["source_label_url_id"] == 1:
				if source_label_url["last_crawled_at"] is not None:
					source_label_url_depth = 1
			
			# Get data file name
			data_file_name = self.__get_data_file_name(response, source_label_url, source_label_url_depth)
			
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
					self.__add_addresses(db_connection, response, source_label_url, source_label_url_depth, file)

			# Add url
			UrlMapper().insert(db_connection, ["address"], [[response.url]])
			url = UrlMapper().select(db_connection, ["url_id"], [], "address = '{}'".format(response.url))[0]

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