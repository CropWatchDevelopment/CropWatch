<script lang="ts">
	import { success, error as errorToast } from '$lib/stores/toast.svelte';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { Dialog, DateRangePicker } from 'bits-ui';
	import type { DateRange } from 'bits-ui';
	import { CalendarDate } from '@internationalized/date';
	import { mdiAlert, mdiDownload, mdiFileDocument, mdiMagnify } from '$lib/icons/mdi';
	import ExportButton from '$lib/components/devices/ExportButton.svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { _, locale as activeLocale } from 'svelte-i18n';

	type BulkProgress = { current: number; total: number };

	let { data } = $props();
	let reports = $state(data.allReports as any[]);
	let searchTerm = $state('');
	let selectedReportIds = $state<number[]>([]);
	let bulkModalOpen = $state(false);
	let modalStartDate = $state('');
	let modalEndDate = $state('');
	let modalDateRange = $state<DateRange | undefined>(undefined);
	const filteredReports = $derived(filterReports(reports));
	const visibleReportIds = $derived(filteredReports.map((report: any) => report.id));
	const visibleSelectedCount = $derived(
		visibleReportIds.filter((id) => selectedReportIds.includes(id)).length
	);
	const allVisibleSelected = $derived(
		visibleReportIds.length > 0 && visibleSelectedCount === visibleReportIds.length
	);
	const someVisibleSelected = $derived(
		visibleSelectedCount > 0 && visibleSelectedCount < visibleReportIds.length
	);

	const STORAGE_KEY = 'cw-all-reports-selection';
	const DOWNLOAD_DELAY_MS = 1200;

	let bulkDownloading = $state(false);
	let bulkProgress = $state<BulkProgress | null>(null);
	let selectAllCheckbox: HTMLInputElement | null = null;

	function filterReports(currentReports: any[]) {
		if (!searchTerm.trim()) return currentReports;

		return currentReports.filter((report: any) => {
			const name = (report.name || '').toLowerCase();
			const search = searchTerm.toLowerCase();
			return name.includes(search);
		});
	}

	onMount(() => {
		if (typeof window === 'undefined') return;
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return;

		try {
			const parsed = JSON.parse(stored) as number[];
			if (!Array.isArray(parsed)) return;
			const existing = parsed.filter((id) => reports.some((report) => report.id === id));
			if (existing.length) {
				setSelectedReports(existing);
			}
		} catch (error) {
			console.warn('Failed to restore saved report selections', error);
			window.localStorage.removeItem(STORAGE_KEY);
		}
	});

	$effect(() => {
		const validIds = new Set(reports.map((report: any) => report.id));
		const filtered = selectedReportIds.filter((id) => validIds.has(id));
		if (filtered.length !== selectedReportIds.length) {
			setSelectedReports(filtered);
		}
	});

	$effect(() => {
		if (!selectAllCheckbox) return;
		selectAllCheckbox.indeterminate = someVisibleSelected;
	});

	function setSelectedReports(ids: number[]) {
		const unique = Array.from(new Set(ids)).sort((a, b) => a - b);
		const sameLength = unique.length === selectedReportIds.length;
		const isSame = sameLength && unique.every((id, index) => id === selectedReportIds[index]);
		if (isSame) return;

		selectedReportIds = unique;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
		}
	}

	function toggleReportSelection(reportId: number, checked: boolean) {
		if (checked) {
			setSelectedReports([...selectedReportIds, reportId]);
		} else {
			setSelectedReports(selectedReportIds.filter((id) => id !== reportId));
		}
	}

	function handleRowSelectionChange(event: Event, reportId: number) {
		const target = event.currentTarget as HTMLInputElement | null;
		if (!target) return;
		toggleReportSelection(reportId, target.checked);
	}

	function toggleSelectAll(checked: boolean) {
		if (!visibleReportIds.length) {
			if (selectAllCheckbox) {
				selectAllCheckbox.indeterminate = false;
			}
			return;
		}

		if (checked) {
			setSelectedReports([...selectedReportIds, ...visibleReportIds]);
		} else {
			const visibleSet = new Set(visibleReportIds);
			setSelectedReports(selectedReportIds.filter((id) => !visibleSet.has(id)));
		}
	}

	function handleSelectAllChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement | null;
		if (!target) return;
		toggleSelectAll(target.checked);
	}

	function openBulkDownloadModal() {
		if (bulkDownloading || !selectedReportIds.length) return;
		const { start, end } = getPreviousWeekRange();
		setModalDateRangeFromDates(start, end);
		bulkModalOpen = true;
	}

	async function confirmBulkDownload() {
		if (!modalStartDate || !modalEndDate) {
			errorToast($_('bulk_missing_date_range'));
			return;
		}

		const rangeStart = new Date(modalStartDate);
		const rangeEnd = new Date(modalEndDate);
		if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
			errorToast($_('bulk_invalid_date_selection'));
			return;
		}
		if (rangeStart > rangeEnd) {
			errorToast($_('bulk_start_after_end'));
			return;
		}

		bulkModalOpen = false;
		await downloadSelectedReports(rangeStart, rangeEnd);
	}

	async function downloadSelectedReports(rangeStart: Date, rangeEnd: Date) {
		if (bulkDownloading || !selectedReportIds.length) return;

		const selected = reports.filter((report: any) => selectedReportIds.includes(report.id));
		if (!selected.length) {
			errorToast($_('bulk_no_reports_available'));
			return;
		}

		const startParam = formatAsDateParam(rangeStart);
		const endParam = formatAsDateParam(rangeEnd);
		const resolvedLocale = get(activeLocale) ?? 'en';
		const resolvedTimezone =
			typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone
				? Intl.DateTimeFormat().resolvedOptions().timeZone
				: 'UTC';

		bulkDownloading = true;
		bulkProgress = { current: 0, total: selected.length };

		let completed = 0;

		for (const report of selected) {
			if (!report?.dev_eui) {
				errorToast(
					$_('bulk_report_missing_identifier', {
						values: { name: getReportLabel(report) }
					})
				);
			} else {
				try {
					await downloadReportPdf(report, startParam, endParam, resolvedLocale, resolvedTimezone);
					completed += 1;
				} catch (error) {
					console.error('Failed to download report', report, error);
					errorToast(
						$_('bulk_unable_to_download', {
							values: { name: getReportLabel(report) }
						})
					);
				}
			}

			bulkProgress = { current: completed, total: selected.length };
			if (completed < selected.length) {
				await delay(DOWNLOAD_DELAY_MS);
			}
		}

		if (completed) {
			const reportWord = completed === 1 ? $_('report') : $_('Reports');
			const partial = completed < selected.length ? $_('bulk_partial_suffix') : '';
			success(
				$_('bulk_download_success', {
					values: {
						count: completed,
						reportWord,
						partial
					}
				})
			);
		}

		bulkDownloading = false;
		bulkProgress = null;
	}

	function cancelBulkDownload() {
		if (bulkDownloading) return;
		bulkModalOpen = false;
	}

	function getPreviousWeekRange() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const end = new Date(today);
		end.setDate(end.getDate() - 1);
		const start = new Date(end);
		start.setDate(end.getDate() - 6);
		return { start, end };
	}

	function setModalDateRangeFromDates(start: Date, end: Date) {
		modalStartDate = formatAsDateParam(start);
		modalEndDate = formatAsDateParam(end);
		modalDateRange = {
			start: dateToCalendarDate(start),
			end: dateToCalendarDate(end)
		};
	}

	function handleModalDateChange(newValue: DateRange | undefined) {
		if (!newValue?.start || !newValue?.end) return;
		const start = calendarDateToDate(newValue.start);
		const end = calendarDateToDate(newValue.end);
		modalStartDate = formatAsDateParam(start);
		modalEndDate = formatAsDateParam(end);
	}

	async function downloadReportPdf(
		report: any,
		start: string,
		end: string,
		localeCode: string,
		timezone: string
	) {
		const params = new URLSearchParams({
			start,
			end,
			locale: localeCode,
			timezone
		});
		const response = await fetch(`/api/devices/${report.dev_eui}/pdf?${params.toString()}`, {
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		const safeName = sanitizeFilename(getReportLabel(report));
		anchor.href = url;
		anchor.download = `${safeName}-${start}_${end}.pdf`;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
	}

	function getReportLabel(report: any) {
		const fallback = report?.name ?? report?.dev_eui ?? report?.id;
		return fallback !== undefined && fallback !== null ? String(fallback) : $_('untitled_report');
	}

	function sanitizeFilename(value: string) {
		return value
			.replace(/[\\/:*?"<>|]+/g, '_')
			.replace(/\s+/g, '_')
			.slice(0, 120);
	}

	function formatAsDateParam(date: Date) {
		return date.toISOString().split('T')[0];
	}

	function dateToCalendarDate(date: Date): CalendarDate {
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	function calendarDateToDate(calendarDate: CalendarDate): Date {
		return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
	}

	function delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function deleteReport(id: number) {
		const formData = new FormData();
		formData.append('id', String(id));
		const res = await fetch('?/delete', { method: 'POST', body: formData });
		const result = await res.json();
		if (result.success) {
			reports = reports.filter((r) => r.id !== id);
			success($_('report_deleted'));
		} else {
			errorToast(result.error || $_('failed_to_delete'));
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
			return $_('N/A');
		}
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$_('all_reports_heading')}</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				{$_('all_reports_subheading')}
			</p>
		</div>
		<div class="actions-group">
			<div class="search-container">
				<div class="search-wrapper">
					<Icon class="search-icon" path={mdiMagnify} size="18" />
					<input
						type="text"
						bind:value={searchTerm}
						placeholder={$_('search_reports_placeholder')}
						class="search-input"
						aria-label={$_('search_reports_placeholder')}
					/>
				</div>
			</div>
			<button
				type="button"
				class="bulk-download-btn"
				disabled={!selectedReportIds.length || bulkDownloading}
				on:click={openBulkDownloadModal}
			>
				{#if bulkDownloading}
					<span class="bulk-spinner" aria-hidden="true"></span>
					<span>{$_('downloading')}</span>
				{:else}
					<Icon class="download-icon" path={mdiDownload} size="18" />
					<span>{$_('download_selected')}</span>
				{/if}
			</button>
		</div>
	</div>

	<Dialog.Root bind:open={bulkModalOpen}>
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 bg-black/50" />
			<Dialog.Content class="bulk-modal">
				<Dialog.Title class="bulk-modal-title">{$_('select_date_range')}</Dialog.Title>
				<Dialog.Description class="bulk-modal-description">
					{$_('bulk_download_description')}
				</Dialog.Description>

				<div class="modal-date-picker">
					<DateRangePicker.Root
						bind:value={modalDateRange}
						onValueChange={handleModalDateChange}
						weekdayFormat="short"
						fixedWeeks={true}
						pagedNavigation={true}
						maxValue={dateToCalendarDate(new Date())}
						class="flex w-full flex-col gap-1.5"
					>
						<div
							class="relative flex w-full rounded border border-gray-300 bg-white px-2 py-1 text-lg text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
						>
							{#each ['start', 'end'] as const as type (type)}
								<DateRangePicker.Input {type}>
									{#snippet children({ segments })}
										{#each segments as { part, value }, i (part + i)}
											<div class="inline-block select-none">
												{#if part === 'literal'}
													<DateRangePicker.Segment
														{part}
														class="p-1 text-gray-500 dark:text-gray-400"
													>
														{value}
													</DateRangePicker.Segment>
												{:else}
													<DateRangePicker.Segment
														{part}
														class="rounded px-1 py-1 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 focus-visible:ring-0! focus-visible:ring-offset-0! aria-[valuetext=Empty]:text-gray-400 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700 dark:focus:text-white dark:aria-[valuetext=Empty]:text-gray-500"
													>
														{value}
													</DateRangePicker.Segment>
												{/if}
											</div>
										{/each}
									{/snippet}
								</DateRangePicker.Input>
								{#if type === 'start'}
									<div aria-hidden="true" class="px-1 text-gray-500 dark:text-gray-400">–</div>
								{/if}
							{/each}

							<DateRangePicker.Trigger
								class="ml-auto inline-flex size-8 items-center justify-center rounded text-gray-600 transition-all hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
							>
								<MaterialIcon name="calendar_month" />
							</DateRangePicker.Trigger>
						</div>

						<DateRangePicker.Content sideOffset={6} class="z-50">
							<DateRangePicker.Calendar
								class="mt-2 rounded-lg border border-gray-300 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
							>
								{#snippet children({ months, weekdays })}
									<DateRangePicker.Header class="mb-4 flex items-center justify-between">
										<DateRangePicker.PrevButton
											class="inline-flex size-8 items-center justify-center rounded transition-all hover:bg-gray-100 dark:hover:bg-zinc-700"
										>
											<MaterialIcon name="chevron_left" />
										</DateRangePicker.PrevButton>
										<DateRangePicker.Heading
											class="text-sm font-medium text-gray-900 dark:text-white"
										/>
										<DateRangePicker.NextButton
											class="inline-flex size-8 items-center justify-center rounded transition-all hover:bg-gray-100 dark:hover:bg-zinc-700"
										>
											<MaterialIcon name="chevron_right" />
										</DateRangePicker.NextButton>
									</DateRangePicker.Header>

									<div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
										{#each months as month (month.value)}
											<DateRangePicker.Grid class="w-full border-collapse space-y-1 select-none">
												<DateRangePicker.GridHead>
													<DateRangePicker.GridRow class="mb-1 flex w-full justify-between">
														{#each weekdays as day (day)}
															<DateRangePicker.HeadCell
																class="w-8 rounded text-center text-xs font-normal! text-gray-600 dark:text-gray-400"
															>
																<div>{day.slice(0, 2)}</div>
															</DateRangePicker.HeadCell>
														{/each}
													</DateRangePicker.GridRow>
												</DateRangePicker.GridHead>
												<DateRangePicker.GridBody>
													{#each month.weeks as weekDates (weekDates)}
														<DateRangePicker.GridRow class="flex w-full">
															{#each weekDates as date (date)}
																<DateRangePicker.Cell
																	{date}
																	month={month.value}
																	class="relative m-0 size-8 overflow-visible p-0! text-center text-sm focus-within:relative focus-within:z-20"
																>
																	<DateRangePicker.Day
																		class="size-8 rounded border border-transparent text-xs font-normal text-gray-900 transition-all hover:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:ring-offset-1 data-disabled:pointer-events-none data-disabled:text-gray-400 data-highlighted:rounded-none data-highlighted:bg-gray-100 data-outside-month:pointer-events-none data-selected:bg-gray-100 data-selected:font-medium data-selected:text-gray-900 data-selection-end:rounded data-selection-end:bg-gray-900 data-selection-end:font-medium data-selection-end:text-white data-selection-start:rounded data-selection-start:bg-gray-900 data-selection-start:font-medium data-selection-start:text-white data-selection-start:focus-visible:ring-2 data-selection-start:focus-visible:ring-offset-2! data-unavailable:text-gray-400 data-unavailable:line-through dark:text-white dark:hover:border-white dark:focus-visible:ring-white! dark:data-disabled:text-gray-500 dark:data-highlighted:bg-zinc-700 dark:data-selected:bg-zinc-700 dark:data-selected:text-white dark:data-selection-end:bg-white dark:data-selection-end:text-gray-900 dark:data-selection-start:bg-white dark:data-selection-start:text-gray-900 dark:data-unavailable:text-gray-500 data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:rounded-none data-selected:[&:not([data-selection-start])]:[&:not([data-selection-end])]:focus-visible:ring-0!"
																	>
																		{date.day}
																	</DateRangePicker.Day>
																</DateRangePicker.Cell>
															{/each}
														</DateRangePicker.GridRow>
													{/each}
												</DateRangePicker.GridBody>
											</DateRangePicker.Grid>
										{/each}
									</div>
								{/snippet}
							</DateRangePicker.Calendar>
						</DateRangePicker.Content>
					</DateRangePicker.Root>
				</div>

				<div class="modal-actions">
					<button type="button" class="modal-button secondary" on:click={cancelBulkDownload}>
						{$_('cancel')}
					</button>
					<button
						type="button"
						class="modal-button primary"
						disabled={!modalStartDate || !modalEndDate || bulkDownloading}
						on:click={confirmBulkDownload}
					>
						{$_('download')}
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	{#if bulkDownloading && bulkProgress}
		<p class="bulk-progress" role="status">
			{$_('bulk_progress_message', {
				values: {
					current: bulkProgress.current,
					total: bulkProgress.total
				}
			})}
		</p>
	{/if}

	{#if filteredReports.length > 0}
		<div class="table-wrapper">
			<table class="reports-table">
				<thead>
					<tr>
						<th scope="col" class="selection-header">
							<span>{$_('selection')}</span>
							<label class="selection-toggle">
								<input
									type="checkbox"
									bind:this={selectAllCheckbox}
									checked={allVisibleSelected}
									aria-label={$_('select_all_reports_aria')}
									on:change={handleSelectAllChange}
								/>
							</label>
						</th>
						<th scope="col">{$_('Report')}</th>
						<th scope="col">{$_('Device')}</th>
						<th scope="col">{$_('Created')}</th>
						<th scope="col" class="table-actions-header">{$_('export')}</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredReports as report (report.id)}
						<tr>
							<td data-title={$_('selection')} class="selection-cell">
								<label class="selection-checkbox">
									<input
										type="checkbox"
										checked={selectedReportIds.includes(report.id)}
										aria-label={$_('select_report_aria', {
											values: { name: getReportLabel(report) }
										})}
										on:change={(event) => handleRowSelectionChange(event, report.id)}
									/>
								</label>
							</td>
							<td data-title={$_('Report')}>
								<div class="name-cell">
									<Icon class="name-icon" path={mdiFileDocument} size="20" />
									<span class="name-text" title={report.name || $_('untitled_report')}>
										{report.name || $_('untitled_report')}
									</span>
								</div>
							</td>
							<td data-title={$_('Device')}>
								{report.cw_device?.name ?? $_('N/A')} <small>({report.dev_eui ?? $_('N/A')})</small>
							</td>
							<td data-title={$_('Created')}>
								{formatDate(report.created_at)}
							</td>
							<td class="table-actions flex" data-title={$_('export')}>
								<ExportButton types={['pdf']} buttonLabel="" devEui={report.dev_eui} />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="no-reports">
			<Icon class="text-4xl text-gray-400" path={mdiAlert} />
			<p class="text-gray-500 dark:text-gray-300">
				{searchTerm ? $_('no_reports_match_search') : $_('no_reports_found')}
			</p>
		</div>
	{/if}
</div>

<style>
	.search-container {
		min-width: 260px;
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: rgb(148 163 184);
		pointer-events: none;
	}

	:global(.dark) .search-icon {
		color: rgb(156 163 175);
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem 0.5rem 2.5rem;
		height: 2.75rem;
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

	.actions-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.bulk-download-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 1.1rem;
		height: 2.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgb(59 130 246);
		background-color: rgb(37 99 235);
		color: white;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease,
			background-color 0.15s ease;
	}

	.bulk-download-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25);
	}

	.bulk-download-btn:focus-visible {
		outline: 2px solid rgb(147 197 253);
		outline-offset: 2px;
	}

	.bulk-download-btn[disabled] {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	:global(.dark) .bulk-download-btn {
		background-color: rgb(29 78 216);
		border-color: rgb(37 99 235);
	}

	:global(.dark) .bulk-download-btn:hover {
		background-color: rgb(37 99 235);
	}

	.bulk-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 9999px;
		animation: bulk-spin 0.8s linear infinite;
	}

	@keyframes bulk-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.bulk-progress {
		font-size: 0.875rem;
		color: rgb(59 130 246);
	}

	:global(.dark) .bulk-progress {
		color: rgb(147 197 253);
	}

	.download-icon {
		color: inherit;
	}

	.selection-header {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 120px;
	}

	.selection-toggle {
		display: flex;
		align-items: center;
	}

	.selection-cell {
		text-align: center;
	}

	.selection-checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.selection-checkbox input,
	.selection-toggle input {
		width: 1rem;
		height: 1rem;
		accent-color: rgb(59 130 246);
	}

	:global(.dark) .selection-checkbox input,
	:global(.dark) .selection-toggle input {
		accent-color: rgb(147 197 253);
	}

	:global(.bulk-modal) {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(90vw, 24rem);
		border-radius: 0.75rem;
		background-color: rgb(255 255 255);
		padding: 1.5rem;
		box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
		color: rgb(17 24 39);
	}

	:global(.dark .bulk-modal) {
		background-color: rgb(31 41 55);
		color: rgb(229 231 235);
	}

	:global(.bulk-modal-title) {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	:global(.bulk-modal-description) {
		font-size: 0.9rem;
		color: rgb(75 85 99);
		margin-bottom: 1rem;
	}

	:global(.dark .bulk-modal-description) {
		color: rgb(148 163 184);
	}

	.modal-date-picker {
		margin-bottom: 1.5rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.modal-button {
		border-radius: 0.5rem;
		padding: 0.45rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.modal-button.secondary {
		background-color: transparent;
		border-color: rgb(209 213 219);
		color: rgb(75 85 99);
	}

	.modal-button.secondary:hover {
		background-color: rgb(229 231 235);
	}

	.modal-button.primary {
		background-color: rgb(37 99 235);
		color: white;
		border-color: rgb(37 99 235);
	}

	.modal-button.primary:hover {
		background-color: rgb(29 78 216);
		transform: translateY(-1px);
	}

	.modal-button[disabled] {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	:global(.dark) .modal-button.secondary {
		border-color: rgb(75 85 99);
		color: rgb(209 213 219);
	}

	:global(.dark) .modal-button.secondary:hover {
		background-color: rgba(148, 163, 184, 0.1);
	}

	:global(.dark) .modal-button.primary {
		background-color: rgb(29 78 216);
		border-color: rgb(37 99 235);
	}

	:global(.dark) .modal-button.primary:hover {
		background-color: rgb(37 99 235);
	}

	.table-wrapper {
		overflow-x: auto;
		border-radius: 0.75rem;
		border: 1px solid rgb(229 231 235);
		background-color: rgb(249 250 251);
	}

	:global(.dark) .table-wrapper {
		border-color: rgb(55 65 81);
		background-color: rgba(31, 41, 55, 0.6);
	}

	.reports-table {
		width: 100%;
		min-width: 640px;
		border-collapse: collapse;
	}

	.reports-table thead {
		background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(56, 189, 248, 0.15));
	}

	:global(.dark) .reports-table thead {
		background: linear-gradient(90deg, rgba(37, 99, 235, 0.25), rgba(14, 165, 233, 0.25));
	}

	.reports-table th,
	.reports-table td {
		padding: 0.85rem 1rem;
		text-align: left;
		border-bottom: 1px solid rgb(229 231 235);
		color: rgb(31 41 55);
		font-size: 0.95rem;
	}

	:global(.dark) .reports-table th,
	:global(.dark) .reports-table td {
		border-color: rgba(75, 85, 99, 0.7);
		color: rgb(229 231 235);
	}

	.reports-table th {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75rem;
		color: rgb(31 41 55);
	}

	:global(.dark) .reports-table th {
		color: rgb(191 219 254);
	}

	.reports-table tbody tr:nth-child(even) {
		background-color: rgba(59, 130, 246, 0.05);
	}

	:global(.dark) .reports-table tbody tr:nth-child(even) {
		background-color: rgba(59, 130, 246, 0.12);
	}

	.reports-table tbody tr:hover {
		background-color: rgba(59, 130, 246, 0.12);
	}

	:global(.dark) .reports-table tbody tr:hover {
		background-color: rgba(59, 130, 246, 0.2);
	}

	.name-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 320px;
	}

	.name-icon {
		color: rgb(37 99 235);
		flex-shrink: 0;
	}

	:global(.dark) .name-icon {
		color: rgb(191 219 254);
	}

	.name-text {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .name-text {
		color: rgb(191 219 254);
	}

	.table-actions {
		text-align: center;
		white-space: nowrap;
	}

	.table-actions-header {
		text-align: center;
	}

	.muted {
		color: rgb(107 114 128);
	}

	:global(.dark) .muted {
		color: rgb(156 163 175);
	}

	.no-reports {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		border-radius: 0.75rem;
		background-color: var(--color-card, rgb(255 255 255));
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		gap: 1rem;
	}

	:global(.dark) .no-reports {
		background-color: rgb(31 41 55);
	}

	@media (max-width: 768px) {
		.search-container {
			min-width: 100%;
		}

		.actions-group {
			width: 100%;
			justify-content: flex-start;
		}

		.bulk-download-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
