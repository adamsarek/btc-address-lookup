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

# TODO: sending query failed another command is already in progress
# TODO: https://stackoverflow.com/questions/3122145/zlib-error-error-3-while-decompressing-incorrect-header-check/22310760#22310760
# TODO: io.DEFAULT_BUFFER_SIZE

# TODO: could not extend file "base/52269/52311.5": No space left on device\nHINT:  Check free disk space.

# TODO: Local MFT / FTP server

# Implement Layers (Business, Data, etc.)

# Robots: urllib.robotparser
# https://stackoverflow.com/questions/43085744/parsing-robots-txt-in-python

# When there is no timestamp (last-modified) of remote file, check size

# Data (table) - whole remote file
# SubData (table) - part of remote file (JSON - only 1 key = 1 address not whole JSON file)

# UAC: https://www.xingyulei.com/post/py-admin/index.html

# Robots.txt sitemap crawling: https://practicaldatascience.co.uk/data-science/how-to-parse-xml-sitemaps-using-python
# https://github.com/scrapy/protego#comparison
# https://github.com/python/cpython/blob/main/Lib/urllib/robotparser.py

# Auto-generate db.json during setup
# Get rid of setup.json, db.json & config.json to enable .exe only use

# Crawl known address labels - Binance, Coinbase, etc.
# https://www.walletexplorer.com/

# Data (table) - add column: new version - if NULL (it's latest version), else (there's ID of newer version)

# ---------- Problems ----------
# 14 SeeKoin
# - only 1st page? - Your IP was blacklisted
# - all crypto or BTC only?
# ---------- Problems ----------

# ---------- TODO ----------
# - 1 DB Connection for thread?
# - Connect data & address (after getting all important data)
# - Roles

# - Check new addresses sources
# - Check searched BTC sources
# - Save file only when useful data inside
# - Roles
# - Add to Run/RunOnce
# ---------- TODO ----------

# List all requirements
# pip freeze > requirements.txt

# Create .exe
# python -m PyInstaller main.py -F -n db_builder --distpath . ; Remove-Item -Recurse -Force "build" ; Remove-Item "db_builder.spec"

# External imports
import ctypes
import datetime
import os
import sys
import time

# Internal imports
from console.console import Console
from crawler import Crawler
from setup import Setup
from file.json_file import JsonFile

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

def wait(seconds):
	# Wait before starting the next run
	date_now = datetime.datetime.now()
	date_future = date_now + datetime.timedelta(seconds=seconds)
	Console().print_info("Crawler will now wait till {0} for the next run.".format(date_future.isoformat(" ", "seconds")))
	time.sleep(seconds)

def main():
	os.system("")

	ARGS = {
		"reset": False,
		"restart_db": False,
		"delete_setup_config": False
	}

	# Change default arguments with input arguments
	for i in range(len(ARGS.keys())):
		if len(sys.argv) > (i + 1):
			ARGS[list(ARGS.keys())[i]] = True if sys.argv[i + 1] == "1" else False
	
	# Configuration data
	config_data = JsonFile("config.json").load()

	Console().set_title(config_data["program"]["title"])
	Console().print_header(config_data["program"]["title"])

	# Run forever (only until finished successfully)
	while(True):
		try:
			# Reset / Setup - reset, restart_db, delete_setup_config
			setup = Setup(config_data, **ARGS)

			# Setup finish message
			Console().print_success("Setup finished successfully.")

			break
		except (Exception) as error:
			Console().print_error(str(error))

			# Setup finish message
			Console().print_info("Setup could not finish due to an exception.")

			# Wait (secs) before starting the next setup
			wait(config_data["run_timeout"]["exception"])

	if ARGS["reset"] == False:
		# Run forever
		while(True):
			Console().print_info("\nCrawler is running...")

			try:
				crawler = Crawler(config_data)

				# Run finish message
				Console().print_success("Crawler finished the current run successfully.")

				# Wait (secs) before starting the next run
				wait(config_data["run_timeout"]["crawler"])
			except (Exception) as error:
				Console().print_error(str(error))

				# Run finish message
				Console().print_info("Crawler could not finish the current run due to an exception.")

				# Wait (secs) before starting the next run
				wait(config_data["run_timeout"]["exception"])

# Start
if __name__ == "__main__":
	if is_admin():
		main()
	else:
		rerun_as_admin()