// Central theme store: handles 'light' | 'dark' | 'system' modes
// Ensures user preference overrides OS unless mode === 'system'
import { writable, type Writable } from 'svelte/store';

export type ThemeMode = 'light' | 'dark' | 'system';
export interface ThemeState {
	mode: ThemeMode; // user selected
	effective: 'light' | 'dark'; // applied
	system: 'light' | 'dark';
	initialized: boolean;
}

const STORAGE_KEY = 'theme.mode';

function getSystemPref(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function deriveEffective(mode: ThemeMode, system: 'light' | 'dark'): 'light' | 'dark' {
	if (mode === 'system') return system;
	return mode;
}

const initialSystem = getSystemPref();
let initialMode: ThemeMode = 'system';
if (typeof window !== 'undefined') {
	const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
	if (saved === 'light' || saved === 'dark' || saved === 'system') initialMode = saved;
}

const initial: ThemeState = {
	mode: initialMode,
	system: initialSystem,
	effective: deriveEffective(initialMode, initialSystem),
	initialized: false
};

export const themeStore: Writable<ThemeState> = writable(initial);

function applyDOMTheme(theme: 'light' | 'dark', mode: ThemeMode, system: 'light' | 'dark') {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const body = document.body;

	// Apply/remove Tailwind dark class consistently on both html and body
	const targets = [root, body].filter((el): el is HTMLElement => Boolean(el));
	targets.forEach((el) => {
		if (theme === 'dark') el.classList.add('dark');
		else el.classList.remove('dark');
	});

	// Data attributes for downstream CSS hooks / debugging
	root.dataset.theme = theme;
	root.dataset.mode = mode; // user selected value (light|dark|system)
	root.dataset.system = system; // current system preference
	if (body) {
		body.dataset.theme = theme;
	}
	const explicit = mode !== 'system';
	if (explicit) root.dataset.explicit = 'true';
	else delete root.dataset.explicit;

	// Enforce browser UI (form controls, scrollbars) color scheme so it matches user intent
	// This prevents a dark UA style leaking when user forces light while OS is dark.
	root.style.colorScheme = theme;

	// Add a helper class only when the user explicitly forces light while the OS is dark.
	// This lets us write targeted override rules inside @media(prefers-color-scheme: dark) blocks.
	if (mode !== 'system' && mode === 'light' && system === 'dark') {
		root.classList.add('force-light');
	} else {
		root.classList.remove('force-light');
	}
}

export function setThemeMode(mode: ThemeMode) {
	themeStore.update((s) => {
		const system = getSystemPref();
		const effective = deriveEffective(mode, system);
		if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
		applyDOMTheme(effective, mode, system);
		return { ...s, mode, system, effective };
	});
}

export function toggleExplicitLightDark() {
	themeStore.update((s) => {
		// If system, move to explicit opposite of current effective
		let newMode: ThemeMode;
		if (s.mode === 'system') newMode = s.effective === 'dark' ? 'light' : 'dark';
		else newMode = s.mode === 'dark' ? 'light' : 'dark';
		if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, newMode);
		const system = getSystemPref();
		const effective = deriveEffective(newMode, system);
		applyDOMTheme(effective, newMode, system);
		return { ...s, mode: newMode, system, effective };
	});
}

export function initThemeOnce() {
	if (typeof window === 'undefined') return;
	let already = false;
	themeStore.update((s) => {
		if (s.initialized) {
			already = true;
			return s;
		}
		const system = getSystemPref();
		const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
		const mode = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : s.mode;
		const effective = deriveEffective(mode, system);
		applyDOMTheme(effective, mode, system);
		return { ...s, mode, system, effective, initialized: true };
	});
	if (already) return;
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	mq.addEventListener('change', (e) => {
		themeStore.update((s) => {
			if (s.mode !== 'system') {
				return s;
			}
			const system = e.matches ? 'dark' : 'light';
			const effective = deriveEffective(s.mode, system);
			applyDOMTheme(effective, s.mode, system);
			return { ...s, system, effective };
		});
	});
}

// Initialize immediately on client
if (typeof window !== 'undefined') {
	initThemeOnce();
}
