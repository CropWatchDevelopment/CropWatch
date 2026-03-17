<script lang="ts">
	import { CwButton, CwCard, CwDialog, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';

	let {
		ruleGroupId,
		ruleName,
		onDeleted
	}: { ruleGroupId: string; ruleName: string; onDeleted?: () => void } = $props();

	let app = getAppContext();
	let open = $state(false);
	let deleting = $state(false);
	const toast = useCwToast();

	const handleDelete = async () => {
		if (deleting) return;
		deleting = true;
		try {
			const api = new ApiService({
				authToken: app.accessToken
			});
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: 'Unable to delete this rule.'
			});
			deleting = false;
			return;
		}
	};
</script>

<CwButton variant="danger" size="md" onclick={() => (open = true)}>Delete Rule</CwButton>

<CwDialog {open} title="Delete Rule" onclose={() => (open = false)}>
	{#snippet children()}
		<p>
			Are you sure you want to delete the rule <strong>{ruleName}</strong>? This action cannot be
			undone.
		</p>
	{/snippet}
	{#snippet actions()}
		<div class="flex flex-row gap-2">
			<CwButton variant="secondary" size="md" onclick={() => (open = false)}>
				<img src={BACK_ICON} alt="Cancel" /> Cancel
			</CwButton>
			<CwButton variant="danger" size="md" onclick={handleDelete} disabled={deleting}>
				Delete
			</CwButton>
		</div>
	{/snippet}
</CwDialog>
