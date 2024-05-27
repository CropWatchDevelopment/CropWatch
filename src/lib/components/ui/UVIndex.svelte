<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    export let uvIndex = 4.0;  // Example UV index value
    export let uvLevel = "Moderate";  // Example UV level

    let svgContainer;

    onMount(() => {
        drawGauge();
    });

    function drawGauge() {
        const width = 150;  // Adjusted width
        const height = 150;
        const radius = Math.min(width, height) / 2;

        const svg = d3.select(svgContainer)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2 - 25},${height / 2})`); // Center adjusted for scale

        // UV INDEX label
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-1.5em')
            .attr('font-size', '16px')
            .attr('fill', 'white')
            .text('UV INDEX');

        // UV index number
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('font-size', '48px')
            .attr('fill', '#f4d03f')
            .text(uvIndex.toFixed(1));

        // UV level label
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '2em')
            .attr('font-size', '16px')
            .attr('fill', '#f4d03f')
            .text(uvLevel);

        // Gradient scale
        const scaleHeight = 80;  // Shorter scale
        const scaleWidth = 10;  // Thinner scale
        const gradientId = 'uvGradient';

        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '100%')
            .attr('x2', '0%')
            .attr('y2', '0%');

        const colors = [
            { offset: '0%', color: 'blue' },
            { offset: '20%', color: 'green' },
            { offset: '40%', color: 'yellow' },
            { offset: '60%', color: 'orange' },
            { offset: '80%', color: 'red' },
            { offset: '100%', color: 'purple' }
        ];

        colors.forEach(({ offset, color }) => {
            gradient.append('stop')
                .attr('offset', offset)
                .attr('stop-color', color);
        });

        svg.append('rect')
            .attr('x', 60)  // Closer to the text
            .attr('y', -scaleHeight / 2)
            .attr('width', scaleWidth)
            .attr('height', scaleHeight)
            .attr('fill', `url(#${gradientId})`)
            .attr('rx', scaleWidth / 2)  // Rounded corners
            .attr('ry', scaleWidth / 2);

        // Position indicator
        const indicatorY = (1 - uvIndex / 16) * (scaleHeight - 20) - (scaleHeight / 2 - 10);  // Adjusted to keep rectangle within bounds

        svg.append('rect')
            .attr('x', 55)  // Position to the left edge of the scale
            .attr('y', indicatorY - 5)  // Center the rectangle on the indicatorY
            .attr('width', scaleWidth + 10)  // Span the width of the scale
            .attr('height', 10)  // Height of the indicator rectangle
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 3);  // Thicker stroke
    }
</script>

<svg bind:this={svgContainer}></svg>
