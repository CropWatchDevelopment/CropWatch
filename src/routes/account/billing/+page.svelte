<script lang="ts">
	import { goto, invalidateAll, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { AppActionRow, AppNotice, AppPage } from '$lib/components/layout';
	import type { BillingProduct } from '$lib/api/api.dtos';
	import { formatCurrency, formatDate } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import { cwDropdownLabels, cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { getServices } from '$lib/services/context';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDialog,
		CwDropdown,
		CwInput,
		useCwToast,
		type CwTone
	} from '@cropwatchdevelopment/cwui';
	import { BillingController } from './billing-controller.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const toast = useCwToast();

	const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

	const controller = new BillingController({
		billing: getServices().billing,
		toast,
		invalidateAll,
		redirect: (url) => {
			window.location.href = url;
		},
		device: () => data.state.device
	});

	const device = $derived(data.state.device);
	const reporting = $derived(data.state.reporting);
	const licenses = $derived(data.state.licenses);
	const isManual = $derived(data.state.billingMode === 'manual');
	const minimumSeats = $derived(device.minimumSeats);
	const hasDeviceSub = $derived(device.subscriptionId !== null);
	const hasReporting = $derived(
		reporting.manual || (!!reporting.status && ACTIVE_STATUSES.includes(reporting.status))
	);
	const nonManualLicenseCount = $derived(licenses.filter((l) => !l.manual).length);

	const assignedDevEuis = $derived(
		new Set(licenses.filter((l) => l.devEui).map((l) => l.devEui as string))
	);
	const locationNames = $derived(new Map(data.locations.map((l) => [l.location_id, l.name])));
	const deviceMap = $derived(new Map(data.devices.map((d) => [d.dev_eui, d])));

	// Assign dropdown: available devices sorted by location, then by name, with
	// the location surfaced in each label (CwDropdown can't render group headings).
	const deviceOptions = $derived(
		data.devices
			.filter((d) => !assignedDevEuis.has(d.dev_eui))
			.map((d) => ({
				value: d.dev_eui,
				name: d.name,
				locName: d.location_id != null ? (locationNames.get(d.location_id) ?? null) : null
			}))
			.sort((a, b) => {
				// Group by location (devices with no location sort last), then by name.
				if (a.locName !== b.locName) {
					if (a.locName === null) return 1;
					if (b.locName === null) return -1;
					const byLoc = a.locName.localeCompare(b.locName);
					if (byLoc !== 0) return byLoc;
				}
				return a.name.localeCompare(b.name);
			})
			.map((o) => ({ label: o.locName ? `${o.locName} — ${o.name}` : o.name, value: o.value }))
	);

	function deviceLocationId(devEui: string): number | null {
		const id = deviceMap.get(devEui)?.location_id;
		return typeof id === 'number' ? id : null;
	}

	function deviceLocationName(devEui: string): string | null {
		const id = deviceLocationId(devEui);
		return id != null ? (locationNames.get(id) ?? null) : null;
	}

	const devicePriceLabel = $derived(priceLabel(data.products.device));
	const reportingPriceLabel = $derived(priceLabel(data.products.reporting));

	const addPreview = $derived(controller.addValid ? deviceTotalLabel(controller.addCount) : null);
	const buyPreview = $derived(controller.buyValid ? deviceTotalLabel(controller.buyCount) : null);

	function minorUnitFactor(currency: string): number {
		try {
			const digits =
				new Intl.NumberFormat('en', {
					style: 'currency',
					currency: currency.toUpperCase()
				}).resolvedOptions().maximumFractionDigits ?? 2;
			return 10 ** digits;
		} catch {
			return 100;
		}
	}

	function priceLabel(product: BillingProduct | null): string | null {
		const price = product?.prices?.[0];
		if (!price || price.priceAmount == null) return null;
		const currency = price.priceCurrency ?? 'usd';
		return formatCurrency(price.priceAmount / minorUnitFactor(currency), currency.toUpperCase());
	}

	/** Monthly cost of `count` device licenses, formatted — for purchase previews. */
	function deviceTotalLabel(count: number): string | null {
		const price = data.products.device?.prices?.[0];
		if (!price || price.priceAmount == null) return null;
		const currency = price.priceCurrency ?? 'usd';
		return formatCurrency(
			(price.priceAmount * count) / minorUnitFactor(currency),
			currency.toUpperCase()
		);
	}

	function statusTone(status: string | null): CwTone {
		switch (status) {
			case 'active':
			case 'trialing':
				return 'success';
			case 'past_due':
				return 'warning';
			case 'canceled':
				return 'danger';
			default:
				return 'secondary';
		}
	}

	function subscriptionStatusLabel(status: string | null): string {
		switch (status) {
			case 'active':
				return m.billing_status_active();
			case 'trialing':
				return m.billing_status_trialing();
			case 'past_due':
				return m.billing_status_past_due();
			case 'canceled':
				return m.billing_status_canceled();
			default:
				return m.billing_status_none();
		}
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const checkout = params.get('checkout');
		if (checkout === 'success') {
			toast.add({ tone: 'success', message: m.billing_checkout_success() });
			invalidateAll();
		} else if (checkout === 'cancel') {
			toast.add({ tone: 'secondary', message: m.billing_checkout_canceled() });
		} else {
			return;
		}
		// Stripe's flag is for one message: drop it from the URL (keeping any other
		// parameter) so a reload does not repeat it. After a tick: Stripe sends the
		// buyer back with a full page load, and the router only starts once this has run.
		const url = new URL(window.location.href);
		url.searchParams.delete('checkout');
		void tick().then(() =>
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- this page's own (resolved) URL
			replaceState(url, page.state)
		);
	});
