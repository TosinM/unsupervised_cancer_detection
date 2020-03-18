from random import choice

import h5py
file_in = "./BRCA-clusters-1.h5"
f1 = h5py.File(file_in, 'r+')     # open the file
del f1['features']

sequence = [i for i in range(12)]
clusters = []
for i in range(len(f1['slideIdx'])):
    clusters.append(choice(sequence))

dset = f1.create_dataset('clusters', data=clusters)
f1.close()
