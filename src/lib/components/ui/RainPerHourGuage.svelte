<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    export let rainValue = 20;  // Rain in mm per hour
    export let pressureValue = 0; // Pressure value in hPa

    let svgContainer;

    onMount(() => {
        drawGauge();
    });

    function drawGauge() {
        const width = 200;
        const height = 300;
        const cloudWidth = 120;
        const cloudHeight = 60;
        const bucketWidth = 80;
        const bucketHeight = 100;
        const maxRainValue = 100;  // Define the max rain value for the bucket to be full
        const distanceBetweenCloudAndBucket = 15;  // Reduced distance between cloud and bucket

        const svg = d3.select(svgContainer)
            .attr('width', width)
            .attr('height', height);

        // Define gradients
        const defs = svg.append('defs');

        // Glass gradient
        const glassGradient = defs.append('linearGradient')
            .attr('id', 'glassGradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        
        glassGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(255, 255, 255, 0.5)')
            .attr('stop-opacity', 0.7);

        glassGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(255, 255, 255, 0.1)')
            .attr('stop-opacity', 0.5);

        // Draw cloud
        const cloud = svg.append('g')
            .attr('transform', `translate(${width / 2 - cloudWidth / 2}, ${cloudHeight / 2})`);

        // Main part of the cloud
        cloud.append('circle')
            .attr('cx', cloudWidth / 2)
            .attr('cy', cloudHeight / 2)
            .attr('r', cloudHeight / 2)
            .attr('fill', '#B0C4DE');

        // Additional circles to make the cloud fluffier
        const circleData = [
            { cx: cloudWidth / 4, cy: cloudHeight / 2.5, r: cloudHeight / 3 },
            { cx: (cloudWidth / 4) * 3, cy: cloudHeight / 2.5, r: cloudHeight / 3 },
            { cx: cloudWidth / 6, cy: cloudHeight / 1.5, r: cloudHeight / 4 },
            { cx: (cloudWidth / 6) * 5, cy: cloudHeight / 1.5, r: cloudHeight / 4 },
            { cx: cloudWidth / 2, cy: cloudHeight / 4, r: cloudHeight / 3.5 },
            { cx: cloudWidth / 3, cy: cloudHeight / 1.1, r: cloudHeight / 5 },
            { cx: (cloudWidth / 3) * 2, cy: cloudHeight / 1.1, r: cloudHeight / 5 }
        ];

        circleData.forEach(d => {
            cloud.append('circle')
                .attr('cx', d.cx)
                .attr('cy', d.cy)
                .attr('r', d.r)
                .attr('fill', '#B0C4DE');
        });

        // Draw pressure value in the center of the cloud
        cloud.append('text')
            .attr('x', cloudWidth / 2)
            .attr('y', cloudHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('font-size', '16px')
            .attr('fill', 'black')
            .text(`${pressureValue.toLocaleString()} hPa`);

        // Draw raindrops if rainValue > 0
        if (rainValue > 0) {
            for (let i = 0; i < 10; i++) {
                const x = width / 2 - cloudWidth / 3 + Math.random() * (cloudWidth * 2 / 3);
                if (x < width / 2 - bucketWidth / 2 || x > width / 2 + bucketWidth / 2) continue;
                const y = cloudHeight + cloudHeight / 2;  // Start raindrops from the bottom of the cloud
                const raindrop = createRaindrop(x, y);
                animateRaindrop(raindrop);
            }
        }

        function createRaindrop(x, y) {
            return svg.append('ellipse')
                .attr('cx', x)
                .attr('cy', y)
                .attr('rx', 3)
                .attr('ry', 10)
                .attr('fill', '#1E90FF');
        }

        function animateRaindrop(raindrop) {
            raindrop.transition()
                .duration(2000)
                .ease(d3.easeLinear)
                .attr('cy', height - bucketHeight - 10 - distanceBetweenCloudAndBucket)
                .on('end', () => {
                    raindrop.attr('cy', cloudHeight + cloudHeight / 2);  // Reset to the bottom of the cloud
                    animateRaindrop(raindrop);
                });
        }

        // Draw bucket
        const bucket = svg.append('g')
            .attr('transform', `translate(${width / 2 - bucketWidth / 2}, ${height - bucketHeight - 20 - distanceBetweenCloudAndBucket})`);

        // Bucket body with rounded bottom
        bucket.append('path')
            .attr('d', `
                M10,0 
                h${bucketWidth - 20} 
                a10,10 0 0 1 10,10 
                v${bucketHeight - 20} 
                a10,10 0 0 1 -10,10 
                h-${bucketWidth - 20} 
                a10,10 0 0 1 -10,-10 
                v-${bucketHeight - 20} 
                a10,10 0 0 1 10,-10 
                z
            `)
            .attr('fill', 'url(#glassGradient)')
            .attr('stroke', 'rgba(0, 0, 0, 0.2)')
            .attr('stroke-width', 2);

        // Bucket rim
        bucket.append('rect')
            .attr('width', bucketWidth)
            .attr('height', 10)
            .attr('y', -10)
            .attr('fill', 'rgba(255, 255, 255, 0.5)')
            .attr('rx', 5)  // Rounded corners
            .attr('ry', 5)  // Rounded corners
            .attr('stroke', 'rgba(0, 0, 0, 0.2)')
            .attr('stroke-width', 2);

        // Water level
        const waterLevel = bucket.append('rect')
            .attr('width', bucketWidth - 4)
            .attr('x', 2)
            .attr('fill', '#1E90FF')
            .attr('opacity', 0.7)
            .attr('rx', 8)  // Rounded corners
            .attr('ry', 8); // Rounded corners

        // Water surface
        const waterSurface = bucket.append('path')
            .attr('fill', '#1E90FF')
            .attr('opacity', 0.7);

        // Update water level based on rainValue
        const waterHeight = (rainValue / maxRainValue) * bucketHeight;
        waterLevel.transition()
            .duration(1000)
            .attr('height', waterHeight)
            .attr('y', bucketHeight - waterHeight);

        // Update water surface path
        function getWaterSurfacePath(yOffset) {
            const waveHeight = 5;
            const waveLength = 10;
            const points = [];

            for (let x = 0; x <= bucketWidth; x += waveLength) {
                points.push(`${x},${bucketHeight - waterHeight + Math.sin((x + yOffset) / waveLength * Math.PI) * waveHeight}`);
            }

            return `M0,${bucketHeight - waterHeight} ` + points.map(p => `L${p}`).join(' ') + ` L${bucketWidth},${bucketHeight - waterHeight} Z`;
        }

        function animateWaterSurface() {
            waterSurface
                .transition()
                .duration(9000)  // Slow down the animation
                .ease(d3.easeLinear)
                .attrTween('d', function() {
                    return function(t) {
                        return getWaterSurfacePath(t * 360);
                    };
                })
                .on('end', animateWaterSurface);
        }

        if (rainValue > 0) {
            animateWaterSurface();
        } else {
            waterSurface.attr('d', '');
        }

        // Rain value text
        bucket.append('text')
            .attr('x', bucketWidth / 2)
            .attr('y', bucketHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('font-size', '16px')  // Reduced text size
            .attr('fill', 'black')
            .text(`${rainValue} mm/h`);
    }
</script>

<svg bind:this={svgContainer}></svg>
