// inspired by http://vallandingham.me/bubble_chart_v4/

function bubbleChart() {

    var width = 800;
    var height = 500;

    // tooltip for mouseover functionality
    var tooltip = floatingTooltip('gates_tooltip', 240);

    var center = { x: width / 2, y: height / 1.9 };

    var nodeCenters = {
        "Europe": { x: width / 2, y: height / 3.7 },
        "Africa": { x: width / 1.9, y: height / 2 },
        "North America": { x: width / 4.2, y: height / 3.7 },
        "South America": { x: width / 3, y: height / 2 },
        "Asia": { x: width / 1.4, y: height / 3.7 },
        "Oceania": { x: width / 1.23, y: height / 1.9 }
    };

    console.log(nodeCenters);

      // y locations of the year titles. nb html markup doesn't work
    var changesTitleY = {
        "North America": height / 8,
        "South America": height / 2.15,
        "Asia": height / 8,
        "Africa": height / 2.15,
        "Europe": height / 8,
        "Oceania": height / 2.15
    };

    var changesTitleX = {
        "North America": width / 4.25,
        "South America": width / 3,
        "Asia": width / 1.37,
        "Africa": width / 1.9,
        "Europe": width / 2,
        "Oceania": width / 1.2
    };

    var forceStrength = 0.07;

    // These will be set in create_nodes and create_vis
    var svg = null;
    var bubbles = null;
    var nodes = [];

    function charge(d) {
        return -Math.pow(d.radius, 2.0) * forceStrength;
    }

    var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force("collide", d3.forceCollide().radius(function(d) { return d.radius + 0.5; }).iterations(2))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

    simulation.stop();

    var fillColor = d3.scaleOrdinal()
    .domain(['North America', 'South America', 'Asia', 'Europe', 'Oceania', 'Africa'])
    .range(['#A14A7b', '#EFC530', "#dd8a3e", "#0b4572", "#2f8fce", "#C7432B" ]);

    function createNodes(rawData) {

        var maxAmount = d3.max(rawData, function (d) { return +d.count; });

        var radiusScale = d3.scalePow()
        //.exponent(0.5)
        .range([2, 40])
        .domain([0, maxAmount]);

        var myNodes = rawData.map(function (d) {
            return {
                id: d.id,
                radius: radiusScale(+d.count),
                value: +d.count, // determines size
                group: d.continent,         // will determine colour and position
                country: d.country,
                x: Math.random() * 900,
                y: Math.random() * 800
            };
          });

        // sort them to prevent occlusion of smaller nodes.
        myNodes.sort(function (a, b) { return b.value - a.value; });

        return myNodes;

    }

    var chart = function chart(selector, rawData) {

        nodes = createNodes(rawData);

        svg = d3.select(selector)
        .append('svg')
        .attr("viewBox", "0 0 " + (width) + " " + (height))
        .attr("preserveAspectRatio", "xMidYMid meet");

        bubbles = svg.selectAll('.bubble')
        .data(nodes, function (d) { return d.id; });

        var bubblesE = bubbles.enter().append('circle')
        .classed('bubble', true)
        .attr('fill', function (d) { return fillColor(d.group); })
        .attr('r', 0)  // initial radius zero to allow transition
        .attr('class', function(d) { 
          return "bubble " + d.group 
        })
        .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
        .attr('stroke-width', 1)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

        // drag actions

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }
        
        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        bubbles = bubbles.merge(bubblesE);

        bubbles.transition()
        .duration(2000)
        .attr('r', function (d) { return d.radius; });

        // function addLabels (d) {
        //     bubbles.append("text")
        //     .classed()
        //     .text(function(d) { return d.country; })
        //     .style("font-size", function(d) { return Math.min(2 * d.radius, (2 * d.radius - 8) / this.getComputedTextLength() * 24) + "px"; })
        //     .attr("dy", ".35em");
        // }

        simulation.nodes(nodes);

        splitBubbles();

        // setTimeout(addLabels(), 2500);
        

    }

        function ticked() {
            bubbles
              .attr("cx", function(d) { return d.x = Math.max((d.radius+5), Math.min(width - (d.radius+5), d.x)); })
              .attr("cy", function(d) { return d.y = Math.max((d.radius+5), Math.min(height - (d.radius+5), d.y)); });
        }
        
          /*
           * Provides a y value for each node to be used with the split by year
           * y force.
           */
        function nodePosY(d) {
            return nodeCenters[d.group].y;
        }
    
        // add extra one for the x position
    
        function nodePosX(d) {
        return nodeCenters[d.group].x;
        }

        function splitBubbles() {

            showChangeTitles();

                    // @v4 Reset the 'y' force to draw the bubbles to their year centers
            simulation.force('y', d3.forceY().strength(forceStrength).y(nodePosY));

            simulation.force('x', d3.forceX().strength(forceStrength).x(nodePosX));

            // @v4 We can reset the alpha value and restart the simulation
            simulation.alpha(1).restart();

        }

        function showChangeTitles() {
            // Another way to do this would be to create
            // the change texts once and then just hide them.
            var changesData = d3.keys(changesTitleY);
            var changes = svg.selectAll('.change')
              .data(changesData);
        
            changes.enter().append('text')
              .attr('class', 'change')
              .attr('x', function (d) { return changesTitleX[d]; })
              .attr('y', function (d) { return changesTitleY[d]; })
              .attr('text-anchor', 'middle')
              .text(function (d) { return d; });
        }



        function mouseover(d) {

            d3.select(this)
            .attr('stroke', 'black')
            .attr('opacity', 0.7);

            var content = '<h3>' +
                        d.country +
                        '</h3>' +
                        '<span class="name">Authors: </span><span class="value">' +
                        d.value +
                        '</span>';

            tooltip.showTooltip(content, d3.event);
        }

        function mouseout(d) {

            // reset outline
            d3.select(this)
            .attr('stroke', d3.rgb(fillColor(d.group)).darker())
            .attr('opacity', 1);

            tooltip.hideTooltip();
        }

        return chart;


}

