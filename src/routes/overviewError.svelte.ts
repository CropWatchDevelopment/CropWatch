// Function to get error severity and styling
export function getErrorSeverity(error) {
	if (!error) return null;

	// Common Supabase error codes and their severities
	const severityMap = {
		// Authentication errors
		invalid_credentials: 'high',
		email_not_confirmed: 'medium',
		weak_password: 'medium',
		signup_disabled: 'high',

		// Database errors
		PGRST116: 'high', // No rows returned
		PGRST301: 'medium', // Invalid range
		'23505': 'medium', // Unique violation
		'23503': 'medium', // Foreign key violation

		// Network/Connection errors
		NetworkError: 'high',
		FetchError: 'high',

		// Rate limiting
		rate_limit_exceeded: 'medium',

		// Default based on status codes
		'4xx': 'medium',
		'5xx': 'high'
	};

	// Check specific error code first
	if (error.code && severityMap[error.code]) {
		return severityMap[error.code];
	}

	// Check HTTP status codes
	if (error.status) {
		if (error.status >= 500) return 'high';
		if (error.status >= 400) return 'medium';
	}

	// Default to medium for unknown errors
	return 'medium';
}

export function getErrorClasses(severity) {
	const classes = {
		high: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
		medium: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
		low: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
	};
	return classes[severity] || classes.medium;
}

export function getErrorIconColor(severity) {
	const colors = {
		high: 'text-red-500',
		medium: 'text-yellow-500',
		low: 'text-blue-500'
	};
	return colors[severity] || colors.medium;
}

export function getErrorIcon(severity) {
	const icons = {
		high: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
		medium: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />`,
		low: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`
	};
	return icons[severity] || icons.medium;
}
