<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { AppActionRow, AppNotice, AppPage } from '$lib/components/layout';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import type { BillingProduct } from '$lib/api/api.dtos';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { formatCurrency, formatDate } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
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
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const initial = (() => data)();
	const toast = useCwToast();

	let busy = $state(false);
	let buyQty = $state('1');
	let desiredSeats = $state(String(initial.state.device.seats));

	let cancelOpen = $state(false);
	let assignOpen = $state(false);
	let assignMode = $state<'assign' | 'move'>('assign');
	let activeLicenseId = $state<number | null>(null);
	let selectedDevEui = $state('');
	let seatCancelOpen = $state(false);
	let seatCancelLicenseId = $state<number | null>(null);

	const base = $derived(data.state.base);
	const device = $derived(data.state.device);
	const licenses = $derived(data.state.licenses);
	const hasBase = $derived(
		!!base.status && ['active', 'trialing', 'past_due'].includes(base.status)
	);
	const hasDeviceSub = $derived(device.subscriptionId !== null);

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

	function deviceHref(devEui: string): string | null {
		const id = deviceLocationId(devEui);
		return id != null
			? resolve('/locations/[location_id]/devices/[dev_eui]', {
					location_id: String(id),
					dev_eui: devEui
				})
			: null;
	}

	function locationHref(devEui: string): string | null {
		const id = deviceLocationId(devEui);
		return id != null ? resolve('/locations/[location_id]', { location_id: String(id) }) : null;
	}

	const basePriceLabel = $derived(priceLabel(data.products.base));
	const devicePriceLabel = $derived(priceLabel(data.products.device));
	const seatsChanged = $derived(
		Number.parseInt(desiredSeats, 10) !== device.seats &&
			Number.isInteger(Number.parseInt(desiredSeats, 10))
	);

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

	function baseStatusTone(status: string | null): CwTone {
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

	function baseStatusLabel(status: string | null): string {
		switch (status) {
			case 'active':
				return m.billing_base_status_active();
			case 'trialing':
				return m.billing_base_status_trialing();
			case 'past_due':
				return m.billing_base_status_past_due();
			case 'canceled':
				return m.billing_base_status_canceled();
			default:
				return m.billing_base_status_none();
		}
	}

	function apiClient(): ApiService {
		return new ApiService({ authToken: data.authToken });
	}

	function showError(err: unknown) {
		const payload = err instanceof ApiServiceError ? err.payload : err;
		toast.add({ tone: 'danger', message: readApiErrorMessage(payload, m.generic_error()) });
	}

	async function refresh() {
		await invalidateAll();
		desiredSeats = String(data.state.device.seats);
	}

	async function subscribeBase() {
		busy = true;
		try {
			const { checkoutUrl } = await apiClient().createBaseCheckout();
			window.location.href = checkoutUrl;
		} catch (err) {
			showError(err);
			busy = false;
		}
	}

	async function openPortal() {
		busy = true;
		try {
			const { portalUrl } = await apiClient().openBillingPortal();
			window.location.href = portalUrl;
		} catch (err) {
			showError(err);
			busy = false;
		}
	}

	async function confirmCancel() {
		busy = true;
		try {
			await apiClient().cancelBaseSubscription();
			toast.add({ tone: 'success', message: m.billing_canceled_toast() });
			cancelOpen = false;
			await refresh();
		} catch (err) {
			showError(err);
		} finally {
			busy = false;
		}
	}

	async function buyDevices() {
		const quantity = Number.parseInt(buyQty, 10);
		if (!Number.isInteger(quantity) || quantity < 1) return;
		busy = true;
		try {
			const { checkoutUrl } = await apiClient().createDeviceCheckout({ quantity });
			window.location.href = checkoutUrl;
		} catch (err) {
			showError(err);
			busy = false;
		}
	}

	async function updateSeats() {
		const seats = Number.parseInt(desiredSeats, 10);
		if (!Number.isInteger(seats) || seats < 0) return;
		busy = true;
		try {
			await apiClient().changeDeviceSeats({ seats });
			toast.add({ tone: 'success', message: m.billing_seats_updated() });
			await refresh();
		} catch (err) {
			showError(err);
		} finally {
			busy = false;
		}
	}

	function openAssign(licenseId: number) {
		assignMode = 'assign';
		activeLicenseId = licenseId;
		selectedDevEui = '';
		assignOpen = true;
	}

	function openMove(licenseId: number) {
		assignMode = 'move';
		activeLicenseId = licenseId;
		selectedDevEui = '';
		assignOpen = true;
	}

	async function confirmAssign() {
		if (activeLicenseId == null || !selectedDevEui) return;
		busy = true;
		try {
			if (assignMode === 'assign') {
				await apiClient().assignLicense(activeLicenseId, selectedDevEui);
				toast.add({ tone: 'success', message: m.billing_license_assigned() });
			} else {
				await apiClient().moveLicense(activeLicenseId, selectedDevEui);
				toast.add({ tone: 'success', message: m.billing_license_moved() });
			}
			assignOpen = false;
			await refresh();
		} catch (err) {
			showError(err);
		} finally {
			busy = false;
		}
	}

	async function unassign(licenseId: number) {
		busy = true;
		try {
			await apiClient().unassignLicense(licenseId);
			toast.add({ tone: 'success', message: m.billing_license_unassigned_toast() });
			await refresh();
		} catch (err) {
			showError(err);
		} finally {
			busy = false;
		}
	}

	function openSeatCancel(licenseId: number) {
		seatCancelLicenseId = licenseId;
		seatCancelOpen = true;
	}

	async function confirmSeatCancel() {
		if (seatCancelLicenseId == null) return;
		busy = true;
		try {
			await apiClient().cancelLicense(seatCancelLicenseId);
			toast.add({ tone: 'success', message: m.billing_seat_canceled_toast() });
			seatCancelOpen = false;
			await refresh();
		} catch (err) {
			showError(err);
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('checkout') === 'success') {
			toast.add({ tone: 'success', message: m.billing_checkout_success() });
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>{m.billing_title()} - CropWatch</title>
</svelte:head>

<AppPage width="lg">
	<CwButton id="account-billing-back-button" variant="secondary" size="sm" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back()}
	</CwButton>

	{#if data.loadFailed}
		<AppNotice tone="danger">
			<p>{m.billing_load_error()}</p>
		</AppNotice>
	{/if}

	<CwCard title={m.billing_base_title()} subtitle={m.billing_base_subtitle()} elevated>
		{#snippet actions()}
			<CwChip
				label={baseStatusLabel(base.status)}
				tone={baseStatusTone(base.status)}
				variant="soft"
				size="sm"
			/>
		{/snippet}

		<div class="billing-section">
			{#if hasBase}
				<div class="billing-meta">
					{#if basePriceLabel}
						<span class="billing-price">{basePriceLabel}{m.billing_per_month()}</span>
					{/if}
					{#if base.discountId}
						<CwChip
							label={m.billing_base_discount_applied()}
							tone="success"
							variant="soft"
							size="sm"
						/>
					{/if}
					{#if base.currentPeriodEnd}
						<span class="billing-muted">
							{base.cancelAtPeriodEnd
								? m.billing_base_ends_on({ date: formatDate(base.currentPeriodEnd) })
								: m.billing_base_renews_on({ date: formatDate(base.currentPeriodEnd) })}
						</span>
					{/if}
				</div>
				<AppActionRow>
					<CwButton
						id="account-billing-base-cancel-button"
						variant="ghost"
						onclick={() => (cancelOpen = true)}
						disabled={busy || base.cancelAtPeriodEnd}
					>
						{m.billing_base_cancel()}
					</CwButton>
					<CwButton id="account-billing-base-manage-button" variant="primary" onclick={openPortal} loading={busy}>
						{m.billing_base_manage()}
					</CwButton>
				</AppActionRow>
			{:else}
				<AppNotice tone="warning">
					<p>{m.billing_base_none_notice()}</p>
				</AppNotice>
				<AppActionRow>
					<CwButton id="account-billing-base-subscribe-button" variant="primary" onclick={subscribeBase} loading={busy}>
						{basePriceLabel
							? `${m.billing_base_subscribe()} — ${basePriceLabel}${m.billing_per_month()}`
							: m.billing_base_subscribe()}
					</CwButton>
				</AppActionRow>
			{/if}
		</div>
	</CwCard>

	<CwCard title={m.billing_devices_title()} subtitle={m.billing_devices_subtitle()} elevated>
		<div class="billing-section">
			<p class="billing-summary">
				{m.billing_devices_summary({
					total: device.seats,
					assigned: device.assignedCount,
					available: device.availableCount
				})}
			</p>
			{#if devicePriceLabel}
				<p class="billing-muted">{devicePriceLabel}{m.billing_per_month()}</p>
			{/if}

			{#if hasDeviceSub}
				<div class="billing-seats">
					<CwInput
						id="account-billing-seats-input"
						type="numeric"
						label={m.billing_seats_label()}
						bind:value={desiredSeats}
						min={device.assignedCount}
					/>
					<CwButton
						id="account-billing-seats-update-button"
						variant="primary"
						onclick={updateSeats}
						loading={busy}
						disabled={!seatsChanged}
					>
						{m.billing_seats_update()}
					</CwButton>
				</div>
				{#if device.assignedCount > 0}
					<p class="billing-muted">
						{m.billing_seats_min_note({ assigned: device.assignedCount })}
					</p>
				{/if}
			{:else}
				<div class="billing-seats">
					<CwInput
						id="account-billing-buy-quantity-input"
						type="numeric"
						label={m.billing_buy_quantity()}
						bind:value={buyQty}
						min={1}
					/>
					<CwButton id="account-billing-buy-devices-button" variant="primary" onclick={buyDevices} loading={busy}>
						{m.billing_buy_action()}
					</CwButton>
				</div>
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
					<div class="license-row">
						<span class="license-seat">
							{m.billing_license_seat({ seat: license.seatIndex + 1 })}
						</span>

						<span class="license-cell">
							{#if license.devEui}
								{@const href = deviceHref(license.devEui)}
								{#if href}
									<a id={`account-billing-license-${license.id}-device-link`} class="license-link" {href}>{license.deviceName ?? license.devEui}</a>
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
								{@const lhref = locationHref(license.devEui)}
								{#if lname && lhref}
									<a id={`account-billing-license-${license.id}-location-link`} class="license-link license-link--muted" href={lhref}>{lname}</a>
								{:else if lname}
									<span class="billing-muted">{lname}</span>
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
									onclick={() => openMove(license.id)}
									disabled={busy}
								>
									{m.billing_move()}
								</CwButton>
								<CwButton
									id={`account-billing-license-${license.id}-unassign-button`}
									variant="ghost"
									size="sm"
									onclick={() => unassign(license.id)}
									disabled={busy}
								>
									{m.billing_unassign()}
								</CwButton>
							{:else}
								<CwButton
									id={`account-billing-license-${license.id}-assign-button`}
									variant="primary"
									size="sm"
									onclick={() => openAssign(license.id)}
									disabled={busy}
								>
									{m.billing_assign()}
								</CwButton>
								<CwButton
									id={`account-billing-license-${license.id}-seat-cancel-button`}
									variant="ghost"
									size="sm"
									onclick={() => openSeatCancel(license.id)}
									disabled={busy}
								>
									{m.billing_seat_cancel()}
								</CwButton>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</CwCard>

	<AppActionRow>
		<CwButton id="account-billing-portal-button" variant="ghost" onclick={openPortal} disabled={busy}>{m.billing_portal()}</CwButton>
	</AppActionRow>
</AppPage>

<CwDialog bind:open={cancelOpen} title={m.billing_cancel_title()}>
	{#snippet children()}
		<p>{m.billing_cancel_body()}</p>
	{/snippet}
	{#snippet actions()}
		<CwButton id="account-billing-cancel-subscription-dismiss-button" variant="ghost" onclick={() => (cancelOpen = false)} disabled={busy}>
			{m.action_cancel()}
		</CwButton>
		<CwButton id="account-billing-cancel-subscription-confirm-button" variant="danger" onclick={confirmCancel} loading={busy}>
			{m.billing_cancel_confirm()}
		</CwButton>
	{/snippet}
</CwDialog>

<CwDialog
	bind:open={assignOpen}
	title={assignMode === 'assign' ? m.billing_assign_title() : m.billing_move_title()}
>
	{#snippet children()}
		{#if deviceOptions.length === 0}
			<AppNotice tone="neutral">
				<p>{m.billing_assign_no_devices()}</p>
			</AppNotice>
		{:else}
			<CwDropdown
				id="account-billing-assign-device-select"
				label={m.billing_assign_device_label()}
				options={deviceOptions}
				bind:value={selectedDevEui}
				placeholder={m.billing_assign_device_label()}
			/>
		{/if}
	{/snippet}
	{#snippet actions()}
		<CwButton id="account-billing-assign-dismiss-button" variant="ghost" onclick={() => (assignOpen = false)} disabled={busy}>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="account-billing-assign-confirm-button"
			variant="primary"
			onclick={confirmAssign}
			loading={busy}
			disabled={!selectedDevEui}
		>
			{assignMode === 'assign' ? m.billing_assign() : m.billing_move()}
		</CwButton>
	{/snippet}
</CwDialog>

<CwDialog bind:open={seatCancelOpen} title={m.billing_seat_cancel_title()}>
	{#snippet children()}
		<p>{m.billing_seat_cancel_body()}</p>
	{/snippet}
	{#snippet actions()}
		<CwButton id="account-billing-seat-cancel-dismiss-button" variant="ghost" onclick={() => (seatCancelOpen = false)} disabled={busy}>
			{m.billing_seat_cancel_keep()}
		</CwButton>
		<CwButton id="account-billing-seat-cancel-confirm-button" variant="danger" onclick={confirmSeatCancel} loading={busy}>
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
		color: var(--cw-text-tertiary);
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
		color: var(--cw-text-link, var(--cw-color-primary));
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
