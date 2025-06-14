import { browser } from '$app/environment';

/**
 * Store for managing dashboard UI preferences
 */
export class DashboardUIStore {
    search = $state(browser ? (localStorage.getItem('dashboard_search') ?? '') : '');
    
    // Method to explicitly clear search
    clearSearch() {
        console.log('DashboardUIStore: clearSearch called');
        this.search = '';
        if (browser) {
            localStorage.removeItem('dashboard_search');
        }
        console.log('DashboardUIStore: search cleared');
    }
    
    hideEmptyLocations = $state(
        browser ? localStorage.getItem('hide_empty_locations') === 'true' : false
    );
    
    dashboardViewType: 'grid' | 'mozaic' | 'list' = $state(
        browser
            ? localStorage.getItem('dashboard_view_type') === 'mozaic'
                ? 'mozaic'
                : localStorage.getItem('dashboard_view_type') === 'list'
                    ? 'list'
                    : 'grid'
            : 'grid'
    );
    
    dashboardSortType: 'alpha' | 'custom' = $state(
        browser
            ? localStorage.getItem('dashboard_sort_type') === 'alpha'
                ? 'alpha'
                : 'custom'
            : 'alpha'
    );
}

// Singleton instance
let dashboardUIStore: DashboardUIStore;

/**
 * Get the dashboard UI store instance
 */
export function getDashboardUIStore() {
    if (!dashboardUIStore) {
        dashboardUIStore = new DashboardUIStore();
    }
    return dashboardUIStore;
}

// The persistence effect should be set up in a Svelte component file
// rather than at the module level in a .svelte.ts file
