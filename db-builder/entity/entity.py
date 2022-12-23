class Entity:
	id = None

	def __init__(self, id=None):
		self.id = id
	
	def __repr__(self):
		return (
			"Entity("
				"id: {0}"
			")"
			.format(
				str(self.id)
			)
		)