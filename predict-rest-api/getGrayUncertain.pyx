import numpy as np
from skimage import filters
cimport numpy as np
cimport cython
from libcpp.vector cimport vector
from libcpp.algorithm cimport sort
from libc.math cimport fabs, ceil

def sort_cpp(double[::1] a):
    sort(&a[0], (&a[0]) + a.shape[0])

def get(long fX, long fY, double[:, :] centX, double[:, :] centY, double[:] slideScores not None):

    cdef long nrows = slideScores.shape[0]
    cdef double[:, :] classMap = np.zeros((fX, fY), dtype=np.double)
    cdef double[:, :] densityMap = np.zeros((fX, fY), dtype=np.double)
    cdef long[:, :] grayClass = np.zeros((fX, fY), dtype=np.int)
    cdef long i, row, col, curX, curY
    cdef double SREGION_GRID_SIZE = 80.0
    cdef double classMin, classMax

    with nogil:
        for i in range(nrows):
            curX = int(ceil(centX[i, 0] / SREGION_GRID_SIZE) - 1)
            curY = int(ceil(centY[i, 0] / SREGION_GRID_SIZE) - 1)
            if slideScores[i] > 0:
                classMap[curX, curY] += 1.0

            densityMap[curX, curY] += 1.0

    with nogil:
        for row in range(fX):
            for col in range(fY):
                if densityMap[row, col] == 0:
                    classMap[row, col] = 0
                else:
                    classMap[row, col] = classMap[row, col] / densityMap[row, col]

    classMap = filters.gaussian(classMap, 1)

    classMax = classMap[0, 0]

    if classMax > 0:
      with nogil:
          for row in range(fX):
              for col in range(fY):
                  grayClass[row, col] = int(min(255.0 * classMap[row, col] / classMax, 255.0))

    return np.asarray(grayClass), classMin, classMax
