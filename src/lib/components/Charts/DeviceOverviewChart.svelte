<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
  
    export let device;
    let svgRef: SVGSVGElement;
  
    onMount(() => {
      // Calculate sensor "health": percentage of sensors with valid data
      const sensorKeys = Object.keys(device.latest_data)
        .filter(key => key !== 'dev_eui' && key !== 'created_at');
      const validSensors = sensorKeys.filter(key => device.latest_data[key] != null);
      const percentage = validSensors.length / sensorKeys.length;
  
      const width = 200,
        height = 200,
        radius = Math.min(width, height) / 2;
  
      // Clear any previous SVG content
      d3.select(svgRef).selectAll("*").remove();
  
      // Append the group element and center it
      const svg = d3.select(svgRef)
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
  
      // Create the background (full circle) arc
      const backgroundArc = d3.arc()
        .innerRadius(radius - 20)
        .outerRadius(radius)
        .startAngle(0)
        .endAngle(2 * Math.PI);
  
      svg.append("path")
        .attr("d", backgroundArc as any)
        .attr("fill", "#1f2937"); // Tailwind gray-800
  
      // Define the foreground arc (progress indicator)
      const foregroundArc = d3.arc()
        .innerRadius(radius - 20)
        .outerRadius(radius)
        .startAngle(0);
  
      // Append the foreground arc, starting at 0
      const path = svg.append("path")
        .datum({ endAngle: 0 })
        .attr("fill", "#10b981") // Tailwind green-500
        .attr("d", foregroundArc as any);
  
      // Animate the arc to the calculated percentage
      path.transition()
        .duration(1000)
        .attrTween("d", function (d) {
          const interpolate = d3.interpolate(d.endAngle, 2 * Math.PI * percentage);
          return function (t) {
            d.endAngle = interpolate(t);
            return foregroundArc(d);
          };
        });
  
      // Add the percentage text in the center of the gauge
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("class", "text-white text-xl font-bold")
        .text(`${Math.round(percentage * 100)}%`);
    });
  </script>
  
  <svg bind:this={svgRef}></svg>
  