<script lang="ts">
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import type { BillingEntitlements } from '$lib/api/api.dtos';
	import { getAppContext } from '$lib/appContext.svelte';
	import { AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, useCwToast } from '@cropwatchdevelopment/cwui';

	interface Props {
		entitlements: BillingEntitlements | null;
	}

	let { entitlements }: Props = $props();

	const app = getAppContext();
	const toast = useCwToast();
	let busy = $state(false);

	// Null entitlements (API unreachable) fail open: no upsell, the API still gates writes.
	const showUpsell = $derived(!!entitlements && !entitlements.reporting && !entitlements.isStaff);

	async function subscribe() {
		busy = true;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const { checkoutUrl } = await api.createReportingCheckout();
			window.location.href = checkoutUrl;
		} catch (err) {
			const payload = err instanceof ApiServiceError ? err.payload : err;
			toast.add({ tone: 'danger', message: readApiErrorMessage(payload, m.generic_error()) });
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
