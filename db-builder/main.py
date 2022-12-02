# External imports
import datetime
import os
import requests
import threading
import zlib
#from dateutil.parser import parse as parsedate

#def download_gzip(url):
#	r = requests.get(url, stream=True)
#	gz = gzip.GzipFile(fileobj=r.raw)
#	gz.seek(0)

# TODO: ERROR - cannot drop a template database
# TODO: ERROR - role "x" cannot be dropped because some objects depend on it
# TODO: ERROR - role "db_admin" cannot be dropped because some objects depend on it
# TODO: ERROR - connection failed: :1), port 5432 failed: FATAL:  database "admin" does not exist

# TODO: https://stackoverflow.com/questions/12571913/python-ungzipping-stream-of-bytes
# TODO: https://www.psycopg.org/psycopg3/docs/advanced/pool.html
# TODO: https://pynative.com/psycopg2-python-postgresql-connection-pooling/
# TODO: https://www.bluebirz.net/en/make-it-chunks/
# TODO: https://stackoverflow.com/questions/19164332/converting-http-request-time-to-unix-timestamp-in-python
# TODO: https://stackoverflow.com/questions/29314287/python-requests-download-only-if-newer

# TODO: https://www.postgresql.org/docs/current/sql-copy.html
# TODO: https://www.postgresql.org/docs/current/populate.html
# TODO: https://www.psycopg.org/articles/2020/11/15/psycopg3-copy/
# TODO: https://stackoverflow.com/questions/758945/whats-the-fastest-way-to-do-a-bulk-insert-into-postgres
# TODO: https://stackoverflow.com/questions/7090243/sql-speed-up-performance-of-insert

# TODO: ALTER SYSTEM SET wal_level = minimal;
# TODO: u COPY nezapomenout dávat conn.commit()

# TODO: Automatický setup - spuštění instalace postgresql.exe, instalace PY knihoven

# Internal imports
from db import Database

RESET = False
DELETE_SETUP_CONFIG = False

def stream_gzip_decompress(stream):
	dec = zlib.decompressobj(32 + zlib.MAX_WBITS)
	for chunk in stream:
		rv = dec.decompress(chunk)
		if rv:
			yield rv

def download_all_addresses():
	url = "http://alladdresses.loyce.club/all_Bitcoin_addresses_ever_used_in_order_of_first_appearance.txt.gz"
	response = requests.get(url, stream=True)
	url_timestamp = datetime.datetime.strptime(response.headers.get("last-modified"), "%a, %d %b %Y %H:%M:%S %Z").timestamp()
	#url_content_length = response.headers.get("content-length")
	file_timestamp = os.path.getmtime("addresses.txt")
	#file_content_length = os.path.getsize("addresses.txt")
	print(str(url_timestamp) + " / " + str(file_timestamp))
	#print(str(url_content_length) + " / " + str(file_content_length)) # na serveru je menší kvůli GZIP kompresi

	"""
	database.update("source", [
		"source_id",
		"roles",
		"name"
	], [
		[1, [1], "Adam"],
		[2, [1, 2], "Ben"],
		[3, [1, 2, 3], "Chad"],
		[4, [1, 2, 3, 4], "Daniel"],
		[5, [1, 2, 3, 4, 5], "Eduardo"],
		[6, [1, 2, 3, 4, 5, 6], "Frank"],
		[7, [1, 2, 3, 4, 5, 6, 7], "George"],
		[8, [1, 2, 3, 4, 5, 6, 7, 8], "Heisenberg"],
		[9, [1, 2, 3, 4, 5, 6, 7, 8, 9], "Isaac"]
	], "t.source_id = c.source_id")
	"""
	
	"""
	with open("addresses.txt", "wb") as addresses_file:
		i = 0
		address_count = 0

		for data in stream_gzip_decompress(response.raw):
			addresses_file.write(data)
			address_count += data.decode("ASCII").count("\n")

		print("Addresses: " + address_count)
	"""

def main():
	database = Database(reset=RESET, delete_setup_config=DELETE_SETUP_CONFIG)
	#crawler = Crawler(database)

	"""
	# Threads
	thread = threading.Thread(
		target = download_all_addresses,
		args = (database,)
	)
	thread.start()

	# Do something else

	thread.join()
	"""

	del database

# Start
main()