</script>

<svelte:head>
	<title>{m.billing_title()} - CropWatch</title>
</svelte:head>

<AppPage>
	<CwButton
		id="account-billing-back-button"
		variant="secondary"
		size="sm"
		onclick={() => goto(resolve('/'))}
	>
		&larr; {m.action_back()}
	</CwButton>

	{#if data.loadFailed}
		<AppNotice tone="danger">
			<p>{m.billing_load_error()}</p>
		</AppNotice>
	{/if}

	{#if isManual}
		<AppNotice tone="info">
			<p>{m.billing_manual_notice()}</p>
		</AppNotice>
	{/if}

	<CwCard title={m.billing_devices_title()} subtitle={m.billing_devices_subtitle()} elevated>
		{#snippet actions()}
			{#if isManual}
				<CwChip label={m.billing_manual_included()} tone="info" variant="soft" size="sm" />
			{:else if hasDeviceSub}
				<CwChip
					label={subscriptionStatusLabel(device.status)}
					tone={statusTone(device.status)}
					variant="soft"
					size="sm"
				/>
			{/if}
		{/snippet}

		<div class="billing-section">
			<p class="billing-summary">
				{m.billing_devices_summary({
					total: device.seats,
					assigned: device.assignedCount,
					available: device.availableCount
				})}
			</p>
			{#if !isManual && devicePriceLabel}
				<p class="billing-muted">{devicePriceLabel}{m.billing_per_month()}</p>
			{/if}

			{#if isManual}
				<!-- Seats are granted by staff; nothing to buy, add, or cancel here. -->
			{:else if hasDeviceSub}
				{#if device.currentPeriodEnd}
					<p class="billing-muted">
						{device.cancelAtPeriodEnd
							? m.billing_ends_on({ date: formatDate(device.currentPeriodEnd) })
							: m.billing_renews_on({ date: formatDate(device.currentPeriodEnd) })}
					</p>
				{/if}
				<div class="billing-seats">
					<CwInput
						labels={cwInputLabels()}
						id="account-billing-add-licenses-input"
						type="numeric"
						label={m.billing_add_licenses_label()}
						bind:value={controller.addQty}
						min={1}
					/>
					<CwButton
						id="account-billing-add-licenses-button"
						variant="primary"
						onclick={() => controller.addLicenses()}
						loading={controller.busy}
						disabled={!controller.addValid || device.cancelAtPeriodEnd}
					>
						{m.billing_add_licenses_action()}
					</CwButton>
				</div>
				{#if addPreview}
					<p class="billing-muted">
						{m.billing_add_licenses_preview({ count: controller.addCount, amount: addPreview })}
					</p>
				{/if}
				<p class="billing-muted">{m.billing_reduce_hint()}</p>
				<p class="billing-muted">{m.billing_device_min_notice({ min: minimumSeats })}</p>
				<AppActionRow>
					<CwButton
						id="account-billing-device-cancel-button"
						variant="ghost"
						onclick={() => (controller.deviceCancelOpen = true)}
						disabled={controller.busy || device.cancelAtPeriodEnd}
					>
						{m.billing_device_cancel()}
					</CwButton>
				</AppActionRow>
			{:else}
				<div class="billing-seats">
					<CwInput
						labels={cwInputLabels()}
						id="account-billing-buy-quantity-input"
						type="numeric"
						label={m.billing_buy_quantity()}
						bind:value={controller.buyQty}
						min={minimumSeats}
					/>
					<CwButton
						id="account-billing-buy-devices-button"
						variant="primary"
						onclick={() => controller.buyDevices()}
						loading={controller.busy}
						disabled={!controller.buyValid}
					>
						{m.billing_buy_action()}
					</CwButton>
				</div>
				<p class="billing-muted">{m.billing_device_min_notice({ min: minimumSeats })}</p>
				{#if buyPreview}
					<p class="billing-muted">
						{m.billing_buy_preview({ count: controller.buyCount, amount: buyPreview })}
					</p>
				{/if}
			{/if}
		</div>
	</CwCard>

	<CwCard title={m.billing_reporting_title()} subtitle={m.billing_reporting_subtitle()} elevated>
		{#snippet actions()}
			{#if reporting.manual}
				<CwChip label={m.billing_manual_included()} tone="info" variant="soft" size="sm" />
			{:else}
				<CwChip
					label={subscriptionStatusLabel(reporting.status)}
					tone={statusTone(reporting.status)}
					variant="soft"
					size="sm"
				/>
			{/if}
		{/snippet}

		<div class="billing-section">
			{#if reporting.manual}
				<!-- Granted by staff; nothing to subscribe to or cancel. -->
			{:else if hasReporting}
				<div class="billing-meta">
					{#if reportingPriceLabel}
						<span class="billing-price">{reportingPriceLabel}{m.billing_per_month()}</span>
					{/if}
					{#if reporting.currentPeriodEnd}
						<span class="billing-muted">
							{reporting.cancelAtPeriodEnd
								? m.billing_ends_on({ date: formatDate(reporting.currentPeriodEnd) })
								: m.billing_renews_on({ date: formatDate(reporting.currentPeriodEnd) })}
						</span>
					{/if}
				</div>
				<AppActionRow>
					<CwButton
						id="account-billing-reporting-cancel-button"
						variant="ghost"
						onclick={() => (controller.reportingCancelOpen = true)}
						disabled={controller.busy || reporting.cancelAtPeriodEnd}
					>
						{m.billing_reporting_cancel()}
					</CwButton>
				</AppActionRow>
			{:else}
				<AppNotice tone="neutral">
					<p>{m.billing_reporting_none_notice()}</p>
				</AppNotice>
				{#if !isManual}
					<AppActionRow>
						<CwButton
							id="account-billing-reporting-subscribe-button"
							variant="primary"
							onclick={() => controller.subscribeReporting()}
							loading={controller.busy}
						>
							{reportingPriceLabel
								? `${m.billing_reporting_subscribe()} — ${reportingPriceLabel}${m.billing_per_month()}`
								: m.billing_reporting_subscribe()}
						</CwButton>
					</AppActionRow>
				{/if}
			{/if}
		</div>
	</CwCard>

	<CwCard title={m.billing_licenses_title()} elevated>
		{#if licenses.length === 0}
			<div class="billing-section">
				<AppNotice tone="neutral">
					<p>{m.billing_license_none()}</p>
				</AppNotice>
			</div>
		{:else}
			<div class="license-table">
				<div class="license-head">
					<span>{m.billing_col_license()}</span>
					<span>{m.billing_col_device()}</span>
					<span>{m.billing_col_location()}</span>
					<span></span>
				</div>
				{#each licenses as license (license.id)}
					{@const canCancelSeat = !license.manual && nonManualLicenseCount > minimumSeats}
					<div class="license-row">
						<span class="license-seat">
							{m.billing_license_seat({ seat: license.seatIndex + 1 })}
						</span>

						<span class="license-cell">
							{#if license.devEui}
								{@const deviceLocId = deviceLocationId(license.devEui)}
								{#if deviceLocId != null}
									<a
										id={`account-billing-license-${license.id}-device-link`}
										class="license-link"
										href={resolve('/locations/[location_id]/devices/[dev_eui]', {
											location_id: String(deviceLocId),
											dev_eui: license.devEui
										})}>{license.deviceName ?? license.devEui}</a
									>
								{:else}
									<span>{license.deviceName ?? license.devEui}</span>
								{/if}
							{:else}
								<CwChip
									label={m.billing_license_unassigned()}
									tone="secondary"
									variant="outline"
									size="sm"
								/>
							{/if}
						</span>

						<span class="license-cell">
							{#if license.devEui}
								{@const lname = deviceLocationName(license.devEui)}
								{@const locId = deviceLocationId(license.devEui)}
								{#if lname && locId != null}
									<a
										id={`account-billing-license-${license.id}-location-link`}
										class="license-link license-link--muted"
										href={resolve('/locations/[location_id]', { location_id: String(locId) })}
										>{lname}</a
									>
								{:else}
									<span class="billing-muted">—</span>
								{/if}
							{/if}
						</span>

						<span class="license-actions">
							{#if license.devEui}
								<CwButton
									id={`account-billing-license-${license.id}-move-button`}
									variant="secondary"
									size="sm"
									onclick={() => controller.openMove(license.id)}
									disabled={controller.busy}
								>
									{m.billing_move()}
								</CwButton>
								<CwButton
									id={`account-billing-license-${license.id}-unassign-button`}
									variant="ghost"
									size="sm"
									onclick={() => controller.unassign(license.id)}
									disabled={controller.busy}
								>
									{m.billing_unassign()}
								</CwButton>
							{:else}
								<CwButton
									id={`account-billing-license-${license.id}-assign-button`}
									variant="primary"
									size="sm"
									onclick={() => controller.openAssign(license.id)}
									disabled={controller.busy}
								>
									{m.billing_assign()}
								</CwButton>
								{#if canCancelSeat}
									<CwButton
										id={`account-billing-license-${license.id}-seat-cancel-button`}
										variant="ghost"
										size="sm"
										onclick={() => controller.openSeatCancel(license.id)}
										disabled={controller.busy}
									>
										{m.billing_seat_cancel()}
									</CwButton>
								{/if}
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</CwCard>

	{#if !isManual}
		<AppActionRow>
			<CwButton
				id="account-billing-portal-button"
				variant="ghost"
				onclick={() => controller.openPortal()}
				disabled={controller.busy}>{m.billing_portal()}</CwButton
			>
		</AppActionRow>
	{/if}
</AppPage>

<CwDialog bind:open={controller.deviceCancelOpen} title={m.billing_device_cancel_title()}>
	<p>{m.billing_device_cancel_body()}</p>
	{#snippet actions()}
		<CwButton
			id="account-billing-device-cancel-dismiss-button"
			variant="ghost"
			onclick={() => (controller.deviceCancelOpen = false)}
			disabled={controller.busy}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="account-billing-device-cancel-confirm-button"
			variant="danger"
			onclick={() => controller.confirmDeviceCancel()}
			loading={controller.busy}
		>
			{m.billing_device_cancel_confirm()}
		</CwButton>
	{/snippet}
</CwDialog>

<CwDialog bind:open={controller.reportingCancelOpen} title={m.billing_reporting_cancel_title()}>
	<p>{m.billing_reporting_cancel_body()}</p>
	{#snippet actions()}
		<CwButton
			id="account-billing-reporting-cancel-dismiss-button"
			variant="ghost"
			onclick={() => (controller.reportingCancelOpen = false)}
			disabled={controller.busy}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="account-billing-reporting-cancel-confirm-button"
			variant="danger"
			onclick={() => controller.confirmReportingCancel()}
			loading={controller.busy}
		>
			{m.billing_reporting_cancel_confirm()}
		</CwButton>
	{/snippet}
</CwDialog>

<CwDialog
	bind:open={controller.assignOpen}
	title={controller.assignMode === 'assign' ? m.billing_assign_title() : m.billing_move_title()}
>
	{#if data.devicesLoadFailed}
		<AppNotice tone="danger">
			<p>{m.billing_devices_load_error()}</p>
		</AppNotice>
	{:else if deviceOptions.length === 0}
		<AppNotice tone="neutral">
			<p>{m.billing_assign_no_devices()}</p>
		</AppNotice>
	{:else}
		<CwDropdown
			labels={cwDropdownLabels()}
			id="account-billing-assign-device-select"
			label={m.billing_assign_device_label()}
			options={deviceOptions}
			bind:value={controller.selectedDevEui}
			placeholder={m.billing_assign_device_label()}
		/>
	{/if}
	{#snippet actions()}
		<CwButton
			id="account-billing-assign-dismiss-button"
			variant="ghost"
			onclick={() => (controller.assignOpen = false)}
			disabled={controller.busy}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="account-billing-assign-confirm-button"
			variant="primary"
			onclick={() => controller.confirmAssign()}
			loading={controller.busy}
			disabled={!controller.selectedDevEui}
		>
			{controller.assignMode === 'assign' ? m.billing_assign() : m.billing_move()}
		</CwButton>
	{/snippet}
</CwDialog>

<CwDialog bind:open={controller.seatCancelOpen} title={m.billing_seat_cancel_title()}>
	<p>{m.billing_seat_cancel_body()}</p>
	{#snippet actions()}
		<CwButton
			id="account-billing-seat-cancel-dismiss-button"
			variant="ghost"
			onclick={() => (controller.seatCancelOpen = false)}
			disabled={controller.busy}
		>
			{m.billing_seat_cancel_keep()}
		</CwButton>
		<CwButton
			id="account-billing-seat-cancel-confirm-button"
			variant="danger"
			onclick={() => controller.confirmSeatCancel()}
			loading={controller.busy}
		>
			{m.billing_seat_cancel_confirm()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.billing-section {
		display: grid;
		gap: var(--cw-space-3);
		padding: var(--cw-space-4);
	}

	.billing-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-3);
	}

	.billing-price {
		font-size: var(--cw-text-lg);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.billing-summary {
		margin: 0;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-text-primary);
	}

	.billing-muted {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.billing-seats {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--cw-space-3);
	}

	.license-table {
		display: grid;
	}

	.license-head,
	.license-row {
		display: grid;
		grid-template-columns: minmax(70px, auto) minmax(0, 1.4fr) minmax(0, 1fr) auto;
		gap: var(--cw-space-3);
		align-items: center;
		padding: var(--cw-space-3) var(--cw-space-4);
	}

	.license-head {
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--cw-text-muted);
		border-bottom: 1px solid var(--cw-border-muted);
	}

	.license-row {
		border-bottom: 1px solid var(--cw-border-muted);
	}

	.license-row:last-child {
		border-bottom: none;
	}

	.license-seat {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.license-cell {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.license-link {
		color: var(--cw-accent-text);
		font-weight: var(--cw-font-medium);
		text-decoration: none;
	}

	.license-link:hover {
		text-decoration: underline;
	}

	.license-link--muted {
		color: var(--cw-text-secondary);
		font-weight: var(--cw-font-normal);
	}

	.license-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}

	@media (max-width: 640px) {
		.license-head {
			display: none;
		}

		.license-row {
			grid-template-columns: 1fr;
			gap: var(--cw-space-1);
		}

		.license-actions {
			justify-content: flex-start;
			padding-top: var(--cw-space-2);
		}
	}
</style>
