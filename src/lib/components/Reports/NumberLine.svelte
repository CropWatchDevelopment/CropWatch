<script lang="ts">
	import { scaleLinear, axisBottom, select } from 'd3';

	// Local type for points expected by this component
	type NumberLinePoint = {
		id?: string;
		name: string;
		operator: '=' | '>' | '<' | 'range';
		value?: number;
		min?: number;
		max?: number;
		color: string;
	};

	let { points, children }: { points: NumberLinePoint[]; children: any } = $props();
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
		const axis = axisBottom(xScale)
			.ticks(10)
			.tickFormat((d: any, _i: number) => cToDisplay(Number(d)).toFixed(0));

		const axisG = svg.append('g').attr('transform', `translate(0, ${height - margin.bottom})`);
		(axisG as any).call(axis as any);

		axisG.selectAll('.domain').attr('stroke', '#000').attr('fill', 'none');
		axisG.selectAll('.tick line').attr('stroke', '#000');

		// Render points/ranges
		(points as NumberLinePoint[]).forEach((pt: NumberLinePoint) => {
			if (pt.operator === '=') {
				const value = Number(pt.value);
				if (isNaN(value)) return;

				const cx = xScale(value);
				if (isNaN(cx)) return;

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
					startC = Number(pt.min);
					endC = Number(pt.max);
				} else if (pt.operator === '>') {
					startC = Number(pt.value);
					endC = domain[1];
				} else if (pt.operator === '<') {
					startC = domain[0];
					endC = Number(pt.value);
				} else return;

				// Check for NaN values
				if (isNaN(startC) || isNaN(endC)) return;

				const x1 = xScale(startC);
				const x2 = xScale(endC);

				// Check for NaN coordinates
				if (isNaN(x1) || isNaN(x2)) return;

				const rectX = Math.min(x1, x2);
				const rectWidth = Math.abs(x2 - x1);
				const textX = (x1 + x2) / 2;

				// Check final values
				if (isNaN(rectX) || isNaN(rectWidth) || isNaN(textX)) return;

				svg
					.append('rect')
					.attr('x', rectX)
					.attr('y', height / 2 - 10)
					.attr('width', rectWidth)
					.attr('height', 20)
					.attr('fill', pt.color)
					.attr('opacity', 0.4);
				svg
					.append('text')
					.attr('x', textX)
					.attr('y', height / 2 + 5)
					.text(pt.name)
					.attr('fill', '#000')
					.attr('text-anchor', 'middle');
			}
		});
	}

	// Redraw reactively when relevant inputs change (unit, domain, or any point fields)
	$effect(() => {
		// Create a lightweight signature so changes to nested fields trigger redraw
		const signature = JSON.stringify({
			unit,
			domain,
			points: points?.map((p) => ({
				id: p.id,
				name: p.name,
				operator: p.operator,
				value: p.value,
				min: p.min,
				max: p.max,
				color: p.color
			}))
		});

		if (svgEl && signature) draw();
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
