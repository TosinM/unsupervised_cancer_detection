Quick start guide
=================

Unsupervised Cancer Detection Tool is distributed as a collection of Docker containers for server hosting and dataset creation.
While UCDT can be installed from source, we recommend that most users work with the Docker containers. These containers are platform independent, and
encapsulate all needed libraries and scripts. `Read more about Docker here. <https://docs.docker.com/get-started/>`_

Example dataset
^^^^^^^^^^^^^^^

The UCDT containers come pre-loaded with an example dataset containing a single slide. This example allows you to explore the functionality and
user interfaces of UCDT in the next sections.

Running Unsupervised Cancer Detection Tool
------------------------------------------

Download the Unsupervised Cancer Detection Tool containers
----------------------------------------------------------
UCDT is implemented as a collection of 3 docker containers:

* ucdweb: a container for the UCDT web server.
* ucddb: a container for the UCDT database.
* dataset: a container for creating UCDT datasets.

To explore the example dataset we need to download the database and server containers: ::

    $ docker pull sanghoon/ucdweb:1.0
    $ docker pull sanghoon/ucddb:1.0
	
Running the Unsupervised Cancer Detection Tool database container
-----------------------------------------------------------------

Run the database container and setup a network to communicate with the server container::

    $ docker network create --subnet=172.18.0.0/16 hmlnet
    $ docker run -d --net hmlnet --ip=“172.18.0.5” -t -i -e MYSQL_ROOT_PASSWORD=‘pass’ -e MYSQL_DATABASE=‘nuclei’ -p 3306:3306 --name ucddb sanghoon/ucddb:1.0
	
Running the Unsupervised Cancer Detection Tool web server container
-------------------------------------------------------------------

Run the server container, start Redis and Apache, and then launch the UCDT application::

	$ docker run --net hmlnet -i -t -p 80:80 -p 6379:6379 --link ucddb --name ucdweb sanghoon/ucdweb:1.0 /bin/bash
	#Run redis on server container.
	root@5c6eb03c0e2f:/notebooks# redis-server --daemonize yes
	#Run apache on server container.
	root@5c6eb03c0e2f:/notebooks# service apache2 start
	#Launch UCDT and wait for "Dataset Loaded."
	root@5c6eb03c0e2f:/notebooks# cd /var/www/html/predict-rest-api
	root@5c6eb03c0e2f:/notebooks# python run_model_server.py
	
If the server has a static IP address available you can run this command to set it after starting Apache and before launching UCDT.::

	root@5c6eb03c0e2f:/notebooks#
	
Accessing Unsupervised Cancer Detection Tool from your browser
--------------------------------------------------------------

Navigate your browser to the UCDT page localhost/UnsupervisedCD/