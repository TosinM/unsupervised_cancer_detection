<?php

	require 'hostspecs.php';
	require '../db/logging.php';

	session_start();

	if( isset($_SESSION['uid']) ) {
		$uid = $_SESSION['uid'];
	}

	// Now get the max X & Y from the database for the slide of the samples
	//
	$dbConn = guestConnect();
	// $response['samples'] = json_decode($response['samples'], true);
	$nClusters = 10;

	for($i = 0, $len = $nClusters; $i < $len; ++$i) {

		$response['samples'][$i]['uid'] = $uid;
		$response['samples'][$i]['label'] = intval($response['samples'][$i]['label']);

		// get slide dimensions for the sample
		$sql = 'SELECT slide, centroid_x, centroid_y, cluster FROM clusters';
		if( $result = mysqli_query($dbConn, $sql) ) {
			$row = mysqli_fetch_row($result);

			$response['samples'][$i]['slide'] = $row[0];
			$response['samples'][$i]['centX'] = $row[1];
			$response['samples'][$i]['centY'] = $row[2];
			$response['samples'][$i]['cluster'] = intval($row[3]);

			mysqli_free_result($result);
		}

		$sql = 'SELECT x_size, y_size, pyramid_path, scale FROM slides WHERE name="'.$response['clusters'][$i]['slide'].'"';
		if( $result = mysqli_query($dbConn, $sql) ) {
			$row = mysqli_fetch_row($result);

			$response['samples'][$i]['maxX'] = intval($row[0]);
			$response['samples'][$i]['maxY'] = intval($row[1]);
			$response['samples'][$i]['path'] = $row[2];
			$response['samples'][$i]['scale'] = intval($row[3]);

			mysqli_free_result($result);
		}

	}




	mysqli_close($dbConn);
	$response = json_encode($response);

	echo $response;
?>
