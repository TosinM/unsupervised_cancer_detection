import h5py
import numpy as np

class Dataset():

	def __init__(self, path):

		self.f = h5py.File(path, 'r')
		self.x_centroid = self.f['x_centroid'][:]
		self.y_centroid = self.f['y_centroid'][:]
		self.slideIdx = self.f['slideIdx'][:]
		self.slides = self.f['slides'][:]
		self.dataIdx = self.f['dataIdx'][:]
		self.wsi_mean = self.f['wsi_mean'][:]
		self.wsi_stddev = self.f['wsi_stddev'][:]
		self.clusters = self.f['clusters'][:]
		self.n_slides = len(self.dataIdx)
		self.n_objects = len(self.slideIdx)

	def getSlideIdx(self, slide):
		idx = np.argwhere(self.slides == slide)[0, 0]
		return idx

	def getDataIdx(self, index):
		return self.dataIdx[index][0]

	def getObjNum(self, index):
		if self.n_slides > index + 1:
			num = self.dataIdx[index + 1, 0] - self.dataIdx[index, 0]
		else:
			num = self.n_objects - self.dataIdx[index, 0]
		return num

	def getClusterSet(self, index, num):
		return self.clusters[index: index+num]

	def getWSI_Mean(self, index):
		return self.wsi_mean[index][:]

	def getWSI_Std(self, index):
		return self.wsi_stddev[index][:]

	def getXcentroidSet(self, index, num):
		return self.x_centroid[index: index+num]

	def getYcentroidSet(self, index, num):
		return self.y_centroid[index: index+num]

	def getSlideIdxSet(self, index, num):
		return self.slideIdx[index: index+num]
