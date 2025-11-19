<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import type { ActionData, PageData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props<{ data: PageData; form: ActionData | undefined }>();

	const gateways = $derived(data.gateways ?? []);
	let gatewayId = $state('');
	let email = $state('');
	let submitting = $state(false);

	const handleSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success') {
				gatewayId = '';
				email = '';
			}
		};
	};
</script>

<svelte:head>
	<title>Add Gateway User - CropWatch</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
	<a
		href="/app/all-gateways"
		class="mb-4 inline-flex items-center text-sm font-medium text-[var(--color-primary)] hover:underline"
	>
		&larr; Back to All Gateways
	</a>

	<div
		class="card space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow"
	>
		<div>
			<h1 class="text-2xl font-bold text-[var(--color-text)]">Add User to Gateway</h1>
			<p class="mt-2 text-sm text-[var(--color-text-muted)]">
				Grant another CropWatch user access to one of your gateways. When submitted, the selected
				user will be added to the <code>cw_gateways_owners</code> table.
			</p>
		</div>

		{#if form?.error}
			<div class="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
				{form.message ?? 'User added successfully.'}
			</div>
		{/if}

		<form method="POST" class="space-y-6" use:enhance={handleSubmit}>
			<div>
				<label for="gatewayId" class="mb-2 block text-sm font-medium text-[var(--color-text)]"
					>Gateway ID (EUI)</label
				>
				<TextInput
					id="gatewayId"
					name="gatewayId"
					required
					placeholder="e.g. 58A0CB00343DFF02"
					list="gateway-options"
					bind:value={gatewayId}
					autocomplete="off"
				/>
				<p class="mt-2 text-xs text-[var(--color-text-muted)]">
					Paste the exact gateway EUI. You can also pick from the list of gateways you manage below.
				</p>
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-[var(--color-text)]"
					>User Email</label
				>
				<TextInput
					id="email"
					name="email"
					type="email"
					required
					placeholder="user@example.com"
					autocomplete="email"
					bind:value={email}
				/>
				<p class="mt-2 text-xs text-[var(--color-text-muted)]">
					We'll match this email to an existing CropWatch account before creating the relationship.
				</p>
			</div>

			<div class="flex items-center justify-end gap-3">
				<Button variant="secondary" href="/app/all-gateways" type="button">Cancel</Button>
				<Button type="submit" loading={submitting} disabled={!gatewayId || !email}>
					{submitting ? 'Adding User...' : 'Add User'}
				</Button>
			</div>
		</form>
	</div>

	{#if gateways.length > 0}
		<section
			class="mt-8 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/70 p-6"
		>
			<h2 class="text-lg font-semibold text-[var(--color-text)]">Available Gateways</h2>
			<p class="mt-1 text-sm text-[var(--color-text-muted)]">
				Use these identifiers when adding collaborators.
			</p>
			<ul class="mt-4 divide-y divide-[var(--color-border)] text-sm">
				{#each gateways as gateway (gateway.id ?? gateway.gateway_id)}
					<li class="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p class="font-medium text-[var(--color-text)]">
								{gateway.gateway_name || 'Unnamed Gateway'}
							</p>
							<p class="font-mono text-xs text-[var(--color-text-muted)]">
								{gateway.gateway_id}
							</p>
						</div>
						<span
							class="mt-1 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-xs text-[var(--color-text-muted)] dark:bg-[var(--color-foreground-dark)]"
						>
							ID #{gateway.id}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{:else}
		<p class="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			No gateways found for your account. Create or claim a gateway before sharing access.
		</p>
	{/if}
</div>

<datalist id="gateway-options">
	{#each gateways as gateway (gateway.id ?? gateway.gateway_id)}
		<option value={gateway.gateway_id}>
			{gateway.gateway_name || gateway.gateway_id}
		</option>
	{/each}
</datalist>
