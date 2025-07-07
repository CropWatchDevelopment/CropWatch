<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import NumberLine from '$lib/components/Reports/NumberLine.svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';

	let { data, form } = $props();

	// Extract data properties
	const devEui = $derived(data.devEui);
	const locationId = $derived(data.locationId);
	const report = $derived(data.report);
	const isEditing = $derived(data.isEditing);
	const recipientsData = $derived(data.recipients);

	// Form state
	let reportName = $state('');
	let isSubmitting = $state(false);

	// Alert points state - using $state for deep reactivity
	let alertPoints = $state<
		Array<{
			id: string;
			name: string;
			operator: '=' | '>' | '<' | 'range';
			value?: number;
			min?: number;
			max?: number;
			color: string;
		}>
	>([]);

	// Recipients state
	let recipients = $state<
		Array<{
			id: string;
			email: string;
			name: string;
		}>
	>([]);

	// Schedules state
	let schedules = $state<
		Array<{
			id: string;
			frequency: 'daily' | 'weekly' | 'monthly';
			time: string;
			days?: number[];
		}>
	>([]);

	// Initialize form data from loaded report if editing
	$effect(() => {
		if (isEditing && report) {
			untrack(() => {
				reportName = report.name || '';
			});
		}

		if (isEditing && data.alertPoints) {
			untrack(() => {
				alertPoints.splice(
					0,
					alertPoints.length,
					...data.alertPoints.map((point: any) => ({
						id: point.id?.toString() || crypto.randomUUID(),
						name: point.name || '',
						operator:
							point.operator === 'range'
								? 'range'
								: point.operator || ('=' as '=' | '>' | '<' | 'range'),
						value:
							point.operator === '=' || point.operator === '>' || point.operator === '<'
								? point.min || point.max || 0
								: undefined,
						min: point.min || undefined,
						max: point.max || undefined,
						value: point.value || undefined,
						color: point.hex_color || '#3B82F6'
					}))
				);
			});
		}

		if (isEditing && recipientsData) {
			untrack(() => {
				recipients.splice(
					0,
					recipients.length,
					...data.recipients.map((recipient: any) => ({
						id: recipient.id?.toString() || crypto.randomUUID(),
						email: recipient.email || '',
						name: recipient.name || ''
					}))
				);
			});
		}

		if (isEditing && data.schedules) {
			untrack(() => {
				schedules.splice(
					0,
					schedules.length,
					...data.schedules.map((schedule: any) => ({
						id: schedule.id?.toString() || crypto.randomUUID(),
						frequency: schedule.end_of_week
							? 'weekly'
							: schedule.end_of_month
								? 'monthly'
								: 'daily',
						time: schedule.time || '09:00',
						days: schedule.days || []
					}))
				);
			});
		}
	});

	// Validation errors
	let validationErrors = $state<string[]>([]);

	// Color palette for alert points
	const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

	function addAlertPoint() {
		const newPoint = {
			id: crypto.randomUUID(),
			name: `Alert Point ${alertPoints.length + 1}`,
			operator: '=' as const,
			value: 0,
			min: undefined,
			max: undefined,
			color: colors[alertPoints.length % colors.length]
		};
		alertPoints.push(newPoint);
	}

	function removeAlertPoint(id: string) {
		const index = alertPoints.findIndex((p) => p.id === id);
		if (index >= 0) {
			alertPoints.splice(index, 1);
		}
	}

	function addRecipient() {
		const newRecipient = {
			id: crypto.randomUUID(),
			email: '',
			name: ''
		};
		recipients.push(newRecipient);
	}

	function removeRecipient(id: string) {
		const index = recipients.findIndex((r) => r.id === id);
		if (index >= 0) {
			recipients.splice(index, 1);
		}
	}

	function addSchedule() {
		const newSchedule = {
			id: crypto.randomUUID(),
			frequency: 'daily' as const,
			time: '09:00',
			days: []
		};
		schedules.push(newSchedule);
	}

	function removeSchedule(id: string) {
		const index = schedules.findIndex((s) => s.id === id);
		if (index >= 0) {
			schedules.splice(index, 1);
		}
	}

	// Validation logic
	function validateRanges() {
		validationErrors.splice(0, validationErrors.length);

		// Check for overlapping ranges
		const ranges: Array<{ start: number; end: number; name: string }> = [];

		alertPoints.forEach((point) => {
			// Ensure values are numbers
			const value = Number(point.value);
			const min = Number(point.min);
			const max = Number(point.max);

			let start: number, end: number;

			if (point.operator === '=') {
				if (isNaN(value)) return;
				start = end = value;
			} else if (point.operator === 'range') {
				if (isNaN(min) || isNaN(max)) return;
				start = min;
				end = max;
			} else if (point.operator === '>') {
				if (isNaN(value)) return;
				start = value;
				end = Infinity;
			} else if (point.operator === '<') {
				if (isNaN(value)) return;
				start = -Infinity;
				end = value;
			} else {
				return; // Skip invalid points
			}

			// Check for overlaps with existing ranges
			for (const existingRange of ranges) {
				if (
					(start <= existingRange.end && end >= existingRange.start) ||
					(existingRange.start <= end && existingRange.end >= start)
				) {
					validationErrors.push(`"${point.name}" overlaps with "${existingRange.name}"`);
				}
			}

			ranges.push({ start, end, name: point.name });
		});
	}

	// Watch for changes to alert points
	$effect(() => {
		// Only track alertPoints changes, not validationErrors changes
		const points = alertPoints;
		// Use untrack to prevent reactive loops when updating validationErrors
		untrack(() => {
			validateRanges();
		});
	});

	// Derived number line points for visualization
	const numberLinePoints = $derived(
		alertPoints
			.filter((point) => {
				// Filter out points with invalid values
				if (point.operator === '=') {
					return !isNaN(Number(point.value));
				} else if (point.operator === 'range') {
					return !isNaN(Number(point.min)) && !isNaN(Number(point.max));
				} else if (point.operator === '>' || point.operator === '<') {
					return !isNaN(Number(point.value));
				}
				return false;
			})
			.map((point) => ({
				...point,
				value: point.value ? Number(point.value) : undefined,
				min: point.min ? Number(point.min) : undefined,
				max: point.max ? Number(point.max) : undefined
			}))
	);

	// Form submission
	function handleSubmit() {
		isSubmitting = true;
		return async ({ result }: { result: ActionResult }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				goto(`/app/dashboard/location/${locationId}/devices/${devEui}/settings/reports`);
			}
		};
	}
