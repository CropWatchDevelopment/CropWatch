<script lang="ts">
	import { apiErrorMessage } from '$lib/api/api-error';
	import type { BillingEntitlements } from '$lib/api/api.dtos';
	import { AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { getServices } from '$lib/services/context';
	import { CwButton, useCwToast } from '@cropwatchdevelopment/cwui';

	interface Props {
		entitlements: BillingEntitlements | null;
	}

	let { entitlements }: Props = $props();

	const { billing } = getServices();
	const toast = useCwToast();
	let busy = $state(false);

	// Null entitlements (API unreachable) fail open: no upsell, the API still gates writes.
	const showUpsell = $derived(!!entitlements && !entitlements.reporting && !entitlements.isStaff);

	async function subscribe() {
		busy = true;
		try {
			const { checkoutUrl } = await billing.createReportingCheckout();
			window.location.href = checkoutUrl;
		} catch (err) {
			toast.add({ tone: 'danger', message: apiErrorMessage(err, m.generic_error()) });
			busy = false;
		}
	}
</script>

{#if showUpsell}
	<AppNotice tone="warning" title={m.reports_upsell_title()}>
		<p>{m.reports_upsell_body()}</p>
		{#if entitlements?.billingMode !== 'manual'}
			<div>
				<CwButton
					id="reports-upsell-subscribe-button"
					type="button"
					variant="primary"
					size="sm"
					onclick={subscribe}
					loading={busy}
				>
					{m.reports_upsell_action()}
				</CwButton>
			</div>
		{/if}
	</AppNotice>
{/if}
