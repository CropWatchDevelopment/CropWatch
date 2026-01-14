<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWTable from '$lib/components/CWTable.svelte';
	import NetworkTopology from '$lib/components/NetworkTopology.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const gatewayItems = $derived(
		(data.gateways ?? []).map((gateway) => {
			const names = (gateway.devices ?? []).map((d) => d.name || d.dev_eui).filter(Boolean);
			const summary =
				names.length === 0
					? 'No devices connected'
					: `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} more` : ''}`;

			return {
				...gateway,
				status_label: gateway.is_online ? 'Online' : 'Offline',
				device_summary: summary
			};
		})
	);

	const statusBadges = {
		Online: { dotClass: 'bg-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-200' },
		Offline: { dotClass: 'bg-rose-400', badgeClass: 'bg-rose-500/15 text-rose-200' }
	};

	const accessBadges = {
		owner: { badgeClass: 'bg-sky-500/15 text-sky-200', label: 'Owner' },
		public: { badgeClass: 'bg-slate-700/60 text-slate-200', label: 'Public' }
	};

	const gatewayColumns = [
		{
			key: 'gateway_name',
			label: 'Gateway',
			type: 'stacked',
			secondaryKey: 'gateway_id',
			sortable: true
		},
		{
			key: 'status_label',
			label: 'Status',
			type: 'badge',
			badges: statusBadges
		},
		{
			key: 'device_count',
			label: 'Devices',
			type: 'number',
			align: 'right',
			suffix: ' dev'
		},
		{
			key: 'device_summary',
			label: 'Connected Devices',
			value: 'device_summary'
		},
		{
			key: 'access_via',
			label: 'Access',
			type: 'badge',
			badges: accessBadges
		},
		{
			key: 'actions',
			label: 'Actions',
			type: 'buttons',
			align: 'right',
			buttons: [
				{
					label: 'Manage access',
					variant: 'ghost',
					onClick: (row: unknown) =>
						goto(resolve(`/gateways/${(row as { gateway_id: string }).gateway_id}/access`))
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Gateways - CropWatch Temp</title>
</svelte:head>

<div class="min-h-screen p-6">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="text-sm uppercase tracking-wide text-slate-400">Gateways</p>
			<CWBackButton fallback="/" label="Back to Dashboard" class="mb-2" />
			<div>
				<h1 class="text-2xl font-semibold text-slate-100">Your gateways & connected devices</h1>
			</div>
			<p class="text-sm text-slate-400">
				View gateways you can access and see the devices currently linked to each one.
			</p>
		</div>
		<!-- <div class="flex items-center gap-2">

		</div> -->
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
		<svelte:boundary>
			<CWTable
				items={gatewayItems}
				columns={gatewayColumns}
				storageKey="gateways-table"
				pageSize={10}
				class="text-sm"
			>
				{#snippet empty()}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8 text-slate-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						</div>
						<p class="text-slate-400">No gateways available</p>
						<p class="mt-1 text-sm text-slate-400">
							Add a gateway or request access from an admin to see it here.
						</p>
					</div>
				{/snippet}
			</CWTable>

			{#snippet failed(error, reset)}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-8 w-8 text-rose-400"
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
					</div>
					<p class="text-rose-300 font-medium">Failed to load gateway table</p>
					<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
					<button
						onclick={reset}
						class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
					>
						Try again
					</button>
				</div>
			{/snippet}
		</svelte:boundary>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 mt-4 shadow-lg">
		<h2 class="text-lg font-semibold text-slate-100 mb-4">Network Topology</h2>
		<svelte:boundary>
			<NetworkTopology gateways={data.gateways ?? []} height={500} />

			{#snippet failed(error, reset)}
				<div
					class="h-[500px] rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center"
				>
					<div class="text-center">
						<div class="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-rose-900/30">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8 text-rose-400"
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
						</div>
						<p class="text-rose-300 font-medium">Failed to render network topology</p>
						<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
						<button
							onclick={reset}
							class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
						>
							Try again
						</button>
					</div>
				</div>
			{/snippet}
		</svelte:boundary>
	</div>
</div>
