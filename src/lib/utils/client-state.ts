/**
 * Clears everything the app keeps in this browser — localStorage,
 * sessionStorage and every cookie the page can see — before signing in again
 * after an unrecoverable error. Each part is best effort: storage or cookies
 * can be unavailable (privacy modes, blocked site data), and the rest is
 * still cleared. Browser only.
 */
export function clearAllClientState(): void {
	try {
		localStorage.clear();
	} catch {
		// storage may be unavailable
	}

	try {
		sessionStorage.clear();
	} catch {
		// storage may be unavailable
	}

	try {
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0].trim();
			if (name) {
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
			}
		}
	} catch {
		// cookie clearing failed
	}
}
