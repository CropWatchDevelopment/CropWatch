<script lang="ts">
	import { success, error as errorToast } from '$lib/stores/toast.svelte';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { Dialog, DateRangePicker } from 'bits-ui';
	import type { DateRange } from 'bits-ui';
	import { CalendarDate } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
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
	let selectAllCheckbox = $state<HTMLInputElement | null>(null);
	let mobileSelectAllCheckbox = $state<HTMLInputElement | null>(null);

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
		const checkboxes = [selectAllCheckbox, mobileSelectAllCheckbox].filter(
			(checkbox): checkbox is HTMLInputElement => Boolean(checkbox)
		);
		for (const checkbox of checkboxes) {
			checkbox.indeterminate = someVisibleSelected;
		}
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

	function calendarDateToDate(value: DateValue): Date {
		if ('toDate' in value && typeof value.toDate === 'function') {
			return value.toDate('UTC');
		}
		const calendarDate = value as CalendarDate;
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

<div class="space-y-6 px-4 py-6 sm:px-6">
	<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
		<div class="min-w-0 flex-auto">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{$_('all_reports_heading')}</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				{$_('all_reports_subheading')}
			</p>
		</div>
		<div
			class="flex w-full flex-col gap-3 md:ml-auto md:max-w-md md:flex-row md:items-center md:justify-end"
		>
			<div class="min-w-[260px] max-sm:min-w-full">
				<div class="relative w-full">
					<Icon
						class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 dark:text-slate-400/80"
						path={mdiMagnify}
						size="18"
					/>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder={$_('search_reports_placeholder')}
						class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-10 text-sm text-gray-900 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-300"
						aria-label={$_('search_reports_placeholder')}
					/>
				</div>
			</div>
			<button
				type="button"
				class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-blue-500 to-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-px hover:shadow-blue-500/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:transform-none md:w-auto"
				disabled={!selectedReportIds.length || bulkDownloading}
				onclick={openBulkDownloadModal}
			>
				{#if bulkDownloading}
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						aria-hidden="true"
					></span>
					<span>{$_('downloading')}</span>
				{:else}
					<Icon class="shrink-0" path={mdiDownload} size="18" />
					<span>{$_('download_selected')}</span>
				{/if}
			</button>
		</div>
	</div>

	<div
		class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
	>
		<span>{$_('selection')}</span>
		<label class="flex items-center justify-center">
			<input
				type="checkbox"
				bind:this={mobileSelectAllCheckbox}
				checked={allVisibleSelected}
				aria-label={$_('select_all_reports_aria')}
				onchange={handleSelectAllChange}
				class="h-4 w-4 accent-blue-500 dark:accent-blue-300"
			/>
		</label>
	</div>

	<Dialog.Root bind:open={bulkModalOpen}>
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 bg-black/50 backdrop-blur-sm" />
			<Dialog.Content
				class="fixed top-1/2 left-1/2 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800 dark:text-slate-200"
			>
				<Dialog.Title class="mb-1 text-lg font-semibold text-slate-900 dark:text-white"
					>{$_('select_date_range')}</Dialog.Title
				>
				<Dialog.Description class="mb-4 text-sm text-slate-600 dark:text-slate-400">
					{$_('bulk_download_description')}
				</Dialog.Description>

				<div class="mb-6">
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

				<div class="flex justify-end gap-3">
					<button
						type="button"
						class="rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-700/50"
						onclick={cancelBulkDownload}
					>
						{$_('cancel')}
					</button>
					<button
						type="button"
						class="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:transform-none dark:border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
						disabled={!modalStartDate || !modalEndDate || bulkDownloading}
						onclick={confirmBulkDownload}
					>
						{$_('download')}
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	{#if bulkDownloading && bulkProgress}
		<p class="text-sm text-blue-500 dark:text-blue-300" role="status">
			{$_('bulk_progress_message', {
				values: {
					current: bulkProgress.current,
					total: bulkProgress.total
				}
			})}
		</p>
	{/if}

	{#if filteredReports.length > 0}
		<div class="hidden md:block">
			<div
				class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
			>
				<table class="w-full text-left text-sm">
					<thead
						class="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-900/50 dark:text-slate-400"
					>
						<tr>
							<th scope="col" class="w-36 px-4 py-3 font-medium">
								<div class="flex items-center gap-2">
									<span>{$_('selection')}</span>
									<label class="flex items-center justify-center">
										<input
											type="checkbox"
											bind:this={selectAllCheckbox}
											checked={allVisibleSelected}
											aria-label={$_('select_all_reports_aria')}
											onchange={handleSelectAllChange}
											class="h-4 w-4 accent-blue-500 dark:accent-blue-300"
										/>
									</label>
								</div>
							</th>
							<th scope="col" class="w-80 px-4 py-3 font-medium">{$_('Report')}</th>
							<th scope="col" class="w-72 px-4 py-3 font-medium">{$_('Device')}</th>
							<th scope="col" class="w-48 px-4 py-3 font-medium">{$_('Created')}</th>
							<th scope="col" class="w-40 px-4 py-3 font-medium">{$_('export')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200 dark:divide-slate-700">
						{#each filteredReports as report (report.id)}
							<tr class="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
								<td class="px-4 py-3">
									<label class="flex w-fit items-center justify-center">
										<input
											type="checkbox"
											checked={selectedReportIds.includes(report.id)}
											aria-label={$_('select_report_aria', {
												values: { name: getReportLabel(report) }
											})}
											onchange={(event) => handleRowSelectionChange(event, report.id)}
											class="h-4 w-4 accent-blue-500 dark:accent-blue-300"
										/>
									</label>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<Icon
											class="shrink-0 text-sky-600 dark:text-sky-300"
											path={mdiFileDocument}
											size="20"
										/>
										<span
											class="truncate font-medium text-slate-900 dark:text-slate-200"
											title={report.name || $_('untitled_report')}
										>
											{report.name || $_('untitled_report')}
										</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<a
										href={`/app/dashboard/location/${report.cw_device?.location_id}/devices/${report.dev_eui}/settings/reports`}
										class="text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
									>
										{report.cw_device?.name ?? $_('N/A')}
										<small class="ml-1 text-slate-500 dark:text-slate-400"
											>({report.dev_eui ?? $_('N/A')})</small
										>
									</a>
								</td>
								<td class="px-4 py-3 text-slate-600 dark:text-slate-300">
									{formatDate(report.created_at)}
								</td>
								<td class="px-4 py-3">
									<ExportButton types={['pdf']} buttonLabel="" devEui={report.dev_eui} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="space-y-4 md:hidden">
			{#each filteredReports as report (report.id)}
				<article
					class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex flex-1 items-start gap-3">
							<label class="mt-1 flex items-center justify-center">
								<input
									type="checkbox"
									checked={selectedReportIds.includes(report.id)}
									aria-label={$_('select_report_aria', {
										values: { name: getReportLabel(report) }
									})}
									onchange={(event) => handleRowSelectionChange(event, report.id)}
									class="h-5 w-5 accent-blue-500 dark:accent-blue-300"
								/>
							</label>
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<Icon class="text-blue-600 dark:text-blue-300" path={mdiFileDocument} size="20" />
									<p class="text-base font-semibold text-slate-900 dark:text-slate-50">
										{report.name || $_('untitled_report')}
									</p>
								</div>
								<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
									{report.cw_device?.name ?? $_('N/A')}
								</p>
							</div>
						</div>
						<div class="flex items-center">
							<ExportButton
								types={['pdf']}
								buttonLabel=""
								devEui={report.dev_eui}
								showDatePicker={false}
							/>
						</div>
					</div>
					<div class="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
						<div class="flex items-start justify-between gap-4">
							<span class="font-medium text-slate-500 dark:text-slate-400">{$_('Device')}</span>
							<a
								href={`/app/dashboard/location/${report.cw_device?.location_id}/devices/${report.dev_eui}/settings/reports`}
								class="text-right text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
							>
								{report.cw_device?.name ?? $_('N/A')}
								<small class="block text-xs text-slate-500 dark:text-slate-400"
									>{report.dev_eui ?? $_('N/A')}</small
								>
							</a>
						</div>
						<div class="flex items-center justify-between gap-4">
							<span class="font-medium text-slate-500 dark:text-slate-400">{$_('Created')}</span>
							<span>{formatDate(report.created_at)}</span>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50"
		>
			<Icon class="mb-3 text-4xl text-slate-400" path={mdiAlert} />
			<p class="text-lg font-medium text-slate-600 dark:text-slate-300">
				{searchTerm ? $_('no_reports_match_search') : $_('no_reports_found')}
			</p>
		</div>
	{/if}
</div>
