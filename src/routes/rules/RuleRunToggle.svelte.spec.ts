import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/api/api-error.ts';
import type { RuleTemplateDto } from '#lib/api/api.dtos.ts';
import { m } from '#lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import RuleRunToggle from './RuleRunToggle.svelte';

const rule = (isActive: boolean): RuleTemplateDto => ({
	id: 7,
	name: 'Cold room',
	description: null,
	deviceTypeId: null,
	isActive,
	createdAt: null,
	assignments: [],
	criteria: [],
	actions: []
});

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(running: boolean, onChanged?: (rule: RuleTemplateDto) => void) {
	view = renderWithServices(RuleRunToggle, {
		props: { templateId: 7, ruleName: 'Cold room', running, onChanged },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const button = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const startButton = () => button('rule-run-7-start-button');
const pauseButton = () => button('rule-run-7-pause-button');
const cancelButton = () => button('rule-run-7-cancel-button')!;
const confirmButton = () => button('rule-run-7-confirm-pause-button')!;
const dialog = () => view!.target.querySelector('dialog') as HTMLDialogElement;
const iconLabel = (element: HTMLElement | null) =>
	element?.querySelector('[role="img"]')?.getAttribute('aria-label');

function click(element: HTMLElement | null) {
	element!.click();
	flushSync();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('RuleRunToggle', () => {
	it('offers Pause on a running rule and Start on a rule that is not running', () => {
		render(true);
		expect(iconLabel(pauseButton())).toBe(m.rules_action_pause_aria({ name: 'Cold room' }));
		expect(startButton()).toBeNull();
		view!.unmount();

		render(false);
		expect(iconLabel(startButton())).toBe(m.rules_action_start_aria({ name: 'Cold room' }));
		expect(pauseButton()).toBeNull();
	});

	it('asks before pausing, and says what pausing means', () => {
		render(true);
		expect(dialog().open).toBe(false);

		click(pauseButton());

		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(m.rules_pause_dialog_title());
		expect(dialog().textContent).toContain(m.rules_pause_confirmation({ name: 'Cold room' }));
		expect(services.rules.pauseRule).not.toHaveBeenCalled();
	});

	it('wraps the question even inside a table cell that does not wrap its text', () => {
		render(true);
		// The dialog lives in the table's actions cell and inherits from it.
		view!.target.style.whiteSpace = 'nowrap';
		view!.target.style.textAlign = 'right';
		click(pauseButton());

		const question = dialog().querySelector<HTMLElement>('.rule-run-toggle__text')!;
		expect(question.textContent).toBe(m.rules_pause_confirmation({ name: 'Cold room' }));
		expect(getComputedStyle(question).whiteSpace).toBe('normal');
		expect(getComputedStyle(question).textAlign).toBe('start');
	});

	it('pauses nothing when the question is cancelled', () => {
		render(true);
		click(pauseButton());

		click(cancelButton());

		expect(dialog().open).toBe(false);
		expect(services.rules.pauseRule).not.toHaveBeenCalled();
	});

	it('pauses after confirmation, hands the updated rule to the parent and confirms', async () => {
		const paused = rule(false);
		services.rules.pauseRule.mockResolvedValue(paused);
		const onChanged = vi.fn();
		render(true, onChanged);
		click(pauseButton());

		click(confirmButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(services.rules.pauseRule).toHaveBeenCalledWith(7);
		expect(services.rules.startRule).not.toHaveBeenCalled();
		expect(onChanged).toHaveBeenCalledWith(paused);
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.rules_paused_success({ name: 'Cold room' }),
			duration: 4000,
			dismissible: true
		});
		expect(dialog().open).toBe(false);
	});

	it('starts at once, without a question', async () => {
		const running = rule(true);
		services.rules.startRule.mockResolvedValue(running);
		const onChanged = vi.fn();
		render(false, onChanged);

		click(startButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(dialog().open).toBe(false);
		expect(services.rules.startRule).toHaveBeenCalledWith(7);
		expect(services.rules.pauseRule).not.toHaveBeenCalled();
		expect(onChanged).toHaveBeenCalledWith(running);
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.rules_started_success({ name: 'Cold room' })
		});
	});

	it('works without an onChanged callback', async () => {
		services.rules.startRule.mockResolvedValue(rule(true));
		render(false);

		click(startButton());

		await vi.waitFor(() => expect(view!.toasts()[0]?.tone).toBe('success'));
	});

	it('sends one request however often the button is pressed', async () => {
		let finish!: (value: RuleTemplateDto) => void;
		services.rules.startRule.mockReturnValue(
			new Promise<RuleTemplateDto>((resolve) => (finish = resolve))
		);
		render(false);

		click(startButton());
		expect(startButton()!.disabled).toBe(true);
		startButton()!.disabled = false;
		click(startButton());

		expect(services.rules.startRule).toHaveBeenCalledTimes(1);
		finish(rule(true));
		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(startButton()!.disabled).toBe(false);
	});

	it('shows why the API refused to pause, and keeps the question open', async () => {
		services.rules.pauseRule.mockRejectedValue(
			new ApiError(403, 'Forbidden', {
				url: 'https://api.cropwatch.test/rules/7/pause',
				payload: { message: 'You do not have permission to manage one or more selected devices' }
			})
		);
		const onChanged = vi.fn();
		render(true, onChanged);
		click(pauseButton());

		click(confirmButton());

		await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'danger',
			message: 'You do not have permission to manage one or more selected devices',
			duration: 5000
		});
		expect(onChanged).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
		expect(confirmButton().disabled).toBe(false);
	});

	it.each([
		[true, () => m.rules_pause_failed()],
		[false, () => m.rules_start_failed()]
	])(
		'falls back to its own message when the request fails (running: %s)',
		async (running, message) => {
			services.rules.pauseRule.mockRejectedValue(new TypeError('Failed to fetch'));
			services.rules.startRule.mockRejectedValue(new TypeError('Failed to fetch'));
			render(running);

			if (running) {
				click(pauseButton());
				click(confirmButton());
			} else {
				click(startButton());
			}

			await vi.waitFor(() => expect(view!.toasts()).toHaveLength(1));
			expect(view!.toasts()[0]).toMatchObject({ tone: 'danger', message: message() });
		}
	);
});
