import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/api/api-error.ts';
import { m } from '#lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import DeleteRuleTemplateDialog from './DeleteRuleTemplateDialog.svelte';

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(onDeleted?: (templateId: number) => void | Promise<void>) {
	view = renderWithServices(DeleteRuleTemplateDialog, {
		props: { templateId: 7, ruleName: 'Cold room', onDeleted },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const button = (id: string) => document.getElementById(id) as HTMLButtonElement;
const openButton = () => button('rule-delete-7-open-button');
const cancelButton = () => button('rule-delete-7-cancel-button');
const deleteButton = () => button('rule-delete-7-delete-button');
const dialog = () => view!.target.querySelector('dialog') as HTMLDialogElement;

function click(element: HTMLElement) {
	element.click();
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('DeleteRuleTemplateDialog: a rule other rules start or pause', () => {
	const refusal = (dependents: unknown) =>
		new ApiError(409, 'Conflict', {
			url: 'https://api.cropwatch.test/rules/7',
			payload: { message: 'Other rules start or pause this rule.', dependents }
		});
	const dependentsList = () => document.getElementById('rule-delete-7-dependents');

	it('is not deleted at once: the dialog lists those rules and asks again', async () => {
		services.rules.deleteRuleTemplate.mockRejectedValueOnce(
			refusal([
				{ id: 3, name: 'Night switch' },
				{ id: 9, name: null }
			])
		);
		const onDeleted = vi.fn();
		render(onDeleted);
		click(openButton());
		expect(dependentsList()).toBeNull();
		expect(deleteButton().textContent?.trim()).toBe(m.action_delete());

		click(deleteButton());

		await vi.waitFor(() => expect(dependentsList()).not.toBeNull());
		expect(services.rules.deleteRuleTemplate).toHaveBeenCalledWith(7, { force: false });
		expect(
			[...dependentsList()!.querySelectorAll('li')].map((li) => li.textContent?.trim())
		).toEqual(['Night switch', m.rules_delete_dependents_hidden({ id: '9' })]);
		expect(dialog().textContent).toContain(m.rules_delete_dependents_title());
		expect(dialog().textContent).toContain(m.rules_delete_dependents_hint());
		// Still open, nothing deleted, and not reported as a failure.
		expect(dialog().open).toBe(true);
		expect(onDeleted).not.toHaveBeenCalled();
		expect(view!.toasts()).toHaveLength(0);
		expect(deleteButton().textContent?.trim()).toBe(m.rules_delete_anyway());
		expect(deleteButton().disabled).toBe(false);
	});

	it('is deleted when the user confirms with "Delete anyway"', async () => {
		services.rules.deleteRuleTemplate
			.mockRejectedValueOnce(refusal([{ id: 3, name: 'Night switch' }]))
			.mockResolvedValueOnce({ id: 7 });
		const onDeleted = vi.fn();
		render(onDeleted);
		click(openButton());
		click(deleteButton());
		await vi.waitFor(() => expect(dependentsList()).not.toBeNull());

		click(deleteButton());

		await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith(7));
		expect(services.rules.deleteRuleTemplate).toHaveBeenLastCalledWith(7, { force: true });
		expect(dialog().open).toBe(false);
		expect(view!.toasts()[0]).toMatchObject({ tone: 'success' });
	});

	it('forgets the list when the dialog is opened again', async () => {
		services.rules.deleteRuleTemplate.mockRejectedValueOnce(
			refusal([{ id: 3, name: 'Night switch' }])
		);
		render();
		click(openButton());
		click(deleteButton());
		await vi.waitFor(() => expect(dependentsList()).not.toBeNull());

		click(cancelButton());
		click(openButton());

		// A fresh question: the first delete is not forced.
		expect(dependentsList()).toBeNull();
		expect(deleteButton().textContent?.trim()).toBe(m.action_delete());
	});

	it('reports a refusal of the confirmed delete as a failure', async () => {
		services.rules.deleteRuleTemplate
			.mockRejectedValueOnce(refusal([{ id: 3, name: 'Night switch' }]))
			.mockRejectedValueOnce(refusal([{ id: 3, name: 'Night switch' }]));
		render();
		click(openButton());
		click(deleteButton());
		await vi.waitFor(() => expect(dependentsList()).not.toBeNull());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'danger',
			message: 'Other rules start or pause this rule.'
		});
		expect(dialog().open).toBe(true);
	});

	it('treats a conflict without a list like any other failure', async () => {
		services.rules.deleteRuleTemplate.mockRejectedValueOnce(refusal(undefined));
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(view!.toasts()[0].tone).toBe('danger');
		expect(dependentsList()).toBeNull();
	});

	it('wraps its text inside the table cell it lives in', () => {
		render();
		view!.target.style.whiteSpace = 'nowrap';
		click(openButton());

		const question = dialog().querySelector<HTMLElement>('.rules-new-delete-dialog__text')!;
		expect(getComputedStyle(question).whiteSpace).toBe('normal');
	});
});

describe('DeleteRuleTemplateDialog', () => {
	it('asks for confirmation before deleting anything', () => {
		render();
		expect(dialog().open).toBe(false);
		expect(openButton().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.action_delete()
		);

		click(openButton());

		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(m.rules_new_delete_template());
		expect(dialog().textContent).toContain(m.rules_delete_confirmation({ name: 'Cold room' }));
		expect(services.rules.deleteRuleTemplate).not.toHaveBeenCalled();
	});

	it('closes without deleting when cancelled', () => {
		render();
		click(openButton());

		click(cancelButton());

		expect(dialog().open).toBe(false);
		expect(services.rules.deleteRuleTemplate).not.toHaveBeenCalled();
	});

	it('deletes the template, closes, reports it to the parent and confirms with a toast', async () => {
		services.rules.deleteRuleTemplate.mockResolvedValue({ id: 7 });
		const onDeleted = vi.fn();
		render(onDeleted);
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(services.rules.deleteRuleTemplate).toHaveBeenCalledWith(7, { force: false });
		expect(onDeleted).toHaveBeenCalledWith(7);
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.rules_new_deleted_success({ name: 'Cold room' }),
			duration: 4000,
			dismissible: true
		});
		expect(dialog().open).toBe(false);
	});

	it('works without an onDeleted callback', async () => {
		services.rules.deleteRuleTemplate.mockResolvedValue({ id: 7 });
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.tone).toBe('success'));
	});

	it('waits for the parent to handle the deletion before confirming', async () => {
		services.rules.deleteRuleTemplate.mockResolvedValue({ id: 7 });
		let finishParent!: () => void;
		const onDeleted = vi.fn(() => new Promise<void>((resolve) => (finishParent = resolve)));
		render(onDeleted);
		click(openButton());

		click(deleteButton());
		await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
		expect(view!.toasts()).toHaveLength(0);
		expect(deleteButton().disabled).toBe(true);

		finishParent();
		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(deleteButton().disabled).toBe(false);
	});

	it('ignores a second activation that lands before the button is disabled', async () => {
		services.rules.deleteRuleTemplate.mockResolvedValue({ id: 7 });
		render();
		click(openButton());

		// Both clicks run before the disabled state is rendered.
		deleteButton().click();
		deleteButton().click();
		flushSync();

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(services.rules.deleteRuleTemplate).toHaveBeenCalledTimes(1);
	});

	it('disables the buttons while the delete is running', async () => {
		let finishDelete!: (value: { id: number }) => void;
		services.rules.deleteRuleTemplate.mockReturnValue(
			new Promise((resolve) => (finishDelete = resolve))
		);
		render();
		click(openButton());

		click(deleteButton());

		expect(deleteButton().disabled).toBe(true);
		expect(deleteButton().getAttribute('aria-busy')).toBe('true');
		expect(cancelButton().disabled).toBe(true);
		expect(openButton().disabled).toBe(true);

		finishDelete({ id: 7 });
		await vi.waitFor(() => expect(openButton().disabled).toBe(false));
		expect(services.rules.deleteRuleTemplate).toHaveBeenCalledTimes(1);
	});

	it("shows the API's message and keeps the dialog open when the delete fails", async () => {
		services.rules.deleteRuleTemplate.mockRejectedValue({ message: 'Template is in use' });
		const onDeleted = vi.fn();
		render(onDeleted);
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'danger',
			message: 'Template is in use',
			duration: 5000,
			dismissible: true
		});
		expect(onDeleted).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
		expect(deleteButton().disabled).toBe(false);
	});

	it('falls back to the generic message when the failure has none', async () => {
		services.rules.deleteRuleTemplate.mockRejectedValue({});
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.message).toBe(m.rules_new_delete_failed()));
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/rules/templates/7',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic message for %s', async (_label, failure) => {
		services.rules.deleteRuleTemplate.mockRejectedValue(failure);
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.message).toBe(m.rules_new_delete_failed()));
	});
});
