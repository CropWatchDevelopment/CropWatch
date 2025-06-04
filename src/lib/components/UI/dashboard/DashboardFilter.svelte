<script lang="ts">
	import { browser } from '$app/environment';
	import DashboardFilterBits from './DashboardFilterBits.svelte';

	let search = '';
	let hideNoDeviceLocations = false;
	let dashboardViewType = 'mozaic';
	let dashboardSortType = 'alpha';

	// Initialize from localStorage if available
	$: {
		if (browser) {
			const searchValue = localStorage.getItem('dashboard_search');
			if (searchValue) {
				search = searchValue;
			}
			
			const hideEmptyValue = localStorage.getItem('hide_empty_locations');
			if (hideEmptyValue) {
				hideNoDeviceLocations = hideEmptyValue === 'true';
			}
			
			const viewTypeValue = localStorage.getItem('dashboard_view_type');
			if (viewTypeValue) {
				dashboardViewType = viewTypeValue as 'grid' | 'mozaic' | 'list';
			}
			
			const sortTypeValue = localStorage.getItem('dashboard_sort_type');
			if (sortTypeValue) {
				dashboardSortType = sortTypeValue as 'alpha' | 'date' | 'time';
			}
		}
	}

	// Handle escape key to clear search
	$: if (browser) {
		document.onkeydown = function (evt: any) {
			var isEscape = false;
			if ('key' in evt) {
				isEscape = evt.key === 'Escape' || evt.key === 'Esc';
			} else {
				isEscape = evt.keyCode === 27;
			}
			if (isEscape) {
				search = '';
				localStorage.removeItem('dashboard_search');
			}
		};
	}
</script>

<!-- Use DashboardFilterBits component instead -->

<DashboardFilterBits
  bind:search
  bind:hideNoDeviceLocations
  bind:dashboardViewType
  bind:dashboardSortType
/>
