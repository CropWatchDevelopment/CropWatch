/**
 * Resolve where a page's "back" button should navigate, as an app-relative path.
 *
 * Honors a `backTo` query param — the app-relative path of the page the user
 * came from (e.g. the dashboard sets `?backTo=/` when opening a device). When a
 * dashboard group filter was carried along as `?filter=<value>`, it is
 * re-applied via the `locationGroup` param the dashboard actually reads, so both
 * the filtered data AND the sidebar selection are restored.
 *
 * Falls back to `fallback` (also an app-relative path) when there is no
 * `backTo`, so existing back buttons keep their current destination.
 *
 * Callers must pass the returned path through `resolve()` from `$app/paths`
 * so the configured base path is applied.
 *
 * @param url       The current page URL (`page.url`).
 * @param fallback  App-relative destination to use when no `backTo` is present.
 */
export function backHref(url: URL, fallback: string): string {
	const backTo = url.searchParams.get('backTo');
	if (!backTo) return fallback;

	const filter = url.searchParams.get('filter');
	return filter
		? `${backTo}${backTo.includes('?') ? '&' : '?'}locationGroup=${encodeURIComponent(filter)}`
		: backTo;
}
