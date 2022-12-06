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
# TODO: https://stackoverflow.com/questions/12206600/how-to-speed-up-insertion-performance-in-postgresql
# TODO: https://stackoverflow.com/questions/16694907/download-large-file-in-python-with-requests
# TODO: https://www.dbi-services.com/blog/the-fastest-way-to-load-1m-rows-in-postgresql/

# TODO: Auto setup - running postgres installation postgresql.exe, install python libraries

# TODO: sending query failed another command is already in progress
# TODO: https://stackoverflow.com/questions/3122145/zlib-error-error-3-while-decompressing-incorrect-header-check/22310760#22310760
# TODO: io.DEFAULT_BUFFER_SIZE

# TODO: could not extend file "base/52269/52311.5": No space left on device\nHINT:  Check free disk space.

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

	del database

# Start
main()