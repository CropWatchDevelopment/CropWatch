/**
 * Signs out through the `/auth/logout` form action. Signing out changes state,
 * so it is a real POST (never a GET a link or another site could trigger):
 * SvelteKit's CSRF origin check applies, and the browser follows the action's
 * redirect to the login page as a full page load.
 *
 * @param action - The logout path, e.g. `buildLogoutPath({ path: resolve('/auth/logout'), redirectTo })`.
 */
export function signOut(action: string): void {
	const form = document.createElement('form');
	form.method = 'POST';
	form.action = action;
	form.hidden = true;
	document.body.append(form);
	form.submit();
}
