# Internal imports
from entity.entity import Entity

class Currency(Entity):
	name = ""
	code = ""
	unit = ""
	symbol = ""
	logo = ""

	def __init__(self, id=None, name="", code="", unit="", symbol="", logo=""):
		super().__init__(id)
		self.name = name
		self.code = code
		self.unit = unit
		self.symbol = symbol
		self.logo = logo

	def __repr__(self):
		return (
			"Currency("
				"id: {0}, "
				"name: {1}, "
				"code: {2}, "
				"unit: {3}, "
				"symbol: {4}, "
				"logo: {5}"
			")"
			.format(
				str(self.id),
				str(self.name),
				str(self.code),
				str(self.unit),
				str(self.symbol),
				str(self.logo)
			)
		)