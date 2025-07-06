<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import NumberLine from '$lib/components/Reports/NumberLine.svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';

	let { data, form } = $props();

	// Extract data properties
	const devEui = $derived(data.devEui);
	const locationId = $derived(data.locationId);
	const report = $derived(data.report);
	const alertPoints = $derived(data.alertPoints);
	const recipients = $derived(data.recipients);
	const schedules = $derived(data.schedules);

	// Form state
	let reportName = $state('');
	let isSubmitting = $state(false);

	// Initialize reportName reactively
	$effect(() => {
		if (report) {
			reportName = report.name || '';
		}
	});

	// Alert points state - using $state for deep reactivity
	let currentAlertPoints = $state<
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
	let currentRecipients = $state<
		Array<{
			id: string;
			email: string;
			name: string;
		}>
	>([]);

	// Schedules state
	let currentSchedules = $state<
		Array<{
			id: string;
			frequency: 'daily' | 'weekly' | 'monthly';
			time: string;
			days?: number[];
		}>
	>([]);

	// Validation errors
	let validationErrors = $state<string[]>([]);

	// Initialize data from props
	$effect(() => {
		if (alertPoints) {
			currentAlertPoints.splice(
				0,
				currentAlertPoints.length,
				...alertPoints.map((point: any) => ({
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
					color: point.hex_color || '#3B82F6'
				}))
			);
		}

		if (recipients) {
			currentRecipients.splice(
				0,
				currentRecipients.length,
				...recipients.map((recipient: any) => ({
					id: recipient.id?.toString() || crypto.randomUUID(),
					email: recipient.profile_id, // This would need proper user lookup
					name: recipient.profile_id
				}))
			);
		}

		if (schedules) {
			currentSchedules.splice(
				0,
				currentSchedules.length,
				...schedules.map((schedule: any) => ({
					id: schedule.id?.toString() || crypto.randomUUID(),
					frequency: (schedule.end_of_week
						? 'weekly'
						: schedule.end_of_month
							? 'monthly'
							: 'daily') as 'daily' | 'weekly' | 'monthly',
					time: '09:00',
					days: []
				}))
			);
		}
	});

	// Validate ranges whenever alert points change
	$effect(() => {
		validateRanges();
	});

	// Color palette for alert points
	const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

	function addAlertPoint() {
		const newPoint = {
			id: crypto.randomUUID(),
			name: `Alert Point ${currentAlertPoints.length + 1}`,
			operator: '=' as const,
			value: 0,
			min: undefined,
			max: undefined,
			color: colors[currentAlertPoints.length % colors.length]
		};
		currentAlertPoints.push(newPoint);
	}

	function removeAlertPoint(id: string) {
		const index = currentAlertPoints.findIndex((p) => p.id === id);
		if (index >= 0) {
			currentAlertPoints.splice(index, 1);
		}
	}

	function addRecipient() {
		const newRecipient = {
			id: crypto.randomUUID(),
			email: '',
			name: ''
		};
		currentRecipients.push(newRecipient);
	}

	function removeRecipient(id: string) {
		const index = currentRecipients.findIndex((r) => r.id === id);
		if (index >= 0) {
			currentRecipients.splice(index, 1);
		}
	}

	function addSchedule() {
		const newSchedule = {
			id: crypto.randomUUID(),
			frequency: 'daily' as const,
			time: '09:00',
			days: []
		};
		currentSchedules.push(newSchedule);
	}

	function removeSchedule(id: string) {
		const index = currentSchedules.findIndex((s) => s.id === id);
		if (index >= 0) {
			currentSchedules.splice(index, 1);
		}
	}

	// Validation logic
	function validateRanges() {
		validationErrors.splice(0, validationErrors.length);

		// Check for overlapping ranges
		const ranges: Array<{ start: number; end: number; name: string }> = [];

		currentAlertPoints.forEach((point) => {
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
		validateRanges();
	});

	// Derived number line points for visualization
	const numberLinePoints = $derived(
		currentAlertPoints
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
			<h1 class="mb-1 text-2xl font-semibold">Edit Report</h1>
			<p class="text-sm text-neutral-600 dark:text-neutral-400">
				Edit report for device: {devEui}
			</p>
		</div>
		<Button
			href="/app/dashboard/location/{locationId}/devices/{devEui}/settings/reports"
			variant="secondary"
		>
			Cancel
		</Button>
	</header>

	<form method="POST" use:enhance={handleSubmit} class="space-y-8">
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
				<Button type="button" onclick={addAlertPoint} variant="secondary">Add Alert Point</Button>
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

			{#if currentAlertPoints.length > 0}
				<div class="mb-6">
					<NumberLine points={numberLinePoints}>
						<div class="text-sm text-gray-600 dark:text-gray-400">
							Visual preview of alert points and ranges
						</div>
					</NumberLine>
				</div>

				<div class="space-y-4">
					{#each currentAlertPoints as point, i}
						<div class="rounded-md border border-gray-200 p-4 dark:border-gray-600">
							<div class="mb-3 flex items-start justify-between">
								<div class="flex items-center space-x-2">
									<div class="h-4 w-4 rounded" style="background-color: {point.color}"></div>
									<span class="font-medium">Alert Point {i + 1}</span>
								</div>
								<Button
									type="button"
									onclick={() => removeAlertPoint(point.id)}
									variant="danger"
									size="sm"
								>
									Remove
								</Button>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label
										for="edit-alert-point-name-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Name
									</label>
									<TextInput
										id="edit-alert-point-name-{i}"
										bind:value={point.name}
										placeholder="Alert point name"
										class="w-full"
									/>
								</div>

								<div>
									<label
										for="edit-alert-point-condition-{i}"
										class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Condition
									</label>
									<Select
										id="edit-alert-point-condition-{i}"
										bind:value={point.operator}
										class="w-full"
									>
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
											for="edit-alert-point-value-{i}"
											class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Value
										</label>
										<TextInput
											id="edit-alert-point-value-{i}"
											type="number"
											bind:value={point.value}
											placeholder="Enter value"
											class="w-full"
										/>
									</div>
								{:else if point.operator === 'range'}
									<div>
										<label
											for="edit-alert-point-min-{i}"
											class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Min Value
										</label>
										<TextInput
											id="edit-alert-point-min-{i}"
											type="number"
											bind:value={point.min}
											placeholder="Min value"
											class="w-full"
										/>
									</div>
									<div>
										<label
											for="edit-alert-point-max-{i}"
											class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
										>
											Max Value
										</label>
										<TextInput
											id="edit-alert-point-max-{i}"
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

		<!-- Form Actions -->
		<div class="flex justify-end space-x-4">
			<Button
				type="button"
				href="/app/dashboard/location/{locationId}/devices/{devEui}/settings/reports"
				variant="secondary"
			>
				Cancel
			</Button>
			<Button
				type="submit"
				variant="primary"
				disabled={isSubmitting || !reportName.trim() || validationErrors.length > 0}
			>
				{#if isSubmitting}
					Updating Report...
				{:else}
					Update Report
				{/if}
			</Button>
		</div>

		<!-- Hidden fields for form submission -->
		<input type="hidden" name="alertPoints" value={JSON.stringify(currentAlertPoints)} />
		<input type="hidden" name="recipients" value={JSON.stringify(currentRecipients)} />
		<input type="hidden" name="schedules" value={JSON.stringify(currentSchedules)} />
	</form>
</section>
