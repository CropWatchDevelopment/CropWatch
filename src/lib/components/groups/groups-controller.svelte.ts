import type { GroupDto } from '#lib/api/api.dtos.ts';
import { apiErrorMessage, apiErrorStatus } from '#lib/api/api-error.ts';
import type { GroupRepository } from '#lib/api/repositories/groups.repository.ts';
import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { naturalSort } from '#lib/utils/natural-sort.ts';

/** The API's limit on a group name (after trimming). */
export const GROUP_NAME_MAX_LENGTH = 120;

/** Which pool a controller manages: the dialogs word their text by it. */
export type GroupKind = 'location' | 'device';

/**
 * The group list behind one group picker and its "Add group" / "Manage groups"
 * dialogs, for ONE organization: a group belongs to the org of the location or
 * device it is used on (one group per name per org). A location or device is
 * saved with its group's *name* and the API resolves it in that org, so the
 * picker offers names.
 */
export class GroupsController {
	readonly kind: GroupKind;
	/**
	 * The org whose groups the list holds and new groups go into; null =
	 * unknown, so groups cannot be added. It follows the page: a device moved
	 * to a location of another org takes that org's groups (`switchOrg`).
	 */
	orgId = $state<string | null>(null);
	groups = $state<GroupDto[]>([]);
	addOpen = $state(false);
	manageOpen = $state(false);
	/** A create, rename or delete is in flight. */
	busy = $state(false);

	readonly names = $derived(
		naturalSort(
			this.groups
				.map((group) => group.name)
				.filter((name, index, all) => all.indexOf(name) === index),
			(name) => name,
			{ locale: getLocale() }
		)
	);
	readonly manageable = $derived(
		naturalSort(
			this.groups.filter((group) => group.can_manage),
			(group) => group.name,
			{ locale: getLocale() }
		)
	);
	/** Groups can be added (and offered) only when the org is known. */
	get canAdd(): boolean {
		return this.orgId !== null;
	}

	#repository: GroupRepository;
	/** Bumped by every list replacement, so a slower earlier load cannot win. */
	#listVersion = 0;
	#onError: (message: string) => void;
	#onSuccess: (message: string) => void;
	#onChanged: () => void | Promise<void>;

	constructor(options: {
		kind: GroupKind;
		repository: GroupRepository;
		orgId: string | null | undefined;
		initial: GroupDto[] | null | undefined;
		onError: (message: string) => void;
		onSuccess: (message: string) => void;
		/**
		 * After a rename or delete: the page reloads its data (the saved
		 * location/device may now carry another name, or none) and re-seeds.
		 */
		onChanged?: () => void | Promise<void>;
	}) {
		this.kind = options.kind;
		this.orgId = options.orgId ?? null;
		this.groups = options.initial ?? [];
		this.#repository = options.repository;
		this.#onError = options.onError;
		this.#onSuccess = options.onSuccess;
		this.#onChanged = options.onChanged ?? (() => {});
	}

	/** Replaces the list with freshly loaded groups of `orgId` (after the page reloads its data). */
	reseed(groups: GroupDto[] | null | undefined, orgId: string | null | undefined) {
		this.#listVersion++;
		this.orgId = orgId ?? null;
		this.groups = groups ?? [];
	}

	/**
	 * Shows another org's groups: the org the page's resource is about to be
	 * saved in changed (a device moved to a location of another org). Loads
	 * that org's list; a load overtaken by a later switch or reseed is dropped,
	 * and a failed one leaves the list empty (the picker keeps its value).
	 */
	async switchOrg(orgId: string | null | undefined): Promise<void> {
		const next = orgId ?? null;
		if (next === this.orgId) return;
		const version = ++this.#listVersion;
		this.orgId = next;
		this.groups = [];
		if (next === null) return;
		try {
			const groups = await this.#repository.listGroups({ orgId: next });
			if (version === this.#listVersion) this.groups = groups;
		} catch {
			// Nothing to offer from that org; the API still saves the name.
		}
	}

	/**
	 * Adds a group to the org and returns the name to select, or null when
	 * nothing was added. A name already in the list is selected without a call;
	 * the API returns the org's existing group for a name the list does not hold.
	 */
	async create(rawName: string): Promise<string | null> {
		const name = rawName.trim();
		const orgId = this.orgId;
		if (!name || name.length > GROUP_NAME_MAX_LENGTH || this.busy || orgId === null) return null;
		if (this.names.includes(name)) {
			this.#onSuccess(m.groups_exists_selected({ name }));
			return name;
		}

		this.busy = true;
		try {
			const group = await this.#repository.createGroup(name, orgId);
			if (!this.groups.some((existing) => existing.id === group.id)) {
				this.groups = [...this.groups, group];
			}
			this.#onSuccess(m.groups_created({ name: group.name }));
			return group.name;
		} catch (error) {
			this.#onError(apiErrorMessage(error, m.groups_create_failed()));
			return null;
		} finally {
			this.busy = false;
		}
	}

	/** Renames a group; resolves true when it was renamed. */
	async rename(id: number, rawName: string): Promise<boolean> {
		const name = rawName.trim();
		if (!name || name.length > GROUP_NAME_MAX_LENGTH || this.busy) return false;

		this.busy = true;
		try {
			const renamed = await this.#repository.renameGroup(id, name);
			this.groups = this.groups.map((group) => (group.id === id ? renamed : group));
			this.#onSuccess(m.groups_renamed({ name: renamed.name }));
			await this.#refresh();
			return true;
		} catch (error) {
			this.#onError(
				apiErrorStatus(error) === 409
					? m.groups_name_taken_org()
					: apiErrorMessage(error, m.groups_rename_failed())
			);
			return false;
		} finally {
			this.busy = false;
		}
	}

	/** Deletes a group; resolves true when it was deleted. */
	async remove(id: number): Promise<boolean> {
		const group = this.groups.find((candidate) => candidate.id === id);
		if (!group || this.busy) return false;

		this.busy = true;
		try {
			await this.#repository.deleteGroup(id);
			this.groups = this.groups.filter((candidate) => candidate.id !== id);
			this.#onSuccess(m.groups_deleted({ name: group.name }));
			await this.#refresh();
			return true;
		} catch (error) {
			this.#onError(apiErrorMessage(error, m.groups_delete_failed()));
			return false;
		} finally {
			this.busy = false;
		}
	}

	/** The change is done; a failed page reload must not turn it into an error. */
	async #refresh() {
		try {
			await this.#onChanged();
		} catch {
			// The list already shows the change; the next navigation reloads the rest.
		}
	}
}
