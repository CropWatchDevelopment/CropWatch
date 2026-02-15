<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWSelect from '$lib/components/CWSelect.svelte';
	import { getToastContext } from '$lib/components/toast';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const toast = getToastContext();
	const reportsListPath = $derived(resolve('/reports'));

	let name = $state((form?.name as string | undefined) ?? data.report.name);
	let devEui = $state((form?.dev_eui as string | undefined) ?? data.report.dev_eui);
	let isSubmitting = $state(false);

	let recipientName = $state('');
	let recipientEmail = $state('');
	let recipientMethod = $state<string | number>('');
	let isAddingRecipient = $state(false);

	let alertName = $state('');
	let alertMetric = $state('');
	let alertOperator = $state('>');
	let alertMin = $state('');
	let alertMax = $state('');
	let alertValue = $state('');
	let alertColor = $state('#f97316');
	let isAddingAlert = $state(false);

	let scheduleActive = $state(data.schedule?.is_active ?? false);
	let scheduleEndOfWeek = $state(data.schedule?.end_of_week ?? false);
	let scheduleEndOfMonth = $state(data.schedule?.end_of_month ?? false);
	let scheduleDevEui = $state(data.schedule?.dev_eui ?? data.report.dev_eui);
	let isSavingSchedule = $state(false);

	const deviceOptions = $derived(
		data.devices.map((d) => ({
			value: d.dev_eui,
			label: d.name ? `${d.name} (${d.dev_eui})` : d.dev_eui
		}))
	);

	const communicationOptions = $derived(
		data.communicationMethods.map((method) => ({
			value: method.communication_method_id,
			label: method.name
		}))
	);

	const metricOptions = $derived(
		data.metadata.map((m) => ({
			value: m.name,
			label: m.public_name ?? m.name,
			notation: m.notation
		}))
	);

	const canSubmit = $derived(name.trim().length >= 3 && !!devEui);
	const canAddRecipient = $derived(!!recipientEmail && !!recipientMethod);
	const canAddAlert = $derived(
		!!alertName && !!alertMetric && (alertMin || alertMax || alertValue)
	);
</script>

<svelte:head>
	<title>Edit Report - CropWatch Temp</title>
</svelte:head>

