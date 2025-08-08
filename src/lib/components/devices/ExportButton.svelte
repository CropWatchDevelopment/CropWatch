<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import type { ReportAlertPoint } from '$lib/models/Report';
	import { neutral } from '$lib/stores/toast.svelte';
	import { Dialog } from 'bits-ui';
	import { _, locale as appLocale } from 'svelte-i18n';

	type ReportType = 'csv' | 'pdf';

	type Props = {
		devEui: string;
		buttonLabel?: string;
		disabled?: boolean;
		showDatePicker?: boolean;
		types?: ReportType[];
		startDateInputString?: string;
		endDateInputString?: string;
		alertPoints?: ReportAlertPoint[];
		dataKeys?: string[];
	};

	let {
		devEui,
		buttonLabel,
		disabled = false,
		showDatePicker = true,
		types = ['csv', 'pdf'],
		startDateInputString = undefined,
		endDateInputString = undefined,
		alertPoints = [],
		dataKeys = []
	}: Props = $props();

	// Modal open state and date range setup
	let modalOpen = $state(false);
	let startDate = $state('');
	let endDate = $state('');

	const today = new Date();
	const oneWeekAgo = new Date();

	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

	$effect(() => {
		// Initialize date states as ISO strings for native date inputs
		startDate = startDateInputString ?? oneWeekAgo.toISOString().split('T')[0];
		endDate = endDateInputString ?? today.toISOString().split('T')[0];
	});

	const startDownload = async (type: ReportType) => {
		neutral($_('exporting_data', { values: { type: type.toUpperCase() } }));

		const params = new URLSearchParams({
			start: startDate,
			end: endDate,
			alertPoints: JSON.stringify(alertPoints),
			dataKeys: dataKeys.join(','),
			locale: $appLocale ?? 'ja'
		});
		const response = await fetch(`/api/devices/${devEui}/${type}?${params}`, {
			method: 'GET',
			headers: {
				'Content-Type': type === 'csv' ? 'text/csv' : 'application/pdf'
			}
		});

		if (!response.ok) {
			console.error(`Failed to download ${type} for device ${devEui}:`, response.statusText);
			return;
		}

		const blob = await response.blob();
		const urlObj = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = urlObj;
		a.download = `${startDate.toString()} - ${endDate.toString()} ${devEui}.${type}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(urlObj);
	};
</script>

{#if showDatePicker}
	<div class="hidden md:flex md:items-center md:justify-end">
		<Dialog.Root bind:open={modalOpen}>
			<Dialog.Trigger asChild>
				<Button
					variant="secondary"
					{disabled}
					onclick={(event) => {
						if (!showDatePicker) {
							event.preventDefault;
							event.stopPropagation();
							startDownload(types[0]);
						}
					}}
				>
					<MaterialIcon name="download" />
					{buttonLabel ?? $_('export')}
				</Button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 bg-black/50" />
				<Dialog.Content
					class="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded bg-gray-50 p-6 text-zinc-900 shadow-lg dark:bg-zinc-800 dark:text-white"
				>
					<Dialog.Title class="text-lg font-semibold">{$_('select_date_range')}</Dialog.Title>
					<Dialog.Description class="mt-1 text-sm dark:text-gray-400"
						>{$_('select_start_end_dates')}</Dialog.Description
					>

					<div class="mt-4 space-y-4">
						<div>
							<label for="start-date" class="mb-1 block text-sm font-medium"
								>{$_('start_date')}</label
							>
							<input
								id="start-date"
								type="date"
								bind:value={startDate}
								class="relative w-full rounded border border-gray-300 px-2 py-1 pr-10"
							/>
						</div>
						<div>
							<label for="end-date" class="mb-1 block text-sm font-medium">{$_('end_date')}</label>
							<input
								id="end-date"
								type="date"
								bind:value={endDate}
								class="relative w-full rounded border border-gray-300 px-2 py-1 pr-10"
							/>
						</div>
					</div>

					<div class="mt-6 flex justify-end gap-2">
						<Button variant="secondary" onclick={() => (modalOpen = false)}>{$_('cancel')}</Button>
						{#each types as type}
							<Button
								variant="primary"
								onclick={() => {
									startDownload(type);
									modalOpen = false;
								}}
							>
								<MaterialIcon name="download" />
								{$_(type)}
							</Button>
						{/each}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	</div>
{:else}
	<Button
		variant="secondary"
		{disabled}
		onclick={() => {
			startDownload(types[0]);
		}}
	>
		<MaterialIcon name="download" />
		{buttonLabel ?? $_('export')}
	</Button>
{/if}
