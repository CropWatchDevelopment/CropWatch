<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { axisBottom } from 'd3-axis';
	import { select } from 'd3-selection';

	let { points, children } = $props();
	let unit: 'C' | 'F' | 'K' = $state('C');
	let centerC = $state(0);
	const domainWidth = 100;
	let svgEl: SVGSVGElement;

	const cToDisplay = $derived((c: number) =>
		unit === 'C' ? c : unit === 'F' ? (c * 9) / 5 + 32 : c + 273.15
	);
	const displayToC = $derived((d: number) =>
		unit === 'C' ? d : unit === 'F' ? ((d - 32) * 5) / 9 : d - 273.15
	);

	let domain = $derived([centerC - domainWidth / 2, centerC + domainWidth / 2]);

	function draw() {
		if (!svgEl) return;
		const width = svgEl.clientWidth;
		const height = 80;
		const margin = { top: 20, right: 20, bottom: 30, left: 20 };

		const xScale = scaleLinear()
			.domain(domain)
			.range([margin.left, width - margin.right]);

		const svg = select(svgEl);
		svg.selectAll('*').remove();

		// Axis with styling
		const axisG = svg
			.append('g')
			.attr('transform', `translate(0, ${height - margin.bottom})`)
			.call(
				axisBottom(xScale)
					.ticks(10)
					.tickFormat((c) => cToDisplay(c as number).toFixed(0))
			);

		axisG.selectAll('.domain').attr('stroke', '#000').attr('fill', 'none');
		axisG.selectAll('.tick line').attr('stroke', '#000');

		// Render points/ranges
		points.forEach((pt) => {
			if (pt.operator === '=') {
				const cx = xScale(pt.value as number);
				svg
					.append('circle')
					.attr('cx', cx)
					.attr('cy', height / 2)
					.attr('r', 6)
					.attr('fill', pt.color);
				svg
					.append('text')
					.attr('x', cx)
					.attr('y', height / 2 - 12)
					.text(pt.name)
					.attr('fill', pt.color)
					.attr('text-anchor', 'middle');
			} else {
				let startC: number, endC: number;
				if (pt.min != null && pt.max != null) {
					startC = pt.min;
					endC = pt.max;
				} else if (pt.operator === '>') {
					startC = pt.value as number;
					endC = domain[1];
				} else if (pt.operator === '<') {
					startC = domain[0];
					endC = pt.value as number;
				} else return;

				const x1 = xScale(startC);
				const x2 = xScale(endC);
				svg
					.append('rect')
					.attr('x', Math.min(x1, x2))
					.attr('y', height / 2 - 10)
					.attr('width', Math.abs(x2 - x1))
					.attr('height', 20)
					.attr('fill', pt.color)
					.attr('opacity', 0.4);
				svg
					.append('text')
					.attr('x', (x1 + x2) / 2)
					.attr('y', height / 2 + 5)
					.text(pt.name)
					.attr('fill', '#000')
					.attr('text-anchor', 'middle');
			}
		});
	}

	$effect(() => {
		if (svgEl && (points.length || domain)) draw();
	});
</script>

<div class="p-4">
	<div class="mb-4 flex items-center space-x-4">
		<label class="flex items-center">
			<span class="mr-2">Unit:</span>
			<select bind:value={unit} class="rounded border p-1">
				<option value="C">°C</option>
				<option value="F">°F</option>
				<option value="K">K</option>
			</select>
		</label>
		<label class="flex items-center">
			<span class="mr-2">Center ({unit}):</span>
			<input
				type="number"
				value={cToDisplay(centerC).toFixed(1)}
				oninput={(e) => (centerC = displayToC(parseFloat(e.currentTarget.value)))}
				class="w-24 rounded border p-1"
			/>
		</label>
		<span class="flex-auto"></span>
		{@render children()}
	</div>

	<svg bind:this={svgEl} class="h-24 w-full rounded shadow"></svg>
</div>

<style>
	/* Ensure axis lines are visible */
	:global(svg .domain) {
		stroke-width: 1px;
	}
	:global(svg text) {
		font-size: 0.75rem;
	}
</style>
