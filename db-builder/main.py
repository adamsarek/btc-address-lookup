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

# TODO: Local MFT / FTP server

# ["Unknown", "N/A", "n/a", "n/a", "/src/img/unknown.svg"]

# Implement Layers (Business, Data, etc.)
# Robots: urllib.robotparser
# https://stackoverflow.com/questions/43085744/parsing-robots-txt-in-python
# psycopg.rows.dict_row
# When there is no timestamp (last-modified) of remote file, check size

# Data (table) - whole remote file
# SubData (table) - part of remote file (JSON - only 1 key = 1 address not whole JSON file)

# DatabaseInitializer (singleton)

# https://www.xingyulei.com/post/py-admin/index.html

# Auto-install python libraries + postgresql?

# External imports
import ctypes
import os
import sys

# Internal imports
from crawler import Crawler
from setup import Setup

def is_admin():
	try:
		return ctypes.windll.shell32.IsUserAnAdmin()
	except:
		return False

def rerun_as_admin():
	return ctypes.windll.shell32.ShellExecuteW(
		None,
		"runas",
		sys.executable,
		" ".join(sys.argv),
		None,
		1
	)

def main():
	ARGS = {
		"reset": False,
		"restart_db": False,
		"delete_setup_config": False
	}
	
	# Change default arguments with input arguments
	for i in range(len(ARGS.keys())):
		if len(sys.argv) > (i + 1):
			ARGS[list(ARGS.keys())[i]] = True if sys.argv[i + 1] == "1" else False
	
	# Setup (reset, restart_db, delete_setup_config)
	setup = Setup(**ARGS)
	
	try:
		if ARGS["reset"] == False:
			crawler = Crawler()
	except (Exception) as error:
		print(str(error))
	finally:
		os.system("PAUSE")

	# Rerun
	main()

# Start
if __name__ == "__main__":
	if is_admin():
		main()
	else:
		rerun_as_admin()