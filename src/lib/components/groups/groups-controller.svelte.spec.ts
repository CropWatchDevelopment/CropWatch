import { describe, expect, it, vi } from 'vitest';
import type { GroupDto } from '#lib/api/api.dtos.ts';
import { ApiError } from '#lib/api/api-error.ts';
import { m } from '#lib/paraglide/messages.js';
import { createMockServices } from '#lib/testing/mock-services.ts';
import { GROUP_NAME_MAX_LENGTH, GroupsController } from './groups-controller.svelte';

const conflict = () =>
	new ApiError(409, 'Conflict', { url: '/location-groups', payload: { message: 'exists' } });
const refused = (message: string) =>
	new ApiError(403, 'Forbidden', { url: '/location-groups/1', payload: { message } });

const ORG = 'org-1';

function setup(initial: GroupDto[] | null = [], orgId: string | null = ORG) {
	const repository = createMockServices().locationGroups;
	const onError = vi.fn();
	const onSuccess = vi.fn();
	const onChanged = vi.fn();
	const controller = new GroupsController({
		kind: 'location',
		repository,
		orgId,
		initial,
		onError,
		onSuccess,
		onChanged
	});
	return { controller, repository, onError, onSuccess, onChanged };
}

const group = (id: number, name: string, can_manage = true): GroupDto => ({
	id,
	name,
	org_id: ORG,
	can_manage
});

