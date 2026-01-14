<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWSelect from '$lib/components/CWSelect.svelte';
	import { getToastContext } from '$lib/components/toast';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const toast = getToastContext();
	const reportsListPath = $derived(resolve('/reports'));
	const getEditPath = (id: string) => resolve(`/reports/${id}/edit-report`);

	let name = $state((form?.name as string | undefined) ?? '');
	let devEui = $state((form?.dev_eui as string | undefined) ?? '');
	let isSubmitting = $state(false);

	const deviceOptions = $derived(
		data.devices.map((d) => ({
			value: d.dev_eui,
			label: d.name ? `${d.name} (${d.dev_eui})` : d.dev_eui
		}))
	);

	const canSubmit = $derived(name.trim().length >= 3 && !!devEui);
</script>

<svelte:head>
	<title>Create Report - CropWatch Temp</title>
</svelte:head>

<div class="min-h-screen p-6">
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<CWBackButton fallback="/reports" label="Back to Reports" class="mb-2" />
				<h1 class="text-2xl font-bold text-slate-100">Create Report</h1>
				<p class="mt-1 text-sm text-slate-400">
					Set up a new report for your device. You can add recipients and alert points after saving.
				</p>
			</div>
			<div class="flex items-center gap-3">
				<CWButton variant="ghost" onclick={() => (window.location.href = reportsListPath)}>
					Cancel
				</CWButton>
				<CWButton
					variant="primary"
					type="submit"
					form="create-report-form"
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
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
					</svg>
					Create Report
				</CWButton>
			</div>
		</div>

		<!-- Stats Preview Row -->
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
						<p class="truncate text-lg font-semibold text-slate-100">{name || 'New Report'}</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Recipients</p>
						<p class="text-xl font-semibold text-slate-500">0</p>
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
						<p class="text-xl font-semibold text-slate-500">0</p>
					</div>
				</div>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/50">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="text-sm text-slate-400">Schedule</p>
						<p class="text-lg font-semibold text-slate-500">Not Set</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Grid: Desktop 12-col asymmetric, Tablet 2-col, Mobile 1-col -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
			<!-- Report Details Card -->
			<div class="md:col-span-2 xl:col-span-7">
				<form
					id="create-report-form"
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

							const payload = result.data as { message?: string; reportId?: string };
							if (payload?.message) {
								toast.success(payload.message);
							}

							if (payload?.reportId) {
								window.location.href = getEditPath(payload.reportId);
								return;
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

					<div class="grid gap-6 sm:grid-cols-2">
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
							<p class="text-xs text-slate-400">Use at least 3 characters for clarity.</p>
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
							<p class="text-xs text-slate-400">Only devices you have access to are shown.</p>
						</div>
					</div>
				</form>
			</div>

			<!-- Tips & Info Card -->
			<div class="xl:col-span-5">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Getting Started
					</h2>

					<div class="space-y-4">
						<div class="flex gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
							<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sm font-semibold text-sky-400">1</div>
							<div>
								<p class="font-medium text-slate-200">Name your report</p>
								<p class="mt-0.5 text-sm text-slate-400">Pick a descriptive name so teammates can find it quickly.</p>
							</div>
						</div>

						<div class="flex gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
							<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sm font-semibold text-sky-400">2</div>
							<div>
								<p class="font-medium text-slate-200">Select a device</p>
								<p class="mt-0.5 text-sm text-slate-400">Reports are tied to a single device. You can duplicate later for others.</p>
							</div>
						</div>

						<div class="flex gap-3 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
							<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sm font-semibold text-sky-400">3</div>
							<div>
								<p class="font-medium text-slate-200">Configure after saving</p>
								<p class="mt-0.5 text-sm text-slate-400">Add recipients, alert points, and set up delivery schedules on the next screen.</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- What's Next Card -->
			<div class="md:col-span-2 xl:col-span-12">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
						What You Can Do Next
					</h2>

					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div class="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
								</svg>
							</div>
							<div>
								<p class="font-medium text-slate-200">Add Recipients</p>
								<p class="mt-0.5 text-sm text-slate-400">Choose who receives this report via email or other methods.</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
								</svg>
							</div>
							<div>
								<p class="font-medium text-slate-200">Set Alert Points</p>
								<p class="mt-0.5 text-sm text-slate-400">Highlight metrics when they cross important thresholds.</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
							<div>
								<p class="font-medium text-slate-200">Schedule Delivery</p>
								<p class="mt-0.5 text-sm text-slate-400">Automate reports weekly or monthly to your recipients.</p>
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
							<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							</div>
							<div>
								<p class="font-medium text-slate-200">Preview Reports</p>
								<p class="mt-0.5 text-sm text-slate-400">See how your report looks before sending it out.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
