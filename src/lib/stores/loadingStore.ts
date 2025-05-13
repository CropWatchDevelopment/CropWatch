import { writable } from 'svelte/store';

// Global loading state store
export const globalLoading = writable(false);

// Helper functions
export function startLoading() {
  globalLoading.set(true);
}

export function stopLoading() {
  globalLoading.set(false);
}
