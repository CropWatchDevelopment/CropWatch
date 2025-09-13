// theme.svelte.ts - Theme state management using Svelte 5 runes
// This follows the latest Svelte 5 documentation

/**
 * Initialize theme based on localStorage or system preference
 * @returns {boolean} True if dark mode should be active
 */
// NOTE: This legacy module is now a thin wrapper over the central themeStore.
// It is kept to avoid breaking existing imports (ThemeToggle etc.).
import { themeStore, setThemeMode, toggleExplicitLightDark } from '$lib/stores/theme';
import { get } from 'svelte/store';

function initializeTheme(): boolean {
	// Derive initial from store (store already handled localStorage + system)
	return get(themeStore).effective === 'dark';
}

// Create private module-level state variables with default values for SSR
const _theme = $state({
	// Default to true for dark mode during SSR to avoid flash of light content
	// This will be immediately overridden by client-side initialization
	darkMode: true,
	systemPrefersDark: false
});

// Initialize theme state on client-side only
if (typeof window !== 'undefined') {
	// Run immediately for initial setup
	_theme.darkMode = initializeTheme();
	_theme.systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

	// Apply theme immediately
	applyTheme(_theme.darkMode);
	//console.log('Theme initialized from localStorage:', _theme.darkMode ? 'dark' : 'light');

	// Add a MutationObserver to monitor for any class changes on html element
	// This will help detect if something else is modifying the theme
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.attributeName === 'class') {
				const htmlElement = document.documentElement;
				const hasDarkClass = htmlElement.classList.contains('dark');

				// If there's a mismatch between state and DOM, fix it
				if (hasDarkClass !== _theme.darkMode) {
					//console.log('Theme mismatch detected, resynchronizing');
					// Update DOM to match our state
					applyTheme(_theme.darkMode);
				}
			}
		});
	});

	// Start observing the document with the configured parameters
	observer.observe(document.documentElement, { attributes: true });

	// Keep legacy _theme state in sync with central store so getDarkMode() reflects selector changes
	themeStore.subscribe((v) => {
		_theme.darkMode = v.effective === 'dark';
	});
}

// Export getter functions instead of the state directly
export function getDarkMode(): boolean {
	return _theme.darkMode;
}

export function getSystemPrefersDark(): boolean {
	return _theme.systemPrefersDark;
}

// Function to update the DOM and localStorage when theme changes
// This is called by components, not at the module level
export function applyTheme(isDark: boolean): void {
	// Delegate to theme store explicit mode set
	setThemeMode(isDark ? 'dark' : 'light');
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): void {
	toggleExplicitLightDark();
	_theme.darkMode = get(themeStore).effective === 'dark';
}

/**
 * Set the theme explicitly
 * @param {boolean} dark - True to set dark mode, false for light mode
 */
export function setTheme(dark: boolean): void {
	setThemeMode(dark ? 'dark' : 'light');
	_theme.darkMode = get(themeStore).effective === 'dark';
}

// Set up listener for system preference changes
// System preference changes handled centrally by themeStore now; no duplicate listeners here.
