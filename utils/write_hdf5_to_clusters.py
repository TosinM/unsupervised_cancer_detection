from random import choice

import h5py
file_in = "./BRCA-clusters-1.h5"
f1 = h5py.File(file_in, 'a')     # open the file
del f1['features']

sequence = [i for i in range(100)]
clusters = []
for i in range(len(f1['slideIdx'])):
    clusters.append(choice(sequence))

dset = f1.create_dataset('clusters', data=clusters)
f1.close()
--------------------------------------------------

fs = h5py.File('BRCA-spfeatures-1.h5', 'r')
fd = h5py.File('BRCA-clusters-1.h5', 'w')
for a in fs.attrs:
    fd.attrs[a] = fs.attrs[a]
for d in fs:
    if not 'features' in d: fs.copy(d, fd)


sequence = [i for i in range(100)]
clusters = []
for i in range(len(fd['slideIdx'])):
    clusters.append(choice(sequence))

dset = fd.create_dataset('clusters', data=clusters)
fd.close()
