<script lang="ts">
	import { success, error as errorToast } from '$lib/stores/toast.svelte';
	import { AlertDialog } from 'bits-ui';
	import { Icon } from 'svelte-ux';
	import {
		mdiFileDocument,
		mdiMagnify,
		mdiAlert,
		mdiCalendarClock,
		mdiDelete,
		mdiPencil,
		mdiEye,
		mdiPlus
	} from '@mdi/js';

	let { data } = $props();
	let reports = $state(data.reports as any[]);
	let searchTerm = $state('');

	// Filter reports based on search term
	function filterReports(reports: any[]) {
		if (!searchTerm.trim()) return reports;

		return reports.filter((report: any) => {
			const name = (report.name || '').toLowerCase();
			const search = searchTerm.toLowerCase();
			return name.includes(search);
		});
	}

	async function deleteReport(id: number) {
		const formData = new FormData();
		formData.append('id', String(id));
		const res = await fetch('?/delete', { method: 'POST', body: formData });
		const result = await res.json();
		if (result.success) {
			reports = reports.filter((r) => r.id !== id);
			success('Report deleted');
		} else {
			errorToast(result.error || 'Failed to delete');
		}
	}

	function formatDate(dateString: string) {
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return 'N/A';
		}
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Reports</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				Manage and view all your configured reports
			</p>
		</div>
		<div class="flex items-center gap-4">
			<div class="search-container">
				<div class="relative">
					<Icon
						class="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
						path={mdiMagnify}
						size="20"
					/>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search reports..."
						class="search-input"
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="reports-grid">
		{#if filterReports(reports).length > 0}
			{@const filteredReports = filterReports(reports)}
			{#each filteredReports as report (report.id)}
				<div class="report-card">
					<div class="report-header">
						<div class="report-icon">
							<Icon class="text-xl text-blue-400" path={mdiFileDocument} />
						</div>
						<h2 class="report-title" title={report.name}>
							{report.name}
						</h2>
						<div class="report-actions">
							<button
								class="action-btn view-btn"
								onclick={() => (window.location.href = `/app/all-reports/${report.id}`)}
								aria-label="View report"
								title="View report"
							>
								<Icon path={mdiEye} size="16" />
							</button>
							<button
								class="action-btn edit-btn"
								onclick={() => (window.location.href = `/app/all-reports/${report.id}/edit`)}
								aria-label="Edit report"
								title="Edit report"
							>
								<Icon path={mdiPencil} size="16" />
							</button>
							<AlertDialog.Root>
								<AlertDialog.Trigger
									class="action-btn delete-btn"
									aria-label="Delete report"
									title="Delete report"
								>
									<Icon path={mdiDelete} size="16" />
								</AlertDialog.Trigger>
								<AlertDialog.Portal>
									<AlertDialog.Overlay class="fixed inset-0 bg-black/50" />
									<AlertDialog.Content
										class="bg-background fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded p-4 shadow"
									>
										<AlertDialog.Title class="font-semibold"
											>Delete {report.name}?</AlertDialog.Title
										>
										<AlertDialog.Description class="text-sm"
											>This action cannot be undone.</AlertDialog.Description
										>
										<div class="mt-4 flex justify-end gap-2">
											<AlertDialog.Cancel class="rounded border px-3 py-1"
												>Cancel</AlertDialog.Cancel
											>
											<AlertDialog.Action
												onclick={() => deleteReport(report.id)}
												class="rounded bg-red-600 px-3 py-1 text-white">Delete</AlertDialog.Action
											>
										</div>
									</AlertDialog.Content>
								</AlertDialog.Portal>
							</AlertDialog.Root>
						</div>
					</div>
					<div class="report-content">
						<div class="report-info">
							<div class="report-info-item">
								<Icon class="text-sm text-gray-500 dark:text-gray-400" path={mdiCalendarClock} />
								<span class="report-info-text">Created: {formatDate(report.created_at)}</span>
							</div>
							{#if report.dev_eui}
								<div class="report-info-item">
									<Icon class="text-sm text-gray-500 dark:text-gray-400" path={mdiFileDocument} />
									<span class="report-info-text">Device: {report.dev_eui}</span>
								</div>
							{/if}
							{#if report.recipients}
								<div class="report-info-item">
									<Icon class="text-sm text-gray-500 dark:text-gray-400" path={mdiAlert} />
									<span class="report-info-text">Recipients: {report.recipients}</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{:else}
			<div class="no-reports">
				<Icon class="text-4xl text-gray-400" path={mdiAlert} />
				<p class="text-gray-500 dark:text-gray-300">
					{searchTerm ? 'No reports match your search.' : 'No reports found.'}
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.search-container {
		min-width: 300px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		border: 1px solid rgb(209 213 219);
		border-radius: 0.5rem;
		background-color: white;
		color: rgb(17 24 39);
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: rgb(59 130 246);
		box-shadow: 0 0 0 3px rgba(59 130 246, 0.1);
	}

	.search-input::placeholder {
		color: rgb(156 163 175);
	}

	:global(.dark) .search-input {
		background-color: rgb(31 41 55);
		border-color: rgb(55 65 81);
		color: white;
	}

	:global(.dark) .search-input:focus {
		border-color: rgb(147 197 253);
		box-shadow: 0 0 0 3px rgba(147 197 253, 0.1);
	}

	:global(.dark) .search-input::placeholder {
		color: rgb(107 114 128);
	}

	.create-report-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: rgb(34 197 94);
		color: white;
		border-radius: 0.5rem;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
	}

	.create-report-btn:hover {
		background-color: rgb(22 163 74);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(34 197 94, 0.3);
	}

	:global(.dark) .create-report-btn {
		background-color: rgb(34 197 94);
	}

	:global(.dark) .create-report-btn:hover {
		background-color: rgb(22 163 74);
	}

	.reports-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
		width: 100%;
	}

	.report-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 0.75rem;
		border: 1px solid rgb(209 213 219);
		background-color: rgb(229 231 235);
		background-color: rgba(156 163 175 / 0.4);
		color: rgb(17 24 39);
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		transition: all 0.2s ease;
		height: 100%;
	}

	.report-card:hover {
		transform: translateY(-2px);
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .report-card {
		border-color: rgb(55 65 81);
		background-color: #1f2532;
		background-color: rgba(31 41 55 / 0.8);
		color: white;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.2),
			0 4px 6px -2px rgba(0, 0, 0, 0.1);
	}

	.report-header {
		display: flex;
		align-items: center;
		min-height: 60px;
		max-height: 60px;
		height: 60px;
		background-color: rgb(15 118 110);
		color: rgb(253 224 71);
		padding: 0.75rem 0.5rem;
		position: relative;
	}

	:global(.dark) .report-header {
		background-color: #2c3546;
		color: rgb(253 224 71);
	}

	.report-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}

	:global(.dark) .report-icon {
		background-color: rgba(55 65 81, 1);
	}

	.report-title {
		flex: 1;
		margin-left: 1.25rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: rgb(217 119 6);
		padding-top: 0.25rem;

		/* Text truncation */
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	:global(.dark) .report-title {
		color: rgb(251 191 36);
	}

	.report-actions {
		display: flex;
		gap: 0.25rem;
		margin-left: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.view-btn {
		background-color: rgb(239 246 255);
		color: rgb(29 78 216);
		border: 1px solid rgb(191 219 254);
	}

	.view-btn:hover {
		background-color: rgb(219 234 254);
		transform: scale(1.05);
	}

	:global(.dark) .view-btn {
		background-color: rgb(30 64 175);
		color: rgb(191 219 254);
		border: 1px solid rgb(30 64 175);
	}

	:global(.dark) .view-btn:hover {
		background-color: rgb(29 78 216);
	}

	.edit-btn {
		background-color: rgb(254 249 195);
		color: rgb(146 64 14);
		border: 1px solid rgb(253 224 71);
	}

	.edit-btn:hover {
		background-color: rgb(253 224 71);
		transform: scale(1.05);
	}

	:global(.dark) .edit-btn {
		background-color: rgb(146 64 14);
		color: rgb(253 224 71);
		border: 1px solid rgb(146 64 14);
	}

	:global(.dark) .edit-btn:hover {
		background-color: rgb(180 83 9);
	}

	:global(.delete-btn) {
		background-color: rgb(254 242 242);
		color: rgb(185 28 28);
		border: 1px solid rgb(252 165 165);
	}

	:global(.delete-btn:hover) {
		background-color: rgb(252 165 165);
		transform: scale(1.05);
	}

	:global(.dark) :global(.delete-btn) {
		background-color: rgb(185 28 28);
		color: rgb(252 165 165);
		border: 1px solid rgb(185 28 28);
	}

	:global(.dark) :global(.delete-btn:hover) {
		background-color: rgb(220 38 38);
	}

	.report-content {
		padding: 0.5rem;
		flex: 1;
	}

	.report-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.report-info-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.report-info-text {
		font-size: 0.875rem;
		color: rgb(75 85 99);
	}

	:global(.dark) .report-info-text {
		color: rgb(156 163 175);
	}

	.no-reports {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		grid-column: 1 / -1;
		background-color: var(--color-card, rgb(255 255 255));
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		gap: 1rem;
	}

	:global(.dark) .no-reports {
		background-color: rgb(31 41 55);
	}

	@media (max-width: 768px) {
		.reports-grid {
			grid-template-columns: 1fr;
		}

		.search-container {
			min-width: 200px;
		}

		.create-report-btn span {
			display: none;
		}
	}
</style>
