# Internal imports
from entity.entity import Entity
from entity.currency import Currency
from entity.source_label import SourceLabel

class Address(Entity):
	currency = Currency()
	source_label = SourceLabel()
	address = ""

	def __init__(self, id=None, currency=Currency(), source_label=SourceLabel(), address=""):
		super().__init__(id)
		self.currency = currency
		self.source_label = source_label
		self.address = address

	def __repr__(self):
		return (
			"Address("
				"id: {0}, "
				"currency: {1}, "
				"source_label: {2}, "
				"address: {3}"
			")"
			.format(
				str(self.id),
				str(self.currency),
				str(self.source_label),
				str(self.address)
			)
		)