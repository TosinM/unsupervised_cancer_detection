<?php

	require 'hostspecs.php';
	require '../db/logging.php';

	session_start();

	if( isset($_SESSION['uid']) ) {
		$uid = $_SESSION['uid'];
	}

	$dbConn = guestConnect();
	$nClusters = 0; // number of clusters
	$maxClusters = 12; // max number of clusters
	$response = array();

	// get slide dimensions for the sample
	$sql = 'SELECT slide, centroid_x, centroid_y, cluster FROM clusters';
	if( $result = mysqli_query($dbConn, $sql) ) {
		while ($row = mysqli_fetch_row($result)) {
				$response['centroids'][$nClusters]['uid'] = $uid;
				$response['centroids'][$nClusters]['slide'] = $row[0];
				$response['centroids'][$nClusters]['centX'] = $row[1];
				$response['centroids'][$nClusters]['centY'] = $row[2];
				$response['centroids'][$nClusters]['cluster'] = intval($row[3]);
				$response['centroids'][$nClusters]['checked'] = 0;
				$nClusters++;
	 }
		mysqli_free_result($result);
	}

	$sql = 'SELECT x_size, y_size, pyramid_path, scale FROM slides WHERE name="'.$response['centroids'][0]['slide'].'"';
	if( $result = mysqli_query($dbConn, $sql) ) {
		$row = mysqli_fetch_row($result);

		for ($i=0;$i < $nClusters;$i++)
		{
				$response['centroids'][$i]['maxX'] = intval($row[0]);
				$response['centroids'][$i]['maxY'] = intval($row[1]);
				$response['centroids'][$i]['path'] = $row[2];
				$response['centroids'][$i]['scale'] = intval($row[3]);
		}
		mysqli_free_result($result);
	}

	mysqli_close($dbConn);
	$response = json_encode($response);

	echo $response;
?>
