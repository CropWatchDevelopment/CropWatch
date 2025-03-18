import { browser } from "$app/environment";
import moment from "moment";

export interface StorageData<T> {
    value: T;
    expiry?: number;
}

export function useLocalStorage() {
    if (!browser) return;
    return {
        set<T>(key: string, value: T, expireInMinutes?: number): void {
            try {
                const data: StorageData<T> = {
                    value,
                    expiry: expireInMinutes
                        ? Date.now() + expireInMinutes * 60 * 1000
                        : undefined,
                };
                localStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                console.error(`Error setting item to localStorage: ${error}`);
            }
        },

        get<T>(key: string): T | null {
            try {
                const item = localStorage.getItem(key);
                if (!item) return null;

                const data: StorageData<T> = JSON.parse(item);

                if (data.expiry && Date.now() > data.expiry) {
                    localStorage.removeItem(key);
                    console.info(`Item with key "${key}" has expired and was removed.`);
                    return null;
                }
                // console.info(`Item with key "${key}" was retrieved from localStorage (expires in: ${moment(data.expiry).diff(new Date(), 'minutes')}).`);
                return data.value;
            } catch (error) {
                console.error(`Error getting item from localStorage: ${error}`);
                return null;
            }
        },
    };
}