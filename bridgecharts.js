var plots = []; //an array of all plots

// TODO: sync this with the one in bridgeChart.js
var margin = {top: 10, right: 10, bottom: 25, left: 40};

var supportsOrientationChange = "onorientationchange" in window;
var orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";
window.addEventListener(
  orientationEvent,
  function() {
    if (navigator.userAgent.match(/android/i)) {
      setTimeout("redraw()", 500); //Only wait for Android
    } else {
      redraw();
    }
  },
  false
);

var zoomSVG = d3.select("#zoomSVG");
var zoomRect = d3.select("#zoomRect");

var redraw = function () {
  plots.forEach(function (plt) {
    plt.containerWidth(document.getElementById("chartContainer").offsetWidth).update();
  });
  d3.select("#charts").attr("width", document.getElementById("chartContainer").offsetWidth);
  zoomSVG.attr("width", document.getElementById("chartContainer").offsetWidth)
          .attr("height", document.getElementById("chartContainer").offsetHeight);
  zoomRect.attr("width", document.getElementById("chartContainer").offsetWidth - margin.left - margin.right)
           .attr("height", document.getElementById("chartContainer").offsetHeight)
           .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

  //update the zoom for the new plot size
  updateZoom();
}

// this will be changed once 'news' is sent from the server
// for now it's just a dummy
var updateZoom = function () { return 0; };


// these are the overall scales which are modified by zooming
// they should be set as the default for new plots
var xScale = d3.scale.linear().domain([0, 200]).range([0, document.getElementById("chartContainer").offsetWidth]);
var yScale = d3.scale.linear();

function copyScale(scal) {
  return d3.scale.linear().domain([scal.domain()[0], scal.domain()[1]]).range([scal.range()[0], scal.range()[1]]);
}

function zoomAll() {
  plots.forEach(function (plt) {
    plt.xScale(copyScale(xScale)).update();
  });
}

var zoom = d3.behavior.zoom()
  .on("zoom", zoomAll);


var changeLines = function () {
  plots.forEach(function (plt) {
    plt.setSelectedLines().update();
  });
}

document.getElementById("render-lines").addEventListener("change", changeLines, false);
document.getElementById("render-depth").addEventListener("mouseup", changeLines, false);
document.getElementById("render-depth").addEventListener("touchend", changeLines, false);
document.getElementById("render-method").addEventListener("change", changeLines, false);

d3.select("#zoomin").on("click", zoomin);
d3.select("#zoomout").on("click", zoomout);
d3.select("#scrollleft").on("click", scrollleft);
d3.select("#scrollright").on("click", scrollright);

function transitionAllNextTime() {
  plots.forEach(function (plt) {
    plt.transitionNextTime(true);
  });
}

// func1 is the function which modifies the domain start in terms of the old domain start, and xdist
// func2 is the function which modifies the domain end in terms of the old domain end, and xdist
function changeZoom(func1, func2) {
  var xdist = xScale.domain()[1] - xScale.domain()[0];

  xScale.domain([
    func1(xScale.domain()[0], xdist),
    func2(xScale.domain()[1], xdist)
  ]);

  zoom.x(xScale);
  transitionAllNextTime();
  zoomAll();
}

function zoomin() {
  changeZoom(
    function (a, b) { return a + (b/4); },
    function (a, b) { return a - (b/4); }
  );
}

function zoomout() {
  changeZoom(
    function (a, b) { return a - (b/2); },
    function (a, b) { return a + (b/2); }
  );
}

function scrollleft() {
  changeZoom(
    function (a, b) { return a + (b/4); },
    function (a, b) { return a + (b/4); }
  );
}

function scrollright() {
  changeZoom(
    function (a, b) { return a - (b/4); },
    function (a, b) { return a - (b/4); }
  );
}


//// SERVER COMMUNICATIONS ////

var socket = io.connect('130.179.231.28:8080/');
var firstTime = true;

//socket.on('connect_failed', function () {
//  console.log("connect_failed :(");
//});
//
//socket.on('connecting', function () {
//  console.log("connecting :!");
//});
//
//socket.on('connect', function () {
//  console.log("connected !!");
//});
//
//socket.on('disconnect', function () {
//  console.log("disconnected !!");
//});


