var annoGrpTransformFunc;
var IIPServer="";

//var SlideSuffix = ".svs-tile.dzi.tif";
var SlideSuffix = ".svs.dzi.tif";
var SlideLocPre = "&RGN=";
var SlideLocSuffix = "&CVT=jpeg";

var slideCnt = 0;
var curSlide = "";
var curWidth = 0;
var curHeight = 0;
var curDataset = "";
var curBox = -1;
var curX = 0, curY = 0;
var boundaryOn = true;

var	boxes = ["box_1", "box_2", "box_3", "box_4", "box_5", "box_6","box_7", "box_8", "box_9", "box_10", "box_11", "box_12", "box_13", "box_14", "box_15", "box_16", "box_17", "box_18"];

var viewer = null;
var imgHelper = null, osdCanvas = null, viewerHook = null;
var overlayHidden = false, selectMode = false, segDisplayOn = false;
var olDiv = null;
var lastScaleFactor = 0;
var pyramids, trainingSets;
var clickCount = 0;
var isSample = false;

// The following only needed for active sessions
var uid = null, negClass = "", posClass = "";

var boundsLeft = 0, boundsRight = 0, boundsTop = 0, boundsBottom = 0;
var	panned = false;
var	pannedX, pannedY;

var heatmapLoaded = false;
var slideReq = null;
var uncertMin = 0.0, uncertMax = 0.0, classMin = 0.0, classMax = 0.0;

// check if the screen is panned or not. Defalut value is false
var ispannedXY = false;
var target = "";
var iteration = 0;
var datapath = "";
var pcapath = "";
var	fixes = "";

var reloaded = false;
var init_reloaded = false;
// var XandYLabelsJson = {};
var viewresultJson = {};
var heatmapresultJson = {};
var isretrained = false;
var isfirstload = true;
var isfinalize = false;
//
//	Initialization
//
//		Get a list of available slides from the database
//		Populate the selection and classifier dropdowns
//		load the first slide
//		Register event handlers
//
$(function() {

	slideReq = $_GET('slide');
	// gets x and y positions
	pannedX = $_GET('x_pos');
	pannedY = $_GET('y_pos');

	// Create the slide zoomer, update slide count etc...
	// We will load the tile pyramid after the slide list is loaded
	//
	viewer = new OpenSeadragon.Viewer({ showNavigator: true, id: "image_zoomer", prefixUrl: "images/", animationTime: 0.1});
	imgHelper = viewer.activateImagingHelper({onImageViewChanged: onImageViewChanged});

	annoGrpTransformFunc = ko.computed(function() {
										return 'translate(' + svgOverlayVM.annoGrpTranslateX() +
										', ' + svgOverlayVM.annoGrpTranslateY() +
										') scale(' + svgOverlayVM.annoGrpScale() + ')';
									}, this);

	//
	// Image handlers
	//
	viewer.addHandler('open', function(event) {
		osdCanvas = $(viewer.canvas);
		statusObj.haveImage(true);

		statusObj.imgWidth(imgHelper.imgWidth);
		statusObj.imgHeight(imgHelper.imgHeight);
		statusObj.imgAspectRatio(imgHelper.imgAspectRatio);
		statusObj.scaleFactor(imgHelper.getZoomFactor());
		// check if the location of x and y is validated or not
		reviewCheck();
	});



	viewer.addHandler('close', function(event) {
		statusObj.haveImage(false);

        osdCanvas.off('mouseenter.osdimaginghelper', onMouseEnter);
        osdCanvas.off('mousemove.osdimaginghelper', onMouseMove);
        osdCanvas.off('mouseleave.osdimaginghelper', onMouseLeave);

		osdCanvas = null;
	});


	viewer.addHandler('animation-finish', function(event) {

		if( segDisplayOn ) {

			if( statusObj.scaleFactor() > 0.2 ) {

				if (uid != null) {
					gotoView();
				}
				else {
						updateSlideSeg();
				}
				// Zoomed in, show boundaries hide heatmap
				$('#anno').show();
				$('#heatmapGrp').hide();

			} else {

				if ( isretrained ) {
						gotoHeatmap();
						isretrained = false;
				}

				// Zoomed out, hide boundaries, show heatmap
				$('#heatmapGrp').show();
				$('#anno').hide();
				// Reset bounds to allow boundaries to be drawn when
				// zooming in from a heatmap.
				boundsLeft = boundsRight = boundsTop = boundsBottom = 0;
			}
		}
	});

	// get slide host info
	//
	$.ajax({
		url: "php/getSession.php",
		data: "",
		dataType: "json",
		success: function(data) {

			uid = data['uid'];
			classifier = data['className'];
			IIPServer = data['IIPServer'];
			curDataset = data['dataset'];
			datapath = data['datapath'];

			if( uid === null ) {
				// No active session, don;t allow navigation to select & visualize
				$('#trainInfo').hide();
				$('#heatmap').hide();
				$('#retrainInfo').hide();
				$('#legend').show();
				$("#btn_save").hide();
				$("#finishBtn").hide();
				$("#retrainBtn").hide();
				$('#legend').hide();
				$('#btn_1').hide();
				// document.getElementById("index").setAttribute("href","index.html");

			} else {
				// Active session, dataset selection not allowed
				document.getElementById('dataset_sel').disabled = true
				$('#legend').show();
				// No report generation during active session
				$("#btn_save").show();
				$("#finishBtn").show();
				$("#retrainBtn").show();
				$('#btn_1').show();
				$('#btn_1').attr('disabled', 'disabled')
				// $('#nav_validation').hide();
				getClusters();

			}

			// Slide list and classifier list will also be updated by this call
			updateDatasetList();
		}
	});


	// Set the update handlers for the selectors
	$("#slide_sel").change(updateSlide);
	$("#dataset_sel").change(updateDataset);

	// Set update handler for the heatmap radio buttons
	$('input[name=heatmapOption]').change(updateHeatmap);

	// Set filter for numeric input
	$("#x_pos").keydown(filter);
	$("#y_pos").keydown(filter);


	// Assign click handlers to each of the thumbnail divs
	//
	boxes.forEach(function(entry) {

		var	box = document.getElementById(entry);
		var	clickCount = 0;

		box.addEventListener('click', function() {
			clickCount++;
			if( clickCount === 1 ) {
				singleClickTimer = setTimeout(function() {
					clickCount = 0;
					thumbSingleClick(entry);
				}, 200);
			} else if( clickCount === 2 ) {
				clearTimeout(singleClickTimer);
				clickCount = 0;
				thumbDoubleClick(entry);
			}
		}, false);
	});

});

