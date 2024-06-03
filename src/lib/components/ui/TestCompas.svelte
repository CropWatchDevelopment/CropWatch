<script lang="ts">
    import { onMount, afterUpdate } from 'svelte';
    import * as d3 from 'd3';

    export let temperature: number;
    export let humidity: number;
    export let windDirection = 'N';
    export let windSpeed = 0;
    export let arrowRotation = 0;

    let svgContainer: SVGSVGElement;
    let arrow: SVGSVGElement;

    onMount(() => {
        drawGauge();
        initialAnimateArrow();
    });

    afterUpdate(() => {
        animateArrow();
    });

    function drawGauge() {
        const width = 300;
        const height = 300;
        const radius = width / 2;
        const tickLength = 15;  // 50% longer tick marks
        const smallTickLength = 7.5;  // 50% longer small tick marks
        const shorterTickLength = 4.5;  // 50% longer shorter tick marks

        const svg = d3.select(svgContainer)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Draw the circle with a stronger gradient to create a more pronounced 3D effect
        const defs = svg.append('defs');
        const gradient = defs.append('radialGradient')
            .attr('id', 'compassGradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '50%')
            .attr('fx', '50%')
            .attr('fy', '50%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#ffffff')
            .attr('stop-opacity', 1);
        gradient.append('stop')
            .attr('offset', '70%')
            .attr('stop-color', '#cccccc')
            .attr('stop-opacity', 1);
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#888888')
            .attr('stop-opacity', 1);

        svg.append('circle')
            .attr('r', radius)
            .attr('fill', 'url(#compassGradient)')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 2);

        // Draw compass directions and tick marks
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const angleOffset = 360 / directions.length;

        directions.forEach((dir, i) => {
            const angle = i * angleOffset;
            const x = (radius - 30) * Math.sin((angle * Math.PI) / 180);  // Move inward
            const y = -(radius - 30) * Math.cos((angle * Math.PI) / 180);  // Move inward

            svg.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '16px')
                .attr('font-weight', 'bold')
                .attr('fill', i % 2 === 0 ? '#555' : '#999')  // Darker for cardinal directions
                .text(dir);

            const tickX1 = radius * Math.sin((angle * Math.PI) / 180);
            const tickY1 = -radius * Math.cos((angle * Math.PI) / 180);
            const tickX2 = (radius - tickLength) * Math.sin((angle * Math.PI) / 180);
            const tickY2 = -(radius - tickLength) * Math.cos((angle * Math.PI) / 180);

            svg.append('line')
                .attr('x1', tickX1)
                .attr('y1', tickY1)
                .attr('x2', tickX2)
                .attr('y2', tickY2)
                .attr('stroke', '#333')  // Darker tick marks
                .attr('stroke-width', 2);
        });

        // Draw smaller tick marks between main directions
        for (let i = 0; i < 16; i++) {
            const angle = i * 22.5;
            const tickX1 = radius * Math.sin((angle * Math.PI) / 180);
            const tickY1 = -radius * Math.cos((angle * Math.PI) / 180);
            const tickX2 = (radius - smallTickLength) * Math.sin((angle * Math.PI) / 180);
            const tickY2 = -(radius - smallTickLength) * Math.cos((angle * Math.PI) / 180);

            svg.append('line')
                .attr('x1', tickX1)
                .attr('y1', tickY1)
                .attr('x2', tickX2)
                .attr('y2', tickY2)
                .attr('stroke', '#333')  // Darker tick marks
                .attr('stroke-width', 1.5);
        }

        // Draw shorter tick marks between the smaller ticks
        for (let i = 0; i < 32; i++) {
            const angle = i * 11.25;
            const tickX1 = radius * Math.sin((angle * Math.PI) / 180);
            const tickY1 = -radius * Math.cos((angle * Math.PI) / 180);
            const tickX2 = (radius - shorterTickLength) * Math.sin((angle * Math.PI) / 180);
            const tickY2 = -(radius - shorterTickLength) * Math.cos((angle * Math.PI) / 180);

            svg.append('line')
                .attr('x1', tickX1)
                .attr('y1', tickY1)
                .attr('x2', tickX2)
                .attr('y2', tickY2)
                .attr('stroke', '#333')  // Darker tick marks
                .attr('stroke-width', 1.5);
        }

        // Draw the wind speed text
        svg.append('text')
            .attr('y', 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '30px')
            .attr('font-weight', 'bold')
            .text(`${(windSpeed * 3.6).toFixed(2)} km/h`);

        // Draw the wind direction text
        svg.append('text')
            .attr('y', -35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '25px')
            .attr('font-weight', 'bold')
            .html(`<tspan fill="green">${windDirection}</tspan>`);
            // .text(windDirection);

        // Draw the temperature and humidity text
        svg.append('text')
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .attr('font-size', '20px')
            .attr('font-weight', 'bold')
            .html(`<tspan fill="coral">${temperature}°C</tspan> / <tspan fill="teal">${humidity}% RH</tspan>`);

        // Draw the arrowhead
        const arrowLength = radius * 0.9;
        arrow = svg.append('g')
            .attr('transform', `rotate(0)`);  // Start at 0 degrees

        arrow.append('polygon')
            .attr('points', '0,0 -10,-20 10,-20')
            .attr('fill', 'green')
            .attr('transform', `translate(0, ${-arrowLength}) rotate(180)`); // Rotate arrowhead to face outward
    }

    function initialAnimateArrow() {
        arrow.transition()
            .duration(750)
            .attr('transform', `rotate(${arrowRotation})`);
    }

    function animateArrow() {
        arrow.transition()
            .duration(750)
            .attr('transform', `rotate(${arrowRotation})`);
    }
</script>

<svg bind:this={svgContainer} class="mx-auto my-2"></svg>
