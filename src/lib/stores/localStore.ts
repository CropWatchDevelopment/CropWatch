import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createLocalStore<T>(key: string, initial: T) {
  const store = writable<T>(initial);

  if (browser) {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      store.set(JSON.parse(storedValue));
    }

    store.subscribe(value => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  return store;
}

export default createLocalStore;