socket.on('news', function (data) {
  // only do this once, so that plots don't get overlapped whenever the server restarts.
  if (!firstTime) {
    return;
  }
  // TODO: extract data about which "level" the data is for.
  // SPB is 200Hz

  firstTime = false;

  // deleting all example plots -->
  _.times(plots.length, function (i) {
    delete plots[i];
  });
  svg = document.getElementById("charts");
  while (svg.lastChild) {
    svg.removeChild(svg.lastChild);
  }
  plots = []; // delete the previous plots
  // <-- done deleting all example plots

  var json = JSON.parse(data);
  socket.emit('ack', "Message received!");

  var plot10 = binnedLineChart(_.map(json, function (d) { return -d.ESGgirder1; }));
  plot10.xScale(copyScale(xScale));

  var pl10 = d3.select("#charts").append("g").call(plot10);

  var plot11 = binnedLineChart(_.map(json,function (d) { return Math.random() * 5 + -d.ESGgirder1; }));
  plot11.xScale(copyScale(xScale));

  var pl11 = d3.select("#charts").append("g").call(plot11);

  // TODO: make the marginTop values dynamic
  plot10.containerWidth(document.getElementById("chartContainer").offsetWidth).height(75).marginTop(10).update();
  plot11.containerWidth(document.getElementById("chartContainer").offsetWidth).height(75).marginTop(120*1 + 10).update();
  plots.push(plot10);
  plots.push(plot11);
  redraw();

  d3.select("#charts").attr("height", 120*plots.length).attr("width", document.getElementById("chartContainer").offsetWidth);

  zoomSVG.attr("width", document.getElementById("chartContainer").offsetWidth)
          .attr("height", document.getElementById("chartContainer").offsetHeight)
          .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

  zoomRect.attr("width", document.getElementById("chartContainer").offsetWidth - margin.left - margin.right)
    .attr("height", document.getElementById("chartContainer").offsetHeight - margin.top)
    .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

  zoomRect.attr("fill", "rgba(0,0,0,0)")
    .call(zoom);

  //redefine this function now that we have data for it to work from
  updateZoom = function () {
    xScale = plot10.xScale();
    yScale = plot10.yScale();
    zoom.x(xScale);
    zoom.y(yScale);
  };

  updateZoom();
});


//// OFFLINE DEMO ////
// A demonstration with example data in case the server is down:

// wait 2 seconds to give the server a chance to send the data (to avoid the demo popping up and then disappearing)
// TODO: set this back to 2000 or so.
setTimeout(rundemo, 1500);

function rundemo() {
  d3.json("Server/esg_sample_index.js", function (error, data) {
    if (error || plots.length > 0) {
      return;
    }

    var json = data;

    //var plotD = binnedLineChart(_.map(json, function (d) { return -d.ESGgirder1; }));
    var plotD = binnedLineChart(json);
    plotD.xScale(copyScale(xScale));

    var pl10 = d3.select("#charts").append("g").call(plotD);

    plotD.containerWidth(document.getElementById("chartContainer").offsetWidth).height(75).marginTop(10).update();

    plots.push(plotD);

    // TODO: trim this all; put it into a separate function, so both this and the from-server code run the same identical code.
    redraw();

    d3.select("#charts").attr("height", 120*plots.length).attr("width", document.getElementById("chartContainer").offsetWidth); //TODO: make this dynamic

    zoomSVG.attr("width", document.getElementById("chartContainer").offsetWidth)
            .attr("height", document.getElementById("chartContainer").offsetHeight)
            .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    zoomRect.attr("width", document.getElementById("chartContainer").offsetWidth - margin.left - margin.right)
      .attr("height", document.getElementById("chartContainer").offsetHeight - margin.top)
      .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    zoomRect.attr("fill", "rgba(0,0,0,0)")
      .call(zoom);

    // TODO: redefine this function now that we have data for it to work from
    updateZoom = function () {
      xScale = plotD.xScale();
      yScale = plotD.yScale();
      zoom.x(xScale);
      zoom.y(yScale);
    };

    updateZoom();
  });
}
