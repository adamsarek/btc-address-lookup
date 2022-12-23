# Internal imports
from entity.entity import Entity
from entity.currency import Currency
from entity.source import Source

class SourceLabel(Entity):
	source = Source()
	new_addresses_currency = Currency()
	roles = []
	name = ""

	def __init__(self, id=None, source=Source(), new_addresses_currency=Currency(), roles=[], name=""):
		super().__init__(id)
		self.source = source
		self.new_addresses_currency = new_addresses_currency
		self.roles = roles
		self.name = name

	def __repr__(self):
		return (
			"SourceLabel("
				"id: {0}, "
				"source: {1}, "
				"new_addresses_currency: {2}, "
				"roles: {3}, "
				"name: {4}"
			")"
			.format(
				str(self.id),
				str(self.source),
				str(self.new_addresses_currency),
				str(self.roles),
				str(self.name)
			)
		)