//
// A single click in the thumbnail box loads the appropriate slide into the viewer
// and pans and zooms to the specific object.
//
//
function thumbSingleClick(box) {

	// Load the appropriate slide in the viewer
	var index = boxes.indexOf(box);
	if( curBox != index ) {

		var newSlide = fixes['centroids'][index]['slide'];

		// Slide loading process pans to the current nuclei, make sure
		// curX and curY are updated before loading a new slide.
		//
		curX = Math.round(fixes['centroids'][index]['centX']);
		curY = Math.round(fixes['centroids'][index]['centY']);

		homeToNuclei();
		//
		// if( statusObj.curSlide() == "" ) {
		// 	statusObj.curSlide(newSlide);
		// 	updateSlideView();
 		// } else {
 		// 	if( statusObj.curSlide() != newSlide ) {
		// 		viewer.close();
		// 		statusObj.curSlide(newSlide);
		// 		updateSlideView();
		// 	} else {
		// 		// On same slide,, no need to load it again
		// 		homeToNuclei();
 		// 	}
		// }

		// Mark the selected box with a gray background
		var boxDiv = "#"+box;
		$(boxDiv).css('background', '#CCCCCC');

		// Clear previously selected box if there was one
		if( curBox != -1 && curBox != index ) {
			boxDiv = "#"+boxes[curBox];
			$(boxDiv).css('background', '#FFFFFF');
		}
		curBox = index;
		boundaryOn = true;
	}
};

//
//	A double click in the thumbnail box toggles the current classification
//	of the object.
//
//
function thumbDoubleClick(box) {

	var index = boxes.indexOf(box);
	var checked = fixes['centroids'][index]['checked'];

	// Toggle through the 2 states, pos, neg
	//
	if( checked === 1 ) {
		fixes['centroids'][index]['checked'] = 0;
	} else {
		fixes['centroids'][index]['checked'] = 1;
	}

	updateCheckStatus(index);

	for( sample in fixes['centroids'] ) {
		if (fixes['centroids'][sample]['checked'] > 0) {
				isSample = true;
		}
	}

	if (isSample){
		$('#btn_1').removeAttr('disabled');
	}
	else{
		$('#btn_1').attr('disabled', 'disabled')
	}

};


function updateCheckStatus(sample) {

	var labelTag = "#label_"+(parseInt(sample)+1),
		label = $('#box_'+(parseInt(sample)+1)).children(".classLabel")

	label.removeClass("negLabel");
	// label.removeClass("ignoreLabel");
	label.removeClass("posLabel");

	if( fixes['centroids'][sample]['checked'] === 1 ) {
		$(labelTag).text("V");
		label.addClass("posLabel");
	} else {
		$(labelTag).text("X");
		label.addClass("negLabel");
	}

}

function updateSlideView() {


	$.ajax({
		type: "POST",
		url: "db/getPyramidPath.php",
		dataType: "json",
		data: { slide: statusObj.curSlide() },
		success: function(data) {

				// Zoomer needs '.dzi' appended to the end of the filename
				pyramid = "DeepZoom="+data[0]+".dzi";
				viewer.open(IIPServer + pyramid);
		}
	});
}


function getClusters() {

	$.ajax({
		type: "POST",
		url: "php/getCentroids.php",
		dataType: "json",
		success: function(data) {

			fixes = data;

			var slide, centX, centY, sizeX, sizeY, loc, thumbNail, scale;
			var sampleArray = data['centroids'];
			var scale_cent = 32;
			var scale_size = 64.0;

			for( sample in sampleArray ) {

				thumbTag = "#thumb_"+(parseInt(sample)+1);
				boxTag = "#"+boxes[sample];
				scale = 2.0;
				slide = sampleArray[sample]['slide'];

				centX = (sampleArray[sample]['centX'] - (scale_cent * scale)) / sampleArray[sample]['maxX'];
				centY = (sampleArray[sample]['centY'] - (scale_cent * scale)) / sampleArray[sample]['maxY'];
				sizeX = (scale_size * scale) / sampleArray[sample]['maxX'];
				sizeY = (scale_size * scale) / sampleArray[sample]['maxY'];
				loc = centX+","+centY+","+sizeX+","+sizeY;

				thumbNail = IIPServer+"FIF="+sampleArray[sample]['path']+SlideLocPre+loc+"&WID=80"+SlideLocSuffix;

				$(thumbTag).attr("src", thumbNail);

			}
		},
		error: function() {
			console.log("Selection failed");
		}
	});
}




