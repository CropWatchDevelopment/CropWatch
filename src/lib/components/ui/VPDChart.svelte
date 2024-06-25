<script>
    import { onMount } from "svelte";
    import * as d3 from "d3";
  
    function calculateVPD(temp, humidity) {
      const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
      const ea = (humidity / 100) * es;
      return es - ea;
    }
  
    const temperatures = d3.range(15, 36);
    const humidities = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35];
  
    const vpdData = temperatures.map(temp => {
      return humidities.map(humidity => ({
        temp,
        humidity,
        vpd: calculateVPD(temp, humidity)
      }));
    });
  
    let svg;
    const width = 1000;
    const height = 700;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  
    onMount(() => {
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
  
      const xScale = d3.scaleBand()
        .domain(humidities)
        .range([0, chartWidth])
        .padding(0.1);
  
      const yScale = d3.scaleBand()
        .domain(temperatures)
        .range([chartHeight, 0])
        .padding(0.1);
  
      const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain([d3.max(vpdData.flat(), d => d.vpd), 0]);
  
      const svgElement = d3.select(svg)
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      svgElement.selectAll()
        .data(vpdData.flat())
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.humidity))
        .attr("y", d => yScale(d.temp))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.vpd));
  
      svgElement.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d + '%'));
  
      svgElement.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => d + '°C'));
  
      // Add a legend
      const legend = svgElement.append("g")
        .attr("transform", `translate(${chartWidth + 20}, 0)`);
  
      const legendScale = d3.scaleLinear()
        .domain([0, d3.max(vpdData.flat(), d => d.vpd)])
        .range([0, 200]);
  
      const legendAxis = d3.axisRight(legendScale)
        .ticks(6);
  
      legend.selectAll("rect")
        .data(d3.range(0, d3.max(vpdData.flat(), d => d.vpd), d3.max(vpdData.flat(), d => d.vpd) / 20))
        .enter()
        .append("rect")
        .attr("y", d => legendScale(d))
        .attr("width", 20)
        .attr("height", legendScale(d3.max(vpdData.flat(), d => d.vpd) / 20))
        .attr("fill", d => colorScale(d));
  
      legend.append("g")
        .attr("transform", "translate(20, 0)")
        .call(legendAxis);
    });
  </script>
  
  <style>
    .chart {
      display: block;
      margin: auto;
    }
  </style>
  
  <svg bind:this={svg} class="chart"></svg>
  