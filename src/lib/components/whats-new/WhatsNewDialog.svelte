<script lang="ts">
	import { onMount } from 'svelte';
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';

	// The announcement release this build's content describes. Bump together
	// with the whats_new_r{N}_* message keys, then activate via the OPS UPDATE
	// in api/supabase/updates/020_whats_new.sql after deploying.
	const WHATS_NEW_CONTENT_RELEASE = 1;

	const RELEASE_ITEMS = [
		{ title: m.whats_new_r1_item1_title, body: m.whats_new_r1_item1_body },
		{ title: m.whats_new_r1_item2_title, body: m.whats_new_r1_item2_body },
		{ title: m.whats_new_r1_item3_title, body: m.whats_new_r1_item3_body },
		{ title: m.whats_new_r1_item4_title, body: m.whats_new_r1_item4_body },
		{ title: m.whats_new_r1_item5_title, body: m.whats_new_r1_item5_body }
	];

	const app = getAppContext();

	let open = $state(false);
	let seenRecorded = false;

	onMount(async () => {
		if (!app.accessToken) return;

		try {
			const api = new ApiService({ authToken: app.accessToken });
			const status = await api.getWhatsNewStatus();
			// Strict release match: a stale deployment (content behind the flag)
			// or a premature flag (content ahead) stays silent.
			open = status.show && status.current_release === WHATS_NEW_CONTENT_RELEASE;
		} catch (error) {
			// Fail quiet — the dialog is a nicety, never worth blocking the app for.
			console.error('Failed to fetch whats-new status:', error);
		}
	});

	function handleClose() {
		open = false;
		if (seenRecorded) return;
		seenRecorded = true;
		// Fire and forget: if this fails the user simply sees the dialog again
		// on their next visit.
		new ApiService({ authToken: app.accessToken })
			.markWhatsNewSeen()
			.catch((error) => console.error('Failed to record whats-new seen:', error));
	}
</script>

<CwDialog bind:open title={m.whats_new_title()} onclose={handleClose}>
	<p class="whats-new-intro">{m.whats_new_intro()}</p>
	<ul class="whats-new-items">
		{#each RELEASE_ITEMS as item (item.title)}
			<li>
				<span class="whats-new-item-title">{item.title()}</span>
				<span class="whats-new-item-body">{item.body()}</span>
			</li>
		{/each}
	</ul>

	{#snippet actions()}
		<CwButton id="whats-new-dismiss-button" variant="primary" onclick={handleClose}>
			{m.whats_new_dismiss()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.whats-new-intro {
		margin: 0 0 0.75rem;
	}

	.whats-new-items {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.75rem;
	}

	.whats-new-items li {
		display: grid;
		gap: 0.15rem;
	}

	.whats-new-item-title {
		font-weight: 600;
	}

	.whats-new-item-body {
		font-size: 0.92rem;
		opacity: 0.85;
	}
</style>
