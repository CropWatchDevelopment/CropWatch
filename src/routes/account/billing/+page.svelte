<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwCopy,
		CwDataTable,
		CwDialog,
		CwExpandPanel,
		CwInput,
		CwSwitch,
		useCwToast,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult,
		type CwTone
	} from '@cropwatchdevelopment/cwui';
	import { formatDateTime, formatNumber } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	type BillingProduct = {
		id: string;
		name: string;
		description: string;
		priceLabel: string;
		billingLabel: string;
		active: boolean;
	};

	type BillingSubscription = {
		id: string;
		status: string;
		productName: string;
		startedAt: string | null;
		renewsAt: string | null;
		canceledAt: string | null;
		amountLabel: string;
	};

	type BillingState = {
		status: string;
		hasActiveSubscription: boolean;
		customerId: string | null;
		activeSubscriptionCount: number;
		trialSubscriptionCount: number;
		cancelledSubscriptionCount: number;
	};

	type BillingFormPayload = {
		action?: string;
		message?: string;
		redirectUrl?: string;
		cancelledId?: string;
	};

	type ActionPayloadResult = Extract<ActionResult, { type: 'success' | 'failure' }>;

	let { data, form }: PageProps = $props();
	const toast = useCwToast();

	$effect(() => {
		if (
			form &&
			typeof form === 'object' &&
			typeof form.message === 'string' &&
			form.message.length > 0
		) {
			const tone: CwTone = form.action === 'cancel' ? 'warning' : 'info';
			toast.add({ tone, message: form.message });
		}
	});

	let selectedProductIds = $state<string[]>([]);
	let showArchivedProducts = $state(true);
	let customerName = $state('');
	let customerEmail = $state('');
	let allowDiscountCodes = $state(true);
	let allowTrial = $state(true);

	let checkoutBusy = $state(false);
	let portalBusy = $state(false);
	let cancelBusy = $state(false);
	let cancelDialogOpen = $state(false);
	let subscriptionToCancel = $state<BillingSubscription | null>(null);

	let pageSize = $state(6);

	let products = $derived((data.products ?? []) as BillingProduct[]);
	let subscriptions = $derived((data.subscriptions ?? []) as BillingSubscription[]);
	let subscriptionState = $derived((data.subscriptionState ?? {}) as BillingState);
	let visibleProducts = $derived(
		showArchivedProducts ? products : products.filter((product) => product.active)
	);

	const hasLoadErrors = $derived(
		Boolean(data.errors?.products || data.errors?.subscriptions || data.errors?.state)
	);

	const subscriptionColumns: CwColumnDef<BillingSubscription>[] = [
		{ key: 'productName', header: m.billing_column_plan(), sortable: true },
		{ key: 'status', header: m.billing_column_status(), sortable: true, width: '10rem' },
		{
			key: 'amountLabel',
			header: m.billing_column_price(),
			sortable: true,
			width: '9rem',
			hideBelow: 'sm'
		},
		{
			key: 'startedAt',
			header: m.billing_column_started(),
			sortable: true,
			width: '12rem',
			hideBelow: 'md'
		},
		{
			key: 'renewsAt',
			header: m.billing_column_renews(),
			sortable: true,
			width: '12rem',
			hideBelow: 'md'
		}
	];

	const toPayload = (result: ActionPayloadResult): BillingFormPayload => {
		if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
			return result.data as BillingFormPayload;
		}
		return {};
	};

	const maybeToast = (tone: CwTone, message: string | undefined, fallback: string) => {
		toast.add({ tone, message: message?.trim() || fallback });
	};

	function isProductSelected(productId: string): boolean {
		return selectedProductIds.includes(productId);
	}

	function toggleProductSelection(productId: string, checked: boolean) {
		if (checked) {
			if (!selectedProductIds.includes(productId)) {
				selectedProductIds = [...selectedProductIds, productId];
			}
			return;
		}
		selectedProductIds = selectedProductIds.filter((id) => id !== productId);
	}

	function clearProductSelection() {
		selectedProductIds = [];
	}

	function formatDate(value: string | null): string {
		return formatDateTime(value ?? '', undefined, m.common_not_available());
	}

	function subscriptionTone(status: string): CwTone {
		const normalized = status.toLowerCase();
		if (normalized.includes('active')) return 'success';
		if (normalized.includes('trial')) return 'info';
		if (normalized.includes('cancel') || normalized.includes('revoke')) return 'danger';
		if (normalized.includes('past') || normalized.includes('unpaid')) return 'warning';
		return 'secondary';
	}

	function translateSubscriptionStatus(status: string): string {
		const normalized = status.toLowerCase();
		if (normalized.includes('active')) return m.billing_status_active();
		if (normalized.includes('trial')) return m.billing_status_trial();
		if (normalized.includes('cancel') || normalized.includes('revoke')) {
			return m.billing_status_canceled();
		}
		if (normalized.includes('past')) return m.billing_status_past_due();
		if (normalized.includes('unpaid')) return m.billing_status_unpaid();
		if (normalized.includes('unknown')) return m.billing_status_unknown();
		return status;
	}

	function accountStateTone(): CwTone {
		return subscriptionState.hasActiveSubscription ? 'success' : 'warning';
	}

	function openCancelDialog(subscription: BillingSubscription) {
		subscriptionToCancel = subscription;
		cancelDialogOpen = true;
	}

	function closeCancelDialog() {
		cancelDialogOpen = false;
		subscriptionToCancel = null;
	}

	function getSortValue(row: BillingSubscription, key: string): string {
		switch (key) {
			case 'productName':
				return row.productName.toLowerCase();
			case 'status':
				return row.status.toLowerCase();
			case 'amountLabel':
				return row.amountLabel.toLowerCase();
			case 'startedAt':
				return row.startedAt ?? '';
			case 'renewsAt':
				return row.renewsAt ?? '';
			default:
				return '';
		}
	}

	async function loadSubscriptions(
		query: CwTableQuery
	): Promise<CwTableResult<BillingSubscription>> {
		let rows = [...subscriptions];
		const normalizedSearch = query.search.trim().toLowerCase();

		if (normalizedSearch.length > 0) {
			rows = rows.filter((row) =>
				`${row.productName} ${row.status} ${row.amountLabel} ${row.id}`
					.toLowerCase()
					.includes(normalizedSearch)
			);
		}

		if (query.sort) {
			rows.sort((a, b) => {
				const aValue = getSortValue(a, query.sort!.column);
				const bValue = getSortValue(b, query.sort!.column);
				const result = aValue.localeCompare(bValue);
				return query.sort!.direction === 'asc' ? result : -result;
			});
		}

		const start = (query.page - 1) * query.pageSize;
		return {
			rows: rows.slice(start, start + query.pageSize),
			total: rows.length
		};
	}

	const checkoutEnhance: SubmitFunction = ({ cancel }) => {
		if (selectedProductIds.length === 0) {
			maybeToast('warning', undefined, m.billing_select_product_before_checkout());
			cancel();
			return;
		}

		checkoutBusy = true;
		return async ({ result, update }) => {
			checkoutBusy = false;

			if (result.type === 'success' || result.type === 'failure') {
				await update();
				const payload = toPayload(result);

				if (result.type === 'success') {
					maybeToast('success', payload.message, m.billing_checkout_session_created());
					if (payload.redirectUrl) {
						window.location.assign(payload.redirectUrl);
					}
				} else {
					maybeToast('danger', payload.message, m.billing_checkout_session_failed());
				}
				return;
			}

			await applyAction(result);
		};
	};

	const portalEnhance: SubmitFunction = () => {
		portalBusy = true;
		return async ({ result, update }) => {
			portalBusy = false;

			if (result.type === 'success' || result.type === 'failure') {
				await update();
				const payload = toPayload(result);

				if (result.type === 'success') {
					maybeToast('success', payload.message, m.billing_portal_opened());
					if (payload.redirectUrl) {
						window.location.assign(payload.redirectUrl);
					}
				} else {
					maybeToast('danger', payload.message, m.billing_portal_open_failed());
				}
				return;
			}

			await applyAction(result);
		};
	};

	const cancelEnhance: SubmitFunction = () => {
		cancelBusy = true;
		return async ({ result, update }) => {
			cancelBusy = false;

			if (result.type === 'success' || result.type === 'failure') {
				await update();
				const payload = toPayload(result);

				if (result.type === 'success') {
					maybeToast('warning', payload.message, m.billing_subscription_canceled());
					closeCancelDialog();
				} else {
					maybeToast('danger', payload.message, m.billing_subscription_cancel_failed());
				}
				return;
			}

			await applyAction(result);
		};
	};
