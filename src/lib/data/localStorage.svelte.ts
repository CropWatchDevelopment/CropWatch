/**
 * Creates a reactive state that automatically syncs with localStorage.
 * Works like $state but persists values to localStorage.
 *
 * @example
 * ```ts
 * // In a .svelte or .svelte.ts file
 * import { persisted } from '$lib/data/localStorage.svelte';
 *
 * // Create a persisted state
 * const count = persisted('my-count', 0);
 *
 * // Use it like regular state
 * count.value++; // Automatically saves to localStorage
 *
 * // Reset to default
 * count.reset();
 * ```
 */

import { browser } from '$app/environment';

type Serializer<T> = {
	serialize: (value: T) => string;
	deserialize: (value: string) => T;
};

const defaultSerializer: Serializer<unknown> = {
	serialize: JSON.stringify,
	deserialize: JSON.parse
};

export interface PersistedOptions<T> {
	/** Custom serializer for complex types */
	serializer?: Serializer<T>;
	/** Sync across browser tabs */
	syncTabs?: boolean;
}

export interface Persisted<T> {
	/** The current value (reactive) */
	value: T;
	/** Reset to the default value */
	reset: () => void;
	/** Remove from localStorage */
	clear: () => void;
}

/**
 * Creates a reactive state that automatically syncs with localStorage.
 *
 * @param key - The localStorage key
 * @param defaultValue - The default value if nothing is stored
 * @param options - Optional configuration
 * @returns A reactive object with `value`, `reset`, and `clear` methods
 */
export function persisted<T>(
	key: string,
	defaultValue: T,
	options: PersistedOptions<T> = {}
): Persisted<T> {
	const { serializer = defaultSerializer as Serializer<T>, syncTabs = true } = options;

	// Initialize with stored value or default
	let storedValue: T = defaultValue;

	if (browser) {
		try {
			const stored = localStorage.getItem(key);
			if (stored !== null) {
				storedValue = serializer.deserialize(stored);
			}
		} catch (e) {
			console.warn(`Error reading localStorage key "${key}":`, e);
		}
	}

	let _value = $state<T>(storedValue);

	// Sync to localStorage whenever value changes
	$effect.root(() => {
		$effect(() => {
			if (browser) {
				try {
					localStorage.setItem(key, serializer.serialize(_value));
				} catch (e) {
					console.warn(`Error writing to localStorage key "${key}":`, e);
				}
			}
		});

		// Listen for changes from other tabs
		if (browser && syncTabs) {
			const handleStorage = (event: StorageEvent) => {
				if (event.key === key && event.newValue !== null) {
					try {
						_value = serializer.deserialize(event.newValue);
					} catch (e) {
						console.warn(`Error parsing storage event for key "${key}":`, e);
					}
				} else if (event.key === key && event.newValue === null) {
					_value = defaultValue;
				}
			};

			window.addEventListener('storage', handleStorage);

			return () => {
				window.removeEventListener('storage', handleStorage);
			};
		}
	});

	return {
		get value() {
			return _value;
		},
		set value(newValue: T) {
			_value = newValue;
		},
		reset() {
			_value = defaultValue;
		},
		clear() {
			_value = defaultValue;
			if (browser) {
				localStorage.removeItem(key);
			}
		}
	};
}

/**
 * Creates a simple reactive wrapper around a localStorage value.
 * Use this when you just need to read/write a single value without full state management.
 *
 * @example
 * ```ts
 * import { localStore } from '$lib/data/localStorage.svelte';
 *
 * const theme = localStore<'light' | 'dark'>('theme', 'dark');
 *
 * // Read
 * console.log(theme.get());
 *
 * // Write (also updates reactively)
 * theme.set('light');
 * ```
 */
export function localStore<T>(key: string, defaultValue: T, serializer: Serializer<T> = defaultSerializer as Serializer<T>) {
	let _value = $state<T>(getInitialValue());

	function getInitialValue(): T {
		if (!browser) return defaultValue;
		try {
			const stored = localStorage.getItem(key);
			return stored !== null ? serializer.deserialize(stored) : defaultValue;
		} catch {
			return defaultValue;
		}
	}

	return {
		get current() {
			return _value;
		},
		set current(newValue: T) {
			_value = newValue;
			if (browser) {
				try {
					localStorage.setItem(key, serializer.serialize(newValue));
				} catch (e) {
					console.warn(`Error writing to localStorage key "${key}":`, e);
				}
			}
		},
		get() {
			return _value;
		},
		set(newValue: T) {
			this.current = newValue;
		},
		remove() {
			_value = defaultValue;
			if (browser) {
				localStorage.removeItem(key);
			}
		}
	};
}
