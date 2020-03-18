import numpy as np
import settings

class Users():

	def __init__(self):
		self.users = []
		self.u_size = 0

	def addUser(self, uid):
		init = {'uid': uid, 'mean':0, 'std_dev':0, 'filename': 0, 'class_names':[], 'centroids': []}
		self.users.append(init)
		self.u_size += 1

	def setTrainSampleData(self, idx, sample):
		self.users[idx]['centroids'].append(sample)
