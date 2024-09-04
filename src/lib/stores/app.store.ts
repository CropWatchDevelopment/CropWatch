// src/lib/stores.js
import { browser } from '$app/environment';
import type { Session } from '@supabase/supabase-js';
import { writable } from 'svelte/store';

interface AppStore {
  user: {
    email: string;
    username: string | null;

  } | null;
  avatarUrl: string | null;
  debugMode: boolean;
};

const localStorageString = browser ? localStorage.getItem('appStore'): '{}';
const localStorageData = localStorageString ? JSON.parse(localStorageString) : {};
// Define stores
export const appStore = writable<AppStore>({
  user: {
    email: localStorageData?.user?.email || '',
    username: localStorageData?.user?.username || null,
  },
  avatarUrl: localStorageData?.avatarUrl || null,
  debugMode: localStorageData?.debugMode || false
});
