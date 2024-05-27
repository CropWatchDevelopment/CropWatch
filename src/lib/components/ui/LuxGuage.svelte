<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	export let luxValue = 0; // Example Lux value

	let svgContainer;

	onMount(() => {
		drawGauge();
	});

	function drawGauge() {
		const width = 150;
		const height = 150;
		const radius = Math.min(width, height) / 2;

		const svg = d3
			.select(svgContainer)
			.attr('width', width)
			.attr('height', height)
			.append('g')
			.attr('transform', `translate(${width / 2},${height / 2})`);

		// Define gradients
		const defs = svg.append('defs');

		const sunGradient = defs
			.append('radialGradient')
			.attr('id', 'sunGradient')
			.attr('cx', '50%')
			.attr('cy', '50%')
			.attr('r', '50%')
			.attr('fx', '50%')
			.attr('fy', '50%');

		sunGradient.append('stop').attr('offset', '0%').attr('stop-color', '#FFFF00'); // Bright yellow

		sunGradient.append('stop').attr('offset', '80%').attr('stop-color', '#FFD700'); // Slightly darker yellow

		sunGradient.append('stop').attr('offset', '100%').attr('stop-color', '#FFA500'); // Even darker perimeter

		const moonGradient = defs
			.append('radialGradient')
			.attr('id', 'moonGradient')
			.attr('cx', '50%')
			.attr('cy', '50%')
			.attr('r', '50%')
			.attr('fx', '50%')
			.attr('fy', '50%');

		moonGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ADD8E6'); // Light blue

		moonGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0000FF'); // Dark blue

		if (luxValue > 0) {
			// Sun circle with gradient
			svg
				.append('circle')
				.attr('r', radius * 0.6)
				.attr('fill', 'url(#sunGradient)');

			// Sun rays as triangles
			const rayLength = radius * 0.2;
			const rayBase = 10; // Width of the base of each triangle
			const numRays = 20;
			const angleStep = (2 * Math.PI) / numRays;

			for (let i = 0; i < numRays; i++) {
				const angle = i * angleStep;
				const x1 = radius * 0.6 * Math.cos(angle);
				const y1 = radius * 0.6 * Math.sin(angle);
				const x2 = (radius * 0.6 + rayLength) * Math.cos(angle - rayBase / 2 / radius);
				const y2 = (radius * 0.6 + rayLength) * Math.sin(angle - rayBase / 2 / radius);
				const x3 = (radius * 0.6 + rayLength) * Math.cos(angle + rayBase / 2 / radius);
				const y3 = (radius * 0.6 + rayLength) * Math.sin(angle + rayBase / 2 / radius);

				const ray = svg
					.append('polygon')
					.attr('points', `${x1},${y1} ${x1},${y1} ${x1},${y1}`)
					.attr('fill', '#FFFF00'); // Same bright yellow for rays

				ray
					.transition()
					.delay(i * 50) // Delay each ray animation for a sequential effect
					.duration(500)
					.attr('points', `${x1},${y1} ${x2},${y2} ${x3},${y3}`);
			}
			// LUX text
			svg
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '-1.0em')
				.attr('font-size', '16px')
				.attr('fill', 'black')
				.text('LUX');

			// Lux value number
			svg
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '.46em')
				.attr('font-size', '24px')
				.attr('fill', 'black')
				.text(luxValue.toLocaleString());
		} else {
			// Blue filled moon shape using the provided SVG path with gradient
			svg
				.append('path')
				.attr(
					'd',
					'M380.525,337.291c-135.427,0-245.302-109.773-245.302-245.302c0-32.502,6.338-63.575,17.991-91.988 C63.372,36.286,0,124.39,0,227.315c0,135.427,109.875,245.302,245.302,245.302c102.923,0,191.029-63.472,227.316-153.315 C444.201,330.954,413.129,337.291,380.525,337.291z'
				)
				.attr('fill', 'url(#moonGradient)')
				.attr('transform', `scale(${width / 1000}) translate(-236.309, -236.309)`); // Scale and translate to fit the container width

			// Add stars
			const starData = [
				{ cx: radius * 0.3, cy: -radius * 0.3 },
				{ cx: -radius * 0.4, cy: radius * 0.4 }
			];

			starData.forEach((star) => {
				svg
					.append('polygon')
					.attr('points', calculateStarPoints(star.cx, star.cy, radius * 0.05, radius * 0.025, 5))
					.attr('fill', '#c4ae70'); // Light yellow
			});
			// LUX text
			svg
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '-2em')
				.attr('font-size', '16px')
				.attr('fill', 'white')
				.text('LUX');

			// Lux value number
			svg
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '.30em')
				.attr('font-size', '24px')
				.attr('fill', 'white')
				.text(luxValue);
		}
	}

	function calculateStarPoints(cx, cy, outerRadius, innerRadius, numPoints) {
		const points = [];
		const angleStep = Math.PI / numPoints;

		for (let i = 0; i < 2 * numPoints; i++) {
			const angle = i * angleStep;
			const radius = i % 2 === 0 ? outerRadius : innerRadius;
			const x = cx + radius * Math.cos(angle - Math.PI / 2);
			const y = cy + radius * Math.sin(angle - Math.PI / 2);
			points.push(`${x},${y}`);
		}

		return points.join(' ');
	}
</script>

<svg bind:this={svgContainer}></svg>
