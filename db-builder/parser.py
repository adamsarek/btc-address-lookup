# External imports
from bs4 import BeautifulSoup

class Parser:
	def __init__(self, response, parser="lxml"):
		# Private properties
		self.__soup = BeautifulSoup(response, parser)
	
	def get_soup(self):
		return self.__soup

	def get_all_links(self):
		return self.__soup.find_all("a", href=True)