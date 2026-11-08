import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
	AiFindingTextDto,
	AiRecommendationDto,
	AiRecommendationFindingDto
} from '$lib/api/api.dtos';
import { getLocale } from '$lib/paraglide/runtime';
import { printElement } from '$lib/utils/print-element';
import { renderWithServices } from '$lib/testing/render';
import AiRecommendationCard from './AiRecommendationCard.svelte';

// A real print dialog would block the runner.
vi.mock('$lib/utils/print-element', () => ({ printElement: vi.fn(() => Promise.resolve()) }));

// getLocale keeps its real answer (ja in tests) unless a test switches to English.
vi.mock('$lib/paraglide/runtime', async (importOriginal) => {
	const runtime = await importOriginal<typeof import('$lib/paraglide/runtime')>();
	return { ...runtime, getLocale: vi.fn(runtime.getLocale) };
});

const text = (overrides: Partial<AiFindingTextDto>): AiFindingTextDto => ({
	what: '',
	value: null,
	average: null,
	target: null,
	action_title: '',
	action: '',
	note: null,
	days_off: null,
	...overrides
});

const NIGHT_COLD: AiRecommendationFindingDto = {
	metric: 'air_temperature',
	period: 'night',
	severity: 3,
	kind: 'target',
	action: 'raise_night_temp',
	display: {
		status: 'below',
		kind: 'low',
		en: text({
			what: 'Night-time air temperature',
			value: '6 °C',
			average: '10.8 °C',
			target: '12–16 °C',
			action_title: 'Warmer nights',
			action: 'Run the heater, or close side vents and thermal screens earlier in the evening.'
		}),
		ja: text({
			what: '夜間の気温',
			value: '6°C',
			average: '10.8°C',
			target: '12〜16°C',
			action_title: '夜間の保温',
			action:
				'暖房を使うか、夕方早めにサイド換気を閉めて保温カーテンを閉じ、夜間のハウスを暖かく保ってください。'
		})
	}
};

const VPD_PEAK: AiRecommendationFindingDto = {
	metric: 'vpd',
	period: 'day',
	severity: 2,
	kind: 'target',
	action: 'lower_vpd',
	display: {
		status: 'peak_above',
		kind: 'high',
		en: text({
			what: 'Daytime vapour pressure deficit (VPD)',
			value: '1.2 kPa',
			average: '0.71 kPa',
			target: '0.42–0.83 kPa',
			action_title: 'Reduce high daytime VPD',
			action: 'Consider misting, shading or ventilating less in the hottest hours.'
		}),
		ja: text({
			what: '日中のVPD（蒸気圧不足）',
			action_title: 'VPDを下げる（乾燥対策）',
			action: '…'
		})
	}
};

const REPORT: AiRecommendationDto = {
	id: 3,
	dev_eui: '343634316633780C',
	report_type: 'daily',
	period_start: '2026-11-08',
	period_end: '2026-11-08',
	timezone: 'Asia/Tokyo',
	status: 'action',
	max_severity: 3,
	headline_ja: 'ミニトマト栽培環境の確認',
	body_ja: '夜間の気温が目標より低めです。\nVPDのピークが目標を超えました。',
	headline_en: 'Cold night: add heat',
	body_en: 'Night-time air temperature was below target.\nThe VPD peak was above target.',
	findings: [NIGHT_COLD, VPD_PEAK],
	details: [
		{
			metric: 'air_temperature',
			period: 'night',
			severity: 3,
			what_en: 'Night-time air temperature',
			what_ja: '夜間の気温',
			ja: '夜間の気温：平均10.8°C、目標12〜16°C。安全範囲外。',
			en: 'Night-time air temperature: average 10.8 °C; target 12–16 °C. Outside safe limits.'
		},
		{
			metric: 'soil_temperature',
			period: 'all',
			severity: 1,
			what_en: 'Soil temperature',
			what_ja: '地温',
			ja: '地温：平均17.3°C、目標15〜20°C。適正範囲に近い。',
			en: 'Soil temperature: average 17.3 °C; target 15–20 °C. Close to target.'
		},
		{
			metric: 'soil_moisture',
			period: 'all',
			severity: null,
			what_en: 'Soil moisture',
			what_ja: '土壌水分',
			ja: '土壌水分：平均46.8%。未評価。',
			en: 'Soil moisture: average 46.8%. No verdict yet.'
		}
	],
	text_source: 'llm',
	created_at: '2026-11-08T16:32:49.779Z',
	updated_at: '2026-11-08T16:32:49.779Z'
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(report: Partial<AiRecommendationDto> = {}) {
	view = renderWithServices(AiRecommendationCard, { props: { report: { ...REPORT, ...report } } });
	return view.target;
}

const english = () => vi.mocked(getLocale).mockReturnValue('en');
const textOf = (root: ParentNode, selector: string) =>
	root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
const all = (root: ParentNode, selector: string) =>
	[...root.querySelectorAll(selector)].map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
const tableRows = (root: HTMLElement) =>
	[...root.querySelectorAll('.ai-report__table tbody tr')].map((tr) => all(tr, 'th, td'));
const expand = (root: HTMLElement, title: string) => {
	const toggle = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(title));
	expect(toggle).toBeDefined();
	toggle!.click();
	flushSync();
};

