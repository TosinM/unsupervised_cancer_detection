from random import choice

boundary_in = "./BRCA-spboundaries-1.txt"
boundary_out = open('./BRCA-spboundaries-clusters-1.txt', 'w')

file = open(boundary_in, "r")
sequence = [i for i in range(100)]

for line in file:
    slide_name = line.split('\t')[0]
    x_centroids = line.split('\t')[1]
    y_centroids = line.split('\t')[2]
    boundaries = line.split('\t')[3]
    random_cluster = choice(sequence)
    boundary_out.write("%s\t" % slide_name)
    boundary_out.write("%s\t" % x_centroids)
    boundary_out.write("%s\t" % y_centroids)
    boundary_out.write("%d\t" % random_cluster)
    boundary_out.write("%s" % boundaries)

boundary_out.close()

# CREATE TABLE sregionboundaries (
# 	id int(11) NOT NULL AUTO_INCREMENT,
# 	slide varchar(80) NOT NULL,
# 	centroid_x decimal(10,1) NOT NULL,
# 	centroid_y decimal(10,1) NOT NULL,
#     cluster int(10) NOT NULL,
# 	boundary varchar(4096) NOT NULL,
# 	PRIMARY KEY(slide, centroid_x, centroid_y, cluster),
# 	UNIQUE KEY (id)
# ) ENGINE=InnoDB;


# LOAD DATA LOCAL INFILE 'BRCA-spboundaries-clusters-1.txt' INTO TABLE sregionboundaries fields terminated by '\t' lines terminated by '\n' (slide, centroid_x, centroid_y, cluster, boundary)

# CREATE TABLE clusters (
# 	id int(11) NOT NULL AUTO_INCREMENT,
# 	slide varchar(80) NOT NULL,
# 	centroid_x decimal(10,1) NOT NULL,
# 	centroid_y decimal(10,1) NOT NULL,
#   cluster int(10) NOT NULL,
# 	PRIMARY KEY(slide, centroid_x, centroid_y, cluster),
# 	UNIQUE KEY (id)
# ) ENGINE=InnoDB;
