<script lang="ts">
	// your script goes here

	let inputDegrees = 0;

	function toRadians(degree) {
		return degree * (Math.PI / 180);
	}

	let degrees = inputDegrees - 90;
	let diameter = 15;
	let radius = diameter / 2 + 0.8;
	let x = radius * Math.cos(toRadians(degrees));
	let y = radius * Math.sin(toRadians(degrees));

	function letter(deg) {
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

<div
	class="bg-[#34393f] bg-opacity-50 rounded-xl p-3 text-surface-100 my-3 flex justify-center items-center mx-4"
>
	<div class="main" style="width: {diameter}rem; height: {diameter}rem">
		<div id="direction" style="transform: translateX({x}rem) translateY({y}rem);">
		<!-- <div id="direction"> -->
			<div>
				<div class="arrow" style="transform: rotate({inputDegrees}deg)">
					<p class="letter">{letter(inputDegrees)}</p> 
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.main {
		/* width: 15rem;
		height: 15rem; */
		background-color: black;
		border-radius: 100%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 5rem 0rem;
	}
	#direction {
		width: 5rem;
		height: 2.5rem;
		background-color: transparent;
		/* position: absolute; */
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.arrow {
		width: 0;
		height: 0;
		border-left: 2.5rem solid transparent;
		border-right: 2.5rem solid transparent;
		border-bottom: 2.5rem solid red;
		position: absolute;
		top: 0%;
		left: 0%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.letter {
		padding-top: 2.5rem;
	}
</style>
