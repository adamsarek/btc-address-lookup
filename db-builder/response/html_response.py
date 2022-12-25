# External imports
import bs4

# Internal imports
from response.response import Response

class HtmlResponse(Response):
	def __init__(self, response, parser="lxml"):
		super().__init__(response)
		self.__soup = bs4.BeautifulSoup(response, parser)
	
	def get_links(self, class_=""):
		return self.__soup.find_all("a", href=True, class_=class_)