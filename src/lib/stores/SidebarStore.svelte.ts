import { browser } from '$app/environment';

/**
 * Global sidebar state management
 */
export class SidebarStore {
	// Sidebar open/closed state
	isOpen = $state(browser ? this.getInitialState() : false);

	// Small icon mode (collapsed but still visible)
	isSmallIconMode = $state(
		browser ? localStorage.getItem('sidebar_small_icon_mode') === 'true' : false
	);

	private getInitialState(): boolean {
		// Check if we're on mobile/tablet vs desktop
		const isMobile = window.innerWidth < 768; // md breakpoint
		const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024; // lg breakpoint

		// For mobile: closed by default
		// For tablet/desktop: open by default
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
		if (!browser) return;

		const handleResize = () => {
			const isMobile = window.innerWidth < 768;
			const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

			// Auto-close on mobile, auto-open on desktop if no user preference
			if (isMobile && this.isOpen && !localStorage.getItem('sidebar_open')) {
				this.close();
			} else if (
				window.innerWidth >= 1024 &&
				!this.isOpen &&
				!localStorage.getItem('sidebar_open')
			) {
				this.open();
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