describe('GroupsController', () => {
	it('offers each name once, sorted, and lists only the groups the caller manages', () => {
		const { controller } = setup([
			group(1, 'Shed 10', false),
			group(2, 'Shed 2'),
			group(3, 'Shed 10'),
			group(4, 'Barn', false)
		]);

		expect(controller.kind).toBe('location');
		expect(controller.orgId).toBe(ORG);
		expect(controller.canAdd).toBe(true);
		expect(controller.names).toEqual(['Barn', 'Shed 2', 'Shed 10']);
		expect(controller.manageable.map((g) => g.id)).toEqual([2, 3]);
		expect(controller.addOpen).toBe(false);
		expect(controller.manageOpen).toBe(false);
	});

	it('starts empty without a list', () => {
		expect(setup(null).controller.names).toEqual([]);
	});

	it('cannot add a group without knowing the organization', async () => {
		const { controller, repository } = setup([], null);

		expect(controller.canAdd).toBe(false);
		await expect(controller.create('Barn')).resolves.toBeNull();
		expect(repository.createGroup).not.toHaveBeenCalled();
	});

	it('re-seeds the list (and its org) from reloaded page data', () => {
		const { controller } = setup([group(1, 'Barn')]);

		controller.reseed([group(1, 'Barn'), group(2, 'Attic')], ORG);
		expect(controller.names).toEqual(['Attic', 'Barn']);
		expect(controller.orgId).toBe(ORG);
		controller.reseed(undefined, 'org-2');
		expect(controller.names).toEqual([]);
		expect(controller.orgId).toBe('org-2');
		controller.reseed([], undefined);
		expect(controller.orgId).toBeNull();
		expect(controller.canAdd).toBe(false);
	});

	it('switches to another org’s groups, and adds there', async () => {
		const { controller, repository } = setup([group(1, 'Barn')]);
		repository.listGroups.mockResolvedValue([
			{ id: 9, name: 'Orchard', org_id: 'org-2', can_manage: true }
		]);
		repository.createGroup.mockResolvedValue({
			id: 10,
			name: 'Shed',
			org_id: 'org-2',
			can_manage: true
		});

		const switching = controller.switchOrg('org-2');
		// The old org's names go at once, not when the new list arrives.
		expect(controller.orgId).toBe('org-2');
		expect(controller.names).toEqual([]);
		await switching;

		expect(repository.listGroups).toHaveBeenCalledWith({ orgId: 'org-2' });
		expect(controller.names).toEqual(['Orchard']);
		await controller.create('Shed');
		expect(repository.createGroup).toHaveBeenCalledWith('Shed', 'org-2');
	});

	it('does nothing when the org stays the same, and loads nothing for no org', async () => {
		const { controller, repository } = setup([group(1, 'Barn')]);

		await controller.switchOrg(ORG);
		expect(controller.names).toEqual(['Barn']);
		await controller.switchOrg(undefined);
		expect(controller.orgId).toBeNull();
		expect(controller.names).toEqual([]);
		expect(repository.listGroups).not.toHaveBeenCalled();
	});

	it('drops a list that arrives after a later switch or re-seed', async () => {
		const { controller, repository } = setup([group(1, 'Barn')]);
		let finishSlow: (groups: GroupDto[]) => void = () => {};
		repository.listGroups
			.mockImplementationOnce(() => new Promise<GroupDto[]>((resolve) => (finishSlow = resolve)))
			.mockResolvedValueOnce([{ id: 4, name: 'Loft', org_id: 'org-3', can_manage: true }]);

		const slow = controller.switchOrg('org-2');
		await controller.switchOrg('org-3');
		finishSlow([{ id: 9, name: 'Orchard', org_id: 'org-2', can_manage: true }]);
		await slow;
		expect(controller.orgId).toBe('org-3');
		expect(controller.names).toEqual(['Loft']);

		let finishLate: (groups: GroupDto[]) => void = () => {};
		repository.listGroups.mockImplementationOnce(
			() => new Promise<GroupDto[]>((resolve) => (finishLate = resolve))
		);
		const late = controller.switchOrg('org-2');
		controller.reseed([group(1, 'Barn')], ORG);
		finishLate([{ id: 9, name: 'Orchard', org_id: 'org-2', can_manage: true }]);
		await late;
		expect(controller.orgId).toBe(ORG);
		expect(controller.names).toEqual(['Barn']);
	});

	it('offers nothing from an org whose list fails to load', async () => {
		const { controller, repository } = setup([group(1, 'Barn')]);
		repository.listGroups.mockRejectedValue(new TypeError('Failed to fetch'));

		await controller.switchOrg('org-2');

		expect(controller.orgId).toBe('org-2');
		expect(controller.names).toEqual([]);
		expect(controller.canAdd).toBe(true);
	});

	it('adds a group to its organization and returns its name to select', async () => {
		const { controller, repository, onSuccess } = setup([group(1, 'Barn')]);
		repository.createGroup.mockResolvedValue(group(7, 'Orchard'));

		await expect(controller.create('  Orchard ')).resolves.toBe('Orchard');

		expect(repository.createGroup).toHaveBeenCalledWith('Orchard', ORG);
		expect(controller.names).toEqual(['Barn', 'Orchard']);
		expect(onSuccess).toHaveBeenCalledWith(m.groups_created({ name: 'Orchard' }));
		expect(controller.busy).toBe(false);
	});

	it('selects a name already in the list instead of creating it again', async () => {
		const { controller, repository, onSuccess } = setup([group(1, 'Barn', false)]);

		await expect(controller.create('Barn ')).resolves.toBe('Barn');

		expect(repository.createGroup).not.toHaveBeenCalled();
		expect(onSuccess).toHaveBeenCalledWith(m.groups_exists_selected({ name: 'Barn' }));
	});

	it('refuses an empty or too long name without calling the API', async () => {
		const { controller, repository } = setup();

		await expect(controller.create('   ')).resolves.toBeNull();
		await expect(controller.create('x'.repeat(GROUP_NAME_MAX_LENGTH + 1))).resolves.toBeNull();
		await expect(controller.rename(1, ' ')).resolves.toBe(false);
		await expect(controller.rename(1, 'x'.repeat(GROUP_NAME_MAX_LENGTH + 1))).resolves.toBe(false);

		expect(repository.createGroup).not.toHaveBeenCalled();
		expect(repository.renameGroup).not.toHaveBeenCalled();
	});

	it('selects the org’s existing group the API returns for a name the list lacked', async () => {
		// The list failed to load (or the group is on things the caller cannot
		// see): adding the name returns the org's group instead of a duplicate.
		const { controller, repository } = setup([]);
		repository.createGroup.mockResolvedValue(group(3, 'Barn', false));

		await expect(controller.create('Barn')).resolves.toBe('Barn');
		repository.createGroup.mockResolvedValue(group(3, 'Barn', false));
		controller.groups = [group(3, 'Barn', false)];
		await expect(controller.create('barn ')).resolves.toBe('Barn');

		expect(controller.groups).toEqual([group(3, 'Barn', false)]);
	});

	it('explains a refused add', async () => {
		const { controller, repository, onError } = setup();
		repository.createGroup.mockRejectedValueOnce(refused('You cannot add groups here'));
		repository.createGroup.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await expect(controller.create('Barn')).resolves.toBeNull();
		await expect(controller.create('Barn')).resolves.toBeNull();

		expect(onError.mock.calls).toEqual([
			['You cannot add groups here'],
			[m.groups_create_failed()]
		]);
		expect(controller.groups).toEqual([]);
		expect(controller.busy).toBe(false);
	});

	it('renames a group in place, then lets the page reload', async () => {
		const { controller, repository, onSuccess, onChanged } = setup([
			group(1, 'Barn'),
			group(2, 'Attic')
		]);
		repository.renameGroup.mockResolvedValue(group(1, 'Cellar'));

		await expect(controller.rename(1, ' Cellar ')).resolves.toBe(true);

		expect(repository.renameGroup).toHaveBeenCalledWith(1, 'Cellar');
		expect(controller.names).toEqual(['Attic', 'Cellar']);
		expect(onSuccess).toHaveBeenCalledWith(m.groups_renamed({ name: 'Cellar' }));
		expect(onChanged).toHaveBeenCalledTimes(1);
	});

	it('keeps a finished change when the page reload fails', async () => {
		const { controller, repository, onChanged, onError } = setup([group(1, 'Barn')]);
		repository.renameGroup.mockResolvedValue(group(1, 'Cellar'));
		onChanged.mockRejectedValue(new TypeError('Failed to fetch'));

		await expect(controller.rename(1, 'Cellar')).resolves.toBe(true);
		expect(onError).not.toHaveBeenCalled();
		expect(controller.busy).toBe(false);
	});

	it('keeps the list when a rename is refused', async () => {
		const { controller, repository, onError } = setup([group(1, 'Barn')]);
		repository.renameGroup.mockRejectedValueOnce(conflict());
		repository.renameGroup.mockRejectedValueOnce(refused('Only its creator can rename it'));
		repository.renameGroup.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await controller.rename(1, 'Attic');
		await controller.rename(1, 'Attic');
		await controller.rename(1, 'Attic');

		expect(onError.mock.calls).toEqual([
			[m.groups_name_taken_org()],
			['Only its creator can rename it'],
			[m.groups_rename_failed()]
		]);
		expect(controller.names).toEqual(['Barn']);
	});

	it('deletes a group, then lets the page reload', async () => {
		const { controller, repository, onSuccess, onChanged } = setup([
			group(1, 'Barn'),
			group(2, 'Attic')
		]);
		repository.deleteGroup.mockResolvedValue(undefined);

		await expect(controller.remove(1)).resolves.toBe(true);

		expect(repository.deleteGroup).toHaveBeenCalledWith(1);
		expect(controller.names).toEqual(['Attic']);
		expect(onSuccess).toHaveBeenCalledWith(m.groups_deleted({ name: 'Barn' }));
		expect(onChanged).toHaveBeenCalledTimes(1);
	});

	it('works without a reload hook', async () => {
		const repository = createMockServices().deviceGroups;
		repository.deleteGroup.mockResolvedValue(undefined);
		const controller = new GroupsController({
			kind: 'device',
			repository,
			orgId: undefined,
			initial: [group(1, 'Barn')],
			onError: () => {},
			onSuccess: () => {}
		});

		expect(controller.orgId).toBeNull();
		await expect(controller.remove(1)).resolves.toBe(true);
	});

	it('keeps a group whose delete is refused, and ignores an unknown id', async () => {
		const { controller, repository, onError } = setup([group(1, 'Barn')]);
		repository.deleteGroup.mockRejectedValue(new TypeError('Failed to fetch'));

		await expect(controller.remove(1)).resolves.toBe(false);
		await expect(controller.remove(99)).resolves.toBe(false);

		expect(repository.deleteGroup).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(m.groups_delete_failed());
		expect(controller.names).toEqual(['Barn']);
	});

	it('runs one change at a time', async () => {
		const { controller, repository } = setup([group(1, 'Barn')]);
		let finish!: (value: GroupDto) => void;
		repository.createGroup.mockReturnValue(new Promise((resolve) => (finish = resolve)));

		const first = controller.create('Attic');
		expect(controller.busy).toBe(true);
		await expect(controller.create('Cellar')).resolves.toBeNull();
		await expect(controller.rename(1, 'Loft')).resolves.toBe(false);
		await expect(controller.remove(1)).resolves.toBe(false);

		finish(group(2, 'Attic'));
		await expect(first).resolves.toBe('Attic');
		expect(repository.createGroup).toHaveBeenCalledTimes(1);
		expect(repository.renameGroup).not.toHaveBeenCalled();
		expect(repository.deleteGroup).not.toHaveBeenCalled();
	});
});
