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
import config
from crawler import Crawler
from db import Database

RESET = False
DELETE_SETUP_CONFIG = False

def main():
	configuration = config.load("config.json")
	database = Database(reset=RESET, delete_setup_config=DELETE_SETUP_CONFIG)
	
	if RESET == False:
		crawler = Crawler(configuration, database)

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