<div class="min-h-screen p-6">
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<CWBackButton fallback="/reports" label="Back to Reports" class="mb-2" />
				<h1 class="text-2xl font-bold text-slate-100">Edit Report</h1>
				<p class="mt-1 text-sm text-slate-400">
					Update report settings, recipients, alerts, and delivery schedule.
				</p>
			</div>
			<CWButton
				variant="primary"
				type="submit"
				form="edit-report-form"
				disabled={!canSubmit}
				loading={isSubmitting}
			>
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
				Save Changes
			</CWButton>
		</div>

		<!-- Stats Row -->
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div class="min-w-0">
						<p class="text-sm text-slate-400">Report</p>
						<p class="truncate text-lg font-semibold text-slate-100">{data.report.name}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Recipients</p>
						<p class="text-xl font-semibold text-purple-400">{data.recipients.length}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Alert Points</p>
						<p class="text-xl font-semibold text-amber-400">{data.alertPoints.length}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl {scheduleActive ? 'bg-emerald-500/20' : 'bg-slate-700/50'}">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {scheduleActive ? 'text-emerald-400' : 'text-slate-500'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Schedule</p>
						<p class="text-lg font-semibold {scheduleActive ? 'text-emerald-400' : 'text-slate-500'}">{scheduleActive ? 'Active' : 'Inactive'}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Grid: Desktop 12-col asymmetric, Tablet 2-col, Mobile 1-col -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
			<!-- Report Details Card -->
			<div class="md:col-span-2 xl:col-span-5">
				<form
					id="edit-report-form"
					method="POST"
					use:enhance={({ formData }) => {
						isSubmitting = true;
						name = (formData.get('name') as string) ?? '';
						devEui = (formData.get('dev_eui') as string) ?? '';

						return async ({ result, update }) => {
							isSubmitting = false;

							if (result.type === 'failure') {
								const message = (result.data as { error?: string })?.error ?? 'Could not save the report. Please check the form.';
								toast.error(message);
								await update();
								return;
							}

							if (result.type === 'error') {
								toast.error('An unexpected error occurred.');
								return;
							}

							const payload = result.data as { message?: string };
							if (payload?.message) {
								toast.success(payload.message);
							}

							await update();
						};
					}}
					class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
				>
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						Report Details
					</h2>

					{#if form?.error}
						<div class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
							{form.error}
						</div>
					{/if}

					<div class="space-y-4">
						<div class="space-y-1.5">
							<label for="name" class="text-sm font-medium text-slate-200">
								Report Name <span class="text-red-400">*</span>
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								minlength="3"
								bind:value={name}
								placeholder="e.g., Weekly Greenhouse Summary"
								class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
							/>
						</div>

						<div class="space-y-1.5">
							<label for="dev_eui" class="text-sm font-medium text-slate-200">
								Device <span class="text-red-400">*</span>
							</label>
							<CWSelect
								id="dev_eui"
								name="dev_eui"
								options={deviceOptions}
								placeholder="Select a device..."
								bind:value={devEui}
								required
							/>
						</div>

						<div class="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
							<div class="flex items-center justify-between text-sm">
								<span class="text-slate-400">Created</span>
								<span class="text-slate-200">{new Date(data.report.created_at).toLocaleDateString()}</span>
							</div>
							<div class="mt-2 flex items-center justify-between text-sm">
								<span class="text-slate-400">Report ID</span>
								<span class="font-mono text-xs text-slate-500">{data.report.report_id}</span>
							</div>
						</div>
					</div>
				</form>
			</div>

			<!-- Schedule Card -->
			<div class="xl:col-span-7">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						Delivery Schedule
					</h2>

					<form
						method="POST"
						action="?/saveSchedule"
						use:enhance={({ formData }) => {
							isSavingSchedule = true;
							scheduleActive = formData.get('is_active') === 'on';
							scheduleEndOfWeek = formData.get('end_of_week') === 'on';
							scheduleEndOfMonth = formData.get('end_of_month') === 'on';
							scheduleDevEui = (formData.get('schedule_dev_eui') as string) ?? data.report.dev_eui;

							return async ({ result, update }) => {
								isSavingSchedule = false;

								if (result.type === 'failure') {
									const message = (result.data as { error?: string })?.error ?? 'Could not save schedule.';
									toast.error(message);
									await update();
									return;
								}

								if (result.type === 'error') {
									toast.error('An unexpected error occurred.');
									return;
								}

								const payload = result.data as { message?: string };
								if (payload?.message) {
									toast.success(payload.message);
								}

								await update();
							};
						}}
						class="space-y-4"
					>
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<label for="schedule_dev_eui" class="text-sm font-medium text-slate-200">Device for Schedule</label>
								<CWSelect
									id="schedule_dev_eui"
									name="schedule_dev_eui"
									required
									options={deviceOptions}
									bind:value={scheduleDevEui}
								/>
							</div>
							<div class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
								<input
									type="checkbox"
									id="is_active"
									name="is_active"
									bind:checked={scheduleActive}
									class="h-5 w-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500/30"
								/>
								<label for="is_active" class="text-sm font-medium text-slate-200">Enable automatic delivery</label>
							</div>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
								<input
									type="checkbox"
									name="end_of_week"
									bind:checked={scheduleEndOfWeek}
									class="h-5 w-5 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500/30"
								/>
								<div>
									<p class="text-sm font-medium text-slate-200">End of Week</p>
									<p class="text-xs text-slate-400">Send every Sunday</p>
								</div>
							</label>
							<label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
								<input
									type="checkbox"
									name="end_of_month"
									bind:checked={scheduleEndOfMonth}
									class="h-5 w-5 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500/30"
								/>
								<div>
									<p class="text-sm font-medium text-slate-200">End of Month</p>
									<p class="text-xs text-slate-400">Send on last day</p>
								</div>
							</label>
						</div>

						<div class="flex justify-end">
							<CWButton type="submit" variant="primary" loading={isSavingSchedule}>Save Schedule</CWButton>
						</div>
					</form>
				</div>
			</div>

			<!-- Recipients Card -->
			<div class="md:col-span-2 xl:col-span-7">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
					<div class="border-b border-slate-800 p-6">
						<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							Recipients
						</h2>
						<p class="mt-1 text-sm text-slate-400">People who will receive this report.</p>
					</div>

					<form
						class="border-b border-slate-800 p-6"
						method="POST"
						action="?/addRecipient"
						use:enhance={({ formData }) => {
							isAddingRecipient = true;
							recipientName = (formData.get('recipient_name') as string) ?? '';
							recipientEmail = (formData.get('recipient_email') as string) ?? '';
							recipientMethod = (formData.get('communication_method') as string) ?? '';

							return async ({ result, update }) => {
								isAddingRecipient = false;

								if (result.type === 'failure') {
									const message = (result.data as { error?: string })?.error ?? 'Could not add recipient.';
									toast.error(message);
									await update();
									return;
								}

								if (result.type === 'error') {
									toast.error('An unexpected error occurred.');
									return;
								}

								const payload = result.data as { message?: string };
								if (payload?.message) {
									toast.success(payload.message);
								}

								recipientName = '';
								recipientEmail = '';
								recipientMethod = '';

								await update();
							};
						}}
					>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div class="space-y-1.5">
								<label for="recipient_name" class="text-sm font-medium text-slate-200">Name</label>
								<input
									id="recipient_name"
									name="recipient_name"
									type="text"
									bind:value={recipientName}
									placeholder="Optional"
									class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
								/>
							</div>
							<div class="space-y-1.5">
								<label for="recipient_email" class="text-sm font-medium text-slate-200">Email <span class="text-red-400">*</span></label>
								<input
									id="recipient_email"
									name="recipient_email"
									type="email"
									required
									bind:value={recipientEmail}
									placeholder="user@example.com"
									class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
								/>
							</div>
							<div class="space-y-1.5">
								<label for="communication_method" class="text-sm font-medium text-slate-200">Method <span class="text-red-400">*</span></label>
								<CWSelect
									id="communication_method"
									name="communication_method"
									required
									options={communicationOptions}
									placeholder="Select..."
									bind:value={recipientMethod}
								/>
							</div>
							<div class="flex items-end">
								<CWButton type="submit" variant="primary" loading={isAddingRecipient} disabled={!canAddRecipient} class="w-full">Add Recipient</CWButton>
							</div>
						</div>
					</form>

					<div class="p-6">
						{#if data.recipients.length === 0}
							<div class="flex flex-col items-center justify-center py-8 text-center">
								<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
									</svg>
								</div>
								<p class="text-slate-400">No recipients yet</p>
								<p class="mt-1 text-sm text-slate-500">Add someone to receive this report.</p>
							</div>
						{:else}
							<ul class="divide-y divide-slate-800">
								{#each data.recipients as recipient (recipient.id)}
									<li class="flex items-center justify-between gap-4 py-3">
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-slate-100">{recipient.name ?? recipient.email}</p>
											<p class="text-sm text-slate-400">{recipient.email}</p>
											<span class="mt-1 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{recipient.method_name}</span>
										</div>
										<form
											method="POST"
											action="?/deleteRecipient"
											use:enhance={() => {
												return async ({ result, update }) => {
													if (result.type === 'failure') {
														const message = (result.data as { error?: string })?.error ?? 'Could not remove recipient.';
														toast.error(message);
														await update();
														return;
													}

													if (result.type === 'error') {
														toast.error('An unexpected error occurred.');
														return;
													}

													const payload = result.data as { message?: string };
													if (payload?.message) {
														toast.success(payload.message);
													}

													await update();
												};
											}}
										>
											<input type="hidden" name="recipient_id" value={recipient.id} />
											<CWButton type="submit" variant="ghost" size="sm">Remove</CWButton>
										</form>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</div>

			<!-- Alert Points Card -->
			<div class="md:col-span-2 xl:col-span-5">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
					<div class="border-b border-slate-800 p-6">
						<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
							</svg>
							Alert Points
						</h2>
						<p class="mt-1 text-sm text-slate-400">Highlight metrics when they cross thresholds.</p>
					</div>

					<form
						class="border-b border-slate-800 p-6"
						method="POST"
						action="?/addAlert"
						use:enhance={({ formData }) => {
							isAddingAlert = true;
							alertName = (formData.get('alert_name') as string) ?? '';
							alertMetric = (formData.get('data_point_key') as string) ?? '';
							alertOperator = (formData.get('operator') as string) ?? '';
							alertMin = (formData.get('min') as string) ?? '';
							alertMax = (formData.get('max') as string) ?? '';
							alertValue = (formData.get('value') as string) ?? '';
							alertColor = (formData.get('hex_color') as string) ?? '#f97316';

							return async ({ result, update }) => {
								isAddingAlert = false;

								if (result.type === 'failure') {
									const message = (result.data as { error?: string })?.error ?? 'Could not save alert.';
									toast.error(message);
									await update();
									return;
								}

								if (result.type === 'error') {
									toast.error('An unexpected error occurred.');
									return;
								}

								const payload = result.data as { message?: string };
								if (payload?.message) {
									toast.success(payload.message);
								}

								alertName = '';
								alertMetric = '';
								alertOperator = '>';
								alertMin = '';
								alertMax = '';
								alertValue = '';
								alertColor = '#f97316';

								await update();
							};
						}}
					>
						<div class="space-y-4">
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-1.5">
									<label for="alert_name" class="text-sm font-medium text-slate-200">Alert Name <span class="text-red-400">*</span></label>
									<input
										id="alert_name"
										name="alert_name"
										type="text"
										required
										bind:value={alertName}
										placeholder="High humidity"
										class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
									/>
								</div>
								<div class="space-y-1.5">
									<label for="data_point_key" class="text-sm font-medium text-slate-200">Metric <span class="text-red-400">*</span></label>
									<CWSelect
										id="data_point_key"
										name="data_point_key"
										required
										options={metricOptions.map((m) => ({ value: m.value, label: m.notation ? `${m.label} (${m.notation})` : m.label }))}
										placeholder="Select..."
										bind:value={alertMetric}
									/>
								</div>
							</div>

							<div class="grid gap-4 sm:grid-cols-4">
								<div class="space-y-1.5">
									<label for="operator" class="text-sm font-medium text-slate-200">Operator</label>
									<select
										id="operator"
										name="operator"
										bind:value={alertOperator}
										class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
									>
										<option value=">">&gt;</option>
										<option value="<">&lt;</option>
										<option value="between">Range</option>
										<option value="==">=</option>
									</select>
								</div>
								<div class="space-y-1.5">
									<label for="min" class="text-sm font-medium text-slate-200">Min</label>
									<input id="min" name="min" type="number" step="any" bind:value={alertMin} class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
								</div>
								<div class="space-y-1.5">
									<label for="max" class="text-sm font-medium text-slate-200">Max</label>
									<input id="max" name="max" type="number" step="any" bind:value={alertMax} class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
								</div>
								<div class="space-y-1.5">
									<label for="value" class="text-sm font-medium text-slate-200">Target</label>
									<input id="value" name="value" type="number" step="any" bind:value={alertValue} class="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
								</div>
							</div>

							<div class="flex items-end gap-4">
								<div class="flex-1 space-y-1.5">
									<label for="hex_color" class="text-sm font-medium text-slate-200">Color</label>
									<div class="flex items-center gap-2">
										<input id="hex_color" type="color" bind:value={alertColor} class="h-10 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-800" />
										<input type="text" bind:value={alertColor} name="hex_color" class="w-24 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
									</div>
								</div>
								<CWButton type="submit" variant="primary" loading={isAddingAlert} disabled={!canAddAlert}>Add Alert</CWButton>
							</div>
						</div>
					</form>

					<div class="p-6">
						{#if data.alertPoints.length === 0}
							<div class="flex flex-col items-center justify-center py-8 text-center">
								<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
									</svg>
								</div>
								<p class="text-slate-400">No alert points yet</p>
								<p class="mt-1 text-sm text-slate-500">Add alerts to flag important thresholds.</p>
							</div>
						{:else}
							<ul class="space-y-3">
								{#each data.alertPoints as alert (alert.id)}
									<li class="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<span class="h-3 w-3 rounded-full" style="background-color: {alert.hex_color ?? '#f97316'}"></span>
													<p class="font-medium text-slate-100">{alert.name}</p>
												</div>
												<p class="mt-1 text-sm text-slate-400">{alert.data_point_key}</p>
												<p class="mt-0.5 text-xs text-slate-500">{alert.operator ?? '>'} &bull; Min: {alert.min ?? '—'} &bull; Max: {alert.max ?? '—'} &bull; Target: {alert.value ?? '—'}</p>
											</div>
											<form
												method="POST"
												action="?/deleteAlert"
												use:enhance={() => {
													return async ({ result, update }) => {
														if (result.type === 'failure') {
															const message = (result.data as { error?: string })?.error ?? 'Could not remove alert.';
															toast.error(message);
															await update();
															return;
														}

														if (result.type === 'error') {
															toast.error('An unexpected error occurred.');
															return;
														}

														const payload = result.data as { message?: string };
														if (payload?.message) {
															toast.success(payload.message);
														}

														await update();
													};
												}}
											>
												<input type="hidden" name="alert_id" value={alert.id} />
												<CWButton type="submit" variant="ghost" size="sm">Remove</CWButton>
											</form>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
