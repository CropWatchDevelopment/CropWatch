import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { overwriteSetLocale, setLocale } from '$lib/paraglide/runtime';
import { renderWithServices } from '$lib/testing/render';
import {
	getAreaUnitOptions,
	getCo2UnitOptions,
	getDateFormatOptions,
	getDistanceUnitOptions,
	getEcUnitOptions,
	getPressureUnitOptions,
	getRainfallUnitOptions,
	getSoilMoistureUnitOptions,
	getTemperatureUnitOptions,
	getTimeFormatOptions,
	getTimezoneOptions,
	getWaterLevelUnitOptions,
	getWeightUnitOptions,
	getWindSpeedUnitOptions
} from '$lib/units';
import SettingsPage from './+page.svelte';

const { invalidateAll, forms } = vi.hoisted(() => {
	const submits = new Map<HTMLFormElement, SubmitFunction>();
	return {
		invalidateAll: vi.fn(),
		forms: {
			submits,
			// `use:enhance` without the network: keep the form's submit function so
			// a test can run it, and never let the browser submit the form.
			enhance: vi.fn((form: HTMLFormElement, submit: SubmitFunction) => {
				submits.set(form, submit);
				const block = (event: Event) => event.preventDefault();
				form.addEventListener('submit', block);
				return {
					destroy: () => {
						submits.delete(form);
						form.removeEventListener('submit', block);
					}
				};
			}),
			applyAction: vi.fn(async () => {})
		}
	};
});
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ enhance: forms.enhance, applyAction: forms.applyAction }));

// The theme picker keeps its choice here and would override the saved theme.
const THEME_STORAGE_KEY = 'cwui-theme';
const originalSetLocale = setLocale;
const changeLocale = vi.fn();

const PREFERENCES = {
	language: 'ja' as const,
	theme: 'dark' as 'dark' | 'light' | 'system',
	temperatureUnit: 'celsius',
	weightUnit: 'kg',
	ecUnit: 'ms_cm',
	waterDepthUnit: 'mm',
	timezone: 'Asia/Tokyo',
	soilMoistureUnit: 'vwc_percent',
	rainfallUnit: 'mm',
	windSpeedUnit: 'm_s',
	pressureUnit: 'hpa',
	co2Unit: 'ppm',
	distanceUnit: 'km',
	areaUnit: 'hectares',
	dateFormat: 'yyyy_mm_dd',
	timeFormat: '24h'
};

const OPTIONS = {
	temperature: getTemperatureUnitOptions(),
	weight: getWeightUnitOptions(),
	ec: getEcUnitOptions(),
	waterDepth: getWaterLevelUnitOptions(),
	timezone: getTimezoneOptions(),
	soilMoisture: getSoilMoistureUnitOptions(),
	rainfall: getRainfallUnitOptions(),
	windSpeed: getWindSpeedUnitOptions(),
	pressure: getPressureUnitOptions(),
	co2: getCo2UnitOptions(),
	distance: getDistanceUnitOptions(),
	area: getAreaUnitOptions(),
	dateFormat: getDateFormatOptions(),
	timeFormat: getTimeFormatOptions()
};

/** Each dropdown: its trigger id, form field name and option list. */
const DROPDOWNS = [
	['settings-timezone-select', 'timezone', OPTIONS.timezone],
	['settings-date-format-select', 'dateFormat', OPTIONS.dateFormat],
	['settings-time-format-select', 'timeFormat', OPTIONS.timeFormat],
	['settings-distance-select', 'distanceUnit', OPTIONS.distance],
	['settings-area-select', 'areaUnit', OPTIONS.area],
	['settings-temperature-select', 'temperatureUnit', OPTIONS.temperature],
	['settings-ec-select', 'ecUnit', OPTIONS.ec],
	['settings-water-level-select', 'waterDepthUnit', OPTIONS.waterDepth],
	['settings-weight-select', 'weightUnit', OPTIONS.weight],
	['settings-soil-moisture-select', 'soilMoistureUnit', OPTIONS.soilMoisture],
	['settings-pressure-select', 'pressureUnit', OPTIONS.pressure],
	['settings-rainfall-select', 'rainfallUnit', OPTIONS.rainfall],
	['settings-wind-speed-select', 'windSpeedUnit', OPTIONS.windSpeed],
	['settings-co2-select', 'co2Unit', OPTIONS.co2]
] as const;

let view: ReturnType<typeof renderWithServices> | null = null;

