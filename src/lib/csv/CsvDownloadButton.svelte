<script>
	import { _ } from 'svelte-i18n';
	import { Dialog } from 'bits-ui';
	import Button from '$lib/components/UI/buttons/Button.svelte';

	let { devEui } = $props();

	// Modal open state and date range setup
	let modalOpen = $state(false);
	// Initialize date states as ISO strings for native date inputs
	let startDate = $state(new Date().toISOString().split('T')[0]);
	let endDate = $state(new Date().toISOString().split('T')[0]);

	const startDownload = async () => {
		const url = `/api/devices/${devEui}/csv?start=${startDate.toString()}&end=${endDate.toString()}`;
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'text/csv'
			}
		});

		if (!response.ok) {
			console.error('Failed to download CSV');
			return;
		}

		const blob = await response.blob();
		const urlObj = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = urlObj;
		a.download = `${devEui}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(urlObj);
	};
</script>

<Dialog.Root bind:open={modalOpen}>
	<Dialog.Trigger asChild>
		<Button variant="secondary" loading={false}>{$_('download_csv')}</Button>
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
					<label for="start-date" class="mb-1 block text-sm font-medium">{$_('start_date')}</label>
					<input
						id="start-date"
						type="date"
						bind:value={startDate}
						class="w-full rounded border border-gray-300 px-2 py-1"
					/>
				</div>
				<div>
					<label for="end-date" class="mb-1 block text-sm font-medium">{$_('end_date')}</label>
					<input
						id="end-date"
						type="date"
						bind:value={endDate}
						class="w-full rounded border border-gray-300 px-2 py-1"
					/>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<Button variant="secondary" onclick={() => (modalOpen = false)}>{$_('cancel')}</Button>
				<Button
					variant="primary"
					onclick={() => {
						startDownload();
						modalOpen = false;
					}}>{$_('download_csv')}</Button
				>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
