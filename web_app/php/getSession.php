<?php

	require 'hostspecs.php';
	session_start();


	$sessionInfo = array();

	if( isset($_SESSION['uid']) ) {
		$sessionInfo['uid'] = $_SESSION['uid'];
		$sessionInfo['className'] = $_SESSION['classifier'];
		$sessionInfo['dataset'] = $_SESSION['dataset'];
		$sessionInfo['datapath'] = $_SESSION['datapath'];
		$sessionInfo['dataSetPath'] = $_SESSION['dataSetPath'];
		$sessionInfo['trainingSetName'] = $_SESSION['trainingSetName'];
	} else {
		$sessionInfo['uid'] = null;
		$sessionInfo['dataset'] = null;
	}

	$sessionInfo['alServer'] = $host;
	$sessionInfo['alServerPort'] = $port;
	$sessionInfo['IIPServer'] = $IIPServer;

	echo json_encode($sessionInfo);
?>
