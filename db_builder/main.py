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

# Checks if application is running as admin
def is_admin():
	try:
		return ctypes.windll.shell32.IsUserAnAdmin()
	except:
		return False

# Reruns application as admin
def rerun_as_admin():
	return ctypes.windll.shell32.ShellExecuteW(
		None,
		"runas",
		sys.executable,
		" ".join(sys.argv),
		None,
		1
	)

# Waits given amount of seconds
def wait(seconds):
	# Wait before starting the next run
	date_now = datetime.datetime.now()
	date_future = date_now + datetime.timedelta(seconds=seconds)
	Console().print_info("Crawler will now wait till {0} for the next run.".format(date_future.isoformat(" ", "seconds")))
	time.sleep(seconds)

# Main function
def main():
	os.system("")

	ARGS = {
		"reset": False,
		"restart_db": True,
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