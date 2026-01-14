<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWDialog from '$lib/components/CWDialog.svelte';

	type StorageItem = {
		name: string;
		fullPath: string;
		id?: string;
		updated_at?: string;
		created_at?: string;
		metadata?: { size?: number };
	};

	interface Props {
		open?: boolean;
		devEui: string | null;
		deviceLabel?: string;
		supabase: SupabaseClient;
	}

	let {
		open = $bindable(false),
		devEui,
		deviceLabel = 'Device',
		supabase
	}: Props = $props();

	const HISTORY_BUCKET = 'Reports';

	const formatBytes = (bytes?: number) => {
		if (!bytes || bytes <= 0) return '—';
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unit = units[0];
		for (let i = 1; i < units.length && size >= 1024; i += 1) {
			size /= 1024;
			unit = units[i];
		}
		return `${size.toFixed(size >= 10 || unit === 'B' ? 0 : 1)} ${unit}`;
	};

	const formatTimestamp = (value?: string) =>
		value ? new Date(value).toLocaleString() : '—';

	const getDisplayName = (name: string) => name.split('/').pop() ?? name;

	const fetchHistory = async (eui: string) => {
		const bucket = supabase.storage.from(HISTORY_BUCKET);
		const { data, error: listError } = await bucket.list(eui, {
			sortBy: { column: 'updated_at', order: 'desc' }
		});

		if (listError) {
			throw new Error(listError.message);
		}

		let entries = (data ?? []).map((item) => ({
			...item,
			fullPath: `${eui}/${item.name}`
		}));
		if (entries.length === 0) {
			const { data: rootData, error: rootError } = await bucket.list('', {
				search: eui,
				sortBy: { column: 'updated_at', order: 'desc' }
			});

			if (rootError) {
				throw new Error(rootError.message);
			}

			entries = (rootData ?? []).map((item) => ({
				...item,
				fullPath: item.name
			}));
		}

		return entries;
	};

	const historyPromise = $derived.by(() => {
		if (!open || !devEui) return null;
		return fetchHistory(devEui);
	});

	let downloading = $state<string | null>(null);

	const handleDownload = async (item: StorageItem) => {
		if (typeof window === 'undefined') return;
		downloading = item.fullPath;
		const { data, error } = await supabase.storage
			.from(HISTORY_BUCKET)
			.createSignedUrl(item.fullPath, 60);

		if (error || !data?.signedUrl) {
			console.error('Failed to create download URL', error);
			downloading = null;
			return;
		}

		const url = new URL(data.signedUrl);
		url.searchParams.set('download', getDisplayName(item.name));
		window.location.href = url.toString();
		downloading = null;
	};
</script>

<CWDialog bind:open title={`Report history for ${deviceLabel}`}>
	{#if !devEui}
		<p class="text-sm text-slate-400">Select a device to view report history.</p>
	{:else if historyPromise}
		{#await historyPromise}
			<p class="text-sm text-slate-400">Loading history...</p>
		{:then items}
			{#if items.length === 0}
				<p class="text-sm text-slate-400">No history entries found for this device.</p>
			{:else}
				<div class="max-h-[60vh] overflow-auto rounded-lg border border-slate-800">
					<table class="w-full text-sm">
						<thead class="bg-slate-900/60 text-slate-300">
							<tr>
								<th class="px-3 py-2 text-left font-medium">File</th>
								<th class="px-3 py-2 text-left font-medium">Updated</th>
								<th class="px-3 py-2 text-right font-medium">Size</th>
								<th class="px-3 py-2 text-right font-medium">Download</th>
							</tr>
						</thead>
						<tbody>
							{#each items as item (item.id ?? item.name)}
								<tr class="border-t border-slate-800 text-slate-200">
									<td class="px-3 py-2">{getDisplayName(item.name)}</td>
									<td class="px-3 py-2">{formatTimestamp(item.updated_at ?? item.created_at)}</td>
									<td class="px-3 py-2 text-right">{formatBytes(item.metadata?.size)}</td>
									<td class="px-3 py-2 text-right">
										<CWButton
											variant="primary"
											size="sm"
											disabled={downloading === item.fullPath}
											onclick={() => handleDownload(item)}
										>
											{downloading === item.fullPath ? 'Preparing...' : 'Download'}
										</CWButton>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:catch err}
			<p class="text-sm text-rose-300">
				{err instanceof Error ? err.message : 'Failed to load report history.'}
			</p>
		{/await}
	{/if}

	<div class="mt-4 flex justify-end">
		<CWButton variant="secondary" onclick={() => (open = false)}>Close</CWButton>
	</div>
</CWDialog>
