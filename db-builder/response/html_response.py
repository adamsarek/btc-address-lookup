# External imports
from bs4 import BeautifulSoup

# Internal imports
from response.response import Response

class HtmlResponse(Response):
	def __init__(self, response, parser="lxml"):
		super().__init__(response)
		self.__soup = BeautifulSoup(response, parser)

	def get_links(self):
		return self.__soup.find_all("a", href=True)