</script>

<svelte:head>
	<title>{m.nav_billing()} - {m.app_name()}</title>
</svelte:head>

<AppPage width="xl" class="billing-page">
	<div class="billing-shell">
		<header class="billing-header">
			<div class="billing-header__copy">
				<h1>{m.billing_heading()}</h1>
				<p>{m.billing_subtitle()}</p>
			</div>
			<div class="billing-header__status">
				<CwChip
					label={m.billing_account_status({
						status: translateSubscriptionStatus(
							subscriptionState.status || m.billing_status_unknown()
						)
					})}
					tone={accountStateTone()}
					variant="soft"
				/>
				{#if subscriptionState.customerId}
					<CwCopy value={subscriptionState.customerId}>
						<code class="billing-customer-id">{subscriptionState.customerId}</code>
					</CwCopy>
				{/if}
			</div>
		</header>

		<div class="billing-kpis">
			<CwCard
				title={m.billing_active_seats()}
				subtitle={m.billing_active_seats_subtitle()}
				elevated
			>
				<p class="billing-kpi__value">{formatNumber(subscriptionState.activeSubscriptionCount)}</p>
			</CwCard>

			<CwCard title={m.billing_trial_plans()} subtitle={m.billing_trial_plans_subtitle()} elevated>
				<p class="billing-kpi__value">{formatNumber(subscriptionState.trialSubscriptionCount)}</p>
			</CwCard>

			<CwCard title={m.billing_canceled()} subtitle={m.billing_canceled_subtitle()} elevated>
				<p class="billing-kpi__value">
					{formatNumber(subscriptionState.cancelledSubscriptionCount)}
				</p>
			</CwCard>

			<CwCard
				title={m.billing_available_products()}
				elevated
			>
				<p class="billing-kpi__value">{formatNumber(products.length)}</p>
			</CwCard>
		</div>

		{#if hasLoadErrors}
			<AppNotice tone="warning" title={m.billing_api_warnings()}>
				<p>{m.billing_api_warnings_subtitle()}</p>
				<ul class="billing-errors">
					{#if data.errors?.products}
						<li>{m.billing_error_products({ message: data.errors.products })}</li>
					{/if}
					{#if data.errors?.subscriptions}
						<li>{m.billing_error_subscriptions({ message: data.errors.subscriptions })}</li>
					{/if}
					{#if data.errors?.state}
						<li>{m.billing_error_state({ message: data.errors.state })}</li>
					{/if}
				</ul>
			</AppNotice>
		{/if}

		<div class="billing-grid">
			<div class="billing-grid__checkout">
				<CwCard
					title={m.billing_checkout_title()}
					subtitle={m.billing_checkout_subtitle()}
					elevated
				>
					<form method="POST" action="?/createCheckoutSession" use:enhance={checkoutEnhance}>
						<AppFormStack padded class="billing-form">
							<div class="billing-products">
								{#if visibleProducts.length === 0}
									<AppNotice tone="neutral">
										<p>{m.billing_no_products()}</p>
									</AppNotice>
								{:else}
									{#each visibleProducts as product (product.id)}
										<article
											class={[
												'billing-product',
												isProductSelected(product.id) && 'billing-product--selected'
											]}
										>
											<div class="billing-product__header">
												<div>
													<h3>{product.name}</h3>
													<p>{product.description || m.billing_no_product_description()}</p>
												</div>
												<CwChip
													label={product.priceLabel}
													tone={product.active ? 'info' : 'secondary'}
													variant="outline"
												/>
											</div>

											<div class="billing-product__meta">
												<CwChip label={product.billingLabel} tone="primary" variant="soft" />
												{#if !product.active}
													<CwChip label={m.billing_archived()} tone="warning" variant="soft" />
												{/if}
											</div>

											<CwSwitch
												checked={isProductSelected(product.id)}
												label={m.billing_include_in_checkout()}
												onchange={(checked) => toggleProductSelection(product.id, checked)}
											/>

											{#if isProductSelected(product.id)}
												<input type="hidden" name="products" value={product.id} />
											{/if}
										</article>
									{/each}
								{/if}
							</div>

							<div class="billing-form__controls">
								<CwSwitch
									checked={showArchivedProducts}
									label={m.billing_include_archived_products()}
									onchange={(checked) => (showArchivedProducts = checked)}
								/>
								<CwButton
									type="button"
									variant="secondary"
									size="sm"
									onclick={clearProductSelection}
								>
									{m.billing_clear_selection()}
								</CwButton>
							</div>

							<CwExpandPanel title={m.billing_optional_checkout_settings()}>
								<div class="billing-options">
									<CwInput
										label={m.billing_customer_name()}
										value={customerName}
										placeholder={m.billing_customer_name_placeholder()}
										oninput={(event) => (customerName = (event.target as HTMLInputElement).value)}
									/>
									<CwInput
										type="email"
										label={m.billing_customer_email()}
										value={customerEmail}
										placeholder={m.billing_customer_email_placeholder()}
										oninput={(event) => (customerEmail = (event.target as HTMLInputElement).value)}
									/>
									<CwSwitch
										checked={allowDiscountCodes}
										label={m.billing_allow_discount_codes()}
										onchange={(checked) => (allowDiscountCodes = checked)}
									/>
									<CwSwitch
										checked={allowTrial}
										label={m.billing_allow_trial()}
										onchange={(checked) => (allowTrial = checked)}
									/>
								</div>
							</CwExpandPanel>

							<input
								type="hidden"
								name="allow_discount_codes"
								value={allowDiscountCodes ? 'true' : 'false'}
							/>
							<input type="hidden" name="allow_trial" value={allowTrial ? 'true' : 'false'} />
							{#if customerName}
								<input type="hidden" name="customer_name" value={customerName} />
							{/if}
							{#if customerEmail}
								<input type="hidden" name="customer_email" value={customerEmail} />
							{/if}

							<div class="billing-form__submit">
								<span
									>{m.billing_selected_count({
										count: formatNumber(selectedProductIds.length)
									})}</span
								>
								<AppActionRow stackOnMobile={false}>
									<CwButton
										type="submit"
										variant="primary"
										loading={checkoutBusy}
										disabled={checkoutBusy || selectedProductIds.length === 0}
									>
										{m.billing_launch_checkout()}
									</CwButton>
								</AppActionRow>
							</div>
						</AppFormStack>
					</form>
				</CwCard>
			</div>

			<CwCard
				title={m.billing_subscriptions_title()}
				subtitle={m.billing_subscriptions_subtitle()}
				elevated
			>
				<AppFormStack padded>
					<AppActionRow stackOnMobile={false} class="billing-subscriptions__actions">
						<form method="POST" action="?/createPortalSession" use:enhance={portalEnhance}>
							<CwButton type="submit" variant="info" loading={portalBusy} disabled={portalBusy}
								>{m.billing_open_portal()}</CwButton
							>
						</form>
					</AppActionRow>

					<CwDataTable
						columns={subscriptionColumns}
						loadData={loadSubscriptions}
						rowKey="id"
						searchable
						bind:pageSize
						rowActionsHeader={m.common_actions()}
					>
						{#snippet cell(
							row: BillingSubscription,
							col: CwColumnDef<BillingSubscription>,
							defaultValue: string
						)}
							{#if col.key === 'status'}
								<CwChip
									label={translateSubscriptionStatus(row.status)}
									tone={subscriptionTone(row.status)}
									variant="soft"
								/>
							{:else if col.key === 'startedAt'}
								{formatDate(row.startedAt)}
							{:else if col.key === 'renewsAt'}
								{formatDate(row.renewsAt)}
							{:else}
								{defaultValue}
							{/if}
						{/snippet}

						{#snippet rowActions(row: BillingSubscription)}
							{#if row.status.toLowerCase().includes('cancel') || row.status
									.toLowerCase()
									.includes('revoke')}
								<CwChip label={m.billing_ended()} tone="secondary" variant="soft" />
							{:else}
								<CwButton
									size="sm"
									variant="danger"
									disabled={cancelBusy}
									onclick={() => openCancelDialog(row)}>{m.action_cancel()}</CwButton
								>
							{/if}
						{/snippet}
					</CwDataTable>
				</AppFormStack>
			</CwCard>
		</div>
	</div>
</AppPage>

<CwDialog
	bind:open={cancelDialogOpen}
	title={m.billing_cancel_subscription_title()}
	onclose={closeCancelDialog}
>
	{#if subscriptionToCancel}
		<AppFormStack gap="sm">
			<p class="billing-dialog__text">
				{m.billing_cancel_subscription_body({
					productName: subscriptionToCancel.productName,
					id: subscriptionToCancel.id
				})}
			</p>
			<p class="billing-dialog__text billing-dialog__warning">
				{m.billing_cancel_subscription_warning()}
			</p>
		</AppFormStack>
	{/if}

	{#snippet actions()}
		<AppActionRow class="billing-dialog__actions">
			<CwButton type="button" variant="secondary" onclick={closeCancelDialog}
				>{m.billing_keep_subscription()}</CwButton
			>
			<form method="POST" action="?/cancelSubscription" use:enhance={cancelEnhance}>
				<input type="hidden" name="subscription_id" value={subscriptionToCancel?.id ?? ''} />
				<CwButton
					type="submit"
					variant="danger"
					loading={cancelBusy}
					disabled={!subscriptionToCancel || cancelBusy}
				>
					{m.billing_confirm_cancel()}
				</CwButton>
			</form>
		</AppActionRow>
	{/snippet}
</CwDialog>

<style>
	.billing-shell {
		display: grid;
		gap: var(--cw-space-4);
	}

	.billing-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cw-space-4);
		flex-wrap: wrap;
	}

	.billing-header__copy {
		display: grid;
		gap: var(--cw-space-2);
	}

	.billing-header h1,
	.billing-header p {
		margin: 0;
	}

	.billing-header h1 {
		font-size: clamp(1.4rem, 1rem + 1.2vw, 2rem);
	}

	.billing-header p {
		color: var(--cw-text-secondary);
	}

	.billing-header__status {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		flex-wrap: wrap;
	}

	.billing-customer-id {
		font-size: var(--cw-text-xs);
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-sm);
		background: var(--cw-bg-subtle);
		color: var(--cw-text-secondary);
	}

	.billing-kpis {
		display: grid;
		gap: var(--cw-space-3);
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.billing-kpi__value {
		margin: 0;
		font-size: clamp(1.6rem, 1.2rem + 0.9vw, 2rem);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.02em;
	}

	.billing-errors {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: var(--cw-space-2);
	}

	.billing-grid {
		display: grid;
		gap: var(--cw-space-4);
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		align-items: start;
	}

	.billing-grid__checkout {
		min-width: 0;
	}

	:global(.billing-form) {
		gap: var(--cw-space-4);
	}

	.billing-products {
		display: grid;
		gap: var(--cw-space-3);
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.billing-product {
		display: grid;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-subtle);
	}

	.billing-product--selected {
		border-color: color-mix(in srgb, var(--cw-info-500) 40%, var(--cw-border-muted));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cw-info-500) 24%, transparent);
	}

	.billing-product__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--cw-space-3);
	}

	.billing-product__header h3 {
		margin: 0;
		font-size: var(--cw-text-base);
		font-weight: var(--cw-font-semibold);
	}

	.billing-product__header p {
		margin: 0.35rem 0 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.billing-product__meta {
		display: flex;
		gap: var(--cw-space-2);
		flex-wrap: wrap;
	}

	.billing-form__controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-3);
		flex-wrap: wrap;
	}

	.billing-options {
		display: grid;
		gap: var(--cw-space-3);
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.billing-form__submit {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--cw-space-3);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
		flex-wrap: wrap;
	}

	.billing-dialog__text {
		margin: 0;
	}

	.billing-dialog__warning {
		color: var(--cw-text-secondary);
		font-size: var(--cw-text-sm);
	}

	@media (max-width: 1023px) {
		.billing-grid {
			grid-template-columns: 1fr;
		}

		.billing-kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 767px) {
		.billing-products,
		.billing-options {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 639px) {
		.billing-kpis {
			grid-template-columns: 1fr;
		}
	}
</style>
