<script>
  import { onMount } from "svelte";
  import * as d3 from "d3";

  // `container` is the <div> element into which we will inject the SVG
  let container: HTMLDivElement = $state();

  // We keep track of the D3 timer so that when props change,
  // we can cancel any running animation before re‐drawing.
  let waveTimer: d3.Timer | null = null;

  // Whenever any of these props (value, maxValue, unit, width, height) change,
  // we want to re‐draw the chart from scratch.
  $: if (container) {
    drawChart();
  }

  onMount(() => {
    // On initial mount, draw the chart
    drawChart();
    return () => {
      // Cleanup if the component is destroyed
      if (waveTimer) waveTimer.stop();
    };
  });

  /**
   * drawChart()
   *
   * Removes any existing SVG inside `container`, then
   * re‐creates the “water‐container” with an animated D3 wave.
   */
  function drawChart() {
    // Stop any previous animation
    if (waveTimer) {
      waveTimer.stop();
      waveTimer = null;
    }

    // Clear out the container DIV
    d3.select(container).selectAll("*").remove();

    // Compute fill percentage (clamped 0..1)
    const pct = Math.max(0, Math.min(1, value / maxValue));

    // Margins so that the container stroke is not chopped
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Wave parameters
    const wave = {
      amplitude: innerHeight * 0.02,    // wave height = 2% of container height
      wavelength: innerWidth * 1.2,     // wave length
      speed: 0.02                       // phase increment per millisecond
    };

    // Create the SVG
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Define a unique clip‐path ID (random string)
    const clipId = `waveClip-${Math.random().toString(36).slice(2, 9)}`;

    // Add <defs> with a <clipPath> that will hold our animated wave <path>
    const defs = svg.append("defs");
    defs
      .append("clipPath")
      .attr("id", clipId)
      .append("path")
      .attr("class", "water‐wave"); // we’ll set its “d” attribute on each tick

    // Draw the container outline (rounded rectangle)
    svg
      .append("rect")
      .attr("class", "container‐outline")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("rx", 12)
      .attr("ry", 12);

    // Create a group that is clipped by the wave path
    const waterG = svg
      .append("g")
      .attr("clip-path", `url(#${clipId})`);

    // Inside that clipped region, draw a solid rectangle the full size of the container.
    // Anything outside the wave path is masked out.
    waterG
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "steelblue")
      .style("opacity", 0.8);

    // Add the numeric label (e.g. "9 cm") centered
    svg
      .append("text")
      .attr("class", "level‐label")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", margin.top + innerHeight / 2)
      .text(`${value} ${unit}`);

    // Grab a reference to the <path> inside the clipPath so we can update its “d”
    const wavePath = d3.select(`#${clipId} path.water‐wave`);

    // Build a function that returns a sine‐wave–shaped “d” string given a phase offset.
    function sinePath(phase: number): string {
      const points: [number, number][] = [];
      const cols = 200; // sample 200 points along x

      for (let i = 0; i <= cols; i++) {
        const x = (i / cols) * innerWidth;
        // y = baseline (1 - pct) * innerHeight + sine oscillation
        const y =
          innerHeight * (1 - pct) +
          wave.amplitude * Math.sin((2 * Math.PI * (x + phase)) / wave.wavelength);

        points.push([margin.left + x, margin.top + y]);
      }

      // Close the path down to the bottom of the container:
      points.push([margin.left + innerWidth, margin.top + innerHeight]);
      points.push([margin.left, margin.top + innerHeight]);
      points.push(points[0]); // back to first point to close

      // Use a smooth closed curve (“BasisClosed”)
      return d3.line().curve(d3.curveBasisClosed)(points)!;
    }

    // Animate: increment phase over time, regenerate the “d” string
    let phase = 0;
    waveTimer = d3.timer((elapsed) => {
      // elapsed is the time since the timer started, in ms.
      // We add to phase based on elapsed.
      phase += wave.speed * elapsed;
      const d = sinePath(phase);
      wavePath.attr("d", d);
    });
  }
</script>

<!-- This DIV is where the D3 chart will be injected -->
<div bind:this={container} class="water‐chart‐wrapper"></div>

<style>
  /* You can override these styles or place them in your global CSS */
  .container‐outline {
    fill: none;
    stroke: #444;
    stroke-width: 4px;
    rx: 12px;
    ry: 12px;
  }

  .water‐wave {
    fill: steelblue;
    opacity: 0.8;
  }

  .level‐label {
    font-size: 2.5rem;
    fill: #222;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  /* Ensure the wrapper <div> doesn’t collapse */
  .water‐chart‐wrapper {
    display: inline-block;
  }
</style>
