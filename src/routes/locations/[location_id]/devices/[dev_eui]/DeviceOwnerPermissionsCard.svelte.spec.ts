import type { ActionResult } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DeviceOwnerPermissionsCard from './DeviceOwnerPermissionsCard.svelte';

type Submit = (input: Record<string, unknown>) => unknown;
type AfterSubmit = (input: {
	result: ActionResult;
	update: (options?: { reset?: boolean }) => Promise<void>;
}) => Promise<void>;

// `use:enhance` without the network: the mock keeps each form's submit
// function so a test can run it and hand it the action's result.
const { forms } = vi.hoisted(() => ({ forms: new Map<HTMLFormElement, Submit>() }));
vi.mock('$app/forms', () => ({
	enhance: (form: HTMLFormElement, submit: Submit) => {
		forms.set(form, submit);
		const onSubmit = (event: Event) => event.preventDefault();
		form.addEventListener('submit', onSubmit);
		return {
			destroy: () => {
				forms.delete(form);
				form.removeEventListener('submit', onSubmit);
			}
		};
	}
}));

type Owner = {
	id: number;
	key: string;
	name: string;
	email: string;
	userId: string;
	permissionLevel: number;
};
type FormPayload = {
	action?: string;
	success?: boolean;
	message?: string;
	ownerKey?: string;
	fieldErrors?: Record<string, string>;
} | null;

