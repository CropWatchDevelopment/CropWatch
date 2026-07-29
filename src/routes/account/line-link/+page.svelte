<script lang="ts">
	import { enhance } from '$app/forms';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard } from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let linking = $state(false);
</script>

<svelte:head>
	<title>{m.line_link_confirm_title()} - CropWatch</title>
</svelte:head>

<AppPage width="md">
	<CwCard title={m.line_link_confirm_title()} subtitle={m.line_link_confirm_subtitle()} elevated>
		{#if !data.linkToken}
			<AppFormStack padded>
				<AppNotice tone="danger">
					<p>{m.line_link_missing_token()}</p>
				</AppNotice>
			</AppFormStack>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					linking = true;
					return async ({ update }) => {
						linking = false;
						await update();
					};
				}}
			>
				<AppFormStack padded>
					{#if form?.error}
						<AppNotice tone="danger">
							<p>{form.error}</p>
						</AppNotice>
					{/if}

					<p>{m.line_link_confirm_body({ email: data.email ?? '' })}</p>

					<input type="hidden" name="linkToken" value={data.linkToken} />

					<AppActionRow>
						<CwButton type="submit" variant="primary" loading={linking}>
							{m.line_link_confirm_action()}
						</CwButton>
					</AppActionRow>
				</AppFormStack>
			</form>
		{/if}
	</CwCard>
</AppPage>
