# Svelte Page Componentization Plan

Target: split all route pages over 500 lines into smaller components.

## 1) src/routes/locations/location/[location_id]/devices/device/[dev_eui]/+page.svelte (~1291 lines)
- Extract DeviceHeader: header title, device EUI copy, location/facility/updated.
- Extract TrafficSection: traffic dashboard wrapper + conditional display.
- Extract MetricCardsSection: metric cards grid.
- Extract HeatmapSection: DeviceHeatmap boundary.
- Extract LineChartSection: CWLineChart + date range picker.
- Extract TelemetryTableSection: CWTable boundary.
- Extract DownloadDialogSection: CWDialog for downloads.

## 2) src/routes/locations/location/[location_id]/create-device/+page.svelte (~1257 lines)
- Extract CreateDeviceHeader (title, breadcrumbs, actions).
- Extract CreateDeviceForm (form inputs, validation state, submit actions).
- Extract DevicePreviewPanel (preview/summary card).
- Extract PermissionsPanel (permissions UI if present).

## 3) src/routes/compare/+page.svelte (~1096 lines)
- Extract CompareHeader (filters, date range, actions).
- Extract CompareCharts (main charting area).
- Extract CompareTable (comparison table/list).
- Extract CompareSidebar (device/metric selectors).

## 4) src/routes/+page.svelte (~1011 lines)
- Extract DashboardHeader (top KPIs/actions).
- Extract DashboardSummaryCards (stat cards).
- Extract DashboardCharts (line/bar charts).
- Extract DashboardTables (recent items).

## 5) src/routes/account/payments/+page.svelte (~864 lines)
- Extract PaymentsHeader (title/actions).
- Extract BillingSummary (current plan, usage).
- Extract PaymentMethods (cards list + actions).
- Extract InvoicesTable (billing history).

## 6) src/routes/account/+page.svelte (~811 lines)
- Extract AccountHeader (profile header).
- Extract AccountProfileForm (profile details form).
- Extract AccountSecurityPanel (password, MFA).
- Extract AccountPreferences (settings toggles).

## 7) src/routes/locations/location/[location_id]/devices/device/[dev_eui]/settings/+page.svelte (~753 lines)
- Extract DeviceSettingsHeader.
- Extract DeviceSettingsForm.
- Extract AlertsSettingsPanel.
- Extract PermissionsSettingsPanel.

## 8) src/routes/reports/[report_id]/edit-report/+page.svelte (~698 lines)
- Extract ReportHeader.
- Extract ReportForm.
- Extract ReportPreview.

## 9) src/routes/locations/location/[location_id]/+page.svelte (~661 lines)
- Extract LocationHeader.
- Extract LocationStatsCards.
- Extract LocationDevicesTable.
- Extract LocationMap/Charts.

## 10) src/routes/auth/register/+page.svelte (~574 lines)
- Extract RegisterHeader.
- Extract RegisterForm.
- Extract RegisterBenefits/Sidebar.

Notes:
- New components will live under src/lib/components/pages/[route]/ for clarity.
- Keep existing logic in the page where possible; pass data down as props.
- After splitting, run qlty metrics and qlty smells.
