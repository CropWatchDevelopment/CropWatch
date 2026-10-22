import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
import { testEvent } from '$lib/testing/server';
import { load } from './+layout.server';

type LoadEvent = Parameters<typeof load>[0];

function orgContext(
	role: 'owner' | 'manager' | 'member',
	capabilities: string[],
	overrides: Partial<MeContextDto> = {}
): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: { id: 'org-1', type: 'company', name: 'Acme', role, capabilities },
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

function run(parent: Record<string, unknown>) {
	const event = testEvent<LoadEvent>({ parent });
	return { event, result: Promise.resolve(load(event)) };
}

async function statusOf(result: Promise<unknown>) {
	const thrown = await result.then(
		() => new Error('expected the load to fail'),
		(error: unknown) => error
	);
	if (!isHttpError(thrown)) throw thrown;
	return thrown.status;
}

describe('management layout load', () => {
	it('lets the owner and managers in', async () => {
		for (const role of ['owner', 'manager'] as const) {
			const { event, result } = run({
				orgContext: orgContext(role, [Capability.OrgRead, Capability.OrgManageOpen])
			});

			await expect(result).resolves.toEqual({});
			expect(event.parent).toHaveBeenCalledTimes(1);
		}
	});

	it('answers members deep-linking here with a real 403', async () => {
		const { result } = run({ orgContext: orgContext('member', [Capability.OrgRead]) });

		await expect(statusOf(result)).resolves.toBe(403);
	});

	it('fails closed without an org context', async () => {
		await expect(statusOf(run({ orgContext: undefined }).result)).resolves.toBe(403);
		await expect(statusOf(run({}).result)).resolves.toBe(403);
	});

	it('lets staff in', async () => {
		const { result } = run({ orgContext: orgContext('member', [], { is_staff: true }) });

		await expect(result).resolves.toEqual({});
	});
});
