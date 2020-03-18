import settings
from flask import Flask, request, jsonify
import redis
import uuid
import json
from copy import copy

# initialize our flask application and redis server
app = Flask(__name__)

# initialize settings
s = settings.Settings()

db = redis.StrictRedis(host=s.REDIS_HOST, port=s.REDIS_PORT, db=s.REDIS_DB)


@app.route("/model")
def test():
	return "Model REST API!"

@app.route("/model/view", methods=['POST'])
def view():
	data = {"success": 'none'}
	d = json.loads(request.data)
	uid = d.get('uid')
	db.rpush(s.REQUEST_QUEUE, json.dumps(d))
	while True:
		output = db.get(uid)
		if output is not None:
			data = copy(output)
			break
	db.flushdb()
	return jsonify(data)

@app.route("/model/heatmap", methods=['POST'])
def heatmap():
	data = {"success": 'none'}
	d = json.loads(request.data)
	uid = d.get('uid')
	db.rpush(s.REQUEST_QUEUE, json.dumps(d))

	while True:
		output = db.get(uid)
		if output is not None:
			data = copy(output)
			break

	db.flushdb()
	return jsonify(data)

@app.route("/model/cancel", methods=['POST'])
def cancel():
	data = {"success": 'none'}
	uid = request.form['uid']
	target = request.form['target']
	dataset = request.form['dataset']

	d = dict(id=uid, uid=uid, target=target, dataset=dataset, pca=pca)

	db.rpush(s.REQUEST_QUEUE, json.dumps(d))

	while True:
		output = db.get(uid)
		if output is not None:
			data = copy(output)
			break

	db.flushdb()
	return jsonify(data)

if __name__ == "__main__":
	app.run()