//
// a check function
// check if the location is validated or not
//

function reviewCheck(){
	if( pannedX === null || pannedY === null ) {
		ispannedXY = false;
	}
	else{
		ispannedXY = true;
		$("#x_pos").val(pannedX);
		$("#y_pos").val(pannedY);
		$("#btn_Go" ).click();
	}
}


// Filter keystrokes for numeric input
function filter(event) {

	// Allow backspace, delete, tab, escape, enter and .
	if( $.inArray(event.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
		// Allow Ctrl-A
	   (event.keyCode == 65 && event.ctrlKey === true) ||
		// Allow Ctrl-C
	   (event.keyCode == 67	&& event.ctrlKey === true) ||
		// Allow Ctrl-X
	   (event.keyCode == 88	&& event.ctrlKey === true) ||
		// Allow home, end, left and right
	   (event.keyCode >= 35	&& event.keyCode <= 39) ) {

			return;
	}

	// Don't allow if not a number
	if( (event.shiftKey || event.keyCode < 48 || event.keyCode > 57) &&
		(event.keyCode < 96 || event.keyCode > 105) ) {

			event.preventDefault();
	}
}



//
//	Get the url for the slide pyramid and set the viewer to display it
//
//
function updatePyramid() {

	slide = "";
	panned = false;
	heatmapLoaded = false;

	// Zoomer needs '.dzi' appended to the end of the filename
	pyramid = "DeepZoom="+pyramids[$('#slide_sel').prop('selectedIndex')]+".dzi";
	viewer.open(IIPServer + pyramid);
}


//
//	Updates the dataset selector
//
function updateDatasetList() {
	var	datasetSel = $("#dataset_sel");

	// Get a list of datasets
	$.ajax({
		type: "POST",
		url: "db/getdatasets.php",
		data: {},
		dataType: "json",
		success: function(data) {

			for( var item in data ) {
				datasetSel.append(new Option(data[item][0], data[item][0]));
			}

			if( curDataset === null ) {
				curDataset = data[0][0];		// Use first dataset initially
			} else {
				datasetSel.val(curDataset);
			}

			// Need to update the slide list since we set the default slide
			updateSlideList();

		}
	});
}





//
//	Updates the list of available slides for the current dataset
//
function updateSlideList() {
	var slideSel = $("#slide_sel");
	var slideCntTxt = $("#count_patient");

	// Get the list of slides for the current dataset
	$.ajax({
		type: "POST",
		url: "db/getslides.php",
		data: { dataset: curDataset },
		dataType: "json",
		success: function(data) {

			var index = 0;

			pyramids = data['paths'];
			if( slideReq === null ) {
				curSlide = String(data['slides'][0]);		// Start with the first slide in the list
				curWidth = String(data['xsizes'][0]);		// Start with the first slide in the list
				curHeight = String(data['ysizes'][0]);		// Start with the first slide in the list
			} else {

				curSlide = slideReq;

				$.ajax({
					type: "POST",
					url: "php/getHeatmap_nn.php",
					dataType: "json",
					data: { uid:	uid,
							slide: 	curSlide,
							},
					success: function(data) {

						curWidth = data[0];
						curHeight = data[1];

					}
				});

			}

			slideCnt = Object.keys(data['slides']).length;;
			slideCntTxt.text(slideCnt);

			slideSel.empty();
			// Add the slides we have segmentation boundaries for to the dropdown
			// selector
			for( var item in data['slides'] ) {

				if( slideReq != null && slideReq == data['slides'][item] ) {
					index = item;
				}
				slideSel.append(new Option(data['slides'][item], data['slides'][item]));
			}

			if( index != 0 ) {
				$('#slide_sel').prop('selectedIndex', index);
			}

			// Get the slide pyrimaid and display
			updatePyramid();
		}
	});
}



//
//	A new slide has been selected from the drop-down menu, update the
// 	slide zoomer.
//
//
function updateSlide() {
	curSlide = $('#slide_sel').val();

	$.ajax({
		type: "POST",
		url: "php/getHeatmap_nn.php",
		dataType: "json",
		data: { uid:	uid,
				slide: 	curSlide,
				},
		success: function(data) {

			curWidth = data[0];
			curHeight = data[1];

			// Set the viewer to display it
			updatePyramid();

			if( segDisplayOn ) {

				// Clear heatmap if displayed
				var heatmapGrp = document.getElementById('heatmapGrp');

				if( heatmapGrp != null ) {
					heatmapGrp.parentNode.removeChild(heatmapGrp);
				}

				updateSeg();

			}

		}
	});



}

//
//	A new seg should be applied to the slide updated.
//
//
function updateSlideSeg() {

	var ele, segGrp, annoGrp;

	var left, right, top, bottom, width, height;

	// Grab nuclei a viewport width surrounding the current viewport
	//
	width = statusObj.dataportRight() - statusObj.dataportLeft();
	height = statusObj.dataportBottom() - statusObj.dataportTop();

	left = (statusObj.dataportLeft() - width > 0) ?	statusObj.dataportLeft() - width : 0;
	right = statusObj.dataportRight() + width;
	top = (statusObj.dataportTop() - height > 0) ?	statusObj.dataportTop() - height : 0;
	bottom = statusObj.dataportBottom() + height;


	var class_sel = document.getElementById('classifier_sel');

	$.ajax({
	type: "POST",
			url: "db/getsample.php",
			dataType: "json",
	data: {
			slide: 	curSlide,
			left:	left,
			right:	right,
			top:	top,
			bottom:	bottom,
	},


		success: function(data) {

				segGrp = document.getElementById('segGrp');
				annoGrp = document.getElementById('anno');

				// Save current viewport location
				boundsLeft = statusObj.dataportLeft();
				boundsRight = statusObj.dataportRight();
				boundsTop = statusObj.dataportTop();
				boundsBottom = statusObj.dataportBottom();

				// If group exists, delete it
				if( segGrp != null ) {
					segGrp.parentNode.removeChild(segGrp);
				}

				// Create segment group
        segGrp = document.createElementNS("http://www.w3.org/2000/svg", "g");
        segGrp.setAttribute('id', 'segGrp');
        annoGrp.appendChild(segGrp);


				for( cell in data ) {
					ele = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
					// boundary
					ele.setAttribute('points', data[cell][0]);
					// id
					ele.setAttribute('id', 'N' + data[cell][1]);
					ele.setAttribute('stroke', 'aqua');
					// ele.setAttribute('stroke-width', 4);
					//ele.setAttribute("stroke-dasharray", "5,5");
					ele.setAttribute("stroke-dasharray", "4 1");
					// color
					ele.setAttribute('fill', 'aqua');
					ele.setAttribute("fill-opacity", "0.2");
					//ele.setAttribute("fill", "none");
					segGrp.appendChild(ele);
				}

				if( panned ) {
					ele = document.createElementNS("http://www.w3.org/2000/svg", "rect");

					ele.setAttribute('x', pannedX - 50);
					ele.setAttribute('y', pannedY - 50);
					ele.setAttribute('width', 100);
					ele.setAttribute('height', 100);
					ele.setAttribute('stroke', 'yellow');
					ele.setAttribute('fill', 'none');
					ele.setAttribute('stroke-width', 4);
					ele.setAttribute('id', 'boundBox');

					segGrp.appendChild(ele);
				}

			}
  	});

}


//
//
//
//
function updateDataset() {

	curDataset = $('#dataset_sel').val();
	updateSlideList();
}



//
//	Display the appropriate heatmap (uncertain or positive class) when
//	a radio button is selected
//
function updateHeatmap() {

	var slide_width, slide_height;

	gotoHeatmap();

}


//
//	Update annotation and viewport information when the view changes
//  due to panning or zooming.
//
//
function onImageViewChanged(event) {
	var boundsRect = viewer.viewport.getBounds(true);

	// Update viewport information. dataportXXX is the view port coordinates
	// using pixel locations. ie. if dataPortLeft is  0 the left edge of the
	// image is aligned with the left edge of the viewport.
	//
	statusObj.viewportX(boundsRect.x);
	statusObj.viewportY(boundsRect.y);
	statusObj.viewportW(boundsRect.width);
	statusObj.viewportH(boundsRect.height);
	statusObj.dataportLeft(imgHelper.physicalToDataX(imgHelper.logicalToPhysicalX(boundsRect.x)));
	statusObj.dataportTop(imgHelper.physicalToDataY(imgHelper.logicalToPhysicalY(boundsRect.y)) * imgHelper.imgAspectRatio);
	statusObj.dataportRight(imgHelper.physicalToDataX(imgHelper.logicalToPhysicalX(boundsRect.x + boundsRect.width)));
	statusObj.dataportBottom(imgHelper.physicalToDataY(imgHelper.logicalToPhysicalY(boundsRect.y + boundsRect.height))* imgHelper.imgAspectRatio);
	statusObj.scaleFactor(imgHelper.getZoomFactor());

	var p = imgHelper.logicalToPhysicalPoint(new OpenSeadragon.Point(0, 0));

	svgOverlayVM.annoGrpTranslateX(p.x);
	svgOverlayVM.annoGrpTranslateY(p.y);
	svgOverlayVM.annoGrpScale(statusObj.scaleFactor());

	var annoGrp = document.getElementById('annoGrp');
	annoGrp.setAttribute("transform", annoGrpTransformFunc());
}




function getSampleColors() {

	var left, right, top, bottom, width, height;

	// Grab nuclei a viewport width surrounding the current viewport
	//
	width = statusObj.dataportRight() - statusObj.dataportLeft();
	height = statusObj.dataportBottom() - statusObj.dataportTop();

	left = (statusObj.dataportLeft() - width > 0) ?	statusObj.dataportLeft() - width : 0;
	right = statusObj.dataportRight() + width;
	top = (statusObj.dataportTop() - height > 0) ?	statusObj.dataportTop() - height : 0;
	bottom = statusObj.dataportBottom() + height;

	if (left > 0 && top > 0) {
			$.ajax({
			type: "POST",
					url: "db/getsamplecolor.php",
					dataType: "json",
			data: { uid:	uid,
					slide: 	curSlide,
					left:	left,
					right:	right,
					top:	top,
					bottom:	bottom,
					dataset: curDataset,
					trainset: classifier,
					classification: JSON.stringify(viewresultJson)
			},

			success: function(data) {

					$('#progressBar').css("width", '90%');


					segGrp = document.getElementById('segGrp');
					annoGrp = document.getElementById('anno');

					// Save current viewport location
					boundsLeft = statusObj.dataportLeft();
					boundsRight = statusObj.dataportRight();
					boundsTop = statusObj.dataportTop();
					boundsBottom = statusObj.dataportBottom();

					// If group exists, delete it
					if( segGrp != null ) {
						segGrp.parentNode.removeChild(segGrp);
					}

					// Create segment group
					segGrp = document.createElementNS("http://www.w3.org/2000/svg", "g");
					segGrp.setAttribute('id', 'segGrp');
					annoGrp.appendChild(segGrp);


					for( cell in data ) {
						ele = document.createElementNS("http://www.w3.org/2000/svg", "polygon");

						ele.setAttribute('points', data[cell][0]);
						ele.setAttribute('id', 'N' + data[cell][1]);
						ele.setAttribute('stroke', 'aqua');
						// ele.setAttribute('stroke-width', '2');
						ele.setAttribute('fill', data[cell][2]);
						if (data[cell][2] == 'lightgrey') {
							ele.setAttribute("fill-opacity", "0");
						}
						if (data[cell][2] == 'lime') {
							ele.setAttribute("fill-opacity", "0.4");
						}
						ele.setAttribute("stroke-dasharray", "4 1");

						segGrp.appendChild(ele);
					}


					if( panned ) {
						ele = document.createElementNS("http://www.w3.org/2000/svg", "rect");

						ele.setAttribute('x', pannedX - 50);
						ele.setAttribute('y', pannedY - 50);
						ele.setAttribute('width', 100);
						ele.setAttribute('height', 100);
						ele.setAttribute('stroke', 'yellow');
						ele.setAttribute('fill', 'none');
						ele.setAttribute('stroke-width', 4);
						ele.setAttribute('id', 'boundBox');

						segGrp.appendChild(ele);
					}
					// if the number of samples fixed is larger than 0,
					if( fixes['centroids'].length > 0 ) {
						for( cell in fixes['centroids'] ) {
							var bound = document.getElementById("N"+fixes['centroids'][cell]['id']);

							if( bound != null ) {
									if( fixes['centroids'][cell]['checked'] == 1 ) {
											bound.setAttribute('fill', 'lime');
											bound.setAttribute("fill-opacity", "0.2");
									} else if( fixes['centroids'][cell]['checked'] == 0 ) {
											bound.setAttribute('fill', 'lightgrey');
											bound.setAttribute("fill-opacity", "0.2");
									}
							}
						}
					}
				}
			});
		}
}

function gotoView() {

		var left, right, top, bottom, width, height;

		// Grab nuclei a viewport width surrounding the current viewport
		//
		width = statusObj.dataportRight() - statusObj.dataportLeft();
		height = statusObj.dataportBottom() - statusObj.dataportTop();

		left = (statusObj.dataportLeft() - width > 0) ?	statusObj.dataportLeft() - width : 0;
		right = statusObj.dataportRight() + width;
		top = (statusObj.dataportTop() - height > 0) ?	statusObj.dataportTop() - height : 0;
		bottom = statusObj.dataportBottom() + height;

		// var stringjson = JSON.stringify(selectedJSON);
		viewJSON = {}
		viewJSON['id'] = uid;
		viewJSON['uid'] = uid;
		viewJSON['target'] = 'view';
		viewJSON['dataset'] = datapath;
		viewJSON['centroids'] = fixes['centroids'];
		viewJSON['classifier'] = classifier;
		viewJSON['width'] = curWidth;
		viewJSON['height'] = curHeight;
		viewJSON['slide'] = curSlide;
		viewJSON['left'] = Math.round(left).toString();
		viewJSON['right'] = Math.round(right).toString();
		viewJSON['top'] = Math.round(top).toString();
		viewJSON['bottom'] = Math.round(bottom).toString();
		// viewJSON['dataset'] = dataset;
		// viewJSON['trainset'] = trainset;

		$.ajax({
				type: 'POST',
				url: '/model/model/view',
				data: JSON.stringify(viewJSON),
				contentType: 'application/json;charset=UTF-8',
				dataType: "json",
				success: function(data){
					// var XandYLabelsJson = {left: 0, right: 0, top: 0, bottom: 0, samples: []};
					viewresultJson = JSON.parse(data);
					if( statusObj.scaleFactor() > 0.2 ) {
						getSampleColors();
					}
				},
				error: function() {
					console.log("Selection failed");
				}
			});

			// set heatmapLoaded to false after retraining
			heatmapLoaded = false;
}

function gotoHeatmap() {

	var viewJSON = {}
	viewJSON['id'] = uid;
	viewJSON['uid'] = uid;
	viewJSON['target'] = 'heatmap';
	viewJSON['dataset'] = datapath;
	viewJSON['centroids'] = fixes['centroids'];
	viewJSON['slide'] = curSlide;
	viewJSON['width'] = curWidth;
	viewJSON['height'] = curHeight;
	viewJSON['index'] = 0;

	$.ajax({
			type: 'POST',
			url: '/model/model/heatmap',
			data: JSON.stringify(viewJSON),
			contentType: 'application/json;charset=UTF-8',
			dataType: "json",

		success: function(data) {

			heatmapresultJson = JSON.parse(data);

			if (typeof heatmapresultJson.width != "undefined") {

				annoGrp = document.getElementById('annoGrp');
				segGrp = document.getElementById('heatmapGrp');

				if( segGrp != null ) {
					segGrp.parentNode.removeChild(segGrp);
				}

				segGrp = document.createElementNS("http://www.w3.org/2000/svg", "g");
				segGrp.setAttribute('id', 'heatmapGrp');
				annoGrp.appendChild(segGrp);

				var xlinkns = "http://www.w3.org/1999/xlink";
				ele = document.createElementNS("http://www.w3.org/2000/svg", "image");
				ele.setAttributeNS(null, "x", 0);
				ele.setAttributeNS(null, "y", 0);
				ele.setAttributeNS(null, "width", heatmapresultJson.width);
				ele.setAttributeNS(null, "height", heatmapresultJson.height);
				ele.setAttributeNS(null, 'opacity', 0.25);
				ele.setAttribute('id', 'heatmapImg');

				uncertMin = heatmapresultJson.uncertMin;
				uncertMax = heatmapresultJson.uncertMax;
				classMin = heatmapresultJson.classMin;
				classMax = heatmapresultJson.classMax;

				if( $('#heatmapUncertain').is(':checked') ) {
					ele.setAttributeNS(xlinkns, "href", "heatmaps/"+uid+"/"+heatmapresultJson.uncertFilename+"?v="+(new Date()).getTime());
				} else {
					ele.setAttributeNS(xlinkns, "href", "heatmaps/"+uid+"/"+heatmapresultJson.classFilename+"?v="+(new Date()).getTime());
				}
				segGrp.appendChild(ele);

				heatmapLoaded = true;
			}

			// console.log("Uncertainty min: "+uncertMin+", max: "+uncertMax+", median: "+XandYLabelsJson.uncertMedian);
		}
	});
}
//
//	Retreive the boundaries for nuclei within the viewport bounds and an
//	area surrounding the viewport. The are surrounding the viewport is a
//	border the width and height of the viewport. This allows the user to pan a full
//	viewport width or height before having to fetch new boundaries.
//
//
function updateSeg() {

	var ele, segGrp, annoGrp, slide_width, slide_height;

	if( statusObj.scaleFactor() > 0.2 ) {

		gotoView();

	} else {

		// Only display heatmap for active sessions
		//
		if( curSlide != "" && classifier != 'none' && heatmapLoaded == false ) {

			gotoHeatmap();

		}
	}
}

//
// Update colors when a sample is selected
// Parameters
// selectedJSON id
//
function updateBoundColors(obj) {

	for( cell in fixes['centroids'] ) {
		var bound = document.getElementById("N"+fixes['centroids'][cell]['id']);

		if( bound != null ) {
			if (fixes['centroids'][cell]['id'] == obj['id']){
					bound.setAttribute('fill', 'yellow');
					bound.setAttribute("fill-opacity", "0.2");
			}
		}
	}
}

function updateRegionBoundColors(obj) {

	for( cell in fixes['centroids'] ) {
		var bound = document.getElementById("N"+fixes['centroids'][cell]['id']);

		if( bound != null ) {
			if (fixes['centroids'][cell]['id'] == obj['id']){
				if( fixes['centroids'][cell]['checked'] == 1 ) {
						bound.setAttribute('fill', 'lime');
						bound.setAttribute("fill-opacity", "0.2");
				}
				if( fixes['centroids'][cell]['checked'] == 0 ) {
						bound.setAttribute('fill', 'lightgrey');
						bound.setAttribute("fill-opacity", "0.2");
				}
			}
		}
	}
}

//
// Undo colors when a sample is deleted
// Parameters
// selectedJSON id
//
function undoBoundColors(obj) {

	for( cell in fixes['centroids'] ) {
		var bound = document.getElementById("N"+fixes['centroids'][cell]['id']);

		if( bound != null ) {
			// check id
			if (fixes['centroids'][cell]['id'] == obj['id']){
				// check label
				if( fixes['centroids'][cell]['checked'] == 0 ) {
					bound.setAttribute('fill', 'lime');
					bound.setAttribute("fill-opacity", "0.2");
				}
				else if( fixes['centroids'][cell]['checked'] == 1 ) {
						bound.setAttribute('fill', 'lightgrey');
						bound.setAttribute("fill-opacity", "0.2");
				}
			}
		}
	}
}


function undoRegionBoundColors(obj) {

	for( cell in fixes['centroids'] ) {
		var bound = document.getElementById("N"+fixes['centroids'][cell]['id']);

		if( bound != null ) {
			// check id
			if (fixes['centroids'][cell]['id'] == obj['id']){
				// check label
				if( fixes['centroids'][cell]['checked'] == 0 ) {
						bound.setAttribute('fill', 'lime');
						bound.setAttribute("fill-opacity", "0.2");
				} else if( fixes['centroids'][cell]['checked'] == 1 ) {
						bound.setAttribute('fill', 'lightgrey');
						bound.setAttribute("fill-opacity", "0.2");
				}
			}
		}
	}
}

function retrain() {

	isretrained = true;

	var left, right, top, bottom, width, height;
	var viewJSON;
	var delay = 2000;

	$('#progDiag').modal('show');
	$('#progressBar').css("width", '10%');

	if( statusObj.scaleFactor() > 0.2 ) {

		// Grab nuclei a viewport width surrounding the current viewport
		//
		width = statusObj.dataportRight() - statusObj.dataportLeft();
		height = statusObj.dataportBottom() - statusObj.dataportTop();

		left = (statusObj.dataportLeft() - width > 0) ?	statusObj.dataportLeft() - width : 0;
		right = statusObj.dataportRight() + width;
		top = (statusObj.dataportTop() - height > 0) ?	statusObj.dataportTop() - height : 0;
		bottom = statusObj.dataportBottom() + height;

		// var stringjson = JSON.stringify(selectedJSON);
		viewJSON = {};
		viewJSON['id'] = uid;
		viewJSON['uid'] = uid;
		viewJSON['target'] = 'view';
		viewJSON['classifier'] = classifier;
		viewJSON['dataset'] = datapath;
		viewJSON['centroids'] = fixes['centroids'];
		viewJSON['width'] = curWidth;
		viewJSON['height'] = curHeight;
		viewJSON['slide'] = curSlide;
		viewJSON['left'] = Math.round(left).toString();
		viewJSON['right'] = Math.round(right).toString();
		viewJSON['top'] = Math.round(top).toString();
		viewJSON['bottom'] = Math.round(bottom).toString();

		$.ajax({
			type: "POST",
			url: '/model/model/view',
			dataType: "json",
			data: JSON.stringify(viewJSON),
			contentType: 'application/json;charset=UTF-8',
			success: function(data) {

				// fixes['centroids'] = [];
				statusObj.samplesToFix(0);
				viewresultJson = JSON.parse(data);

				if( statusObj.scaleFactor() > 0.2 ) {
					getSampleColors();
				}

				setTimeout(function() {
					// Hide progress dialog
					$('#progDiag').modal('hide');
			        }, delay);

			}
		});

	}

	else {

			if( curSlide != "" && classifier != 'none' && heatmapLoaded == false ) {

				viewJSON = {};
				viewJSON['id'] = uid;
				viewJSON['uid'] = uid;
				viewJSON['target'] = 'heatmap';
				viewJSON['classifier'] = classifier;
				viewJSON['centroids'] = fixes['centroids'];
				viewJSON['dataset'] = datapath;
				viewJSON['slide'] = curSlide;
				viewJSON['iteration'] = iteration;
				viewJSON['width'] = curWidth;
				viewJSON['height'] = curHeight;

				$.ajax({
						type: 'POST',
						url: '/model/model/heatmap',
						data: JSON.stringify(viewJSON),
						contentType: 'application/json;charset=UTF-8',
						dataType: "json",

					success: function(data) {

						heatmapresultJson = JSON.parse(data);

						annoGrp = document.getElementById('annoGrp');
						segGrp = document.getElementById('heatmapGrp');

						if( segGrp != null ) {
							segGrp.parentNode.removeChild(segGrp);
						}

						segGrp = document.createElementNS("http://www.w3.org/2000/svg", "g");
						segGrp.setAttribute('id', 'heatmapGrp');
						annoGrp.appendChild(segGrp);

						var xlinkns = "http://www.w3.org/1999/xlink";
						ele = document.createElementNS("http://www.w3.org/2000/svg", "image");
						ele.setAttributeNS(null, "x", 0);
						ele.setAttributeNS(null, "y", 0);
						ele.setAttributeNS(null, "width", heatmapresultJson.width);
						ele.setAttributeNS(null, "height", heatmapresultJson.height);
						ele.setAttributeNS(null, 'opacity', 0.25);
						ele.setAttribute('id', 'heatmapImg');

						classMin = heatmapresultJson.classMin;
						classMax = heatmapresultJson.classMax;

						ele.setAttributeNS(xlinkns, "href", "heatmaps/"+uid+"/"+heatmapresultJson.classFilename+"?v="+(new Date()).getTime());
						segGrp.appendChild(ele);

						heatmapLoaded = true;

						statusObj.samplesToFix(0);

						setTimeout(function() {
							// Hide progress dialog
							$('#progDiag').modal('hide');
									}, delay);
					}
				});
			}
	}

	// $('#retrainBtn').attr('disabled', 'disabled');
}


//
// ===============	Mouse event handlers for viewer =================
//

//
//	Mouse enter event handler for viewer
//
//
function onMouseEnter(event) {
	statusObj.haveMouse(true);
}


//
// Mouse move event handler for viewer
//
//
function onMouseMove(event) {
	var offset = osdCanvas.offset();

	statusObj.mouseRelX(event.pageX - offset.left);
	statusObj.mouseRelY(event.pageY - offset.top);
	statusObj.mouseImgX(imgHelper.physicalToDataX(statusObj.mouseRelX()));
	statusObj.mouseImgY(imgHelper.physicalToDataY(statusObj.mouseRelY()));
}



//
// =======================  Button Handlers ===================================
//



//
//	Load the boundaries for the current slide and display
//
//
function viewSegmentation() {

	var	segBtn = $('#btn_1');

	if( segDisplayOn ) {
		// Currently displaying segmentation, hide it
		segBtn.val("Show Segmentation");
		$('.overlaySvg').css('visibility', 'hidden');
		segDisplayOn = false;

	} else {
		// Segmentation not currently displayed, show it
		segBtn.val("Hide Segmentation");
		$('.overlaySvg').css('visibility', 'visible');
		segDisplayOn = true;

		if (uid != null) {
			if( statusObj.scaleFactor() > 0.2 ) {
					gotoView();
			} else {
					gotoHeatmap();
			}
		}
		else {
			if( statusObj.scaleFactor() > 0.2 ) {
				updateSlideSeg();
			}
		}

	}

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

function saveTrainSet() {

	$('#saveDiag').modal('show');
	$('#saveprogressBar').css("width", '30%');

	var target = 'save';

	$.ajax({
			type: 'POST',
			url: '/model/model/save',
			data: {
							uid: uid,
							target: target,
							classifier: classifier,
							posclass: posClass,
							negclass: negClass,
							dataset: datapath,
							pca: pcapath,
							iteration: iteration.toString(),
							reloaded: init_reloaded.toString()
			},
			dataType: "json",
			success: function(data){
				var saveJson = JSON.parse(data);
				$('#saveprogressBar').css("width", '30%');
				if( init_reloaded ) {
					finishSaveReloaded(saveJson);
				}
				else{
					finishSave(saveJson);
				}
				$('#saveDiag').modal('hide');
			},
			error: function() {
				console.log("Save failed");
			}
		});

		$('#btn_save').attr('disabled', 'disabled');

}


function saveSession() {

	$('#saveDiag').modal('show');
	$('#saveprogressBar').css("width", '30%');

	var target = 'save';
	isfinalize = true;

	if( init_reloaded ) {

			$.ajax({
					type: 'POST',
					url: '/model/model/save',
					data: {
									uid: uid,
									target: target,
									classifier: classifier,
									posclass: posClass,
									negclass: negClass,
									dataset: datapath,
									pca: pcapath,
									iteration: iteration.toString(),
									reloaded: init_reloaded.toString()
					},
					dataType: "json",
					success: function(data){
						var saveJson = JSON.parse(data);
						$('#saveprogressBar').css("width", '30%');
						finishSaveReloaded(saveJson);
					},
					error: function() {
						console.log("Save failed");
					}
				});

	} else {

		$.ajax({
				type: 'POST',
				url: '/model/model/save',
				data: {
								uid: uid,
								target: target,
								classifier: classifier,
								posclass: posClass,
								negclass: negClass,
								dataset: datapath,
								pca: pcapath,
								iteration: iteration.toString(),
								reloaded: init_reloaded.toString()
				},
				dataType: "json",
				success: function(data){
					var saveJson = JSON.parse(data);
					$('#saveprogressBar').css("width", '30%');
					finishSave(saveJson);
				},
				error: function() {
					console.log("Save failed");
				}
			});
	}
}

function finishSaveReloaded(saveJson) {

	var iterations = saveJson['iterations'];
	var filename = saveJson['filename'];
	var samples = JSON.stringify(saveJson['samples']);

	$.ajax({
		type: "POST",
		url: "php/finishReloadedSession_nn.php",
		data: {
						uid: uid,
						iterations: iterations,
						filename:	filename,
						samples: samples,
						classifier: classifier,
						posClass: posClass,
						negClass: negClass,
						dataset: curDataset
		},
		success: function(data) {
			$('#saveprogressBar').css("width", '80%');
			if (isfinalize) {
				cancel();
			}
		},
		error: function() {
			console.log("Save failed");
		}
	});

}


function finishSave(saveJson) {

	var iterations = saveJson['iterations'];
	var filename = saveJson['filename'];
	var samples = JSON.stringify(saveJson['samples']);

	$.ajax({
		type: "POST",
		url: "php/finishSession_nn.php",
		data: {
						uid: uid,
						iterations: iterations,
						filename:	filename,
						samples: samples,
						classifier: classifier,
						posClass: posClass,
						negClass: negClass,
						dataset: curDataset
		},
		success: function(data) {
			$('#saveprogressBar').css("width", '80%');
			if (isfinalize) {
				cancel();
			}
		},
		error: function() {
			console.log("Save failed");
		}
	});

}


function go() {

	var	segBtn = $('#btn_1');

	pannedX = $("#x_pos").val();
	pannedY = $("#y_pos").val();

	// TODO! - Need to validate location against size of image
	if( pannedX === "" || pannedY === "" ) {
		window.alert("Invalid position");
	} else {

		// Turn on overlay and reset bounds to force update
		segBtn.val("Hide Segmentation");
		$('.overlaySvg').css('visibility', 'visible');
		segDisplayOn = true;
		boundsLeft = boundsRight = boundsTop = boundsBottom = 0;

		// Zoom in all the way
		viewer.viewport.zoomTo(viewer.viewport.getMaxZoom());

		// Move to nucei
		imgHelper.centerAboutLogicalPoint(new OpenSeadragon.Point(imgHelper.dataToLogicalX(pannedX),
															  imgHelper.dataToLogicalY(pannedY)));
		panned = true;
	}
}







//
// Retruns the value of the GET request variable specified by name
//
//
function $_GET(name) {
	var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
	return match && decodeURIComponent(match[1].replace(/\+/g,' '));
}


function homeToNuclei() {

	// Zoom in all the way
	viewer.viewport.zoomTo(viewer.viewport.getMaxZoom());
	// Move to nucei
	imgHelper.centerAboutLogicalPoint(new OpenSeadragon.Point(imgHelper.dataToLogicalX(curX),
															  imgHelper.dataToLogicalY(curY)));
}


//
// Image data we want knockout.js to keep track of
//
var statusObj = {
	haveImage: ko.observable(false),
	haveMouse: ko.observable(false),
	imgAspectRatio: ko.observable(0),
	imgWidth: ko.observable(0),
	imgHeight: ko.observable(0),
	mouseRelX: ko.observable(0),
	mouseRelY: ko.observable(0),
	mouseImgX: ko.observable(0),
	mouseImgY: ko.observable(0),
	scaleFactor: ko.observable(0),
	viewportX: ko.observable(0),
	viewportY: ko.observable(0),
	viewportW: ko.observable(0),
	viewportH: ko.observable(0),
	dataportLeft: ko.observable(0),
	dataportTop: ko.observable(0),
	dataportRight: ko.observable(0),
	dataportBottom: ko.observable(0),
	samplesToFix: ko.observable(0),
	iteration:	ko.observable(0),
	curSlide: ko.observable("")
};


var svgOverlayVM = {
	annoGrpTranslateX:	ko.observable(0.0),
	annoGrpTranslateY:	ko.observable(0.0),
	annoGrpScale: 		ko.observable(1.0),
	annoGrpTransform:	annoGrpTransformFunc
};

var vm = {
	statusObj:	ko.observable(statusObj),
	svgOverlayVM: ko.observable(svgOverlayVM)
};



// Apply binfding for knockout.js - Let it keep track of the image info
// and mouse positions
//
ko.applyBindings(vm);
