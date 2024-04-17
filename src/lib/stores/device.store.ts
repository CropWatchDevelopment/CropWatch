import { writable, type Writable } from "svelte/store";

interface Device {
  dev_eui: string;
  name: string;
  [key: string]: any; // Additional properties can be dynamically added
}

function createDeviceStore() {
  const { subscribe, set, update }: Writable<Device[]> = writable([]);

  return {
    subscribe,

    add: (obj: Device) => {
      update(items => {
        const index = items.findIndex(item => item.dev_eui === obj.dev_eui);
        if (index === -1) {
          return [...items, obj];
        } else {
          console.error("Item with dev_eui", obj.dev_eui, "already exists.");
          return items;
        }
      });
    },

    delete: (dev_eui: string) => {
      update(items => items.filter(item => item.dev_eui !== dev_eui));
    },

    search: (dev_eui: string) => {
      let found: Device | null = null;
      update(items => {
        found = items.find(item => item.dev_eui === dev_eui) || null;
        return items;
      });
      return found;
    }
  };
}

export const deviceStore = createDeviceStore();