<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import CWTable from '$lib/components/CWTable.svelte';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
    import RECEIPT_ICON from '$lib/images/icons/receipt.svg';

	type SelectOption = { value: string | number; label: string };
	type ColumnConfig = {
		key: string;
		label: string;
		value?: string;
		secondaryKey?: string;
		type?: 'text' | 'number' | 'datetime' | 'stacked' | 'badge' | 'buttons' | 'select' | 'custom';
		href?: string | ((row: unknown) => string | undefined);
		suffix?: string;
		align?: 'left' | 'center' | 'right';
		sortable?: boolean;
		sortOrder?: string[];
		badges?: Record<string, { label?: string; dotClass?: string; badgeClass?: string }>;
		filter?: { type: 'checkbox'; options: { value: string; label?: string }[] };
		width?: string;
		cellClass?: string;
		buttons?: {
			label: string;
			variant?: 'primary' | 'ghost';
			onClick?: (row: unknown) => void;
			class?: string;
		}[];
		select?: {
			options: SelectOption[] | ((row: unknown) => SelectOption[]);
			placeholder?: string;
			onChange?: (row: unknown, value: string | number | null) => void;
			disabled?: boolean | ((row: unknown) => boolean);
			size?: 'sm' | 'md' | 'lg';
		};
	};

	interface Device {
		dev_eui: string;
		name: string;
		type: string;
	}

	interface Seat {
		id: string;
		profile_id: string;
		stripe_subscription_id: string;
		stripe_subscription_item_id: string;
		seat_number: number;
		dev_eui: string | null;
		status: string;
		created_at: string;
		updated_at: string;
	}

	interface Subscription {
		id: string;
		status: string;
		current_period_end: number;
		items: { data: { quantity: number }[] };
	}

	interface PaymentHistoryItem {
		id: string;
		number: string | null;
		amount: number;
		currency: string;
		status: string | null;
		created: number;
		hostedUrl: string | null;
		pdfUrl: string | null;
	}

	interface PageData {
		devices: Device[];
		seats: Seat[];
		subscriptions: Subscription[];
		paymentHistory: PaymentHistoryItem[];
		stripeCustomerId: string | null;
		user: { email: string };
	}

	let { data, form } = $props<{
		data: PageData;
		form: { success?: boolean; message?: string; error?: string } | null;
	}>();

	// State for purchasing seats
	let seatQuantity = $state(1);
	let isSubmitting = $state(false);
	let addSeatsQuantity = $state(1);

	// Check for success/cancel query params
	const isSuccess = $derived(page.url.searchParams.get('success') === 'true');
	const isCancelled = $derived(page.url.searchParams.get('cancelled') === 'true');
	const sessionId = $derived(page.url.searchParams.get('session_id'));

	// Process successful checkout automatically
	let hasProcessed = $state(false);

	// Build device options for the select dropdown
	const deviceOptions = $derived<SelectOption[]>([
		{ value: '', label: 'Empty Seat' },
		...data.devices
			.filter(
				(d: Device) => !data.seats.some((s: Seat) => s.dev_eui === d.dev_eui && s.dev_eui !== null)
			)
			.map((d: Device) => ({
				value: d.dev_eui,
				label: `${d.name} (${d.type})`
			}))
	]);

	// Get device options for a specific seat (includes currently assigned device)
	function getDeviceOptionsForSeat(currentDevEui: string | null): SelectOption[] {
		const options: SelectOption[] = [{ value: '', label: 'Empty Seat' }];

		for (const device of data.devices) {
			const isAssignedElsewhere = data.seats.some(
				(s: Seat) => s.dev_eui === device.dev_eui && device.dev_eui !== currentDevEui
			);

			if (!isAssignedElsewhere || device.dev_eui === currentDevEui) {
				options.push({
					value: device.dev_eui,
					label: `${device.name} (${device.type})`
				});
			}
		}

		return options;
	}

	// Table columns for seats
	const seatColumns: ColumnConfig[] = [
		{ key: 'seat_number', label: 'Seat #', sortable: true, align: 'center' },
		{
			key: 'dev_eui',
			label: 'Assigned Device',
			type: 'select',
			select: {
				options: (row: unknown) => {
					const seat = row as Seat;
					return getDeviceOptionsForSeat(seat.dev_eui);
				},
				placeholder: 'Empty Seat',
				size: 'sm',
				onChange: async (row: unknown, value: string | number | null) => {
					const seat = row as Seat;
					const formData = new FormData();
					formData.append('seat_id', seat.id);
					formData.append('dev_eui', String(value ?? ''));

					await fetch('?/assignDevice', {
						method: 'POST',
						body: formData
					});

					// Refresh the page to get updated data
					window.location.reload();
				}
			}
		},
		{
			key: 'status',
			label: 'Status',
			type: 'badge',
			badges: {
				active: {
					label: 'Active',
					dotClass: 'bg-green-500',
					badgeClass: 'bg-green-500/20 text-green-300'
				},
				cancelled: {
					label: 'Cancelled',
					dotClass: 'bg-red-500',
					badgeClass: 'bg-red-500/20 text-red-300'
				},
				pending: {
					label: 'Pending',
					dotClass: 'bg-yellow-500',
					badgeClass: 'bg-yellow-500/20 text-yellow-300'
				}
			}
		},
		{ key: 'created_at', label: 'Created', type: 'datetime' }
	];

	// Table columns for payment history
	const paymentColumns: ColumnConfig[] = [
		{ key: 'number', label: 'Invoice #' },
		{
			key: 'amount',
			label: 'Amount',
			type: 'number',
			suffix: '',
			align: 'right'
		},
		{
			key: 'status',
			label: 'Status',
			type: 'badge',
			badges: {
				paid: {
					label: 'Paid',
					dotClass: 'bg-green-500',
					badgeClass: 'bg-green-500/20 text-green-300'
				},
				open: {
					label: 'Open',
					dotClass: 'bg-yellow-500',
					badgeClass: 'bg-yellow-500/20 text-yellow-300'
				},
				void: {
					label: 'Void',
					dotClass: 'bg-slate-500',
					badgeClass: 'bg-slate-500/20 text-slate-300'
				},
				draft: {
					label: 'Draft',
					dotClass: 'bg-blue-500',
					badgeClass: 'bg-blue-500/20 text-blue-300'
				},
				uncollectible: {
					label: 'Uncollectible',
					dotClass: 'bg-red-500',
					badgeClass: 'bg-red-500/20 text-red-300'
				}
			}
		},
		{ key: 'created', label: 'Date', type: 'datetime' },
		{
			key: 'hostedUrl',
			label: 'Actions',
			type: 'buttons',
			buttons: [
				{
					label: 'View',
					variant: 'ghost',
					onClick: (row: unknown) => {
						const invoice = row as { hostedUrl: string | null };
						if (invoice.hostedUrl) {
							window.open(invoice.hostedUrl, '_blank');
						}
					}
				}
			]
		}
	];

	// Format currency
	function formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(amount / 100);
	}

	// Format payment history with proper currency display
	const formattedPaymentHistory = $derived(
		data.paymentHistory.map((inv: PaymentHistoryItem) => ({
			...inv,
			amount: formatCurrency(inv.amount, inv.currency),
			created: new Date(inv.created * 1000).toISOString()
		}))
	);

	// Get active subscription
	const activeSubscription = $derived(
		data.subscriptions.find((s: Subscription) => s.status === 'active' || s.status === 'trialing')
	);

	// Total seats and used seats
	const totalSeats = $derived(data.seats.filter((s: Seat) => s.status === 'active').length);
	const usedSeats = $derived(
		data.seats.filter((s: Seat) => s.status === 'active' && s.dev_eui !== null).length
	);

	// Format date for subscription period
	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Payments & Subscriptions - CropWatch</title>
