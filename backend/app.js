var width = 900;
var height = 500;

// Create Projection
var projection = d3.geo.mercator()

// Generate paths based on projection
var path = d3.geo.path()
        .projection(projection);

// Create SVG
var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

// Group for the map features
var features = svg.append("g")
        .attr("class","features");

// Build map with markers
d3.json("countries.topojson",function(error,geodata) {
    if (error) return console.log(error);

    //Create a path for each map feature in the data
    features.selectAll("path")
            .data(topojson.feature(geodata, geodata.objects.subunits).features)
            .enter()
            .append("path")
            .attr("d", path)
    // Add markers for cities by their latitude and longitude.
    d3.csv("cities.csv", function (error, data) {
        features.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", function (d) {
                    return projection([d.lon, d.lat])[0];
                })
                .attr("cy", function (d) {
                    return projection([d.lon, d.lat])[1];
                })
                .attr("r", 5)
                .style("fill", "red");

    });
});
