export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'neutral';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	dismissible?: boolean;
	timeout?: number;
}

// Svelte 5 runes: use $state for the toast array (non-exported)
let toasts = $state<Toast[]>([]);

// Export a getter function to access the toasts array
export function getToasts() {
	return toasts;
}

function generateId() {
	return Math.random().toString(36).substring(2, 9);
}

export function add(toast: Omit<Toast, 'id'>) {
	const id = generateId();
	const defaults = {
		dismissible: true,
		timeout: 5000
	};
	const newToast: Toast = { ...defaults, ...toast, id };
	// Use push instead of reassignment
	toasts.push(newToast);
	if (newToast.timeout && typeof window !== 'undefined') {
		setTimeout(() => remove(id), newToast.timeout);
	}
	return id;
}

export function remove(id: string) {
	// Find and remove the toast with the given id
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) {
		toasts.splice(index, 1);
	}
}

export function clear() {
	// Clear the array without reassignment
	toasts.splice(0, toasts.length);
}

export function success(message: string, options = {}) {
	return add({ type: 'success', message, ...options });
}
export function error(message: string, options = {}) {
	return add({ type: 'error', message, ...options });
}
export function warning(message: string, options = {}) {
	return add({ type: 'warning', message, ...options });
}
export function info(message: string, options = {}) {
	return add({ type: 'info', message, ...options });
}
export function neutral(message: string, options = {}) {
	return add({ type: 'neutral', message, ...options });
}
