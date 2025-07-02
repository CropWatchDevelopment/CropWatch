// theme.svelte.ts - Theme state management using Svelte 5 runes
// This follows the latest Svelte 5 documentation

/**
 * Initialize theme based on localStorage or system preference
 * @returns {boolean} True if dark mode should be active
 */
function initializeTheme(): boolean {
	// Handle SSR case
	if (typeof window === 'undefined') return false;

	// Check localStorage first for user preference
	const savedTheme = localStorage.getItem('theme');

	if (savedTheme === 'dark') return true;
	if (savedTheme === 'light') return false;

	// Fall back to system preference if no saved preference
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
	if (typeof window === 'undefined') return;

	if (isDark) {
		document.documentElement.classList.add('dark');
		localStorage.setItem('theme', 'dark');
	} else {
		document.documentElement.classList.remove('dark');
		localStorage.setItem('theme', 'light');
	}
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): void {
	_theme.darkMode = !_theme.darkMode;
	applyTheme(_theme.darkMode);
}

/**
 * Set the theme explicitly
 * @param {boolean} dark - True to set dark mode, false for light mode
 */
export function setTheme(dark: boolean): void {
	_theme.darkMode = dark;
	applyTheme(_theme.darkMode);
}

// Set up listener for system preference changes
if (typeof window !== 'undefined') {
	const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	// Update system preference state and apply theme if no localStorage preference exists
	darkModeMediaQuery.addEventListener('change', (e) => {
		_theme.systemPrefersDark = e.matches;

		// Check if user has a saved preference
		const savedTheme = localStorage.getItem('theme');

		// Only follow system preference if no explicit user preference exists
		if (!savedTheme) {
			_theme.darkMode = e.matches;
			applyTheme(e.matches);
			//console.log('System preference changed, applying:', e.matches ? 'dark' : 'light');
		} else {
			//console.log('System preference changed, but keeping user preference:', savedTheme);
		}
	});

	// Apply the initial theme
	applyTheme(_theme.darkMode);
}
