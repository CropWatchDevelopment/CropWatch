import { browser } from '$app/environment';
import { writable, type Writable, get } from 'svelte/store';

// Define Device interface
interface Device {
  dev_eui: string;
  name: string;
  location_id: number; // Ensure location_id is included
  data: any[]; // Array to store multiple data items
  [key: string]: any; // Additional properties can be dynamically added
}

// Load initial data from local storage
const loadFromLocalStorage = () => {
  if (!browser) return [];
  const storedData = localStorage.getItem('deviceStore');
  return storedData ? JSON.parse(storedData) : [];
};

// Create device store
function createDeviceStore() {
  const { subscribe, set, update }: Writable<Device[]> = writable(loadFromLocalStorage());

  const saveToLocalStorage = (items: Device[]) => {
    if (browser) {
      localStorage.setItem('deviceStore', JSON.stringify(items));
    }
  };

  return {
    subscribe,
    add: (obj: Device) => {
      update(items => {
        const index = items.findIndex(item => item.dev_eui === obj.dev_eui);
        if (index === -1) {
          // Ensure data array is initialized
          if (!obj.data) obj.data = [];
          const newItems = [...items, obj];
          saveToLocalStorage(newItems);
          return newItems;
        }
      });
    },

    updateDevice: (dev_eui: string, newData: any, location_id: number) => {
      update(items => {
        const index = items.findIndex(item => item.dev_eui === dev_eui);
        if (index === -1) {
          console.error('Item with dev_eui', dev_eui, 'does not exist.');
          return items;
        } else {
          // Initialize data array if it does not exist
          if (!items[index].data) {
            items[index].data = [];
          }
          newData['location_id'] = location_id; // Ensure location_id is included
          items[index].data.push(newData); // Push new data onto the array
          items[index] = { ...items[index], data: [...items[index].data] }; // Ensure reactivity and correct location
          return items;
        }
      });
    },

    delete: (dev_eui: string) => {
      update(items => {
        const newItems = items.filter(item => item.dev_eui !== dev_eui);
        saveToLocalStorage(newItems);
        return newItems;
      });
    },

    search: (dev_eui: string) => {
      const items = get(deviceStore);
      return items.find(item => item.dev_eui === dev_eui) || null;
    },

    getLatestData: (dev_eui: string) => {
      const items = get(deviceStore);
      const device = items.find(item => item.dev_eui === dev_eui);
      return device && device.data.length > 0 ? device.data[device.data.length - 1] : null;
    },

    getDevicesByLocation: (location_id: number) => {
      const items = get(deviceStore);
      return items.filter(item => item.location_id === location_id);
    }
  };
}

export const deviceStore = createDeviceStore();
