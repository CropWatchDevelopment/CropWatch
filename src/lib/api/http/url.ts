export type ApiQueryValue = string | number | boolean | Date | null | undefined;
export type ApiQuery = Record<string, ApiQueryValue>;

export function toIsoIfDate(value: string | Date | undefined): string | undefined {
	if (value === undefined) return undefined;
	return value instanceof Date ? value.toISOString() : value;
}

/** `null`/`undefined` values are dropped; there is no array support (join explicitly). */
export function buildQueryString(query?: ApiQuery): string {
	if (!query) return '';

	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null) continue;
		searchParams.set(key, value instanceof Date ? value.toISOString() : String(value));
	}

	const serialized = searchParams.toString();
	return serialized.length > 0 ? `?${serialized}` : '';
}

export function buildUrl(baseUrl: string, path: string, query?: ApiQuery): string {
	const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
	const normalizedPath = path.length === 0 ? '' : path.startsWith('/') ? path : `/${path}`;
	return `${normalizedBaseUrl}${normalizedPath}${buildQueryString(query)}`;
}

/** Replaces every `{param}` in the template with its URL-encoded value. */
export function replacePathParams(
	pathTemplate: string,
	pathParams: Record<string, string | number>
): string {
	let resolvedPath = pathTemplate;
	for (const [param, value] of Object.entries(pathParams)) {
		resolvedPath = resolvedPath.replaceAll(`{${param}}`, encodeURIComponent(String(value)));
	}
	return resolvedPath;
}
