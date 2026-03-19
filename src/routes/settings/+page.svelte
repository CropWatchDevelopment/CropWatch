<script lang="ts">
	import { setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwSeparator,
		CwSwitch,
		CwThemePicker,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';

	type SupportedLocale = 'ja' | 'en';
	type PreferenceDraft = PageProps['data']['preferences'];
	type Option = { label: string; value: string };

	let { data }: PageProps = $props();

	const toast = useCwToast();

	function getInitialPreferences(): PreferenceDraft {
		return { ...data.preferences };
	}

	let preferences = $state(getInitialPreferences());

	const isDirty = $derived(JSON.stringify(preferences) !== JSON.stringify(data.preferences));
	const languageLabel = $derived(getOptionLabel(data.options.language, preferences.language));
	const temperatureLabel = $derived(
		getOptionLabel(data.options.temperature, preferences.temperatureUnit)
	);
	const ecLabel = $derived(getOptionLabel(data.options.ec, preferences.ecUnit));
	const formatLabel = $derived(
		`${getOptionLabel(data.options.dateFormat, preferences.dateFormat)} / ${getOptionLabel(data.options.timeFormat, preferences.timeFormat)}`
	);
	const spatialLabel = $derived(
		`${getOptionLabel(data.options.distance, preferences.distanceUnit)} / ${getOptionLabel(data.options.area, preferences.areaUnit)}`
	);
	const themeLabel = $derived(getThemeLabel(preferences.theme));

	function getOptionLabel(options: Option[], value: string): string {
		return options.find((option) => option.value === value)?.label ?? value;
	}

	function getThemeLabel(theme: PreferenceDraft['theme']): string {
		if (theme === 'dark') return 'Dark';
		if (theme === 'light') return 'Light';
		return 'System';
	}

	async function handleLanguageChange(nextLanguage: SupportedLocale) {
		preferences.language = nextLanguage;

		try {
			await setLocale(nextLanguage as SupportedLocale);
		} catch (error) {
			console.error('Failed to update locale:', error);
			toast.add({
				tone: 'danger',
				message: 'Unable to switch languages in this preview.'
			});
		}
	}

	async function resetForm() {
		const initialPreferences = getInitialPreferences();
		preferences = { ...initialPreferences };

		try {
			await setLocale(initialPreferences.language as SupportedLocale);
		} catch (error) {
			console.error('Failed to reset locale:', error);
		}

		toast.add({
			tone: 'info',
			message: 'Settings returned to the mock defaults.'
		});
	}

	function handleSave() {
		if (!isDirty) {
			toast.add({
				tone: 'info',
				message: 'No mock setting changes to save yet.'
			});
			return;
		}

		toast.add({
			tone: 'info',
			message: 'Settings persistence is intentionally deferred until you wire the API service.'
		});
	}
</script>

<svelte:head>
	<title>{m.nav_settings()} - CropWatch</title>
</svelte:head>

<div class="settings-page">
	<div class="settings-shell">
		<CwCard
			title={m.nav_settings()}
			subtitle="Define the notation, language, and presentation defaults CropWatch should use across dashboards, telemetry tables, and exports."
			elevated
		>
			{#snippet actions()}
				<div class="settings-meta">
					{#if data.email}
						<CwChip label={data.email} tone="info" variant="soft" size="sm" />
					{/if}
					{#if data.role}
						<CwChip label={data.role} tone="secondary" variant="outline" size="sm" />
					{/if}
					<CwChip label="Mockup only" tone="warning" variant="soft" size="sm" />
				</div>
			{/snippet}

			<div class="settings-hero">
				<div class="hero-copy">
					<p class="hero-eyebrow">Workspace defaults</p>
					<h2>Standardize how every sensor reading is presented before you wire persistence.</h2>
					<p>
						This page focuses on the preferences CropWatch is already surfacing elsewhere in the
						app: environmental units, field reporting notation, and the UI defaults that shape day
						to day monitoring.
					</p>
				</div>

				<div class="hero-grid">
					<div class="hero-stat">
						<span class="hero-stat__label">Language</span>
						<strong>{languageLabel}</strong>
					</div>
					<div class="hero-stat">
						<span class="hero-stat__label">Theme</span>
						<strong>{themeLabel}</strong>
					</div>
					<div class="hero-stat">
						<span class="hero-stat__label">Temperature</span>
						<strong>{temperatureLabel}</strong>
					</div>
					<div class="hero-stat">
						<span class="hero-stat__label">EC</span>
						<strong>{ecLabel}</strong>
					</div>
				</div>
			</div>
		</CwCard>

		<form class="settings-grid" onsubmit={(event) => event.preventDefault()}>
			<div class="settings-card settings-card--regional">
				<CwCard
					title="Regional preferences"
					subtitle="Control localization, number formatting, and the calendar notation used in reports."
					elevated
				>
					<div class="card-stack">
						<div class="field-grid field-grid--two">
							<CwDropdown
								label="Language"
								options={data.options.language}
								bind:value={preferences.language}
								onchange={(value) => void handleLanguageChange(value as SupportedLocale)}
							/>

							<CwDropdown
								label="Date format"
								options={data.options.dateFormat}
								bind:value={preferences.dateFormat}
							/>

							<CwDropdown
								label="Time format"
								options={data.options.timeFormat}
								bind:value={preferences.timeFormat}
							/>

							<CwDropdown
								label="Decimal separator"
								options={data.options.decimalSeparator}
								bind:value={preferences.decimalSeparator}
							/>
						</div>

						<div class="chip-row">
							<CwChip label={formatLabel} tone="primary" variant="soft" />
							<CwChip label={languageLabel} tone="secondary" variant="outline" />
						</div>
					</div>
				</CwCard>
			</div>

			<div class="settings-card settings-card--appearance">
				<CwCard
					title="Appearance and mapping"
					subtitle="Keep the UI theme and spatial notation aligned with the operators reading the data."
					elevated
				>
					<div class="card-stack">
						<div class="theme-row">
							<div class="theme-copy">
								<p class="section-title">Theme mode</p>
								<p class="section-copy">
									Preview how CropWatch should follow system appearance or lock into a single theme.
								</p>
							</div>

							<CwThemePicker bind:theme={preferences.theme} />
						</div>

						<CwSeparator spacing="0" />

						<div class="field-grid field-grid--two">
							<CwDropdown
								label="Distance"
								options={data.options.distance}
								bind:value={preferences.distanceUnit}
							/>

							<CwDropdown
								label="Area"
								options={data.options.area}
								bind:value={preferences.areaUnit}
							/>
						</div>

						<div class="chip-row">
							<CwChip label={themeLabel} tone="info" variant="soft" />
							<CwChip label={spatialLabel} tone="secondary" variant="outline" />
						</div>
					</div>
				</CwCard>
			</div>

			<div class="settings-card settings-card--notation">
				<CwCard
					title="Sensor notation"
					subtitle="Choose the units operators will expect when comparing air, soil, and water measurements."
					elevated
				>
					<div class="card-stack">
						<div class="field-grid field-grid--two">
							<CwDropdown
								label="Temperature"
								options={data.options.temperature}
								bind:value={preferences.temperatureUnit}
							/>

							<CwDropdown label="EC" options={data.options.ec} bind:value={preferences.ecUnit} />

							<CwDropdown
								label="Soil moisture"
								options={data.options.soilMoisture}
								bind:value={preferences.soilMoistureUnit}
							/>

							<CwDropdown
								label="Pressure"
								options={data.options.pressure}
								bind:value={preferences.pressureUnit}
							/>

							<CwDropdown
								label="Rainfall"
								options={data.options.rainfall}
								bind:value={preferences.rainfallUnit}
							/>

							<CwDropdown
								label="Wind speed"
								options={data.options.windSpeed}
								bind:value={preferences.windSpeedUnit}
							/>

							<CwDropdown
								label="Water depth"
								options={data.options.waterDepth}
								bind:value={preferences.waterDepthUnit}
							/>

							<CwDropdown label="CO2" options={data.options.co2} bind:value={preferences.co2Unit} />
						</div>

						<div class="chip-row">
							<CwChip label={temperatureLabel} tone="primary" variant="soft" />
							<CwChip label={ecLabel} tone="info" variant="soft" />
							<CwChip
								label={getOptionLabel(data.options.soilMoisture, preferences.soilMoistureUnit)}
								tone="secondary"
								variant="outline"
							/>
						</div>
					</div>
				</CwCard>
			</div>

			<div class="settings-card settings-card--presentation">
				<CwCard
					title="Presentation defaults"
					subtitle="Decide how much context CropWatch should expose by default in dashboards and exports."
					elevated
				>
					<div class="switch-grid">
						<CwSwitch
							checked={preferences.compactDashboard}
							label="Compact dashboard cards"
							description="Fit more device summaries into one view for high density monitoring."
							onchange={(checked) => (preferences.compactDashboard = checked)}
						/>

						<CwSwitch
							checked={preferences.showDerivedMetrics}
							label="Show derived metrics"
							description="Surface calculated context such as combined summaries when it is available."
							onchange={(checked) => (preferences.showDerivedMetrics = checked)}
						/>

						<CwSwitch
							checked={preferences.includeUnitsInExports}
							label="Include units in exports"
							description="Append the selected notation to CSV, PDF, and table exports by default."
							onchange={(checked) => (preferences.includeUnitsInExports = checked)}
						/>

						<CwSwitch
							checked={preferences.highlightAlertThresholds}
							label="Highlight alert thresholds"
							description="Keep threshold-sensitive values visually emphasized inside telemetry views."
							onchange={(checked) => (preferences.highlightAlertThresholds = checked)}
						/>
					</div>
				</CwCard>
			</div>

			<div class="settings-card settings-card--save">
				<CwCard
					title="Preview summary"
					subtitle="Keep the save action mocked until the API service is ready."
					elevated
				>
					<div class="card-stack">
						<div class="preview-panel">
							<div class="preview-panel__copy">
								<p class="section-title">Current preview</p>
								<p class="section-copy">
									Your formatting profile is currently centered on {temperatureLabel},
									{` ${ecLabel}, ${formatLabel}, and ${themeLabel.toLowerCase()} mode.`}
								</p>
							</div>

							<div class="chip-row">
								<CwChip label={languageLabel} tone="secondary" variant="outline" />
								<CwChip label={temperatureLabel} tone="primary" variant="soft" />
								<CwChip label={ecLabel} tone="info" variant="soft" />
								<CwChip label={themeLabel} tone="warning" variant="outline" />
							</div>
						</div>

						<CwSeparator spacing="0" />

						<div class="action-row">
							<CwButton
								type="button"
								variant="ghost"
								onclick={() => void resetForm()}
								disabled={!isDirty}
							>
								Reset
							</CwButton>
							<CwButton type="button" variant="primary" onclick={handleSave}>
								Save Settings
							</CwButton>
						</div>
					</div>
				</CwCard>
			</div>
		</form>
	</div>
</div>

<style>
	.settings-page {
		width: 100%;
		min-height: 100%;
		padding: 1rem;
		overflow-y: auto;
	}

	.settings-shell {
		width: min(100%, 82rem);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.settings-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.settings-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 1fr);
		gap: 1rem;
		align-items: stretch;
	}

	.hero-copy {
		padding: 1.25rem;
		border-radius: 1.25rem;
		background:
			linear-gradient(135deg, color-mix(in srgb, #0f766e 30%, transparent), transparent 55%),
			color-mix(in srgb, var(--cw-bg-surface, #0f172a) 94%, transparent);
		border: 1px solid color-mix(in srgb, var(--cw-border-default, #334155) 72%, transparent);
	}

	.hero-eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--cw-text-secondary, #94a3b8);
	}

	.hero-copy h2 {
		margin: 0;
		font-size: clamp(1.4rem, 2vw, 2rem);
		line-height: 1.15;
	}

	.hero-copy p:last-child {
		margin: 0.85rem 0 0;
		max-width: 44rem;
		line-height: 1.6;
		color: var(--cw-text-secondary, #94a3b8);
	}

	.hero-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.hero-stat {
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--cw-border-default, #334155) 72%, transparent);
		background: color-mix(in srgb, var(--cw-bg-surface, #0f172a) 94%, transparent);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.hero-stat__label {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cw-text-secondary, #94a3b8);
	}

	.hero-stat strong {
		font-size: 1rem;
		line-height: 1.35;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 1rem;
	}

	.settings-card {
		min-width: 0;
	}

	.settings-card--regional,
	.settings-card--appearance {
		grid-column: span 6;
	}

	.settings-card--notation,
	.settings-card--presentation,
	.settings-card--save {
		grid-column: span 12;
	}

	.card-stack {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field-grid {
		display: grid;
		gap: 1rem;
	}

	.field-grid--two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.theme-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.25rem 0;
	}

	.theme-copy,
	.preview-panel__copy {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.section-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.section-copy {
		margin: 0;
		line-height: 1.55;
		color: var(--cw-text-secondary, #94a3b8);
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	.switch-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.preview-panel {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem;
		border-radius: 1rem;
		background:
			linear-gradient(140deg, color-mix(in srgb, #f59e0b 12%, transparent), transparent 50%),
			color-mix(in srgb, var(--cw-bg-surface, #0f172a) 94%, transparent);
		border: 1px solid color-mix(in srgb, var(--cw-border-default, #334155) 72%, transparent);
	}

	.action-row {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	@media (max-width: 900px) {
		.settings-hero,
		.field-grid--two,
		.switch-grid {
			grid-template-columns: 1fr;
		}

		.settings-card--regional,
		.settings-card--appearance,
		.settings-card--notation,
		.settings-card--presentation,
		.settings-card--save {
			grid-column: span 12;
		}

		.theme-row,
		.preview-panel {
			flex-direction: column;
			align-items: stretch;
		}

		.action-row {
			justify-content: stretch;
		}

		.action-row :global(.cw-button) {
			flex: 1 1 auto;
		}
	}
</style>
