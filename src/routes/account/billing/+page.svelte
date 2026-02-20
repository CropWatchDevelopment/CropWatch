<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
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
		{ key: 'productName', header: 'Plan', sortable: true },
		{ key: 'status', header: 'Status', sortable: true, width: '10rem' },
		{ key: 'amountLabel', header: 'Price', sortable: true, width: '9rem', hideBelow: 'sm' },
		{ key: 'startedAt', header: 'Started', sortable: true, width: '12rem', hideBelow: 'md' },
		{ key: 'renewsAt', header: 'Renews', sortable: true, width: '12rem', hideBelow: 'md' }
	];

	const isRecord = (value: unknown): value is Record<string, unknown> =>
		typeof value === 'object' && value !== null && !Array.isArray(value);

	const toPayload = (result: ActionPayloadResult): BillingFormPayload => {
		if (isRecord(result.data)) {
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
		if (!value) return 'N/A';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return 'N/A';
		return parsed.toLocaleString();
	}

	function subscriptionTone(status: string): CwTone {
		const normalized = status.toLowerCase();
		if (normalized.includes('active')) return 'success';
		if (normalized.includes('trial')) return 'info';
		if (normalized.includes('cancel') || normalized.includes('revoke')) return 'danger';
		if (normalized.includes('past') || normalized.includes('unpaid')) return 'warning';
		return 'secondary';
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
			maybeToast('warning', undefined, 'Select at least one product before checkout.');
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
					maybeToast('success', payload.message, 'Checkout session created.');
					if (payload.redirectUrl) {
						window.location.assign(payload.redirectUrl);
					}
				} else {
					maybeToast('danger', payload.message, 'Unable to create checkout session.');
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
					maybeToast('success', payload.message, 'Billing portal opened.');
					if (payload.redirectUrl) {
						window.location.assign(payload.redirectUrl);
					}
				} else {
					maybeToast('danger', payload.message, 'Unable to open billing portal.');
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
					maybeToast('warning', payload.message, 'Subscription canceled.');
					closeCancelDialog();
				} else {
					maybeToast('danger', payload.message, 'Unable to cancel subscription.');
				}
				return;
			}

			await applyAction(result);
		};
	};
</script>