function render(preferences: Partial<typeof PREFERENCES> = {}) {
	view = renderWithServices(SettingsPage, {
		props: {
			data: {
				email: 'ada@example.com',
				role: 'authenticated',
				preferences: { ...PREFERENCES, ...preferences },
				options: OPTIONS
			}
		} as never,
		app: { accessToken: 'jwt-token' }
	});
	flushSync();
	return view;
}

const form = () => document.querySelector<HTMLFormElement>('form[action="?/updatePreferences"]')!;
const field = (name: string) => form().querySelector<HTMLInputElement>(`input[name="${name}"]`);
const trigger = (id: string) => document.getElementById(id) as HTMLButtonElement;
const saveButton = () => document.getElementById('settings-save-button') as HTMLButtonElement;
const resetButton = () => document.getElementById('settings-reset-button') as HTMLButtonElement;
const chips = () =>
	[...document.querySelectorAll('.chip-row .cw-chip')].map((chip) => chip.textContent?.trim());
const themeLabel = () => document.querySelector('.theme-copy .section-copy')?.textContent?.trim();

function choose(id: string, label: string) {
	trigger(id).click();
	flushSync();
	[
		...(trigger(id).closest('.cw-dropdown')?.querySelectorAll<HTMLElement>('li[role="option"]') ??
			[])
	]
		.find((option) => option.textContent?.trim() === label)
		?.click();
	flushSync();
}

function chooseTheme(label: string) {
	document.querySelector<HTMLButtonElement>('.cw-theme-picker__trigger')?.click();
	flushSync();
	[...document.querySelectorAll<HTMLButtonElement>('.cw-theme-picker__option')]
		.find((option) => option.textContent?.trim() === label)
		?.click();
	flushSync();
}

/** Runs the form's enhance callback as SvelteKit would: submit, then the result handler. */
async function submit(result?: ActionResult) {
	const submitFn = forms.submits.get(form());
	if (!submitFn) throw new Error('No enhanced settings form');
	const url = new URL('http://localhost/settings?/updatePreferences');
	const formData = new FormData(form());
	const after = await submitFn({
		action: url,
		formData,
		formElement: form(),
		controller: new AbortController(),
		submitter: null,
		cancel: vi.fn()
	});
	flushSync();
	const finish = async (outcome: ActionResult) => {
		if (typeof after === 'function') {
			await after({
				action: url,
				formData,
				formElement: form(),
				result: outcome,
				update: vi.fn()
			});
		}
		flushSync();
	};
	if (result) await finish(result);
	return { formData, finish };
}

beforeEach(() => {
	localStorage.removeItem(THEME_STORAGE_KEY);
	overwriteSetLocale(changeLocale);
});

afterEach(() => {
	view?.unmount();
	view = null;
	overwriteSetLocale(originalSetLocale);
	changeLocale.mockReset();
	invalidateAll.mockReset();
	forms.applyAction.mockClear();
	localStorage.removeItem(THEME_STORAGE_KEY);
	document.documentElement.removeAttribute('data-theme');
	vi.restoreAllMocks();
});

