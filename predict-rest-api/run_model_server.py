import json
import h5py
import numpy as np
import redis
import cv2
import mysql.connector

from copy import copy
from time import time
from scipy.misc import imsave
from sklearn.externals import joblib

# inner functions
import settings
import view
import heatmap
import dataset
import users

# import cython functions
from loadPredictswithCenXY import load

# initialize all settings
set = settings.Settings()

# connect to Redis server
db = redis.StrictRedis(host=set.REDIS_HOST,
                       port=set.REDIS_PORT, db=set.REDIS_DB)

def run():
    # initialize global instance
    uset = users.Users()
    dset = dataset.Dataset(set.PATH_TO_SPECIAL)
    print ("Dataset Loaded ... ")

    while True:

        queue = db.lrange(set.REQUEST_QUEUE, set.REQUEST_START, set.REQUEST_END)
        q_uid = None
        # initialize local instance
        heat = heatmap.Heatmap()
        viewer = view.View()

        for q in queue:

            q = json.loads(q.decode("utf-8"))
            q_uid = q["uid"]
            target = q["target"]
            session_uid = q["uid"]

            if target == 'view':
                viewer.setData(q)

            if target == 'heatmap':
                heat.setData(q)

        if q_uid is not None:

            print (" Session Start .....")

            no_uid = True
            uidx = 0

            # find current user Index
            for i in range(len(uset.users)):
                if uset.users[i]['uid'] == session_uid:
                    uidx = i
                    no_uid = False

            if no_uid:
                # set users data
                uset.addUser(session_uid)

            if target == 'view':
                slide_idx = dset.getSlideIdx(viewer.slide)
                object_num = dset.getObjNum(slide_idx)
                data_idx = dset.getDataIdx(slide_idx)
                cluster_set = dset.getClusterSet(data_idx, object_num)
                x_centroid_set = dset.getXcentroidSet(data_idx, object_num)
                y_centroid_set = dset.getYcentroidSet(data_idx, object_num)

                print ("Determine labels ... ")
                selected_cluster_number = []
                for sample in viewer.centroids:
                    if sample['checked'] > 0:
                        selected_cluster_number.append(sample['cluster'])

                slide_cluster_labels = np.zeros((len(cluster_set), ))

                for i in selected_cluster_number:
                    slide_cluster_labels[np.where(cluster_set==i)] = 1

                object_idx = load(
                    viewer.left, viewer.right, viewer.top, viewer.bottom, x_centroid_set.astype(np.float), y_centroid_set.astype(np.float)
                )
                data = {}

                for i in object_idx:
                    data[str(x_centroid_set[i][0])+'_'+str(y_centroid_set[i][0])] = str(slide_cluster_labels[i])

                db.set(q_uid, json.dumps(data))
                db.ltrim(set.REQUEST_QUEUE, len(q_uid), -1)

            if target == 'heatmap':
                slide_idx = dset.getSlideIdx(heat.slide)
                object_num = dset.getObjNum(slide_idx)
                data_idx = dset.getDataIdx(slide_idx)
                cluster_set = dset.getClusterSet(data_idx, object_num)
                x_centroid_set = dset.getXcentroidSet(data_idx, object_num)
                y_centroid_set = dset.getYcentroidSet(data_idx, object_num)

                print ("Determine heatmap ... ")
                selected_cluster_number = []
                for sample in viewer.centroids:
                    if sample['checked'] > 0:
                        selected_cluster_number.append(sample['cluster'])

                slide_cluster_labels = np.zeros((len(cluster_set), ))

                for i in selected_cluster_number:
                    slide_cluster_labels[np.where(cluster_set==i)] = 1

                # set x and y maps
                heat.setXandYmap()
                # write heatmaps
                heat.setHeatMap(x_centroid_set, y_centroid_set, slide_cluster_labels)
                # get heatmap data
                data = heat.getData(0)

                db.set(q_uid, json.dumps(data))
                db.ltrim(set.REQUEST_QUEUE, len(q_uid), -1)


if __name__ == "__main__":
    run()
