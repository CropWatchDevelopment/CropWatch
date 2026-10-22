import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DeleteReportTemplateDialog from './DeleteReportTemplateDialog.svelte';

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(onDeleted?: (templateId: number) => void | Promise<void>) {
	view = renderWithServices(DeleteReportTemplateDialog, {
		props: { templateId: 7, reportName: 'Weekly cold room', onDeleted },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const button = (id: string) => document.getElementById(id) as HTMLButtonElement;
const openButton = () => button('report-delete-7-open-button');
const cancelButton = () => button('report-delete-7-cancel-button');
const deleteButton = () => button('report-delete-7-delete-button');
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

describe('DeleteReportTemplateDialog', () => {
	it('asks for confirmation before deleting anything', () => {
		render();
		expect(dialog().open).toBe(false);
		expect(openButton().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.action_delete()
		);

		click(openButton());

		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(m.reports_new_delete_template());
		expect(dialog().textContent).toContain(
			m.reports_new_delete_confirmation({ name: 'Weekly cold room' })
		);
		expect(cancelButton().textContent?.trim()).toBe(m.action_cancel());
		expect(deleteButton().textContent?.trim()).toBe(m.action_delete());
		expect(services.reports.deleteReportTemplate).not.toHaveBeenCalled();
	});

	it('closes without deleting when cancelled', () => {
		render();
		click(openButton());

		click(cancelButton());

		expect(dialog().open).toBe(false);
		expect(services.reports.deleteReportTemplate).not.toHaveBeenCalled();
	});

	it('deletes the template, closes, reports it to the parent and confirms with a toast', async () => {
		services.reports.deleteReportTemplate.mockResolvedValue({ id: 7 });
		const onDeleted = vi.fn();
		render(onDeleted);
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(services.reports.deleteReportTemplate).toHaveBeenCalledWith(7);
		expect(onDeleted).toHaveBeenCalledWith(7);
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.reports_new_deleted_success({ name: 'Weekly cold room' }),
			duration: 4000,
			dismissible: true
		});
		expect(dialog().open).toBe(false);
	});

	it('works without an onDeleted callback', async () => {
		services.reports.deleteReportTemplate.mockResolvedValue({ id: 7 });
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.tone).toBe('success'));
	});

	it('waits for the parent to handle the deletion before confirming', async () => {
		services.reports.deleteReportTemplate.mockResolvedValue({ id: 7 });
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

	it('disables the buttons while the delete is running, and deletes once', async () => {
		let finishDelete!: (value: { id: number }) => void;
		services.reports.deleteReportTemplate.mockReturnValue(
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
		expect(services.reports.deleteReportTemplate).toHaveBeenCalledTimes(1);
	});

	it("shows the API's message and keeps the dialog open when the delete fails", async () => {
		services.reports.deleteReportTemplate.mockRejectedValue({ message: 'Template is in use' });
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
		services.reports.deleteReportTemplate.mockRejectedValue({});
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.message).toBe(m.reports_new_delete_failed()));
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/reports/7',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic message for %s', async (_label, failure) => {
		services.reports.deleteReportTemplate.mockRejectedValue(failure);
		render();
		click(openButton());

		click(deleteButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.message).toBe(m.reports_new_delete_failed()));
	});
});
