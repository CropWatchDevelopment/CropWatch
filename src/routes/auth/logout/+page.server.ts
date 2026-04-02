import { buildLoginPath, readRedirectPathFromUrl } from '$lib/utils/auth-redirect';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, url }) => {
	const redirectPath = readRedirectPathFromUrl(url, '');

	cookies.delete('jwt', { path: '/' });
	for (const cookieName of cookies.getAll().map((cookie) => cookie.name)) {
		cookies.delete(cookieName, { path: '/' });
	}

	throw redirect(
		303,
		buildLoginPath({
			redirectTo: redirectPath,
			reason: 'signed-out'
		})
	);
};
