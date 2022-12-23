# Internal imports
from entity.entity import Entity

class Url(Entity):
	address = ""

	def __init__(self, id=None, address=""):
		super().__init__(id)
		self.address = address

	def __repr__(self):
		return (
			"Url("
				"id: {0}, "
				"address: {1}"
			")"
			.format(
				str(self.id),
				str(self.address)
			)
		)