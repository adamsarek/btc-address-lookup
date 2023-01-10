# External imports
import datetime
import requests
import threading
import time
import urllib.parse
import urllib.robotparser

# Internal imports
from console.console import Console
from file.json_file import JsonFile

class Request(object):
	def __new__(cls):
		if not hasattr(cls, "instance"):
			cls.instance = super(Request, cls).__new__(cls)
			cls.instance.__config_data = JsonFile("config.json").load()
			cls.instance.__session = requests.Session()
			cls.instance.__robots = {}
		return cls.instance
	
	def __get_robots_url(self, url):
		# Get robots.txt url
		parsed_url = urllib.parse.urlparse(url)
		robots_url = "{url.scheme}://{url.netloc}/robots.txt".format(url=parsed_url)
		
		return robots_url

	def __get_robots(self, robots_url):
		if robots_url not in self.__robots:
			robots_txt = self.__session.get(robots_url)

			# Robots.txt exists
			if robots_txt.status_code == 200 and len(robots_txt.text) > 0:
				robots_parser = urllib.robotparser.RobotFileParser()
				robots_parser.set_url(robots_url)
				robots_parser.disallow_all = False
				robots_parser.parse(robots_txt.text.splitlines())
				
				self.__robots[robots_url] = {
					"url": robots_url,
					"parser": robots_parser,
					"thread_lock": threading.Lock(),
					"last_request_at": datetime.datetime.now().timestamp()
				}
			# Robots.txt does not exist
			else:
				self.__robots[robots_url] = {
					"url": robots_url,
					"parser": None,
					"thread_lock": threading.Lock(),
					"last_request_at": datetime.datetime.now().timestamp()
				}

		return self.__robots[robots_url]
	
	def __raw_request(self, url, robots, stream=True):
		for _ in range(self.__config_data["request"]["count"]):
			try:
				with robots["thread_lock"]:
					wait = robots["last_request_at"] + self.__config_data["request"]["wait"] - datetime.datetime.now().timestamp()
					if wait > 0:
						time.sleep(wait)
					
					robots["last_request_at"] = datetime.datetime.now().timestamp()

				return self.__session.get(url, headers=self.__config_data["request"]["headers"], timeout=self.__config_data["request"]["timeout"], stream=stream)
			except (
				Exception,
				ConnectionError,
				ConnectionAbortedError,
				ConnectionRefusedError,
				ConnectionResetError,
				TimeoutError,
				requests.exceptions.ConnectionError,
				requests.exceptions.ConnectTimeout,
				requests.exceptions.ReadTimeout,
				requests.exceptions.RetryError,
				requests.exceptions.Timeout,
				requests.exceptions.TooManyRedirects
			) as error:
				Console().print_error(str(error))
		
		return None
	
	def request(self, url, stream=True):
		# Get robots.txt url
		robots_url = self.__get_robots_url(url)
		
		robots = self.__get_robots(robots_url)

		# Robots.txt exists
		if robots["parser"] is not None:
			# Url can be requested
			if robots["parser"].can_fetch(self.__config_data["request"]["robots"]["user_agent"], url):
				return self.__raw_request(url, robots, stream)
			
			# Url cannot be requested
			raise Exception("A request to the URL: {0} could not be sent because the URL is not allowed to be accessed by the robots.txt".format(url))
		
		# Robots.txt does not exist => Url can be requested
		return self.__raw_request(url, robots, stream)