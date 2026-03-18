<svelte:head>
	<title>CropWatch Offline</title>
	<meta
		name="description"
		content="CropWatch is offline. Reconnect to load live device data, reports, and settings."
	/>
</svelte:head>

<div class="offline-page">
	<section class="offline-card">
		<p class="offline-eyebrow">Offline</p>
		<h1>CropWatch needs a connection for live data.</h1>
		<p>
			The app shell is installed and ready, but dashboards, reports, and settings still depend on
			reaching the network.
		</p>
		<button type="button" onclick={() => window.location.reload()}>Try again</button>
	</section>
</div>

<style>
	.offline-page {
		display: grid;
		place-items: center;
		min-height: 100%;
		padding: 2rem;
		background:
			radial-gradient(circle at top, rgb(74 222 128 / 0.12), transparent 30%),
			linear-gradient(180deg, #0f172a, #111827 55%, #020617);
	}

	.offline-card {
		width: min(32rem, 100%);
		padding: 2rem;
		border: 1px solid rgb(148 163 184 / 0.24);
		border-radius: 1.5rem;
		color: #e2e8f0;
		background: rgb(15 23 42 / 0.78);
		box-shadow: 0 24px 60px rgb(2 6 23 / 0.45);
		backdrop-filter: blur(16px);
	}

	.offline-eyebrow {
		margin: 0 0 0.5rem;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #86efac;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.9rem, 5vw, 2.6rem);
		line-height: 1.05;
	}

	p {
		margin: 1rem 0 0;
		font-size: 1rem;
		line-height: 1.6;
		color: rgb(226 232 240 / 0.88);
	}

	button {
		margin-top: 1.4rem;
		padding: 0.9rem 1.25rem;
		border: 0;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		color: #0f172a;
		background: linear-gradient(135deg, #86efac, #4ade80);
		cursor: pointer;
	}

	button:hover {
		filter: brightness(1.04);
	}
</style>
