import { createRawSnippet, flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DangerZoneCard from './DangerZoneCard.svelte';

const onDelete = vi.fn();
const deleteForm = createRawSnippet(() => ({
	render: () => '<form class="probe-delete-form" method="POST" action="?/deleteDevice"></form>'
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(DangerZoneCard, {
		props: {
			idPrefix: 'device-delete',
			heading: 'Delete this device',
			description: 'Removes the device and all of its readings.',
			buttonLabel: 'Delete device',
			onDelete,
			...props
		} as never
	});
	return view.target;
}

const card = () => view!.target.querySelector('.danger-zone > .cw-card') as HTMLElement;
const deleteButton = () =>
	document.getElementById('device-delete-open-button') as HTMLButtonElement;
const notices = () =>
	[...view!.target.querySelectorAll<HTMLElement>('.app-notice')].map((notice) => ({
		tone: [...notice.classList].find((name) => name.startsWith('app-notice--')),
		text: notice.querySelector('.app-notice__body > p')?.textContent
	}));

afterEach(() => {
	view?.unmount();
	view = null;
	onDelete.mockReset();
});

describe('DangerZoneCard', () => {
	it('is an elevated "Danger zone" card explaining the delete', () => {
		render();

		expect(card().classList.contains('cw-card--elevated')).toBe(true);
		expect(card().querySelector('.cw-card__title')?.textContent).toBe(m.danger_zone_title());
		expect(card().querySelector('.danger-zone__heading')?.textContent).toBe('Delete this device');
		expect(card().querySelector('.danger-zone__copy')?.textContent).toBe(
			'Removes the device and all of its readings.'
		);
		expect(notices()).toEqual([]);
	});

	it('lays the copy and the button out in a padded form stack, the button last', () => {
		render();

		const stack = card().querySelector('.app-form-stack.app-form-stack--padded') as HTMLElement;
		expect(stack).not.toBeNull();
		const row = stack.lastElementChild as HTMLElement;
		expect(row.classList.contains('app-action-row')).toBe(true);
		expect(row.querySelector('button')).toBe(deleteButton());
	});

	it('offers an enabled danger button that asks the owner to delete', () => {
		render();

		const button = deleteButton();
		expect(button.textContent?.trim()).toBe('Delete device');
		expect(button.type).toBe('button');
		expect(button.classList.contains('cw-button--danger')).toBe(true);
		expect(button.disabled).toBe(false);

		button.click();

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("renders the owner's delete form inside the card, ahead of the stack", () => {
		render({ children: deleteForm });

		const form = card().querySelector('.probe-delete-form') as HTMLElement;
		expect(form).not.toBeNull();
		expect(form.nextElementSibling?.classList.contains('app-form-stack')).toBe(true);
	});

	it('shows the last failure as a danger notice', () => {
		render({ errorMessage: 'The device could not be deleted.' });

		expect(notices()).toEqual([
			{ tone: 'app-notice--danger', text: 'The device could not be deleted.' }
		]);
		expect(deleteButton().disabled).toBe(false);
	});

	it('explains why deleting is blocked and disables the button', () => {
		render({ blockedMessage: 'Remove the 3 devices first.' });

		expect(notices()).toEqual([
			{ tone: 'app-notice--warning', text: 'Remove the 3 devices first.' }
		]);
		expect(deleteButton().disabled).toBe(true);
		deleteButton().click();
		expect(onDelete).not.toHaveBeenCalled();
	});

	it('shows the failure above the blocked reason', () => {
		render({ errorMessage: 'Refused', blockedMessage: 'Still has devices' });

		expect(notices()).toEqual([
			{ tone: 'app-notice--danger', text: 'Refused' },
			{ tone: 'app-notice--warning', text: 'Still has devices' }
		]);
	});

	it('shows the button as busy and locked while deleting', () => {
		const props = $state({ busy: true });
		view = renderWithServices(DangerZoneCard, {
			props: {
				idPrefix: 'device-delete',
				heading: 'Delete this device',
				description: 'Removes the device.',
				buttonLabel: 'Delete device',
				onDelete,
				get busy() {
					return props.busy;
				}
			}
		});

		expect(deleteButton().disabled).toBe(true);
		expect(deleteButton().getAttribute('aria-busy')).toBe('true');
		expect(deleteButton().classList.contains('cw-button--loading')).toBe(true);

		props.busy = false;
		flushSync();

		expect(deleteButton().disabled).toBe(false);
		expect(deleteButton().hasAttribute('aria-busy')).toBe(false);
	});
});