<div class="billing-page">
	<!-- <div class="billing-page__background" aria-hidden="true"></div> -->

	<div class="billing-shell">
		<header class="billing-header">
			<div>
				<h1>Billing & Subscriptions</h1>
				<p>Manage plan purchases, active subscriptions, and customer portal access.</p>
			</div>
			<div class="billing-header__status">
				<CwChip
					label={`Account: ${subscriptionState.status || 'unknown'}`}
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
			<CwCard title="Active Plans" subtitle="Currently billed subscriptions" elevated>
				<p class="billing-kpi__value">{subscriptionState.activeSubscriptionCount}</p>
			</CwCard>

			<CwCard title="Trial Plans" subtitle="In trial period" elevated>
				<p class="billing-kpi__value">{subscriptionState.trialSubscriptionCount}</p>
			</CwCard>

			<CwCard title="Canceled" subtitle="Historical cancellations" elevated>
				<p class="billing-kpi__value">{subscriptionState.cancelledSubscriptionCount}</p>
			</CwCard>

			<CwCard title="Available Products" subtitle="Returned by payments API" elevated>
				<p class="billing-kpi__value">{products.length}</p>
			</CwCard>
		</div>

		{#if hasLoadErrors}
			<CwCard title="API Warnings" subtitle="Some endpoints returned errors">
				<div class="billing-errors">
					{#if data.errors?.products}
						<CwChip label={`Products: ${data.errors.products}`} tone="danger" variant="soft" />
					{/if}
					{#if data.errors?.subscriptions}
						<CwChip label={`Subscriptions: ${data.errors.subscriptions}`} tone="danger" variant="soft" />
					{/if}
					{#if data.errors?.state}
						<CwChip label={`State: ${data.errors.state}`} tone="warning" variant="soft" />
					{/if}
				</div>
			</CwCard>
		{/if}

		<div class="billing-grid">
			<CwCard
				title="Create Checkout Session"
				subtitle="Choose one or more products, then launch hosted checkout"
				elevated
				class="billing-grid__checkout"
			>
				<form method="POST" action="?/createCheckoutSession" use:enhance={checkoutEnhance} class="billing-form">
					<div class="billing-products">
						{#if visibleProducts.length === 0}
							<p class="billing-empty">No products found for checkout.</p>
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
											<p>{product.description || 'No description provided by API.'}</p>
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
											<CwChip label="Archived" tone="warning" variant="soft" />
										{/if}
									</div>

									<CwSwitch
										checked={isProductSelected(product.id)}
										label="Include in checkout"
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
							label="Include archived products"
							onchange={(checked) => (showArchivedProducts = checked)}
						/>
						<CwButton type="button" variant="secondary" size="sm" onclick={clearProductSelection}
							>Clear Selection</CwButton
						>
					</div>

					<CwExpandPanel title="Optional Checkout Settings">
						<div class="billing-options">
							<CwInput
								label="Customer name"
								value={customerName}
								placeholder="Jane Smith"
								oninput={(event) => (customerName = (event.target as HTMLInputElement).value)}
							/>
							<CwInput
								type="email"
								label="Customer email"
								value={customerEmail}
								placeholder="jane@example.com"
								oninput={(event) => (customerEmail = (event.target as HTMLInputElement).value)}
							/>
							<CwSwitch
								checked={allowDiscountCodes}
								label="Allow discount codes"
								onchange={(checked) => (allowDiscountCodes = checked)}
							/>
							<CwSwitch
								checked={allowTrial}
								label="Allow trial"
								onchange={(checked) => (allowTrial = checked)}
							/>
						</div>
					</CwExpandPanel>

					<input type="hidden" name="allow_discount_codes" value={allowDiscountCodes ? 'true' : 'false'} />
					<input type="hidden" name="allow_trial" value={allowTrial ? 'true' : 'false'} />
					{#if customerName}
						<input type="hidden" name="customer_name" value={customerName} />
					{/if}
					{#if customerEmail}
						<input type="hidden" name="customer_email" value={customerEmail} />
					{/if}

					<div class="billing-form__submit">
						<CwButton
							type="submit"
							variant="primary"
							loading={checkoutBusy}
							disabled={checkoutBusy || selectedProductIds.length === 0}
							>Launch Checkout</CwButton
						>
						<span>{selectedProductIds.length} selected</span>
					</div>
				</form>
			</CwCard>

			<CwCard title="Subscriptions" subtitle="Current and historical subscription records" elevated>
				<div class="billing-subscriptions__actions">
					<form method="POST" action="?/createPortalSession" use:enhance={portalEnhance}>
						<CwButton type="submit" variant="info" loading={portalBusy} disabled={portalBusy}
							>Open Billing Portal</CwButton
						>
					</form>
				</div>

				<CwDataTable
					columns={subscriptionColumns}
					loadData={loadSubscriptions}
					rowKey="id"
					searchable
					bind:pageSize
					actionsHeader="Actions"
				>
					{#snippet cell(row: BillingSubscription, col: CwColumnDef<BillingSubscription>, defaultValue: string)}
						{#if col.key === 'status'}
							<CwChip label={row.status} tone={subscriptionTone(row.status)} variant="soft" />
						{:else if col.key === 'startedAt'}
							{formatDate(row.startedAt)}
						{:else if col.key === 'renewsAt'}
							{formatDate(row.renewsAt)}
						{:else}
							{defaultValue}
						{/if}
					{/snippet}

					{#snippet rowActions(row: BillingSubscription)}
						{#if row.status.toLowerCase().includes('cancel') || row.status.toLowerCase().includes('revoke')}
							<CwChip label="Ended" tone="secondary" variant="soft" />
						{:else}
							<CwButton
								size="sm"
								variant="danger"
								disabled={cancelBusy}
								onclick={() => openCancelDialog(row)}
								>Cancel</CwButton
							>
						{/if}
					{/snippet}
				</CwDataTable>
			</CwCard>
		</div>

		{#if isRecord(form) && typeof form.message === 'string' && form.message.length > 0}
			<div class="billing-feedback">
				<CwChip
					label={form.message}
					tone={form.action === 'cancel' ? 'warning' : 'info'}
					variant="soft"
				/>
			</div>
		{/if}
	</div>
</div>

<CwDialog bind:open={cancelDialogOpen} title="Cancel Subscription" onclose={closeCancelDialog}>
	{#if subscriptionToCancel}
		<p class="billing-dialog__text">
			Cancel <strong>{subscriptionToCancel.productName}</strong> ({subscriptionToCancel.id})?
		</p>
		<p class="billing-dialog__text billing-dialog__warning">
			This action calls the revoke endpoint and cannot be undone from this page.
		</p>
	{/if}

	{#snippet actions()}
		<div class="billing-dialog__actions">
			<CwButton type="button" variant="secondary" onclick={closeCancelDialog}>Keep Subscription</CwButton>
			<form method="POST" action="?/cancelSubscription" use:enhance={cancelEnhance}>
				<input type="hidden" name="subscription_id" value={subscriptionToCancel?.id ?? ''} />
				<CwButton
					type="submit"
					variant="danger"
					loading={cancelBusy}
					disabled={!subscriptionToCancel || cancelBusy}
				>
					Confirm Cancel
				</CwButton>
			</form>
		</div>
	{/snippet}
</CwDialog>

<style>
	.billing-page {
		position: relative;
		min-height: 100%;
		padding: 1.2rem;
	}

	.billing-page__background {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(circle at 18% 18%, rgb(0 140 255 / 22%), transparent 40%),
			radial-gradient(circle at 78% 8%, rgb(0 255 200 / 16%), transparent 38%),
			radial-gradient(circle at 82% 86%, rgb(93 77 255 / 20%), transparent 42%),
			linear-gradient(180deg, rgb(6 17 37 / 96%), rgb(6 15 30 / 92%));
	}

	.billing-page__background::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgb(73 111 170 / 10%) 1px, transparent 1px),
			linear-gradient(90deg, rgb(73 111 170 / 10%) 1px, transparent 1px);
		background-size: 28px 28px;
		mask-image: linear-gradient(to bottom, transparent 0%, rgb(0 0 0 / 80%) 25%, black 100%);
	}

	.billing-shell {
		position: relative;
		z-index: 1;
		max-width: 1480px;
		margin: 0 auto;
		display: grid;
		gap: 1rem;
	}

	.billing-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.billing-header h1 {
		margin: 0;
		font-size: clamp(1.4rem, 1rem + 1.2vw, 2rem);
	}

	.billing-header p {
		margin: 0.4rem 0 0;
		color: var(--cw-text-secondary);
	}

	.billing-header__status {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.billing-customer-id {
		font-size: 0.75rem;
		padding: 0.3rem 0.5rem;
		background: rgb(4 12 28 / 70%);
		border: 1px solid rgb(95 148 211 / 35%);
		border-radius: 0.45rem;
	}

	.billing-kpis {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.billing-kpi__value {
		margin: 0;
		font-size: 1.9rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.billing-errors {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.billing-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		align-items: start;
	}

	.billing-form {
		display: grid;
		gap: 0.9rem;
	}

	.billing-products {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.billing-product {
		border: 1px solid rgb(90 133 191 / 24%);
		border-radius: 0.9rem;
		padding: 0.8rem;
		background: rgb(8 20 46 / 62%);
		display: grid;
		gap: 0.55rem;
	}

	.billing-product--selected {
		border-color: rgb(70 164 255 / 72%);
		box-shadow: 0 0 0 1px rgb(70 164 255 / 42%);
	}

	.billing-product__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.6rem;
	}

	.billing-product__header h3 {
		margin: 0;
		font-size: 0.97rem;
		font-weight: 600;
	}

	.billing-product__header p {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
		color: var(--cw-text-muted);
	}

	.billing-product__meta {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.billing-form__controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.billing-options {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 0.1rem 0.05rem 0.25rem;
	}

	.billing-form__submit {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		font-size: 0.9rem;
		color: var(--cw-text-secondary);
	}

	.billing-subscriptions__actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.8rem;
	}

	.billing-empty {
		margin: 0;
		padding: 1rem;
		text-align: center;
		border: 1px dashed rgb(107 144 199 / 35%);
		border-radius: 0.8rem;
		color: var(--cw-text-secondary);
	}

	.billing-feedback {
		display: flex;
		justify-content: flex-end;
	}

	.billing-dialog__text {
		margin: 0;
	}

	.billing-dialog__warning {
		margin-top: 0.45rem;
		color: var(--cw-text-secondary);
		font-size: 0.9rem;
	}

	.billing-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.55rem;
		flex-wrap: wrap;
	}

	@media (max-width: 1220px) {
		.billing-grid {
			grid-template-columns: 1fr;
		}

		.billing-kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 820px) {
		.billing-products,
		.billing-options {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.billing-kpis {
			grid-template-columns: 1fr;
		}
	}
</style>
