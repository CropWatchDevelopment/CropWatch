import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ReportRecipientsSection from './ReportRecipientsSection.svelte';
import type { RecipientDraft, SelectOption } from './report-template-form';

const METHODS: SelectOption[] = [
	{ label: 'Email', value: '1' },
	{ label: 'SMS', value: '2' }
];

let view: ReturnType<typeof renderWithServices> | null = null;

/** A reactive list, as the form passes it (`bind:recipients={fields.recipients}`). */
function recipientDrafts(...entries: Partial<RecipientDraft>[]): RecipientDraft[] {
	const recipients = $state<RecipientDraft[]>(
		entries.map((entry, index) => ({
			communication_method: '1',
			email: '',
			name: '',
			key: `recipient-${index + 1}`,
			...entry
		}))
	);
	return recipients;
}

function render(recipients?: RecipientDraft[]) {
	const onAdd = vi.fn();
	const onRemove = vi.fn();
	view = renderWithServices(ReportRecipientsSection, {
		props: { recipients, communicationMethodOptions: METHODS, onAdd, onRemove }
	});
	return { onAdd, onRemove };
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => view?.target.textContent ?? '';

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Opens a cwui dropdown by its trigger id and clicks the option labelled `label`. */
function choose(triggerId: string, label: string) {
	const trigger = byId(triggerId)!;
	const root = trigger.closest('.cw-dropdown')!;
	if (trigger.getAttribute('aria-expanded') !== 'true') click(trigger);
	const option = [...root.querySelectorAll('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!option) throw new Error(`No option "${label}" in ${triggerId}`);
	click(option);
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ReportRecipientsSection', () => {
	it('says when nobody receives the report yet', () => {
		render();

		expect(text()).toContain(m.reports_create_recipients_title());
		expect(text()).toContain(m.reports_create_recipients_copy());
		expect(text()).toContain(m.reports_create_empty_recipients());
		expect(byId('report-recipients-0-email-input')).toBeNull();
	});

	it('adds a recipient through the parent', () => {
		const { onAdd } = render(recipientDrafts());

		click(byId('report-recipients-add-button'));

		expect(onAdd).toHaveBeenCalledTimes(1);
	});

	it('shows each recipient, numbered, with its method, email and name', () => {
		render(
			recipientDrafts(
				{ communication_method: '2', email: 'ops@example.com', name: 'Ops' },
				{ email: 'night@example.com' }
			)
		);

		expect(text()).not.toContain(m.reports_create_empty_recipients());
		expect(text()).toContain(m.reports_create_recipient_heading({ index: '1' }));
		expect(text()).toContain(m.reports_create_recipient_heading({ index: '2' }));
		expect(text()).toContain(m.reports_create_recipient_copy());
		expect(byId('report-recipients-0-method-select')?.textContent?.trim()).toBe('SMS');
		expect(byId<HTMLInputElement>('report-recipients-0-email-input')?.value).toBe(
			'ops@example.com'
		);
		expect(byId<HTMLInputElement>('report-recipients-0-name-input')?.value).toBe('Ops');
		expect(byId('report-recipients-1-method-select')?.textContent?.trim()).toBe('Email');
		expect(byId<HTMLInputElement>('report-recipients-1-email-input')?.value).toBe(
			'night@example.com'
		);
	});

	it('cannot remove the only recipient', () => {
		render(recipientDrafts({ email: 'ops@example.com' }));

		expect(byId('report-recipients-0-remove-button')).toBeNull();
	});

	it('removes a recipient by its key through the parent', () => {
		const { onRemove } = render(
			recipientDrafts({ email: 'ops@example.com' }, { email: 'night@example.com' })
		);

		click(byId('report-recipients-1-remove-button'));

		expect(onRemove).toHaveBeenCalledWith('recipient-2');
		expect(byId('report-recipients-0-remove-button')?.textContent?.trim()).toBe(m.action_remove());
	});

	it('edits the recipient in the draft', () => {
		const recipients = recipientDrafts({ email: '' });
		render(recipients);

		choose('report-recipients-0-method-select', 'SMS');
		type(byId<HTMLInputElement>('report-recipients-0-email-input')!, 'ada@example.com');
		type(byId<HTMLInputElement>('report-recipients-0-name-input')!, 'Ada');

		expect(recipients[0]).toEqual({
			communication_method: '2',
			email: 'ada@example.com',
			name: 'Ada',
			key: 'recipient-1'
		});
	});
});
