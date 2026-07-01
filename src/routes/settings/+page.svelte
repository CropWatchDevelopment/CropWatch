<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
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

	let { data, form }: PageProps = $props();

	const toast = useCwToast();
	const initial = (() => data)();

	// Seed from the loaded (DB) preferences. The theme picker itself resolves
	// light/dark/system against its own localStorage; when localStorage is empty
	// the DB-seeded value wins and the picker persists it, giving cross-device sync.
	let preferences = $state<PreferenceDraft>({ ...initial.preferences });
	let saving = $state(false);

	const isDirty = $derived(JSON.stringify(preferences) !== JSON.stringify(data.preferences));
	const themeLabel = $derived(
		preferences.theme === 'dark'
			? m.settings_theme_dark()
			: preferences.theme === 'light'
				? m.settings_theme_light()
				: m.settings_theme_system()
	);

	async function resetForm() {
		preferences = { ...data.preferences };
		try {
			await setLocale(preferences.language);
		} catch (error) {
			console.error('Failed to reset locale:', error);
		}
	}
</script>

<svelte:head>
	<title>{m.nav_settings()} - CropWatch</title>
</svelte:head>

<AppPage width="xl">
	<form
		method="POST"
		action="?/updatePreferences"
		class="settings-grid"
		use:enhance={() => {
			saving = true;
			return async ({ result }) => {
				saving = false;
				await applyAction(result);
				if (result.type === 'success') {
					toast.add({ tone: 'success', message: m.settings_saved() });
					await invalidateAll();
				} else if (result.type === 'failure' && typeof result.data?.error === 'string') {
					toast.add({ tone: 'danger', message: result.data.error });
				}
			};
		}}
	>
		<!-- Persisted theme lives in a hidden field so the CwThemePicker value is POSTed. -->
		<input type="hidden" name="theme" value={preferences.theme} />

		<div class="settings-card settings-card--regional">
			<CwCard title={m.settings_regional_title()} subtitle={m.settings_regional_subtitle()} elevated>
				<AppFormStack padded>
					<div class="field-grid field-grid--two">
						<LanguageSwitcher compact class="mr-3" />

						<CwDropdown
							id="settings-timezone-select"
							name="timezone"
							label={m.settings_timezone_label()}
							placeholder={m.settings_timezone_placeholder()}
							options={data.options.timezone}
							bind:value={preferences.timezone}
						/>

						<CwDropdown
							id="settings-date-format-select"
							name="dateFormat"
							label={m.settings_date_format_label()}
							options={data.options.dateFormat}
							bind:value={preferences.dateFormat}
						/>

						<CwDropdown
							id="settings-time-format-select"
							name="timeFormat"
							label={m.settings_time_format_label()}
							options={data.options.timeFormat}
							bind:value={preferences.timeFormat}
						/>
					</div>
				</AppFormStack>
			</CwCard>
		</div>

		<div class="settings-card settings-card--appearance">
			<CwCard
				title={m.settings_appearance_title()}
				subtitle={m.settings_appearance_subtitle()}
				elevated
			>
				<AppFormStack padded>
					<div class="theme-row">
						<div class="theme-copy">
							<p class="section-title">{m.settings_theme_label()}</p>
							<p class="section-copy">{themeLabel}</p>
						</div>
						<CwThemePicker bind:theme={preferences.theme} />
					</div>

					<div class="field-grid field-grid--two">
						<CwDropdown
							id="settings-distance-select"
							name="distanceUnit"
							label={m.settings_distance_label()}
							options={data.options.distance}
							bind:value={preferences.distanceUnit}
						/>

						<CwDropdown
							id="settings-area-select"
							name="areaUnit"
							label={m.settings_area_label()}
							options={data.options.area}
							bind:value={preferences.areaUnit}
						/>
					</div>
				</AppFormStack>
			</CwCard>
		</div>

		<div class="settings-card settings-card--notation">
			<CwCard title={m.settings_units_title()} subtitle={m.settings_units_subtitle()} elevated>
				<AppFormStack padded>
					<div class="field-grid field-grid--two">
						<CwDropdown
							id="settings-temperature-select"
							name="temperatureUnit"
							label={m.settings_temperature_label()}
							options={data.options.temperature}
							bind:value={preferences.temperatureUnit}
						/>

						<CwDropdown
							id="settings-ec-select"
							name="ecUnit"
							label={m.settings_ec_label()}
							options={data.options.ec}
							bind:value={preferences.ecUnit}
						/>

						<CwDropdown
							id="settings-water-level-select"
							name="waterDepthUnit"
							label={m.settings_water_level_label()}
							options={data.options.waterDepth}
							bind:value={preferences.waterDepthUnit}
						/>

						<CwDropdown
							id="settings-weight-select"
							name="weightUnit"
							label={m.settings_weight_label()}
							options={data.options.weight}
							bind:value={preferences.weightUnit}
						/>

						<CwDropdown
							id="settings-soil-moisture-select"
							name="soilMoistureUnit"
							label={m.settings_soil_moisture_label()}
							options={data.options.soilMoisture}
							bind:value={preferences.soilMoistureUnit}
						/>

						<CwDropdown
							id="settings-pressure-select"
							name="pressureUnit"
							label={m.settings_pressure_label()}
							options={data.options.pressure}
							bind:value={preferences.pressureUnit}
						/>

						<CwDropdown
							id="settings-rainfall-select"
							name="rainfallUnit"
							label={m.settings_rainfall_label()}
							options={data.options.rainfall}
							bind:value={preferences.rainfallUnit}
						/>

						<CwDropdown
							id="settings-wind-speed-select"
							name="windSpeedUnit"
							label={m.settings_wind_speed_label()}
							options={data.options.windSpeed}
							bind:value={preferences.windSpeedUnit}
						/>

						<CwDropdown
							id="settings-co2-select"
							name="co2Unit"
							label={m.settings_co2_label()}
							options={data.options.co2}
							bind:value={preferences.co2Unit}
						/>
					</div>
				</AppFormStack>
			</CwCard>
		</div>

		<div class="settings-card settings-card--actions">
			<CwCard title={m.settings_actions_title()} elevated>
				<AppFormStack padded>
					<div class="chip-row">
						<CwChip label={themeLabel} tone="secondary" variant="outline" />
						{#if preferences.timezone}
							<CwChip label={preferences.timezone} tone="info" variant="soft" />
						{/if}
					</div>

					<AppActionRow>
						<CwButton
							id="settings-reset-button"
							type="button"
							variant="ghost"
							onclick={resetForm}
							disabled={!isDirty || saving}
						>
							{m.settings_reset()}
						</CwButton>
						<CwButton id="settings-save-button" type="submit" variant="primary" loading={saving} disabled={!isDirty}>
							{m.action_save_changes()}
						</CwButton>
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
