import { getContext, setContext } from 'svelte';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	title?: string;
	duration?: number; // ms, 0 = forever
	dismissible?: boolean;
}

export interface ToastOptions {
	title?: string;
	duration?: number;
	dismissible?: boolean;
}

const TOAST_CONTEXT_KEY = Symbol('toast');

function createToastState() {
	let toasts = $state<Toast[]>([]);

	function generateId(): string {
		return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	function add(type: ToastType, message: string, options: ToastOptions = {}): string {
		const id = generateId();
		const duration = options.duration ?? (type === 'error' ? 0 : 5000);
		const dismissible = options.dismissible ?? true;

		const toast: Toast = {
			id,
			type,
			message,
			title: options.title,
			duration,
			dismissible
		};

		toasts = [...toasts, toast];

		if (duration > 0) {
			setTimeout(() => {
				dismiss(id);
			}, duration);
		}

		return id;
	}

	function dismiss(id: string): void {
		toasts = toasts.filter((t) => t.id !== id);
	}

	function dismissAll(): void {
		toasts = [];
	}

	function success(message: string, options?: ToastOptions): string {
		return add('success', message, options);
	}

	function info(message: string, options?: ToastOptions): string {
		return add('info', message, options);
	}

	function warning(message: string, options?: ToastOptions): string {
		return add('warning', message, options);
	}

	function error(message: string, options?: ToastOptions): string {
		return add('error', message, { duration: 0, ...options });
	}

	function neutral(message: string, options?: ToastOptions): string {
		return add('neutral', message, options);
	}

	return {
		get toasts() {
			return toasts;
		},
		add,
		dismiss,
		dismissAll,
		success,
		info,
		warning,
		error,
		neutral
	};
}

export type ToastState = ReturnType<typeof createToastState>;

export function createToastContext(): ToastState {
	const state = createToastState();
	setContext(TOAST_CONTEXT_KEY, state);
	return state;
}

export function getToastContext(): ToastState {
	const context = getContext<ToastState>(TOAST_CONTEXT_KEY);
	if (!context) {
		throw new Error('Toast context not found. Make sure to use CWToastContainer in a parent component.');
	}
	return context;
}