describe('settings page', () => {
	it('shows the saved preferences in every field', () => {
		render();

		expect(document.title).toBe(`${m.nav_settings()} - CropWatch`);
		for (const [id, name, options] of DROPDOWNS) {
			const saved = PREFERENCES[name];
			expect(field(name)?.value, name).toBe(saved);
			expect(trigger(id).textContent?.trim(), id).toBe(
				options.find((option) => option.value === saved)?.label
			);
		}
		expect(field('theme')?.type).toBe('hidden');
		expect(field('theme')?.value).toBe('dark');
		expect(themeLabel()).toBe(m.settings_theme_dark());
		expect(chips()).toEqual([m.settings_theme_dark(), 'Asia/Tokyo']);
	});

	it('names the light and system themes, and shows no timezone chip without one', () => {
		render({ theme: 'light', timezone: '' });
		expect(themeLabel()).toBe(m.settings_theme_light());
		expect(chips()).toEqual([m.settings_theme_light()]);
		expect(trigger('settings-timezone-select').textContent?.trim()).toBe(
			m.settings_timezone_placeholder()
		);
		view?.unmount();
		localStorage.removeItem(THEME_STORAGE_KEY);

		render({ theme: 'system' });
		expect(themeLabel()).toBe(m.settings_theme_system());
	});

	it("lets the theme picker's choice on this device win over the saved theme, without counting it as a change", async () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'light');

		render({ theme: 'dark' });

		expect(field('theme')?.value).toBe('light');
		expect(themeLabel()).toBe(m.settings_theme_light());
		expect(saveButton().disabled).toBe(true);
		expect(resetButton().disabled).toBe(true);

		// Saving another change keeps this device's theme.
		choose('settings-co2-select', OPTIONS.co2[1].label);
		expect(saveButton().disabled).toBe(false);
		const { formData } = await submit();
		expect(formData.get('theme')).toBe('light');
		expect(formData.get('co2Unit')).toBe(OPTIONS.co2[1].value);
	});

	it('counts a theme picked on the page as a change, unless it is the saved one', () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'light');
		render({ theme: 'dark' });

		chooseTheme(m.cwui_theme_light());
		expect(saveButton().disabled).toBe(false);

		chooseTheme(m.cwui_theme_dark());
		expect(field('theme')?.value).toBe('dark');
		expect(saveButton().disabled).toBe(true);
	});

	it('enables saving and resetting only once something changed', () => {
		render();
		expect(saveButton().disabled).toBe(true);
		expect(resetButton().disabled).toBe(true);

		choose('settings-temperature-select', OPTIONS.temperature[1].label);

		expect(field('temperatureUnit')?.value).toBe('fahrenheit');
		expect(saveButton().disabled).toBe(false);
		expect(resetButton().disabled).toBe(false);
	});

	it('posts the chosen theme with the form', () => {
		render();

		chooseTheme(m.cwui_theme_light());

		expect(field('theme')?.value).toBe('light');
		expect(themeLabel()).toBe(m.settings_theme_light());
		expect(saveButton().disabled).toBe(false);
	});

	it('resets to the saved preferences and language', async () => {
		render();
		choose('settings-co2-select', OPTIONS.co2[1].label);
		choose('settings-timezone-select', OPTIONS.timezone[0].label);
		expect(chips()).toEqual([m.settings_theme_dark(), 'Pacific/Pago_Pago']);

		resetButton().click();
		await vi.waitFor(() => expect(changeLocale).toHaveBeenCalledWith('ja'));
		flushSync();

		expect(field('co2Unit')?.value).toBe('ppm');
		expect(field('timezone')?.value).toBe('Asia/Tokyo');
		expect(chips()).toEqual([m.settings_theme_dark(), 'Asia/Tokyo']);
		expect(saveButton().disabled).toBe(true);
		expect(resetButton().disabled).toBe(true);
	});

	it('still resets the form when the language cannot be restored', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('locale unavailable');
		changeLocale.mockRejectedValue(failure);
		render();
		choose('settings-weight-select', OPTIONS.weight[1].label);

		resetButton().click();

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to reset locale:', failure)
		);
		flushSync();
		expect(field('weightUnit')?.value).toBe('kg');
	});

	it('saves through the form action, then reloads the preferences', async () => {
		const { toasts } = render();
		choose('settings-pressure-select', OPTIONS.pressure[2].label);

		const { formData, finish } = await submit();
		expect(formData.get('pressureUnit')).toBe('bar');
		expect(formData.get('theme')).toBe('dark');
		expect(saveButton().getAttribute('aria-busy')).toBe('true');
		expect(resetButton().disabled).toBe(true);

		const success: ActionResult = { type: 'success', status: 200, data: { success: true } };
		await finish(success);

		expect(saveButton().getAttribute('aria-busy')).toBeNull();
		expect(forms.applyAction).toHaveBeenCalledWith(success);
		expect(toasts()).toMatchObject([{ tone: 'success', message: m.settings_saved() }]);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('posts every changed field under its form name', async () => {
		render();
		const expected: Record<string, string> = { theme: 'dark' };
		for (const [id, name, options] of DROPDOWNS) {
			// The last option always differs from the saved value.
			const choice = options[options.length - 1];
			choose(id, choice.label);
			expected[name] = choice.value;
		}

		const { formData } = await submit();

		expect(Object.fromEntries(formData)).toEqual(expected);
	});

	it("shows the action's error, and stays quiet for other results", async () => {
		const { toasts } = render();
		choose('settings-pressure-select', OPTIONS.pressure[2].label);
		const failure: ActionResult = { type: 'failure', status: 400, data: { error: 'Bad unit' } };

		await submit(failure);
		await submit({ type: 'failure', status: 400 });
		await submit({ type: 'redirect', status: 303, location: '/auth/login' });

		expect(forms.applyAction).toHaveBeenCalledTimes(3);
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(toasts()).toMatchObject([{ tone: 'danger', message: 'Bad unit' }]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(saveButton().disabled).toBe(false);
	});
});
