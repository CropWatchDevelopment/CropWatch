import type { HandleClientError } from '@sveltejs/kit';

function clearAllClientState(): void {
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

export const handleError: HandleClientError = ({ error, status, message }) => {
	console.error('[CropWatch] Unexpected client error:', error);

	if (status === 500 || status === undefined) {
		clearAllClientState();
		window.location.href = '/auth/login?reason=error-recovery';
		return;
	}

	return {
		message
	};
};
