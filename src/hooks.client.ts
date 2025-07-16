import { captureException } from '$lib/services/logrocket';

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
	window.addEventListener('error', (event) => {
		captureException(event.error || new Error(event.message), {
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			type: 'global_error'
		});
	});

	// Handle unhandled promise rejections
	window.addEventListener('unhandledrejection', (event) => {
		captureException(new Error(event.reason || 'Unhandled promise rejection'), {
			reason: event.reason,
			type: 'unhandled_rejection'
		});
	});
}
