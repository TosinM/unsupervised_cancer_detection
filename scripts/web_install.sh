#!/bin/bash

if [ -z "$1" ]; then
	echo usage $0 '<web root dir>'
	exit
fi

HOME_DIR=$1'/UnsupervisedCD'
mkdir $HOME_DIR
mkdir $HOME_DIR'/datasets'
mkdir $HOME_DIR'/trainingsets'

mkdir $HOME_DIR'/heatmaps'

# For reports
mkdir $HOME_DIR'/trainingsets/tmp'
chown www-data:www-data $HOME_DIR'/trainingsets/tmp'
chmod 777 $HOME_DIR'/trainingsets/tmp'

cp -r ../web_app/* $HOME_DIR
