<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.offline_page_title()}</title>
	<meta name="description" content={m.offline_page_description()} />
</svelte:head>

<div class="offline-page">
	<section class="offline-card">
		<p class="offline-eyebrow">{m.offline_eyebrow()}</p>
		<h1>{m.offline_heading()}</h1>
		<p>{m.offline_body()}</p>
		<!-- No JavaScript runs on this page: an empty href opens the current URL (with its
		     query) again — a real navigation, not a link standing in for a button. -->
		<!-- svelte-ignore a11y_invalid_attribute -->
		<a id="offline-retry-button" class="offline-retry" href="">{m.action_try_again()}</a>
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

	.offline-retry {
		display: inline-block;
		margin-top: 1.4rem;
		padding: 0.9rem 1.25rem;
		border: 0;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		color: #0f172a;
		background: linear-gradient(135deg, #86efac, #4ade80);
		text-decoration: none;
		cursor: pointer;
	}

	.offline-retry:hover {
		filter: brightness(1.04);
	}
</style>
