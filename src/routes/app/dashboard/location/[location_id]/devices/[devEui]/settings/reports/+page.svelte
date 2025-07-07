<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import type { Report } from '$lib/models/Report';
	import type { ActionResult } from '@sveltejs/kit';
	import { success } from '$lib/stores/toast.svelte.js';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';

	// Get data from the page server load function
	let { data, form } = $props();

	// Extract data properties
	const devEui = $derived(data.devEui);
	const reports = $derived(data.reports);
	const reportCount = $derived(data.reportCount);

	// Modal state
	let showCreateModal = $state(false);
	let showDeleteModal = $state(false);
	let reportToDelete: Report | null = $state(null);
	let createReportName = $state('');

	// Form state
	let isSubmitting = $state(false);

	// Format date for display
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Handle form submission
	function handleCreateSubmit() {
		isSubmitting = true;
		return async ({ result }: { result: ActionResult }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				showCreateModal = false;
				createReportName = '';
				// Force page data to refresh to update the reports list
				await invalidateAll();
			}
		};
	}

	function handleDeleteSubmit() {
		isSubmitting = true;
		return async ({ result }: { result: ActionResult }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				showDeleteModal = false;
				reportToDelete = null;
				success('Report deleted successfully');
				// Force page data to refresh to update the reports list
				await invalidateAll();
			} else {
				// Handle error case
				console.error('Error deleting report');
			}
		};
	}

	function openDeleteModal(report: Report) {
		reportToDelete = report;
		showDeleteModal = true;
	}
</script>

<section class="flex flex-col gap-6">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h1 class="mb-1 text-2xl font-semibold">
				{$_('Reports')}
				{reportCount > 0 ? `(${reportCount})` : ''}
			</h1>
			<p class="text-sm text-neutral-100">
				Customizable reports to analyze your device data over time. Create and manage reports to
				track trends, monitor performance, and gain insights into your device's behavior.
			</p>
		</div>

		<div class="mt-4 md:mt-0">
			<Button
				href="/app/dashboard/location/{$page.params
					.location_id}/devices/{devEui}/settings/reports/create"
			>
				<svg
					class="mr-2 h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
					></path>
				</svg>
				{$_('Add Report')}
			</Button>
		</div>
	</header>

	<!-- Reports List -->
	<div class="space-y-4">
		{#if reports && reports.length > 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
			>
				<div class="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
					<h2 class="text-lg font-medium">Device Reports</h2>
					<p class="text-sm text-neutral-600 dark:text-neutral-400">
						Reports configured for device: {devEui}
					</p>
				</div>

				<div class="divide-y divide-neutral-200 dark:divide-neutral-700">
					{#each reports as report}
						<div class="p-4 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h3 class="font-medium text-neutral-900 dark:text-white">
										{report.name}
									</h3>
									<p class="mt-1 text-sm text-neutral-600 dark:text-gray-100">
										Report ID: {report.report_id}
									</p>
									<p class="mt-1 text-xs text-neutral-500 dark:text-gray-300">
										Created: {formatDate(report.created_at)}
									</p>

									<!-- Alert Points Summary -->
									{#if report.alert_points && report.alert_points.length > 0}
										<div class="mt-2">
											<span class="text-xs text-blue-600 dark:text-blue-400">
												{report.alert_points.length} alert point{report.alert_points.length !== 1
													? 's'
													: ''}
											</span>
										</div>
									{/if}

									<!-- Recipients Summary -->
									{#if report.recipients && report.recipients.length > 0}
										<div class="mt-1">
											<span class="text-xs text-green-600 dark:text-green-400">
												{report.recipients.length} recipient{report.recipients.length !== 1
													? 's'
													: ''}
											</span>
										</div>
									{/if}

									<!-- Schedule Summary -->
									{#if report.schedules && report.schedules.length > 0}
										<div class="mt-1">
											<span class="text-xs text-purple-600 dark:text-purple-400">
												{report.schedules.length} schedule{report.schedules.length !== 1 ? 's' : ''}
											</span>
										</div>
									{/if}
								</div>

								<div class="ml-4 flex items-center space-x-2">
									<Button type="button" onclick={() => {}} variant="primary" size="sm">
										<MaterialIcon name="edit" />
										Generate Report
									</Button>
									<Button
										type="button"
										onclick={() =>
											goto(
												`/app/dashboard/location/${$page.params.location_id}/devices/${devEui}/settings/reports/create?reportId=${report.report_id}`
											)}
										variant="info"
										size="sm"
									>
										<MaterialIcon name="edit" />
										Edit
									</Button>
									<Button
										type="button"
										onclick={() => openDeleteModal(report)}
										variant="danger"
										size="sm"
									>
										<MaterialIcon name="delete_forever" />
										Remove
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="py-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-neutral-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					></path>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
					No reports found
				</h3>
				<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
					No reports have been created for this device yet.
				</p>
				<div class="mt-6">
					<Button
						href="/app/dashboard/location/{$page.params
							.location_id}/devices/{devEui}/settings/reports/create"
						variant="primary"
					>
						<svg
							class="mr-2 h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							></path>
						</svg>
						Create your first report
					</Button>
				</div>
			</div>
		{/if}
	</div>
</section>

<!-- Create Report Modal -->
<Dialog bind:open={showCreateModal} size="md">
	{#snippet title()}
		Create New Report
	{/snippet}

	{#snippet body()}
		<div class="space-y-4">
			<div>
				<label for="name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Report Name
				</label>
				<TextInput
					type="text"
					name="name"
					placeholder="Enter report name"
					bind:value={createReportName}
					required
					class="w-full"
				/>
			</div>

			<div class="text-sm text-gray-600 dark:text-gray-400">
				<p>This will create a new report for device: <strong>{devEui}</strong></p>
			</div>

			{#if form?.error}
				<div class="text-sm text-red-600">
					{form.error}
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showCreateModal = false)}>Cancel</Button>
		<form method="POST" action="?/createReport" use:enhance={handleCreateSubmit} class="inline">
			<input type="hidden" name="name" bind:value={createReportName} />
			<Button type="submit" variant="primary" disabled={isSubmitting || !createReportName.trim()}>
				{#if isSubmitting}
					Creating...
				{:else}
					Create Report
				{/if}
			</Button>
		</form>
	{/snippet}
</Dialog>

<!-- Delete Report Modal -->
<Dialog bind:open={showDeleteModal} size="sm">
	{#snippet title()}
		Delete Report
	{/snippet}

	{#snippet body()}
		<div class="space-y-4">
			<p class="text-gray-700 dark:text-gray-300">
				Are you sure you want to delete the report "<strong>{reportToDelete?.name}</strong>"?
			</p>

			<p class="text-sm text-gray-600 dark:text-gray-400">
				This action cannot be undone. All alert points, recipients, and schedules associated with
				this report will also be deleted.
			</p>

			{#if form?.error}
				<div class="text-sm text-red-600">
					{form.error}
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showDeleteModal = false)}>Cancel</Button>
		<form method="POST" action="?/deleteReport" use:enhance={handleDeleteSubmit} class="inline">
			<input type="hidden" name="reportId" value={reportToDelete?.report_id} />
			<Button type="submit" variant="danger" disabled={isSubmitting}>
				{#if isSubmitting}
					Deleting...
				{:else}
					Delete Report
				{/if}
			</Button>
		</form>
	{/snippet}
</Dialog>