afterEach(() => {
	view?.unmount();
	view = null;
	vi.mocked(getLocale).mockReset();
	vi.mocked(printElement).mockClear();
});

describe('AiRecommendationCard', () => {
	it('lays the findings out as a table of measurement, recorded, target and status', () => {
		english();
		const root = render();

		expect(textOf(root, '.ai-report__headline')).toBe(REPORT.headline_en);
		expect(all(root, '.ai-report__table thead th')).toEqual([
			'Measurement',
			'Recorded',
			'Target',
			'Status'
		]);
		expect(tableRows(root)).toEqual([
			['Night-time air temperature', 'Low 6 °C; average 10.8 °C', '12–16 °C', 'Below target'],
			[
				'Daytime vapour pressure deficit (VPD)',
				'High 1.2 kPa; average 0.71 kPa',
				'0.42–0.83 kPa',
				'Peak above target; average within target'
			]
		]);
		expect(all(root, '.ai-report__table tbody strong')).toEqual([
			'6 °C',
			'10.8 °C',
			'1.2 kPa',
			'0.71 kPa'
		]);
	});

	it('marks a finding outside safe limits apart from one that needs attention', () => {
		english();
		const root = render();
		const statuses = [...root.querySelectorAll('.ai-report__status')];
		expect(statuses[0].classList.contains('ai-report__status--critical')).toBe(true);
		expect(statuses[1].classList.contains('ai-report__status--attention')).toBe(true);
	});

	it('lists the recommended actions with a bold title, then what is on target', () => {
		english();
		const root = render();

		expect(textOf(root, '.ai-report__subheading')).toBe('Recommended actions');
		expect(all(root, '.ai-report__actions li')).toEqual([
			'Warmer nights: Run the heater, or close side vents and thermal screens earlier in the evening.',
			'Reduce high daytime VPD: Consider misting, shading or ventilating less in the hottest hours.'
		]);
		expect(all(root, '.ai-report__actions li strong')).toEqual([
			'Warmer nights:',
			'Reduce high daytime VPD:'
		]);
		// Close to target counts as on target; a metric without a verdict is not listed.
		expect(textOf(root, '.ai-report__on-target')).toBe('On target: Soil temperature');
	});

	it('shows the Japanese report and its day by default', () => {
		const root = render();

		expect(textOf(root, '.ai-report__headline')).toBe(REPORT.headline_ja);
		expect(tableRows(root)[0]).toEqual([
			'夜間の気温',
			'低い時間帯 6°C、平均 10.8°C',
			'12〜16°C',
			'目標より低い'
		]);
		expect(textOf(root, '.ai-report__on-target')).toBe('目標どおり：地温');
		expect(all(root, '.ai-report__actions li strong')[0]).toBe('夜間の保温：');
		expect(root.textContent).toContain('11月8日');
	});

	it('gives one bullet per action and shows how a covering action helps', () => {
		english();
		const sensor = (metric: string, what: string): AiRecommendationFindingDto => ({
			metric,
			period: 'all',
			severity: 2,
			kind: 'sensor',
			action: 'check_sensor',
			display: {
				status: 'invalid',
				kind: null,
				en: text({
					what,
					action_title: 'Check the sensor',
					action: 'Check its wiring and battery.'
				}),
				ja: text({ what, action_title: 'センサーの点検', action: '配線と電池を確認してください。' })
			}
		});
		const humid: AiRecommendationFindingDto = {
			metric: 'air_humidity',
			period: 'night',
			severity: 2,
			kind: 'target',
			action: 'lower_night_humidity',
			display: {
				status: 'above',
				kind: null,
				en: text({
					what: 'Night-time relative humidity',
					value: '88%',
					target: '65–75%',
					action_title: 'Lower night-time humidity',
					action: 'Ventilate briefly around sunset.',
					note: 'Warming the house to 12 °C should bring it to about 67%.'
				}),
				ja: text({ what: '夜間の湿度', action_title: '夜間の除湿', action: '…', note: '…' })
			}
		};
		const root = render({
			findings: [sensor('soil_moisture', 'Soil moisture'), sensor('soil_ec', 'Soil EC'), humid]
		});

		expect(tableRows(root)).toEqual([
			['Soil moisture', '—', '—', 'Readings look invalid'],
			['Soil EC', '—', '—', 'Readings look invalid'],
			['Night-time relative humidity', '88%', '65–75%', 'Above target']
		]);
		expect(all(root, '.ai-report__actions li')).toEqual([
			'Check the sensor: Check its wiring and battery.',
			'Lower night-time humidity: Warming the house to 12 °C should bring it to about 67%.'
		]);
	});

	it("keeps the model's text one click away", () => {
		english();
		const root = render();
		expand(root, 'AI summary');
		expect(all(root, '.ai-report__ai-text p')).toEqual([
			'Night-time air temperature was below target.',
			'The VPD peak was above target.'
		]);
	});

	it('falls back to the text, one item per line, for a report without display data', () => {
		english();
		const root = render({
			findings: [{ ...NIGHT_COLD, display: undefined }],
			body_en: 'Night-time air temperature was below target.\n\nDaytime CO₂ was below target. '
		});
		expect(root.querySelector('.ai-report__table')).toBeNull();
		expect(all(root, '.ai-report__point')).toEqual([
			'Night-time air temperature was below target.',
			'Daytime CO₂ was below target.'
		]);
	});

	it('shows a good day as its text, with no table', () => {
		english();
		const root = render({
			status: 'good',
			max_severity: 0,
			findings: [],
			body_en: 'Everything is within or close to the target range. No change is needed.'
		});
		expect(root.querySelector('.ai-report__table')).toBeNull();
		expect(textOf(root, '.cw-chip')).toContain('Looking good');
		expect(all(root, '.ai-report__point')).toEqual([
			'Everything is within or close to the target range. No change is needed.'
		]);
	});

	it.each([
		[{ status: 'action', max_severity: 2 }, 'Needs attention'],
		[{ status: 'action', max_severity: 3 }, 'Outside safe limits'],
		[{ status: 'insufficient_data', max_severity: 0, findings: [] }, 'Not enough data']
	])('labels %o as "%s"', (report, label) => {
		english();
		expect(textOf(render(report), '.cw-chip')).toContain(label);
	});

	it('shows a light bulb to the left of the title', () => {
		english();
		const root = render();
		const row = root.querySelector('.ai-report__title-row');
		expect(row?.firstElementChild?.classList.contains('cw-icon')).toBe(true);
		expect(row?.querySelector('h3')?.textContent).toBe('Growing advice');
	});

	it('prints just the card, with both panels open and without the print button', async () => {
		english();
		const root = render();
		const button = root.querySelector<HTMLButtonElement>('#ai-report-print-button');
		expect(button?.textContent).toContain('Print');

		button!.click();
		await vi.waitFor(() => expect(printElement).toHaveBeenCalledTimes(1));

		const [element, options] = vi.mocked(printElement).mock.calls[0];
		expect(element).toBe(root.querySelector('.ai-report'));
		expect(options?.title).toBe('Growing advice Sun, November 8');

		const copy = element.cloneNode(true) as HTMLElement;
		options!.prepare!(copy);
		const panels = [...copy.querySelectorAll('.cw-expand')];
		expect(panels.length).toBe(2);
		expect(panels.every((panel) => panel.classList.contains('cw-expand--open'))).toBe(true);
		expect(copy.querySelector('[inert]')).toBeNull();
		expect(copy.querySelector('#ai-report-print-button')).toBeNull();
		// The page itself keeps its button and closed panels.
		expect(root.querySelector('#ai-report-print-button')).not.toBeNull();
		expect(root.querySelector('.cw-expand--open')).toBeNull();
	});

	it('keeps the report day in any viewer time zone', () => {
		english();
		// A report for the 1st must not read as the 31st west of UTC.
		const root = render({ period_start: '2026-11-01', period_end: '2026-11-01' });
		expect(root.textContent).toContain('November 1');
	});

	it('lists what each value means, in the page language, once expanded', () => {
		english();
		const root = render();
		expand(root, 'What each value means');
		expect(all(root, '.ai-report__details li')).toEqual(REPORT.details.map((d) => d.en));
	});
});
