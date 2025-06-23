<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	// Props: lineData should be array of {date, temp} objects
	let { lineData = [] } = $props();

	let container;

	// Function to calculate VPD (Vapor Pressure Deficit) in kPa
	function calculateVPD(temperature, humidity) {
		// Saturated vapor pressure (es) using Magnus formula
		const es = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
		// Actual vapor pressure (ea)
		const ea = es * (humidity / 100);
		// VPD = es - ea
		return es - ea;
	}

	// Generate VPD heatmap data based on the chart ranges
	function generateVPDData() {
		const data = [];
		// Temperature range: 5°C to 40°C (matching the image)
		for (let temp = 5; temp <= 40; temp++) {
			// Humidity range: 40% to 95% in 5% increments (matching the image)
			for (let hum = 40; hum <= 95; hum += 5) {
				const vpd = calculateVPD(temp, hum);
				data.push({
					temperature: temp,
					humidity: hum,
					vpd: vpd
				});
			}
		}
		return data;
	}

	onMount(() => {
		const margin = { top: 60, right: 60, bottom: 80, left: 80 };
		const W = 900 - margin.left - margin.right;
		const H = 700 - margin.top - margin.bottom;

		// Clear any existing content
		d3.select(container).selectAll('*').remove();

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', W + margin.left + margin.right)
			.attr('height', H + margin.top + margin.bottom)
			.style('background', 'white')
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Generate VPD data
		const vpdData = generateVPDData();

		// Scales
		const temperatures = d3.range(5, 41); // 5°C to 40°C
		const humidities = d3.range(40, 100, 5); // 40% to 95% in 5% steps

		const xScale = d3.scaleBand().domain(humidities).range([0, W]).padding(0.02);

		const yScale = d3
			.scaleBand()
			.domain(temperatures.reverse()) // Reverse so higher temps are at top
			.range([0, H])
			.padding(0.02);

		// Color scale matching the image (blue for low VPD, yellow/red for high VPD)
		const colorScale = d3
			.scaleSequential()
			.domain([0, 3]) // VPD range in kPa
			.interpolator(d3.interpolateRdYlBu)
			.clamp(true);

		// Draw heatmap cells
		svg
			.selectAll('rect')
			.data(vpdData)
			.enter()
			.append('rect')
			.attr('x', (d) => xScale(d.humidity))
			.attr('y', (d) => yScale(d.temperature))
			.attr('width', xScale.bandwidth())
			.attr('height', yScale.bandwidth())
			.attr('fill', (d) => colorScale(d.vpd))
			.attr('stroke', '#fff')
			.attr('stroke-width', 0.5);

		// Add VPD values as text in each cell (like in the image)
		svg
			.selectAll('text.vpd-value')
			.data(vpdData)
			.enter()
			.append('text')
			.attr('class', 'vpd-value')
			.attr('x', (d) => xScale(d.humidity) + xScale.bandwidth() / 2)
			.attr('y', (d) => yScale(d.temperature) + yScale.bandwidth() / 2)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.style('font-size', '10px')
			.style('font-weight', 'bold')
			.style('fill', (d) => (d.vpd > 1.5 ? 'white' : 'black'))
			.text((d) => d.vpd.toFixed(1) + 'kPa');

		// Y-axis (Temperature)
		const yAxis = d3.axisLeft(yScale).tickFormat((d) => d + '°C');

		svg.append('g').call(yAxis).style('font-size', '12px');

		// X-axis (Humidity)
		const xAxis = d3.axisBottom(xScale).tickFormat((d) => d + '%');

		svg.append('g').attr('transform', `translate(0,${H})`).call(xAxis).style('font-size', '12px');

		// Axis labels
		svg
			.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('y', 0 - margin.left)
			.attr('x', 0 - H / 2)
			.attr('dy', '1em')
			.style('text-anchor', 'middle')
			.style('font-size', '14px')
			.style('font-weight', 'bold')
			.text('Temperature (°C)');

		svg
			.append('text')
			.attr('transform', `translate(${W / 2}, ${H + margin.bottom - 10})`)
			.style('text-anchor', 'middle')
			.style('font-size', '14px')
			.style('font-weight', 'bold')
			.text('Humidity (%)');

		// Title
		svg
			.append('text')
			.attr('x', W / 2)
			.attr('y', 0 - margin.top / 2)
			.attr('text-anchor', 'middle')
			.style('font-size', '16px')
			.style('font-weight', 'bold')
			.text('Vapor Pressure Deficit (VPD) Chart');

		// Legend indicators (like in the image)
		const legendY = H + 50;

		// Yellow indicator (too dry)
		svg
			.append('rect')
			.attr('x', W * 0.2)
			.attr('y', legendY)
			.attr('width', 20)
			.attr('height', 15)
			.attr('fill', colorScale(2.5));

		svg
			.append('text')
			.attr('x', W * 0.2 + 25)
			.attr('y', legendY + 12)
			.style('font-size', '12px')
			.text('Yellow: Too Dry');

		// Blue indicator (too wet)
		svg
			.append('rect')
			.attr('x', W * 0.6)
			.attr('y', legendY)
			.attr('width', 20)
			.attr('height', 15)
			.attr('fill', colorScale(0.5));

		svg
			.append('text')
			.attr('x', W * 0.6 + 25)
			.attr('y', legendY + 12)
			.style('font-size', '12px')
			.text('Blue: Too Wet');

		// Draw line data if provided
		if (lineData && lineData.length > 0) {
			// For line data, we need to map temperature to humidity somehow
			// Assuming lineData contains {date, temp, humidity} or we calculate humidity
			const linePoints = lineData.filter((d) => d.temp >= 5 && d.temp <= 40);

			if (linePoints.length > 0) {
				// If humidity is not provided, we'll need to calculate or estimate it
				// For now, assuming lineData has both temp and humidity
				const line = d3
					.line()
					.x((d) => xScale(d.humidity || 60) + xScale.bandwidth() / 2) // Default to 60% if no humidity
					.y((d) => yScale(d.temp) + yScale.bandwidth() / 2)
					.curve(d3.curveMonotoneX);

				svg
					.append('path')
					.datum(linePoints)
					.attr('fill', 'none')
					.attr('stroke', '#000')
					.attr('stroke-width', 3)
					.attr('d', line);

				// Add circles for line points
				svg
					.selectAll('circle.line-point')
					.data(linePoints)
					.enter()
					.append('circle')
					.attr('class', 'line-point')
					.attr('cx', (d) => xScale(d.humidity || 60) + xScale.bandwidth() / 2)
					.attr('cy', (d) => yScale(d.temp) + yScale.bandwidth() / 2)
					.attr('r', 4)
					.attr('fill', '#000')
					.attr('stroke', '#fff')
					.attr('stroke-width', 2);
			}
		}
	});
</script>

<div bind:this={container}></div>