var myBubbleChart = bubbleChart();

function display(error, data) {
    if (error) {
      console.log(error);
    }
  
    myBubbleChart('#bubble-chart', data);
}

// Load the data.
d3.csv('data/All.csv', display);

// Link behaviour to dropdown

d3.select("#selector").on("change", selectGroup)

function selectGroup() {

    var group = this.options[this.selectedIndex].value

    // remove old svg or draws below

    d3.select("svg").remove();

    d3.csv('data/' + group + '.csv', display);

    console.log(group);
}

// Link top five to dropdown

$("#selector").on("change", function() {
    if (this.value == "All") {
        $("#one").html('1. US: <span class="top" style="color: rgb(145, 64, 110)">74</span>');
        $("#two").html('2. UK: <span class="top" style="color: #0b4572">45</span>');
        $("#three").html('= Germany: <span class="top" style="color: #0b4572">45</span');
        $("#four").html('3. Australia: <span class="top" style="color: #2983be">37</span>');
        $("#five").html('= China: <span class="top" style="color: #c27731">37</span>');
    } else if (this.value == "WG1") {
        // use .html() rather than .text() method since includes styling
        $("#one").html('1. US: <span class="top" style="color: rgb(145, 64, 110)">23</span>');
        $("#two").html('2. UK: <span class="top" style="color: #0b4572">21</span>');
        $("#three").html('3. China: <span class="top" style="color: #c27731">14</span>');
        $("#four").html('= Germany: <span class="top" style="color: #0b4572">14</span>');
        $("#five").html('4. Australia: <span class="top" style="color: #2983be">11</span>');
    } else if (this.value == "WG2") {
        $("#one").html('1. US: <span class="top" style="color: rgb(145, 64, 110)">31</span>');
        $("#two").html('2. Australia: <span class="top" style="color: #2983be">17</span>');
        $("#three").html('= Germany: <span class="top" style="color: #0b4572">17</span>');
        $("#four").html('3. UK: <span class="top" style="color: #0b4572">15</span>');
        $("#five").html('4. India: <span class="top" style="color: #c27731">13</span>');
    } else if (this.value == "WG3") {
        $("#one").html('1. US: <span class="top" style="color: rgb(145, 64, 110)">20</span>');
        $("#two").html('2. Germany: <span class="top" style="color: #0b4572">14</span>');
        $("#three").html('= Japan: <span class="top" style="color: #c27731">14</span>');
        $("#four").html('3. China: <span class="top" style="color: #c27731">13</span>');
        $("#five").html('4. India: <span class="top" style="color: #c27731">12</span>');
    } else {
        // do nothing
    }
})

// reset dropdown on window reload

$(document).ready(function () {
    $("select").each(function () {
        $(this).val($(this).find('option[selected]').val());
    });
})


