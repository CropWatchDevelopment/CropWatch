<script lang="ts">
	import { AppActionRow, AppFormStack, AppPage } from '$lib/components/layout';
	import { setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwThemePicker,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

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

	async function resetForm() {
		const initialPreferences = getInitialPreferences();
		preferences = { ...initialPreferences };

		try {
			await setLocale(initialPreferences.language);
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

<AppPage width="xl" class="settings-page">
	<form class="settings-grid" onsubmit={(event) => event.preventDefault()}>
		<div class="settings-card settings-card--regional">
			<CwCard
				title="Regional preferences"
				subtitle="Control localization, number formatting, and the calendar notation used in reports."
				elevated
			>
				<AppFormStack padded>
					<div class="field-grid field-grid--two">
						<LanguageSwitcher compact class="mr-3" />

						<CwDropdown
							label="Date format"
							options={data.options.dateFormat}
							bind:value={preferences.dateFormat}
							disabled
						/>

						<CwDropdown
							label="Time format"
							options={data.options.timeFormat}
							bind:value={preferences.timeFormat}
							disabled
						/>

						<CwDropdown
							label="Decimal separator"
							options={data.options.decimalSeparator}
							bind:value={preferences.decimalSeparator}
							disabled
						/>
					</div>

					<div class="chip-row">
						<CwChip label={languageLabel} tone="secondary" variant="outline" />
						<CwChip label={formatLabel} tone="primary" variant="soft" />
					</div>
				</AppFormStack>
			</CwCard>
		</div>

		<div class="settings-card settings-card--appearance">
			<CwCard
				title="Appearance and mapping"
				subtitle="Keep the UI theme and spatial notation aligned with the operators reading the data."
				elevated
			>
				<AppFormStack padded>
					<div class="theme-row">
						<div class="theme-copy">
							<p class="section-title">Theme mode</p>
							<p class="section-copy">{themeLabel}</p>
						</div>
						<CwThemePicker bind:theme={preferences.theme} />
					</div>

					<div class="field-grid field-grid--two">
						<CwDropdown
							label="Distance"
							options={data.options.distance}
							bind:value={preferences.distanceUnit}
							disabled
						/>

						<CwDropdown
							label="Area"
							options={data.options.area}
							bind:value={preferences.areaUnit}
							disabled
						/>
					</div>

					<div class="chip-row">
						<CwChip label={spatialLabel} tone="info" variant="soft" />
					</div>
				</AppFormStack>
			</CwCard>
		</div>

		<div class="settings-card settings-card--notation">
			<CwCard
				title="Sensor notation"
				subtitle="Choose the units operators will expect when comparing air, soil, and water measurements."
				elevated
			>
				<AppFormStack padded>
					<div class="field-grid field-grid--two">
						<CwDropdown
							label="Temperature"
							options={data.options.temperature}
							bind:value={preferences.temperatureUnit}
							disabled
						/>

						<CwDropdown
							label="EC"
							options={data.options.ec}
							bind:value={preferences.ecUnit}
							disabled
						/>

						<CwDropdown
							label="Soil moisture"
							options={data.options.soilMoisture}
							bind:value={preferences.soilMoistureUnit}
							disabled
						/>

						<CwDropdown
							label="Pressure"
							options={data.options.pressure}
							bind:value={preferences.pressureUnit}
							disabled
						/>

						<CwDropdown
							label="Rainfall"
							options={data.options.rainfall}
							bind:value={preferences.rainfallUnit}
							disabled
						/>

						<CwDropdown
							label="Wind speed"
							options={data.options.windSpeed}
							bind:value={preferences.windSpeedUnit}
							disabled
						/>

						<CwDropdown
							label="Water depth"
							options={data.options.waterDepth}
							bind:value={preferences.waterDepthUnit}
							disabled
						/>

						<CwDropdown
							label="CO2"
							options={data.options.co2}
							bind:value={preferences.co2Unit}
							disabled
						/>
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
				</AppFormStack>
			</CwCard>
		</div>

		<div class="settings-card settings-card--actions">
			<CwCard
				title="Preview and actions"
				subtitle="These controls still operate on the local preview state until the settings API is wired."
				elevated
			>
				<AppFormStack padded>
					<div class="chip-row">
						<CwChip label={themeLabel} tone="secondary" variant="outline" />
						<CwChip label={spatialLabel} tone="info" variant="soft" />
						<CwChip label={formatLabel} tone="primary" variant="soft" />
					</div>

					<AppActionRow>
						<CwButton type="button" variant="secondary" onclick={resetForm} disabled={!isDirty}>
							Reset preview
						</CwButton>
						<CwButton type="button" variant="primary" onclick={handleSave}>Save settings</CwButton>
					</AppActionRow>
				</AppFormStack>
			</CwCard>
		</div>
	</form>
</AppPage>

<style>
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
	.settings-card--actions {
		grid-column: span 12;
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
	}

	.theme-copy {
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
		color: var(--cw-text-secondary);
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	@media (max-width: 1023px) {
		.field-grid--two {
			grid-template-columns: 1fr;
		}

		.settings-card--regional,
		.settings-card--appearance,
		.settings-card--notation,
		.settings-card--actions {
			grid-column: span 12;
		}

		.theme-row {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
