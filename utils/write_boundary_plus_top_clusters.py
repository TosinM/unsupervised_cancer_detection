boundary_in = "./BRCA-spboundaries-clusters-1.txt"
boundary_out = open('./BRCA-clusters-10.txt', 'w')

file = open(boundary_in, "r")

i = 0
k = 0
for line in file:
    if i == k:
        boundary_out.write("%s" % line)
        k += 30000
        print (i, k)
    else:
        i += 1

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


LOAD DATA LOCAL INFILE 'BRCA-clusters-10.txt' INTO TABLE clusters fields terminated by '\t' lines terminated by '\n' (slide, centroid_x, centroid_y, cluster)
