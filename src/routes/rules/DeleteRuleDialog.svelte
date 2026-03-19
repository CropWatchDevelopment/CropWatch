<script lang="ts">
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import BACK_ICON from '$lib/images/icons/back.svg';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		ruleGroupId,
		ruleName,
		onDeleted
	}: { ruleGroupId: string; ruleName: string; onDeleted?: (ruleGroupId: string) => void } =
		$props();

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
			await api.deleteRule(ruleGroupId);
			onDeleted?.(ruleGroupId);
			open = false;
			toast.add({
				tone: 'success',
				message: 'Success!' // m.rules_delete_success()
			});
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: m.rules_delete_failed()
			});
			deleting = false;
			return;
		}
	};
</script>

<CwButton variant="danger" size="md" onclick={() => (open = true)}>{m.rules_delete_rule()}</CwButton
>

<CwDialog {open} title={m.rules_delete_rule()} onclose={() => (open = false)}>
	<p>{m.rules_delete_confirmation({ name: ruleName })}</p>
	{#snippet actions()}
		<div class="flex flex-row gap-2">
			<CwButton variant="secondary" size="md" onclick={() => (open = false)}>
				<img src={BACK_ICON} alt={m.action_cancel()} />
				{m.action_cancel()}
			</CwButton>
			<CwButton variant="danger" size="md" onclick={handleDelete} disabled={deleting}>
				{m.action_delete()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>
