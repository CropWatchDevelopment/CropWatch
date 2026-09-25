import { applyAction, deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

/**
 * Posts a named page action with the given fields and returns whether it
 * succeeded (invalidating all data on success). The caller toasts.
 */
export async function submitPageAction(
	action: string,
	fields: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		body.set(key, value);
	}

	const response = await fetch(`?/${action}`, { method: 'POST', body });
	const result = deserialize(await response.text());
	if (result.type === 'success') {
		await invalidateAll();
		return { ok: true };
	}
	await applyAction(result);
	return {
		ok: false,
		error:
			result.type === 'failure' && typeof result.data?.error === 'string'
				? result.data.error
				: undefined
	};
}
