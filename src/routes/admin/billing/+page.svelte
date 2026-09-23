<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { AdminBillingCustomer } from '$lib/api/api.dtos';
	import { AppNotice, AppPage } from '$lib/components/layout';
	import { cwDataTableLabels, cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { m } from '$lib/paraglide/messages.js';
	import { sortByColumn } from '$lib/utils/sortByColumn';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDataTable,
		CwInput,
		useCwToast,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult,
		CW_EMPTY_VALUE
	} from '@cropwatchdevelopment/cwui';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageProps } from './$types';

	type CustomerRow = AdminBillingCustomer & {
		customerLabel: string;
		seatsLabel: string;
		modeLabel: string;
		deviceSubLabel: string;
		reportingLabel: string;
	};

	let { data }: PageProps = $props();
	const toast = useCwToast();

	let busyUserId = $state<string | null>(null);
	// Per-row seat inputs, keyed by user id, seeded from the current manual count.
	let seatInputs = $state<Record<string, string>>({});

	const columns: CwColumnDef<CustomerRow>[] = [
		{ key: 'customerLabel', header: m.admin_billing_col_customer(), sortable: true },
		{ key: 'deviceCount', header: m.admin_billing_col_devices(), sortable: true, align: 'right' },
		{
			key: 'licensedDeviceCount',
			header: m.admin_billing_col_licensed(),
			sortable: true,
			align: 'right'
		},
		{ key: 'seatsLabel', header: m.admin_billing_col_seats(), align: 'right' },
		{ key: 'modeLabel', header: m.admin_billing_col_mode(), sortable: true },
		{ key: 'deviceSubLabel', header: m.admin_billing_col_device_subscription(), hideBelow: 'lg' },
		{ key: 'reportingLabel', header: m.admin_billing_col_reporting(), sortable: true }
	];

	function toRow(customer: AdminBillingCustomer): CustomerRow {
		const modeLabel =
			customer.billingMode === 'manual'
				? m.admin_billing_mode_manual()
				: m.admin_billing_mode_stripe();
		return {
			...customer,
			customerLabel: customer.email ?? customer.fullName ?? customer.userId,
			seatsLabel:
				customer.manualSeatCount > 0
					? `${customer.seatCount} (${customer.manualSeatCount})`
					: String(customer.seatCount),
			modeLabel,
			deviceSubLabel: customer.deviceSubscriptionId
				? `${customer.deviceSubscriptionId.slice(0, 12)}… · ${customer.deviceSeats}`
				: CW_EMPTY_VALUE,
			reportingLabel: customer.reportingManual
				? m.admin_billing_mode_manual()
				: (customer.reportingStatus ?? CW_EMPTY_VALUE)
		};
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<CustomerRow>> {
		const search = query.search?.trim().toLowerCase() ?? '';
		let rows = data.customers.map(toRow);
		if (search) {
			rows = rows.filter(
				(row) =>
					row.customerLabel.toLowerCase().includes(search) ||
					(row.fullName ?? '').toLowerCase().includes(search) ||
					row.userId.toLowerCase().includes(search)
			);
		}
		if (query.sort) {
			rows = sortByColumn(rows, query.sort.column, query.sort.direction, {
				numericColumns: ['deviceCount', 'licensedDeviceCount']
			});
		}
		const total = rows.length;
		const skip = (query.page - 1) * query.pageSize;
		return { rows: rows.slice(skip, skip + query.pageSize), total };
	}

	// Shared submit handler for every per-row action form.
	const handleRowSubmit: SubmitFunction = ({ formData }) => {
		busyUserId = String(formData.get('userId') ?? '');
		return async ({ result, update }) => {
			busyUserId = null;
			if (result.type === 'success') {
				toast.add({ tone: 'success', message: m.admin_billing_updated_toast() });
				await update({ reset: false });
				return;
			}
			await applyAction(result);
			if (result.type === 'failure' && typeof result.data?.error === 'string') {
				toast.add({ tone: 'danger', message: result.data.error });
			}
		};
	};
</script>

<svelte:head>
	<title>{m.admin_billing_title()} - CropWatch</title>
</svelte:head>

<AppPage width="xl">
	<CwButton
		id="admin-billing-back-button"
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

	<CwCard title={m.admin_billing_title()} subtitle={m.admin_billing_subtitle()} elevated>
		{#key data.customers}
			<CwDataTable
				id="admin-billing-table"
				labels={cwDataTableLabels()}
				{columns}
				{loadData}
				rowActionsHeader={m.common_actions()}
				rowKey="userId"
				pageSize={25}
				pageSizeOptions={[25, 50, 100]}
			>
				{#snippet cell(row: CustomerRow, col: CwColumnDef<CustomerRow>, defaultValue: string)}
					{#if col.key === 'modeLabel'}
						<CwChip
							label={row.modeLabel}
							tone={row.billingMode === 'manual' ? 'info' : 'secondary'}
							variant="soft"
							size="sm"
						/>
					{:else if col.key === 'reportingLabel'}
						<CwChip
							label={row.reportingLabel}
							tone={row.reportingManual || row.reportingStatus === 'active'
								? 'success'
								: 'secondary'}
							variant="soft"
							size="sm"
						/>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet rowActions(row: CustomerRow)}
					{@const busy = busyUserId === row.userId}
					{@const nextMode = row.billingMode === 'manual' ? 'stripe' : 'manual'}
					<div class="admin-billing__actions">
						<form method="POST" action="?/setBillingMode" use:enhance={handleRowSubmit}>
							<input type="hidden" name="userId" value={row.userId} />
							<input type="hidden" name="billingMode" value={nextMode} />
							<CwButton
								id={`admin-billing-${row.userId}-mode-button`}
								type="submit"
								variant="secondary"
								size="sm"
								loading={busy}
								disabled={busyUserId !== null}
							>
								{nextMode === 'manual'
									? m.admin_billing_set_mode_manual()
									: m.admin_billing_set_mode_stripe()}
							</CwButton>
						</form>

						{#if row.billingMode === 'manual'}
							<form
								method="POST"
								action="?/setManualSeats"
								class="admin-billing__seats"
								use:enhance={handleRowSubmit}
							>
								<input type="hidden" name="userId" value={row.userId} />
								<CwInput
									labels={cwInputLabels()}
									id={`admin-billing-${row.userId}-seats-input`}
									type="numeric"
									name="seats"
									min={0}
									bind:value={
										() => seatInputs[row.userId] ?? String(row.manualSeatCount),
										(v) => (seatInputs[row.userId] = v)
									}
								/>
								<CwButton
									id={`admin-billing-${row.userId}-seats-button`}
									type="submit"
									variant="secondary"
									size="sm"
									loading={busy}
									disabled={busyUserId !== null}
								>
									{m.admin_billing_set_seats()}
								</CwButton>
							</form>
						{/if}

						<form method="POST" action="?/setReporting" use:enhance={handleRowSubmit}>
							<input type="hidden" name="userId" value={row.userId} />
							<input type="hidden" name="manual" value={row.reportingManual ? 'false' : 'true'} />
							<CwButton
								id={`admin-billing-${row.userId}-reporting-button`}
								type="submit"
								variant={row.reportingManual ? 'ghost' : 'secondary'}
								size="sm"
								loading={busy}
								disabled={busyUserId !== null}
							>
								{row.reportingManual
									? m.admin_billing_revoke_reporting()
									: m.admin_billing_grant_reporting()}
							</CwButton>
						</form>
					</div>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</AppPage>

<style>
	.admin-billing__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: flex-end;
		gap: var(--cw-space-2);
	}

	.admin-billing__seats {
		display: flex;
		align-items: flex-end;
		gap: var(--cw-space-2);
	}

	.admin-billing__seats :global(.cw-input) {
		width: 5rem;
	}
</style>
