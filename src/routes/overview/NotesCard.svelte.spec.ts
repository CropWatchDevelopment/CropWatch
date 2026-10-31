import { afterEach, describe, expect, it } from 'vitest';
import type { OverviewDto } from '$lib/api/api.dtos';
import { formatRelative } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import NotesCard from './NotesCard.svelte';

type Note = OverviewDto['notes'][number];

const NOW = Date.parse('2026-10-15T09:05:00.000Z');
const LOCALE = 'ja-JP';

const note = (overrides: Partial<Note>): Note => ({
	id: 1,
	devEui: 'DEV-1',
	deviceName: 'Soil probe',
	locationId: 2,
	locationName: 'Field A',
	title: 'Irrigation',
	note: 'Valve replaced',
	author: 'Ada',
	authorIsStaff: false,
	createdAt: '2026-10-15T08:05:00.000Z',
	...overrides
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(notes: Note[], className?: string) {
	view = renderWithServices(NotesCard, {
		props: { notes, locale: LOCALE, now: NOW, class: className }
	});
	const section = view.target.querySelector('section') as HTMLElement;
	return {
		section,
		notes: [...section.querySelectorAll<HTMLElement>('.note')].map((item) => ({
			title: item.querySelector('.note__title')?.textContent,
			body: item.querySelector('.note__body')?.textContent ?? null,
			chip: item.querySelector('.note__chip')?.textContent ?? null,
			by: item.querySelector('.note__by')?.textContent?.trim()
		}))
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('NotesCard', () => {
	it('says when there are no notes', () => {
		const { section, notes } = render([]);

		expect(notes).toEqual([]);
		expect(section.querySelector('.notes-empty')?.textContent).toBe(m.overview_notes_empty());
	});

	it('shows each note with its place, author and age', () => {
		const ago = formatRelative('2026-10-15T08:05:00.000Z', NOW, LOCALE);

		expect(render([note({})]).notes).toEqual([
			{ title: 'Irrigation', body: 'Valve replaced', chip: 'Field A', by: `Ada · ${ago}` }
		]);
	});

	it('falls back to the device, to "CropWatch support" for hidden staff, and drops what is missing', () => {
		const ago = formatRelative('2026-10-15T08:05:00.000Z', NOW, LOCALE);

		const { notes } = render([
			note({ id: 1, locationName: null, author: null, authorIsStaff: true }),
			note({ id: 2, locationName: null, deviceName: null, author: null, note: null }),
			note({ id: 3, createdAt: 'not a date' })
		]);

		expect(notes).toEqual([
			{
				title: 'Irrigation',
				body: 'Valve replaced',
				chip: 'Soil probe',
				by: `${m.common_staff_author()} · ${ago}`
			},
			{ title: 'Irrigation', body: null, chip: null, by: ago },
			{ title: 'Irrigation', body: 'Valve replaced', chip: 'Field A', by: 'Ada' }
		]);
	});

	it('has a title, drops its card on phones and takes a class', () => {
		const { section } = render([], 'ov-order-6');

		expect(section.querySelector('h2')?.textContent).toBe(m.overview_notes_title());
		expect(section.classList.contains('section--bare-phone')).toBe(true);
		expect(section.classList.contains('ov-order-6')).toBe(true);
	});
});