</svelte:head>

<div class="flex min-h-screen flex-col gap-6 bg-slate-950 p-6 text-slate-100">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<CWBackButton fallback="/account" />
			<div>
				<h1 class="text-2xl font-semibold text-white">Payments & Subscriptions</h1>
				<p class="text-sm text-slate-400">Manage your device seats and billing information</p>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if isSuccess && !hasProcessed}
		<div transition:slide class="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-green-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				<div>
					<p class="font-medium text-green-300">Payment Successful!</p>
					<p class="text-sm text-green-400">Your device seats are being created...</p>
				</div>
			</div>
			{#if sessionId}
				<form
					method="POST"
					action="?/processCheckoutSuccess"
					use:enhance={() => {
						hasProcessed = true;
						return async ({ update }) => {
							await update();
							goto(window.location.pathname);
						};
					}}
				>
					<input type="hidden" name="session_id" value={sessionId} />
					<CWButton type="submit" variant="primary" class="mt-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
						Activate Seats
					</CWButton>
				</form>
			{/if}
		</div>
	{/if}

	{#if isCancelled}
		<div transition:slide class="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-yellow-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<p class="text-yellow-300">Checkout was cancelled. No charges were made.</p>
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div transition:slide class="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-green-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				<p class="text-sm text-green-300">{form.message}</p>
			</div>
		</div>
	{/if}

	{#if form?.error}
		<div transition:slide class="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="text-sm text-red-300">{form.error}</p>
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left Column - Main Content -->
		<div class="flex flex-col gap-6 lg:col-span-2">
			<!-- Purchase/Add Seats Section -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-white">
							{#if activeSubscription}
								Add More Seats
							{:else}
								Purchase Device Seats
							{/if}
						</h2>
						<p class="text-sm text-slate-400">
							Each seat costs <span class="font-medium text-sky-400">$9.99/month</span> and allows you
							to monitor one device
						</p>
					</div>
				</div>

				<div class="mt-6">
					{#if activeSubscription}
						<!-- Add seats to existing subscription -->
						<form
							method="POST"
							action="?/addSeats"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									isSubmitting = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="subscription_id" value={activeSubscription.id} />
							<div class="flex flex-wrap items-end gap-4">
								<div>
									<label
										for="additional_seats"
										class="mb-1.5 block text-sm font-medium text-slate-300"
									>
										Additional Seats
									</label>
									<input
										type="number"
										id="additional_seats"
										name="additional_seats"
										min="1"
										max="100"
										bind:value={addSeatsQuantity}
										class="w-32 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
									/>
								</div>
								<div class="flex-1">
									<p class="text-sm text-slate-400">
										Additional cost: <span class="font-semibold text-white"
											>${(addSeatsQuantity * 9.99).toFixed(2)}/month</span
										>
									</p>
								</div>
								<CWButton variant="primary" type="submit" loading={isSubmitting}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										/>
									</svg>
									Add {addSeatsQuantity} Seat{addSeatsQuantity > 1 ? 's' : ''}
								</CWButton>
							</div>
						</form>
					{:else}
						<!-- Create new subscription -->
						<form
							method="POST"
							action="?/createCheckout"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									isSubmitting = false;
									await update();
								};
							}}
						>
							<div class="flex flex-wrap items-end gap-4">
								<div>
									<label for="quantity" class="mb-1.5 block text-sm font-medium text-slate-300">
										Number of Seats
									</label>
									<input
										type="number"
										id="quantity"
										name="quantity"
										min="1"
										max="100"
										bind:value={seatQuantity}
										class="w-32 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
									/>
								</div>
								<div class="flex-1">
									<p class="text-sm text-slate-400">
										Total: <span class="font-semibold text-white"
											>${(seatQuantity * 9.99).toFixed(2)}/month</span
										>
									</p>
								</div>
								<CWButton variant="primary" type="submit" loading={isSubmitting}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
										/>
									</svg>
									{#if isSubmitting}
										Redirecting...
									{:else}
										Purchase {seatQuantity} Seat{seatQuantity > 1 ? 's' : ''}
									{/if}
								</CWButton>
							</div>
						</form>
					{/if}
				</div>
			</section>

			<!-- Device Seats Table -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Device Seats</h2>
				<p class="mt-1 text-sm text-slate-400">Assign devices to your purchased seats</p>

				{#if data.seats.length > 0}
					<div class="mt-6 -mx-6 -mb-6">
						<svelte:boundary>
							<CWTable items={data.seats} columns={seatColumns} pageSize={10} class="text-sm" />
							{#snippet failed(error, reset)}
								<div class="flex flex-col items-center justify-center py-12 text-center">
									<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
									</div>
									<p class="text-rose-300 font-medium">Failed to load device seats</p>
									<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
									<button onclick={reset} class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
										Try again
									</button>
								</div>
							{/snippet}
						</svelte:boundary>
					</div>
				{:else}
					<div class="mt-6 rounded-xl border border-slate-800 bg-slate-800/30 py-12 text-center">
						<div
							class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-slate-400"
						>
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<p class="mt-4 font-medium text-slate-300">No device seats yet</p>
						<p class="mt-1 text-sm text-slate-400">
							Purchase seats above to start monitoring your devices
						</p>
					</div>
				{/if}
			</section>

			<!-- Payment History Table -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<div class="flex flex-row">
					<span>
						<h2 class="text-lg font-semibold text-white">Payment History</h2>
						<p class="mt-1 text-sm text-slate-400">View your past invoices and payments</p>
					</span>
                    <span class="flex-1"></span>
					<span>
						<CWButton
							variant="secondary"
							class="float-right mt-0.5 text-sm text-slate-400 hover:text-slate-200"
							on:click={() => window.open('https://billing.cropwatch.io', '_blank')}
						>
                            <img src={RECEIPT_ICON} alt="Download Icon" class="inline h-4 w-4 mr-2" />
							Download Receipts
						</CWButton>
					</span>
				</div>

				{#if data.paymentHistory.length > 0}
					<div class="mt-6 -mx-6 -mb-6">
						<svelte:boundary>
							<CWTable
								items={formattedPaymentHistory}
								columns={paymentColumns}
								pageSize={10}
								class="text-sm"
							/>
							{#snippet failed(error, reset)}
								<div class="flex flex-col items-center justify-center py-12 text-center">
									<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
									</div>
									<p class="text-rose-300 font-medium">Failed to load payment history</p>
									<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
									<button onclick={reset} class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
										Try again
									</button>
								</div>
							{/snippet}
						</svelte:boundary>
					</div>
				{:else}
					<div class="mt-6 rounded-xl border border-slate-800 bg-slate-800/30 py-12 text-center">
						<div
							class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-slate-400"
						>
							<svg
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								/>
							</svg>
						</div>
						<p class="mt-4 font-medium text-slate-300">No payment history</p>
						<p class="mt-1 text-sm text-slate-400">
							Your invoices will appear here after your first purchase
						</p>
					</div>
				{/if}
			</section>
		</div>

		<!-- Right Column - Stats & Subscription Info -->
		<div class="flex flex-col gap-6">
			<!-- Subscription Overview -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Subscription Overview</h2>

				<div class="mt-6 space-y-4">
					<!-- Total Seats -->
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Total Seats</span>
						<span class="text-2xl font-bold text-white">{totalSeats}</span>
					</div>

					<!-- Assigned Devices -->
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Assigned Devices</span>
						<span class="text-2xl font-bold text-green-400">{usedSeats}</span>
					</div>

					<!-- Available Seats -->
					<div class="flex items-center justify-between border-b border-slate-800 pb-3">
						<span class="text-sm text-slate-400">Available Seats</span>
						<span class="text-2xl font-bold text-sky-400">{totalSeats - usedSeats}</span>
					</div>

					<!-- Subscription Status -->
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-400">Status</span>
						{#if activeSubscription}
							<span
								class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30"
							>
								Active
							</span>
						{:else}
							<span
								class="rounded-full bg-slate-500/20 px-2.5 py-1 text-xs font-medium text-slate-400 ring-1 ring-slate-500/30"
							>
								No Subscription
							</span>
						{/if}
					</div>
				</div>

				{#if activeSubscription}
					<div class="mt-6 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400"
							>
								<svg
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<div>
								<p class="text-sm font-medium text-white">Next Billing Date</p>
								<p class="text-sm text-slate-400">
									{formatDate(activeSubscription.current_period_end)}
								</p>
							</div>
						</div>
					</div>
				{/if}
			</section>

			<!-- Monthly Cost Estimate -->
			{#if totalSeats > 0 || activeSubscription}
				<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
					<h2 class="text-lg font-semibold text-white">Monthly Cost</h2>

					<div class="mt-6 space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm text-slate-400"
								>{totalSeats} seat{totalSeats !== 1 ? 's' : ''} × $9.99</span
							>
							<span class="font-medium text-white">${(totalSeats * 9.99).toFixed(2)}</span>
						</div>
						<div class="border-t border-slate-800 pt-3">
							<div class="flex items-center justify-between">
								<span class="font-medium text-white">Total per month</span>
								<span class="text-xl font-bold text-sky-400">${(totalSeats * 9.99).toFixed(2)}</span
								>
							</div>
						</div>
					</div>
				</section>
			{/if}

			<!-- Quick Actions -->
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="text-lg font-semibold text-white">Quick Actions</h2>
				<p class="mt-1 text-sm text-slate-400">Manage your subscription</p>

				<div class="mt-6 space-y-3">
					<a
						href="/locations"
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-sky-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-sky-500/20 p-3 text-sky-400">
							<svg
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-sky-400">View Devices</p>
							<p class="mt-1 text-sm text-slate-400">Manage your locations and devices</p>
						</div>
					</a>

					<a
						href="/account"
						class="group flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-all hover:border-purple-500/50 hover:bg-slate-900/60"
					>
						<div class="rounded-lg bg-purple-500/20 p-3 text-purple-400">
							<svg
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-white group-hover:text-purple-400">Account Settings</p>
							<p class="mt-1 text-sm text-slate-400">Update your profile and preferences</p>
						</div>
					</a>
				</div>
			</section>
		</div>
	</div>
</div>
