# External imports
import builtins
import ctypes

class Console(object):
	COLOR = {
		"RESET": "\33[0m",
		"SHADOW": "\33[90m",
		"ERROR": "\33[31m",
		"SUCCESS": "\33[32m",
		"WARN": "\33[33m",
		"INFO": "\33[94m",
		"COMMENT": "\33[35m",
		"VALUE": "\033[36m",
		"HEADER": "\033[97m",
	}

	def __new__(cls):
		if not hasattr(cls, "instance"):
			cls.instance = super(Console, cls).__new__(cls)
		return cls.instance
	
	def set_title(self, title):
		ctypes.windll.kernel32.SetConsoleTitleW(title)

	def print(self, text, reset=True):
		builtins.print(text + (self.COLOR["RESET"] if reset else ""))

	def get_shadow_text(self, text):
		return self.COLOR["SHADOW"] + text
	
	def get_error_text(self, text):
		return self.COLOR["ERROR"] + text

	def get_success_text(self, text):
		return self.COLOR["SUCCESS"] + text
	
	def get_warn_text(self, text):
		return self.COLOR["WARN"] + text

	def get_info_text(self, text):
		return self.COLOR["INFO"] + text

	def get_comment_text(self, text):
		return self.COLOR["COMMENT"] + text

	def get_value_text(self, text):
		return self.COLOR["VALUE"] + text

	def get_header_text(self, text):
		return self.COLOR["HEADER"] + text
	
	def print_shadow(self, text, reset=True):
		self.print(self.get_shadow_text(text), reset)
	
	def print_error(self, text, reset=True):
		self.print(self.get_error_text(text), reset)

	def print_success(self, text, reset=True):
		self.print(self.get_success_text(text), reset)

	def print_warn(self, text, reset=True):
		self.print(self.get_warn_text(text), reset)

	def print_info(self, text, reset=True):
		self.print(self.get_info_text(text), reset)

	def print_comment(self, text, reset=True):
		self.print(self.get_comment_text(text), reset)

	def print_value(self, text, reset=True):
		self.print(self.get_value_text(text), reset)

	def print_header(self, text, reset=True):
		self.print(self.get_header_text(text), reset)