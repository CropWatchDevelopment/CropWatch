import { afterEach, describe, expect, it } from 'vitest';
import type { OverviewDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LocationsCard from './LocationsCard.svelte';

type Location = OverviewDto['locations'][number];

const location = (overrides: Partial<Location>): Location => ({
	locationId: 1,
	name: 'Field A',
	total: 4,
	online: 4,
	alerts: 0,
	...overrides
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(locations: Location[], className?: string) {
	view = renderWithServices(LocationsCard, { props: { locations, class: className } });
	const section = view.target.querySelector('section') as HTMLElement;
	return {
		section,
		rows: [...section.querySelectorAll<HTMLElement>('.loc')].map((row) => ({
			row,
			name: row.querySelector('.loc__name')?.textContent?.trim(),
			href: row.querySelector('a.loc__link')?.getAttribute('href') ?? null,
			count: row.querySelector('.loc__count [aria-hidden="true"]')?.textContent,
			countLabel: row.querySelector('.loc__count .sr-only')?.textContent?.trim(),
			width: row.querySelector<HTMLElement>('.loc__bar')?.style.width,
			down: row.querySelector('.loc__dot')?.classList.contains('loc__dot--down')
		}))
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('LocationsCard', () => {
	it('lists locations with offline devices first, each with its online share', () => {
		const { rows } = render([
			location({ locationId: 1, name: 'Packing Shed', total: 4, online: 4 }),
			location({ locationId: 2, name: 'Greenhouse 2', total: 7, online: 5 }),
			location({ locationId: 3, name: 'Cold Room 1', total: 8, online: 8 })
		]);

		expect(
			rows.map(({ name, href, count, width, down }) => ({ name, href, count, width, down }))
		).toEqual([
			{ name: 'Greenhouse 2', href: '/locations/2', count: '5 / 7', width: '71%', down: true },
			{ name: 'Cold Room 1', href: '/locations/3', count: '8 / 8', width: '100%', down: false },
			{ name: 'Packing Shed', href: '/locations/1', count: '4 / 4', width: '100%', down: false }
		]);
		expect(rows[0].countLabel).toBe(m.overview_locations_count_aria({ online: 5, total: 7 }));
	});

	it('flags a location with offline devices in its count and bar', () => {
		const [{ row }] = render([location({ total: 3, online: 1 })]).rows;

		expect(row.querySelector('.loc__count')?.classList.contains('loc__count--down')).toBe(true);
		expect(row.querySelector('.loc__bar')?.classList.contains('loc__bar--down')).toBe(true);
	});

	it('names devices without a location, which have no page to link to', () => {
		const { rows } = render([
			location({ locationId: 5, name: null, total: 0, online: 0 }),
			location({ locationId: null, name: null, total: 2, online: 1 })
		]);

		expect(rows.map(({ name, href, width, down }) => ({ name, href, width, down }))).toEqual([
			{ name: m.dashboard_no_location(), href: null, width: '50%', down: true },
			{ name: m.dashboard_no_location(), href: '/locations/5', width: '0%', down: false }
		]);
	});

	it('lists every group of devices without a location, however many there are', () => {
		const { rows } = render([
			location({ locationId: null, name: null, total: 2, online: 1 }),
			location({ locationId: null, name: null, total: 3, online: 3 })
		]);

		expect(rows.map(({ name, count, href }) => ({ name, count, href }))).toEqual([
			{ name: m.dashboard_no_location(), count: '1 / 2', href: null },
			{ name: m.dashboard_no_location(), count: '3 / 3', href: null }
		]);
	});

	it('lists devices without a location after the named locations', () => {
		const { rows } = render([
			location({ locationId: null, name: null, total: 2, online: 2 }),
			location({ locationId: 1, name: 'Field A', total: 2, online: 2 })
		]);

		expect(rows.map((row) => row.name)).toEqual(['Field A', m.dashboard_no_location()]);
	});

	it('shows eight locations and links to the rest', () => {
		const many = Array.from({ length: 9 }, (_, i) =>
			location({ locationId: i + 1, name: `Field ${i + 1}` })
		);

		let { section, rows } = render(many);
		expect(rows).toHaveLength(8);
		const all = section.querySelector('a.locs__all');
		expect(all?.getAttribute('href')).toBe('/locations');
		expect(all?.textContent).toBe(m.overview_locations_all());
		view?.unmount();

		({ section, rows } = render(many.slice(0, 8)));
		expect(rows).toHaveLength(8);
		expect(section.querySelector('a.locs__all')).toBeNull();
	});

	it('has a title, a subtitle and a class, and an empty list without locations', () => {
		const { section, rows } = render([], 'ov-order-5');

		expect(rows).toHaveLength(0);
		expect(section.classList.contains('ov-order-5')).toBe(true);
		expect(section.querySelector('h2')?.textContent).toBe(m.overview_locations_title());
		expect(section.querySelector('.section__subtitle')?.textContent?.trim()).toBe(
			m.overview_locations_subtitle()
		);
	});
});
