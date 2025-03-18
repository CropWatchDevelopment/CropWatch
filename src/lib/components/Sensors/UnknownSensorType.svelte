<script>
	import { goto } from '$app/navigation';

	function goBack() {
		goto('/dashboard');
	}
</script>

<div class="unknown-sensor">
	<svg
		class="question-mark"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="currentColor"
		width="100"
		height="100"
	>
		<path
			fill-rule="evenodd"
			d="M12 2a10 10 0 1 0 10 10A10.012 10.012 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm-1-3h2v2h-2zm1-11a4 4 0 0 0-4 4h2a2 2 0 1 1 2 2 1 1 0 0 0-1 1v1h2v-1a3 3 0 0 0 3-3 4 4 0 0 0-4-4z"
			clip-rule="evenodd"
		/>
	</svg>

	<p class="message">Unknown Sensor Type</p>

	<button class="back-button" on:click={goBack}>Go Back to Dashboard</button>
</div>

<style>
	.unknown-sensor {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		text-align: center;
	}

	.message {
		font-size: 1.5rem;
		color: #444;
		margin: 1rem 0;
	}

	.back-button {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		color: white;
		background-color: #007bff;
		border: none;
		border-radius: 5px;
		cursor: pointer;
	}

	.back-button:hover {
		background-color: #0056b3;
	}
</style>
