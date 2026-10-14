/**
 * Leaflet writes string popup/tooltip content (and `divIcon` `html`) with
 * innerHTML and has no escaping option (CVE-2025-69993; no fixed release).
 * Wrap any text that could contain user data — device names, notes — so it
 * reaches Leaflet as a DOM node and can never become markup.
 *
 * ESLint enforces this: `bindPopup`, `bindTooltip` and `setContent` only
 * accept `plainText(...)` (see eslint.config.js).
 */
export function plainText(text: string): HTMLElement {
	const node = document.createElement('span');
	node.textContent = text;
	return node;
}
