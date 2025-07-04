import { browser } from '$app/environment';

/**
 * Global sidebar state management
 */
export class SidebarStore {
	// Sidebar open/closed state
	isOpen = $state(browser ? this.getInitialState() : false);

	// Small icon mode (collapsed but still visible)
	isSmallIconMode = $state(browser ? this.getInitialSmallIconMode() : false);

	private getInitialSmallIconMode(): boolean {
		// Check if user has a saved preference
		const savedMode = localStorage.getItem('sidebar_small_icon_mode');
		if (savedMode !== null) {
			return savedMode === 'true';
		}

		// Default to small icon mode on desktop if sidebar is not open
		const isMobile = window.innerWidth < 1024;
		const savedOpen = localStorage.getItem('sidebar_open');

		if (!isMobile && (savedOpen === null || savedOpen === 'false')) {
			return true; // Default to small icon mode on desktop
		}

		return false;
	}

	private getInitialState(): boolean {
		// Check if we're on mobile vs desktop (align with CSS breakpoints)
		const isMobile = window.innerWidth < 1024; // lg breakpoint to match CSS

		// For mobile: closed by default
		// For desktop: small icon mode by default (unless user has preference)
		const defaultState = !isMobile;

		// Check if user has a saved preference
		const savedState = localStorage.getItem('sidebar_open');
		if (savedState !== null) {
			return savedState === 'true';
		}

		return defaultState;
	}

	toggle() {
		this.isOpen = !this.isOpen;
		if (browser) {
			localStorage.setItem('sidebar_open', this.isOpen.toString());
		}
	}

	open() {
		this.isOpen = true;
		if (browser) {
			localStorage.setItem('sidebar_open', 'true');
		}
	}

	close() {
		this.isOpen = false;
		if (browser) {
			localStorage.setItem('sidebar_open', 'false');
		}
	}

	toggleSmallIconMode() {
		this.isSmallIconMode = !this.isSmallIconMode;
		if (browser) {
			localStorage.setItem('sidebar_small_icon_mode', this.isSmallIconMode.toString());
		}
	}

	// Reactive getter for checking if sidebar should be visible
	get shouldShowSidebar() {
		return this.isOpen || this.isSmallIconMode;
	}

	// Initialize responsive behavior
	initializeResponsive() {
		if (!browser) return () => {};

		const handleResize = () => {
			const isMobile = window.innerWidth < 1024; // Align with CSS breakpoint

			// Auto-close on mobile, enable small icon mode on desktop if no user preference
			if (isMobile && this.isOpen && !localStorage.getItem('sidebar_open')) {
				this.close();
			} else if (
				!isMobile &&
				!this.isOpen &&
				!this.isSmallIconMode &&
				!localStorage.getItem('sidebar_open')
			) {
				// On desktop, default to small icon mode
				this.isSmallIconMode = true;
			}
		};

		window.addEventListener('resize', handleResize);

		// Initial check
		handleResize();

		// Return cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}
}

// Global instance
export const sidebarStore = new SidebarStore();
