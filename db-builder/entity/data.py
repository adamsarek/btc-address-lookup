# External imports
import datetime

# Internal imports
from entity.entity import Entity
from entity.source_label_url import SourceLabelUrl
from entity.url import Url

class Data(Entity):
	source_label_url = SourceLabelUrl()
	url = Url()
	roles = []
	path = ""
	crawled_at = datetime.datetime.fromtimestamp(0)

	def __init__(self, id=None, source_label_url=SourceLabelUrl(), url=Url(), roles=[], path="", crawled_at=datetime.datetime.fromtimestamp(0)):
		super().__init__(id)
		self.source_label_url = source_label_url
		self.url = url
		self.roles = roles
		self.path = path
		self.crawled_at = crawled_at

	def __repr__(self):
		return (
			"Data("
				"id: {0}, "
				"source_label_url: {1}, "
				"url: {2}, "
				"roles: {3}, "
				"path: {4}, "
				"crawled_at: {5}"
			")"
			.format(
				str(self.id),
				str(self.source_label_url),
				str(self.url),
				str(self.roles),
				str(self.path),
				str(self.crawled_at)
			)
		)