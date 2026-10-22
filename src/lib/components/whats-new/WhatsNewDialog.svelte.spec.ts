import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WhatsNewStatusDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import WhatsNewDialog from './WhatsNewDialog.svelte';

const RELEASE_ITEMS = [
	[m.whats_new_r1_item1_title(), m.whats_new_r1_item1_body()],
	[m.whats_new_r1_item2_title(), m.whats_new_r1_item2_body()],
	[m.whats_new_r1_item3_title(), m.whats_new_r1_item3_body()],
	[m.whats_new_r1_item4_title(), m.whats_new_r1_item4_body()],
	[m.whats_new_r1_item5_title(), m.whats_new_r1_item5_body()]
];

function status(overrides: Partial<WhatsNewStatusDto> = {}): WhatsNewStatusDto {
	return { current_release: 1, seen_release: null, show: true, ...overrides };
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
let consoleError: ReturnType<typeof vi.spyOn>;

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog');
const dismissButton = () =>
	document.getElementById('whats-new-dismiss-button') as HTMLButtonElement;

function render(accessToken: string | null = 'jwt-token') {
	view = renderWithServices(WhatsNewDialog, {
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

beforeEach(() => {
	services = createMockServices();
	services.account.markWhatsNewSeen.mockResolvedValue(status({ show: false, seen_release: 1 }));
	consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	view?.unmount();
	view = null;
	consoleError.mockRestore();
});

describe('WhatsNewDialog', () => {
	it("opens for this build's release when the API says the user has not seen it", async () => {
		services.account.getWhatsNewStatus.mockResolvedValue(status());

		render();

		await expect.poll(() => dialog()?.open).toBe(true);
		const text = dialog()?.textContent ?? '';
		expect(text).toContain(m.whats_new_title());
		expect(text).toContain(m.whats_new_intro());
		const items = [...(dialog()?.querySelectorAll('.whats-new-items li') ?? [])].map((item) => [
			item.querySelector('.whats-new-item-title')?.textContent,
			item.querySelector('.whats-new-item-body')?.textContent
		]);
		expect(items).toEqual(RELEASE_ITEMS);
		expect(dismissButton().textContent?.trim()).toBe(m.whats_new_dismiss());
		expect(services.account.getWhatsNewStatus).toHaveBeenCalledTimes(1);
	});

	it.each([
		['the user has seen it', status({ show: false, seen_release: 1 })],
		['the API announces a newer release than this build describes', status({ current_release: 2 })],
		['the API is behind this build', status({ current_release: 0 })]
	])('stays closed when %s', async (_label, answer) => {
		services.account.getWhatsNewStatus.mockResolvedValue(answer);

		render();

		await vi.waitFor(() => expect(services.account.getWhatsNewStatus).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 20));
		flushSync();
		expect(dialog()?.open).toBe(false);
	});

	it('does not ask without a session', async () => {
		render(null);
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(services.account.getWhatsNewStatus).not.toHaveBeenCalled();
		expect(dialog()?.open).toBe(false);
	});

	it('stays quiet when the status cannot be loaded', async () => {
		const failure = new Error('API down');
		services.account.getWhatsNewStatus.mockRejectedValue(failure);

		render();

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to fetch whats-new status:', failure)
		);
		expect(dialog()?.open).toBe(false);
	});

	it('records the release as seen once when dismissed', async () => {
		services.account.getWhatsNewStatus.mockResolvedValue(status());
		render();
		await expect.poll(() => dialog()?.open).toBe(true);

		dismissButton().click();
		flushSync();

		expect(dialog()?.open).toBe(false);
		expect(services.account.markWhatsNewSeen).toHaveBeenCalledTimes(1);

		dismissButton().click();
		flushSync();
		expect(services.account.markWhatsNewSeen).toHaveBeenCalledTimes(1);
	});

	it('records the release as seen when closed with the close button', async () => {
		services.account.getWhatsNewStatus.mockResolvedValue(status());
		render();
		await expect.poll(() => dialog()?.open).toBe(true);

		dialog()?.querySelector<HTMLButtonElement>('.cw-dialog__close')?.click();
		flushSync();

		expect(dialog()?.open).toBe(false);
		expect(services.account.markWhatsNewSeen).toHaveBeenCalledTimes(1);
	});

	it('only logs when the seen marker cannot be saved', async () => {
		const failure = new Error('write failed');
		services.account.getWhatsNewStatus.mockResolvedValue(status());
		services.account.markWhatsNewSeen.mockRejectedValue(failure);
		render();
		await expect.poll(() => dialog()?.open).toBe(true);

		dismissButton().click();

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to record whats-new seen:', failure)
		);
		expect(dialog()?.open).toBe(false);
	});
});
