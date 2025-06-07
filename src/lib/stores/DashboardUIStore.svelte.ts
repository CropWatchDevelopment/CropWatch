import { browser } from '$app/environment';

/**
 * Store for managing dashboard UI preferences
 */
export class DashboardUIStore {
    search = $state(browser ? (localStorage.getItem('dashboard_search') ?? '') : '');
    
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

// Set up the effect at the module level
if (browser) {
    // Create the store first to ensure it exists
    const store = getDashboardUIStore();
    
    // Then set up the persistence effect at module level
    $effect(() => {
        localStorage.setItem('dashboard_view_type', store.dashboardViewType);
        localStorage.setItem('dashboard_search', store.search);
        localStorage.setItem('hide_empty_locations', store.hideEmptyLocations.toString());
        localStorage.setItem('dashboard_sort_type', store.dashboardSortType);
    });
}
