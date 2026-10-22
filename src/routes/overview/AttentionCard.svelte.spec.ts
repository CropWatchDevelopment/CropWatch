import { afterEach, describe, expect, it } from 'vitest';
import type { OverviewAttentionGroupDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import AttentionCard from './AttentionCard.svelte';
import type { AttentionRow } from './overview';

const group = (locationId: number | null, name: string | null): OverviewAttentionGroupDto => ({
	locationId,
	name,
	count: 1
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(rows: AttentionRow[], className?: string) {
	view = renderWithServices(AttentionCard, { props: { rows, class: className } });
	const section = view.target.querySelector('section') as HTMLElement;
	return {
		section,
		wide: [...section.querySelectorAll<HTMLElement>('.att-list--wide .att')].map((item) => ({
			tone: item.querySelector('.att__chip')?.className.match(/att__chip--(\w+)/)?.[1],
			dot: item.querySelector('.att__dot')?.className.match(/att__dot--(\w+)/)?.[1],
			tag: item.querySelector('.att__chip')?.textContent,
			count: item.querySelector('.att__text strong')?.textContent,
			text: item.querySelector('.att__text')?.textContent,
			where: item.querySelector('.att__where')?.textContent,
			view: item.querySelector('a.att__view')?.textContent,
			href: item.querySelector('a.att__view')?.getAttribute('href')
		})),
		narrow: [...section.querySelectorAll<HTMLElement>('.att-list--narrow a.att-row')].map(
			(link) => ({
				href: link.getAttribute('href'),
				tile: link.querySelector('.att-row__tile')?.className.match(/att-row__tile--(\w+)/)?.[1],
				title: link.querySelector('.att-row__title')?.textContent,
				where: link.querySelector('.att-row__where')?.textContent,
				chevron: link.querySelector('svg.att-row__chevron') !== null
			})
		)
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('AttentionCard', () => {
	it('says when nothing needs attention', () => {
		const { section, wide, narrow } = render([]);

		expect(section.querySelector('.att-none')?.textContent?.trim()).toBe(
			m.overview_attention_none()
		);
		expect(section.querySelector('.att-none svg')).not.toBeNull();
		expect(wide).toEqual([]);
		expect(narrow).toEqual([]);
	});

	it('groups offline devices across locations and opens the dashboard', () => {
		const { wide, narrow } = render([
			{
				key: 'offline',
				count: 4,
				groups: [group(2, 'Field A'), group(3, 'Greenhouse 2')],
				target: { kind: 'dashboard' }
			}
		]);

		const count = m.overview_attention_devices_other({ count: 4 });
		expect(wide).toEqual([
			{
				tone: 'danger',
				dot: 'offline',
				tag: m.overview_attention_tag_offline(),
				count,
				text: `${count} ${m.overview_attention_offline_text_other()}`,
				where: 'Field A · Greenhouse 2',
				view: m.action_view(),
				href: '/'
			}
		]);
		expect(narrow).toEqual([
			{
				href: '/',
				tile: 'danger',
				title: m.overview_health_offline_other({ count: 4 }),
				where: 'Field A · Greenhouse 2',
				chevron: true
			}
		]);
	});

	it('opens the one location a single offline device is at', () => {
		const { wide, narrow } = render([
			{
				key: 'offline',
				count: 1,
				groups: [group(2, 'Field A')],
				target: { kind: 'location', locationId: 2 }
			}
		]);

		const count = m.overview_attention_devices_one();
		expect(wide[0]).toMatchObject({
			count,
			text: `${count} ${m.overview_attention_offline_text_one()}`,
			href: '/locations/2'
		});
		expect(narrow[0]).toMatchObject({
			href: '/locations/2',
			title: m.overview_health_offline_one()
		});
	});

	it('sends active alerts to the rules page', () => {
		let { wide, narrow } = render([
			{
				key: 'alerts',
				count: 2,
				groups: [group(1, 'Cold Room 1'), group(null, null)],
				target: { kind: 'rules' }
			}
		]);

		let count = m.overview_attention_rules_other({ count: 2 });
		expect(wide).toEqual([
			{
				tone: 'warning',
				dot: 'alerts',
				tag: m.overview_attention_tag_alert(),
				count,
				text: `${count} ${m.overview_attention_alert_text_other()}`,
				where: `Cold Room 1 · ${m.dashboard_no_location()}`,
				view: m.action_view(),
				href: '/rules'
			}
		]);
		expect(narrow[0]).toMatchObject({
			href: '/rules',
			tile: 'warning',
			title: m.overview_health_alerts_other({ count: 2 })
		});
		view?.unmount();

		({ wide, narrow } = render([
			{ key: 'alerts', count: 1, groups: [group(1, 'Cold Room 1')], target: { kind: 'rules' } }
		]));
		count = m.overview_attention_rules_one();
		expect(wide[0]).toMatchObject({
			count,
			text: `${count} ${m.overview_attention_alert_text_one()}`
		});
		expect(narrow[0].title).toBe(m.overview_health_alerts_one());
	});

	it('sends offline gateways to the gateways page', () => {
		let { wide, narrow } = render([
			{ key: 'gateways', count: 2, groups: [], target: { kind: 'gateways' } }
		]);

		let count = m.overview_attention_gateways_other({ count: 2 });
		expect(wide).toEqual([
			{
				tone: 'danger',
				dot: 'gateways',
				tag: m.overview_attention_tag_gateway(),
				count,
				text: `${count} ${m.overview_attention_gateway_text_other()}`,
				where: m.overview_attention_all_gateways(),
				view: m.action_view(),
				href: '/gateways'
			}
		]);
		expect(narrow[0]).toMatchObject({
			href: '/gateways',
			title: m.overview_health_gateways_offline_other({ count: 2 }),
			where: m.overview_attention_all_gateways()
		});
		view?.unmount();

		({ wide, narrow } = render([
			{ key: 'gateways', count: 1, groups: [], target: { kind: 'gateways' } }
		]));
		count = m.overview_attention_gateways_one();
		expect(wide[0]).toMatchObject({
			count,
			text: `${count} ${m.overview_attention_gateway_text_one()}`
		});
		expect(narrow[0].title).toBe(m.overview_health_gateways_offline_one());
	});

	it('names three locations and counts the rest', () => {
		const { wide } = render([
			{
				key: 'offline',
				count: 5,
				groups: ['A', 'B', 'C', 'D', 'E'].map((name, i) => group(i, name)),
				target: { kind: 'dashboard' }
			}
		]);

		expect(wide[0].where).toBe(`A · B · C · ${m.overview_attention_more({ count: 2 })}`);
	});

	it('lists the rows in order, is the #attention target, and has a title, subtitle and class', () => {
		const { section, wide } = render(
			[
				{ key: 'offline', count: 1, groups: [], target: { kind: 'dashboard' } },
				{ key: 'alerts', count: 1, groups: [], target: { kind: 'rules' } },
				{ key: 'gateways', count: 1, groups: [], target: { kind: 'gateways' } }
			],
			'ov-order-1'
		);

		expect(wide.map((row) => row.dot)).toEqual(['offline', 'alerts', 'gateways']);
		expect(section.id).toBe('attention');
		expect(section.classList.contains('ov-order-1')).toBe(true);
		expect(section.querySelector('h2')?.textContent).toBe(m.overview_attention_title());
		expect(section.querySelector('.section__subtitle')?.textContent?.trim()).toBe(
			m.overview_attention_subtitle()
		);
	});
});