</script>

<section class="flex flex-col gap-6">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h1 class="mb-1 text-2xl font-semibold">{isEditing ? 'Edit Report' : 'Create Report'}</h1>
			<p class="text-sm text-neutral-600 dark:text-neutral-400">
				{isEditing ? 'Edit' : 'Create a new'} report for device: {devEui}
			</p>
		</div>
		<Button
			href="/app/dashboard/location/{locationId}/devices/{devEui}/settings/reports"
			variant="secondary"
		>
			<MaterialIcon name="cancel" />
			Cancel
		</Button>
	</header>

	<form method="POST" use:enhance={handleSubmit} class="space-y-8">
		{#if isEditing && report}
			<input type="hidden" name="reportId" value={report.report_id} />
		{/if}

		<!-- Report Basic Info -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
		>
			<h2 class="mb-4 text-lg font-medium">Report Details</h2>

			<div class="space-y-4">
				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Report Name *
					</label>
					<TextInput
						name="name"
						bind:value={reportName}
						placeholder="Enter report name"
						required
						class="w-full"
					/>
				</div>
			</div>
		</div>

		<!-- Alert Points -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-medium">Alert Points</h2>
				<Button type="button" onclick={addAlertPoint} variant="secondary">
					<MaterialIcon name="notification_add" />
					Add Alert Point</Button
				>
			</div>

			{#if validationErrors.length > 0}
				<div class="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Validation Errors</h3>
							<div class="mt-2 text-sm text-red-700 dark:text-red-300">
								<ul class="list-inside list-disc space-y-1">
									{#each validationErrors as error}
										<li>{error}</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if alertPoints.length > 0}
				<div class="mb-6">
					<NumberLine points={numberLinePoints}>
						<div class="text-sm text-gray-600 dark:text-gray-400">
							Visual preview of alert points and ranges
						</div>
					</NumberLine>
				</div>

				<div class="space-y-4">
					{#each alertPoints as point, i}
						<div class="rounded-md border border-gray-200 p-4 dark:border-gray-600">
							<div class="mb-3 flex items-start justify-between">
								<div class="flex items-center space-x-2">
									<input type="color" class="h-6 w-5 rounded-xl" bind:value={point.color} />
									<!-- <div  style="background-color: {point.color}"></div> -->
									<span class="font-medium">Alert Point {i + 1}</span>
								</div>
								<Button
									type="button"
									onclick={() => removeAlertPoint(point.id)}
									variant="danger"
									size="sm"
								>
									<MaterialIcon name="notifications_off" />
									Remove
								</Button>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label
										for="alert-point-name-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Name
									</label>
									<TextInput
										id="alert-point-name-{i}"
										bind:value={point.name}
										placeholder="Alert point name"
										class="w-full"
									/>
								</div>

								<div>
									<label
										for="alert-point-condition-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Condition
									</label>
									<Select id="alert-point-condition-{i}" bind:value={point.operator} class="w-full">
										<option value="=">Equals (=)</option>
										<option value=">">Greater than (&gt;)</option>
										<option value="<">Less than (&lt;)</option>
										<option value="range">Range</option>
									</Select>
								</div>
							</div>

							<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
								{#if point.operator === '=' || point.operator === '>' || point.operator === '<'}
									<div>
										<label
											for="alert-point-value-{i}"
											class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Value
										</label>
										<TextInput
											id="alert-point-value-{i}"
											type="number"
											bind:value={point.value}
											placeholder="Enter value"
											class="w-full"
										/>
									</div>
								{:else if point.operator === 'range'}
									<div>
										<label
											for="alert-point-min-{i}"
											class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Min Value
										</label>
										<TextInput
											id="alert-point-min-{i}"
											type="number"
											bind:value={point.min}
											placeholder="Min value"
											class="w-full"
										/>
									</div>
									<div>
										<label
											for="alert-point-max-{i}"
											class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Max Value
										</label>
										<TextInput
											id="alert-point-max-{i}"
											type="number"
											bind:value={point.max}
											placeholder="Max value"
											class="w-full"
										/>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-8 text-center text-gray-500 dark:text-gray-400">
					<p>No alert points configured. Add an alert point to get started.</p>
				</div>
			{/if}
		</div>

		<!-- Recipients -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-medium">Recipients</h2>
				<Button type="button" onclick={addRecipient} variant="secondary">
					<MaterialIcon name="group_add" />
					Add Recipient</Button
				>
			</div>

			{#if recipients.length > 0}
				<div class="space-y-4">
					{#each recipients as recipient, i}
						<div class="rounded-md border border-gray-200 p-4 dark:border-gray-600">
							<div class="mb-3 flex items-start justify-between">
								<span class="font-medium">Recipient {i + 1}</span>
								<Button
									type="button"
									onclick={() => removeRecipient(recipient.id)}
									variant="danger"
									size="sm"
								>
									<MaterialIcon name="group_remove" />
									Remove
								</Button>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label
										for="recipient-name-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Name
									</label>
									<TextInput
										id="recipient-name-{i}"
										bind:value={recipient.name}
										placeholder="Recipient name"
										class="w-full"
									/>
								</div>

								<div>
									<label
										for="recipient-email-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Email
									</label>
									<TextInput
										id="recipient-email-{i}"
										type="email"
										bind:value={recipient.email}
										placeholder="recipient@example.com"
										class="w-full"
									/>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-8 text-center text-gray-500 dark:text-gray-400">
					<p>No recipients configured. Add a recipient to get started.</p>
				</div>
			{/if}
		</div>

		<!-- Schedules -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-medium">Schedules</h2>
				<Button type="button" onclick={addSchedule} variant="secondary">
					<MaterialIcon name="calendar_add_on" />
					Add Schedule</Button
				>
			</div>

			{#if schedules.length > 0}
				<div class="space-y-4">
					{#each schedules as schedule, i}
						<div class="rounded-md border border-gray-200 p-4 dark:border-gray-600">
							<div class="mb-3 flex items-start justify-between">
								<span class="font-medium">Schedule {i + 1}</span>
								<Button
									type="button"
									onclick={() => removeSchedule(schedule.id)}
									variant="danger"
									size="sm"
								>
									<MaterialIcon name="event_busy" />
									Remove
								</Button>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label
										for="schedule-frequency-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Frequency
									</label>
									<Select
										id="schedule-frequency-{i}"
										bind:value={schedule.frequency}
										class="w-full"
									>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="monthly">Monthly</option>
									</Select>
								</div>

								<div>
									<label
										for="schedule-time-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Time (24h format)
									</label>
									<TextInput
										id="schedule-time-{i}"
										type="text"
										bind:value={schedule.time}
										placeholder="09:00"
										class="w-full"
									/>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-8 text-center text-gray-500 dark:text-gray-400">
					<p>No schedules configured. Add a schedule to get started.</p>
				</div>
			{/if}
		</div>

		<!-- Form Actions -->
		<div class="flex justify-end space-x-4">
			<Button
				type="button"
				href="/app/dashboard/location/{locationId}/devices/{devEui}/settings/reports"
				variant="secondary"
			>
				<MaterialIcon name="cancel" />
				Cancel
			</Button>
			<Button type="button" variant="secondary">
				<MaterialIcon name="Lab_Research" />
				Generate Sample Report
			</Button>
			<Button
				type="submit"
				variant="primary"
				disabled={isSubmitting || !reportName.trim() || validationErrors.length > 0}
			>
				{#if isSubmitting}
					{isEditing ? 'Updating Report...' : 'Creating Report...'}
				{:else}
					<MaterialIcon name="save" /> {isEditing ? 'Update Report' : 'Save Report'}
				{/if}
			</Button>
		</div>

		<!-- Hidden fields for form submission -->
		<input type="hidden" name="alertPoints" value={JSON.stringify(alertPoints)} />
		<input type="hidden" name="recipients" value={JSON.stringify(recipients)} />
		<input type="hidden" name="schedules" value={JSON.stringify(schedules)} />
	</form>
</section>
