import numpy as np
import settings


class View():
    def __init__(self):

        self.uid = None
        self.slide = None
        self.left = 0
        self.right = 0
        self.top = 0
        self.bottom = 0

    def setData(self, q):

        self.uid = q["uid"]
        self.slide = str(q["slide"])
        self.left = int(q["left"])
        self.right = int(q["right"])
        self.top = int(q["top"])
        self.bottom = int(q["bottom"])
        self.centroids = q["centroids"]
        self.classifier = q["classifier"]
