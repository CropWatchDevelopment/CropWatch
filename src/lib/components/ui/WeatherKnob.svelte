<script lang="ts">
	// your script goes here

	import DarkCard2 from './DarkCard2.svelte';
	let inputDegrees = 0;
	
    function toRadians(degree) {
		return degree * (Math.PI / 180);
	}

	let degrees = inputDegrees - 90;
	let radius = 10;
	let x = radius * Math.cos(toRadians(degrees));
	let y = radius * Math.sin(toRadians(degrees));

    function letter(deg){
        if (deg >= 337.5 || deg < 22.5) {
            return 'N';
        } else if (deg >= 22.5 && deg < 67.5) {
            return 'NE';
        } else if (deg >= 67.5 && deg < 112.5) {
            return 'E';
        } else if (deg >= 112.5 && deg < 157.5) {
            return 'SE';
        } else if (deg >= 157.5 && deg < 202.5) {
            return 'S';
        } else if (deg >= 202.5 && deg < 247.5) {
            return 'SW';
        } else if (deg >= 247.5 && deg < 292.5) {
            return 'W';
        } else if (deg >= 292.5 && deg < 337.5) {
            return 'NW';
        } else {
            return 'N/A';
        }
    }
</script>

<DarkCard2>
	<div class="main">
		<div id="direction" style="transform: translateX({x}rem) translateY({y}rem)"><p>{letter(inputDegrees)}</p></div>
	</div>
</DarkCard2>

<style>
	.main {
		width: 20rem;
		height: 20rem;
		background-color: black;
		border-radius: 100%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	#direction {
		width: 5rem;
		height: 5rem;
		background-color: red;
		position: absolute;
	}
</style>
