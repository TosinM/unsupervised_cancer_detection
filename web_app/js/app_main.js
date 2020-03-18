var uid = "";
var classifier = "";


//
//	Initialization
//
//
$(function() {

	var	datasetSel = $("#datasetSel");


	// get session vars
	//
	$.ajax({
		url: "php/getSession.php",
		data: "",
		dataType: "json",
		success: function(data) {

			uid = data['uid'];
			classifier = data['className'];
			curDataset = data['dataset'];
			IIPServer = data['IIPServer'];
			datapath = data['datapath'];

			if( uid === null ) {
				$('#nav_heatmaps').hide();
				$('#resetBtn').hide();

			} else {

				$('#beginSession').attr('disabled', 'true');
				$('#trainset').attr('disabled', 'true');
				$('#datasetSel').attr('disabled', 'true');

			}

		}
	});

	// Populate Dataset dropdown
	//
	$.ajax({
		type: "POST",
		url: "db/getdatasets.php",
		data: {},
		dataType: "json",
		success: function(data) {

			curDataset = data[0];		// Use first dataset initially

			for( var item in data ) {
				datasetSel.append(new Option(data[item][0], data[item][0]));
			}
		}
	});

});



function displayProg() {

	$('#progDiag').modal('show');
}



function cancel() {
	$.ajax({
		url: "php/cancelSession.php",
		data: "",
		success: function() {
			window.location = "index.html";
		}
	});
}

//
// Retruns the value of the GET request variable specified by name
//
//
function $_GET(name) {
	var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
	return match && decodeURIComponent(match[1].replace(/\+/g,' '));
}
