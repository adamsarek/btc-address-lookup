# External imports
import datetime

# Internal imports
from entity.entity import Entity
from entity.source_label import SourceLabel
from entity.url import Url

class SourceLabelUrl(Entity):
	source_label = SourceLabel()
	url = Url()
	roles = []
	last_crawled_at = datetime.datetime.fromtimestamp(0)

	def __init__(self, id=None, source_label=SourceLabel(), url=Url(), roles=[], last_crawled_at=datetime.datetime.fromtimestamp(0)):
		super().__init__(id)
		self.source_label = source_label
		self.url = url
		self.roles = roles
		self.last_crawled_at = last_crawled_at

	def __repr__(self):
		return (
			"SourceLabelUrl("
				"id: {0}, "
				"source_label: {1}, "
				"url: {2}, "
				"roles: {3}, "
				"last_crawled_at: {4}"
			")"
			.format(
				str(self.id),
				str(self.source_label),
				str(self.url),
				str(self.roles),
				str(self.last_crawled_at)
			)
		)