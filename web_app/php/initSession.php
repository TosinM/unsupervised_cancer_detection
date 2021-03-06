<?php

	require '../db/logging.php';

	// Make sure initSession.php was referenced from the main
	// page by checking if 'submit' is empty
	//
	if( empty($_POST['submit']) ) {
		echo "Form was not submitted <br>";
		exit;
	}

	// TODO - Add an alert to indicate what was missing. Should
	// be on the main page


	// Each of the text fields must also be filled in
	//
	if( empty($_POST["classifiername"]) ) {
			// Redirect back to the form
			header("Location:".$_SERVER['HTTP_REFERER']);
			exit;
	}



	// 	Retrieve a list of training set name from db.
	//
	$dbConn = guestConnect();

	$sql = 'SELECT name FROM training_sets WHERE name="'.$_POST["classifiername"].'"';
	// check if trainingset name already exists.
	if( $result = mysqli_query($dbConn, $sql) ) {
		while( $array = mysqli_fetch_row($result) ) {
			$isClassifyName = $array[0];
		}
		mysqli_free_result($result);
	}
	mysqli_close($dbConn);

	// if(isset($isClassifyName)) {
	// 	echo "<script type='text/javascript'>window.alert('Classifier: $isClassifyName already exists !! ');
	// 	window.location.href = '../index.html';</script>";;
	// }

	if(isset($isClassifyName)) {
		echo "<script type='text/javascript'>window.alert('Classifier: $isClassifyName already exists !! ');
		window.location.href = '../index.html';</script>";;
	}

	else {


	// Generate a unique id to track this session in the server
	//
	$UID = uniqid("", true);

	// Get the dataset file from the database
	//
	$dbConn = guestConnect();
	$sql = 'SELECT features_file FROM datasets WHERE name="'.$_POST["dataset"].'"';

	if( $result = mysqli_query($dbConn, $sql) ) {

		$featureFile = mysqli_fetch_row($result);
		mysqli_free_result($result);
	}
	mysqli_close($dbConn);

	require 'hostspecs.php';

		write_log("INFO", "Session '".$_POST["classifiername"]."' started");

		session_start();
		$_SESSION['uid'] = $UID;
		$_SESSION['classifier'] = $_POST["classifiername"];
		$_SESSION['dataset'] = $_POST["dataset"];
		$_SESSION['datapath'] = $featureFile[0];
		$_SESSION['init_reloaded'] = false;
		header("Location: ../viewer.html");
	}
?>
