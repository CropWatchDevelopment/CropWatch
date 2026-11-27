import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CALENDAR_CLOCK_ICON from '#lib/images/icons/calendar_clock.svg';
import PLAY_ICON from '#lib/images/icons/play.svg';
import STOP_ICON from '#lib/images/icons/stop.svg';
import { m } from '#lib/paraglide/messages.js';
import type { RuleStatusDto } from '#lib/rules/rule-template.types.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import { describeRuleStatus } from './rule-status.ts';
import RuleStatusCell from './RuleStatusCell.svelte';

const status = (overrides: Partial<RuleStatusDto> = {}): RuleStatusDto => ({
	state: 'running',
	since: '2026-11-20T00:00:00.000Z',
	reason: null,
	byUserName: null,
	byRule: null,
	autoPauseAt: null,
	thenStart: null,
	nextStart: null,
	...overrides
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(value: RuleStatusDto, tooltipPosition?: 'bottom' | 'right') {
	view = renderWithServices(RuleStatusCell, { props: { status: value, tooltipPosition } });
	return view;
}

const icon = () => view!.target.querySelector<HTMLElement>('.rule-status')!;
const bubble = () => view!.target.querySelector<HTMLElement>('[role="tooltip"]')!;
const maskOf = (element: HTMLElement) =>
	element.querySelector<HTMLElement>('.cw-icon')!.style.getPropertyValue('--cw-icon-src');

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('RuleStatusCell', () => {
	it.each<[string, RuleStatusDto, string, string]>([
		['running', status(), m.rules_status_running(), PLAY_ICON],
		['paused', status({ state: 'paused' }), m.rules_status_paused(), STOP_ICON],
		[
			'scheduled',
			status({
				state: 'scheduled',
				nextStart: { at: '2026-12-01T00:00:00.000Z', source: 'date', byRule: null }
			}),
			m.rules_status_scheduled(),
			CALENDAR_CLOCK_ICON
		]
	])('shows a %s rule with its own icon, colour and name', (state, value, label, iconSrc) => {
		render(value);

		expect(icon().dataset.state).toBe(state);
		expect(icon().classList.contains(`rule-status--${state}`)).toBe(true);
		expect(icon().getAttribute('role')).toBe('img');
		expect(icon().getAttribute('aria-label')).toBe(label);
		expect(maskOf(icon())).toBe(`url("${iconSrc}")`);
	});

	it('colours running green, paused red and scheduled blue (the CWUI tone tokens)', () => {
		const root = document.documentElement;
		const tokens = {
			'--cw-success-500': 'rgb(1, 150, 1)',
			'--cw-danger-500': 'rgb(200, 2, 2)',
			'--cw-info-500': 'rgb(3, 3, 200)'
		};
		for (const [token, value] of Object.entries(tokens)) root.style.setProperty(token, value);

		try {
			const colourOf = (value: RuleStatusDto) => {
				render(value);
				const colour = getComputedStyle(icon()).color;
				view!.unmount();
				view = null;
				return colour;
			};

			expect(colourOf(status())).toBe('rgb(1, 150, 1)');
			expect(colourOf(status({ state: 'paused' }))).toBe('rgb(200, 2, 2)');
			expect(
				colourOf(
					status({
						state: 'scheduled',
						nextStart: { at: '2026-12-01T00:00:00.000Z', source: 'date', byRule: null }
					})
				)
			).toBe('rgb(3, 3, 200)');
		} finally {
			for (const token of Object.keys(tokens)) root.style.removeProperty(token);
		}
	});

	it('opens the tooltip beside the icon, or where it is told to', () => {
		render(status());
		expect(bubble().classList.contains('cw-tooltip__bubble--right')).toBe(true);
		view!.unmount();

		render(status(), 'bottom');
		expect(bubble().classList.contains('cw-tooltip__bubble--bottom')).toBe(true);
	});

	it('places the tooltip against the icon, not against a stretched table cell', () => {
		render(status());
		const cell = view!.target.querySelector<HTMLElement>('.rule-status-cell')!;
		// What the table does to a cell in its card layout.
		view!.target.style.display = 'grid';
		view!.target.style.width = '300px';

		expect(cell.getBoundingClientRect().width).toBeLessThan(60);
		expect(cell.querySelector('.cw-tooltip')!.getBoundingClientRect().width).toBeLessThan(60);
	});

	it('explains the status in a CWUI tooltip that keyboard users can open', () => {
		const value = status({ reason: 'manual', byUserName: 'Aki' });
		render(value);

		expect(bubble().textContent?.trim()).toBe(describeRuleStatus(value).tooltip);
		expect(bubble().classList.contains('cw-tooltip__bubble--visible')).toBe(false);
		// The tooltip text is the icon's description for screen readers.
		expect(icon().getAttribute('aria-describedby')).toBe(bubble().id);
		expect(icon().tabIndex).toBe(0);

		icon().focus();
		flushSync();
		expect(bubble().classList.contains('cw-tooltip__bubble--visible')).toBe(true);

		icon().blur();
		flushSync();
		expect(bubble().classList.contains('cw-tooltip__bubble--visible')).toBe(false);
	});
});