const ADA: Owner = {
	id: 1,
	key: 'ada@example.com',
	name: 'Ada',
	email: 'ada@example.com',
	userId: 'u-1',
	permissionLevel: 1
};
const NO_EMAIL: Owner = {
	id: 2,
	key: 'u-2',
	name: 'u-2',
	email: '',
	userId: 'u-2',
	permissionLevel: 3
};
const BOB: Owner = {
	id: 3,
	key: 'bob@example.com',
	name: 'Bob',
	email: 'bob@example.com',
	userId: 'u-3',
	permissionLevel: 4
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(owners: Owner[], form: FormPayload = null) {
	view = renderWithServices(DeviceOwnerPermissionsCard, { props: { owners, form } });
	return view;
}

const row = (key: string) =>
	document.getElementById(`device-owner-permissions-row-${key}-form`) as HTMLFormElement | null;
const field = (key: string, name: string) =>
	row(key)?.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;
const updateButton = (key: string) =>
	document.getElementById(
		`device-owner-permissions-row-${key}-update-button`
	) as HTMLButtonElement | null;
const levelSelect = (key: string) =>
	document.getElementById(
		`device-owner-permissions-row-${key}-permission-level-select`
	) as HTMLButtonElement | null;
const levelError = (key: string) =>
	row(key)?.querySelector('.cw-dropdown__message--error')?.textContent ?? null;

function chooseLevel(key: string, label: string) {
	levelSelect(key)?.click();
	flushSync();
	const options = [
		...(levelSelect(key)
			?.closest('.cw-dropdown')
			?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
	];
	const option = options.find((element) => element.textContent?.trim() === label);
	if (!option) throw new Error(`No option "${label}"`);
	option.click();
	flushSync();
}

/** Runs a row's enhance submit function; returns its cancel spy and result callback. */
function submit(key: string, formData?: FormData) {
	const form = row(key);
	const submitFn = form && forms.get(form);
	if (!form || !submitFn) throw new Error(`No enhanced form for ${key}`);
	const cancel = vi.fn();
	const after = submitFn({
		cancel,
		formData: formData ?? new FormData(form),
		formElement: form
	}) as AfterSubmit | undefined;
	flushSync();
	return { cancel, after };
}

afterEach(() => {
	view?.unmount();
	view = null;
	forms.clear();
});

describe('DeviceOwnerPermissionsCard', () => {
	it('says when the device has no owners', () => {
		render([]);

		expect(document.body.textContent).toContain(m.devices_owner_permissions_title());
		expect(document.body.textContent).toContain(m.devices_no_device_owners());
		expect(document.querySelector('form')).toBeNull();
	});

	it('gives each owner with an email a form with their current level', () => {
		render([ADA, NO_EMAIL, BOB]);

		expect(document.querySelectorAll('form')).toHaveLength(2);
		expect(row('u-2')).toBeNull();
		expect(row(ADA.key)?.textContent).toContain('Ada (ada@example.com)');
		expect([
			field(ADA.key, 'ownerKey'),
			field(ADA.key, 'targetUserEmail'),
			field(ADA.key, 'permissionLevel')
		]).toEqual(['ada@example.com', 'ada@example.com', '1']);
		expect(levelSelect(ADA.key)?.textContent?.trim()).toBe(m.permission_level_admin());
		expect(levelSelect(BOB.key)?.textContent?.trim()).toBe(m.permission_level_viewer());
		expect(updateButton(ADA.key)?.disabled).toBe(false);
		expect(levelError(ADA.key)).toBeNull();
		// A separator follows every owner row but the last owner's.
		expect(document.querySelectorAll('.cw-separator')).toHaveLength(1);
	});

	it('submits the level chosen in the dropdown', () => {
		render([ADA, BOB]);

		chooseLevel(ADA.key, m.permission_level_manager());

		expect(field(ADA.key, 'permissionLevel')).toBe('2');
		expect(levelSelect(ADA.key)?.textContent?.trim()).toBe(m.permission_level_manager());
		expect(field(BOB.key, 'permissionLevel')).toBe('4');
	});

	it('flags, and will not submit, a row without a valid level or email', () => {
		render([
			{ ...ADA, permissionLevel: 0 },
			{ ...BOB, email: 'not-an-email' }
		]);

		for (const key of [ADA.key, BOB.key]) {
			expect(updateButton(key)?.disabled).toBe(true);
			const { cancel, after } = submit(key);
			expect(cancel).toHaveBeenCalled();
			expect(after).toBeUndefined();
		}
	});

	it('names the problem: the level for a bad level, the email for a bad email', () => {
		render([
			{ ...ADA, permissionLevel: 0 },
			{ ...BOB, email: 'not-an-email' }
		]);
		const emailNotices = (key: string) =>
			[...(row(key)?.querySelectorAll('.app-notice--danger') ?? [])].map((notice) =>
				notice.textContent?.trim()
			);

		expect(levelError(ADA.key)).toBe(m.devices_choose_valid_permission_level());
		expect(emailNotices(ADA.key)).toEqual([]);
		expect(levelError(BOB.key)).toBeNull();
		expect(emailNotices(BOB.key)).toEqual([m.devices_owner_email_invalid()]);
	});

	it('puts separators only between the owners it shows', () => {
		const separators = () => document.querySelectorAll('.permission-list .cw-separator').length;
		const endsWithSeparator = () =>
			document.querySelector('.permission-list')?.lastElementChild?.matches('.cw-separator');

		// The last owner has no email, so no row: nothing may follow Bob's.
		render([ADA, BOB, NO_EMAIL]);
		expect(document.querySelectorAll('form')).toHaveLength(2);
		expect(separators()).toBe(1);
		expect(endsWithSeparator()).toBe(false);
		view?.unmount();

		render([NO_EMAIL, ADA]);
		expect(separators()).toBe(0);
		view?.unmount();

		const noEmail = (id: number) => ({ ...NO_EMAIL, id, key: `u-${id}`, userId: `u-${id}` });
		render([ADA, noEmail(4), noEmail(5), BOB, noEmail(6)]);
		expect(separators()).toBe(1);
		expect(endsWithSeparator()).toBe(false);
	});

	it('shows only the row being saved as busy, until the update finishes', async () => {
		render([ADA, BOB]);

		const { cancel, after } = submit(ADA.key);
		expect(cancel).not.toHaveBeenCalled();
		expect(updateButton(ADA.key)?.getAttribute('aria-busy')).toBe('true');
		expect(updateButton(ADA.key)?.disabled).toBe(true);
		expect(updateButton(BOB.key)?.getAttribute('aria-busy')).toBeNull();

		const update = vi.fn(async () => {});
		await after?.({ result: { type: 'success', status: 200 }, update });
		flushSync();

		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(updateButton(ADA.key)?.getAttribute('aria-busy')).toBeNull();
		expect(updateButton(ADA.key)?.disabled).toBe(false);
	});

	it('tracks the row by its own key when the form sends none, even if the update fails', async () => {
		render([ADA, BOB]);

		const { after } = submit(BOB.key, new FormData());
		expect(updateButton(BOB.key)?.getAttribute('aria-busy')).toBe('true');

		const update = vi.fn(async () => {
			throw new Error('update failed');
		});
		await expect(after?.({ result: { type: 'failure', status: 400 }, update })).rejects.toThrow(
			'update failed'
		);
		flushSync();

		expect(updateButton(BOB.key)?.getAttribute('aria-busy')).toBeNull();
	});

	it("shows an action's result on the owner it belongs to only", () => {
		render([ADA, BOB], {
			action: 'updateDeviceOwnerPermission',
			ownerKey: BOB.key,
			success: true,
			message: 'Saved for Bob'
		});
		expect(row(BOB.key)?.querySelector('.app-notice--success')?.textContent).toContain(
			'Saved for Bob'
		);
		expect(row(ADA.key)?.querySelector('.app-notice')).toBeNull();
		view?.unmount();

		render([ADA, BOB], {
			action: 'updateDeviceOwnerPermission',
			ownerKey: BOB.key,
			success: false,
			message: 'Refused'
		});
		expect(row(BOB.key)?.querySelector('.app-notice--danger')?.textContent).toContain('Refused');
	});

	it("shows the server's field errors on the owner's row", () => {
		render([ADA, BOB], {
			action: 'updateDeviceOwnerPermission',
			ownerKey: BOB.key,
			fieldErrors: { targetUserEmail: 'Email is wrong', permissionLevel: 'Level is wrong' }
		});

		const notices = [...(row(BOB.key)?.querySelectorAll('.app-notice--danger') ?? [])];
		expect(notices.map((notice) => notice.textContent?.trim())).toEqual(['Email is wrong']);
		expect(levelError(BOB.key)).toBe('Level is wrong');
		expect(levelError(ADA.key)).toBeNull();
	});

	it("ignores other actions' results", () => {
		render([ADA, BOB], {
			action: 'updateDevice',
			ownerKey: BOB.key,
			success: true,
			message: 'Device saved',
			fieldErrors: { permissionLevel: 'Level is wrong' }
		});

		expect(document.querySelector('.app-notice')).toBeNull();
		expect(levelError(BOB.key)).toBeNull();
	});
});
