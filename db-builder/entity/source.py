# Internal imports
from entity.entity import Entity

class Source(Entity):
	roles = []
	name = ""

	def __init__(self, id=None, roles=[], name=""):
		super().__init__(id)
		self.roles = roles
		self.name = name

	def __repr__(self):
		return (
			"Source("
				"id: {0}, "
				"roles: {1}, "
				"name: {2}"
			")"
			.format(
				str(self.id),
				str(self.roles),
				str(self.name)
			)
		)