import { browser } from '$app/environment';

// Type for the callback function
type SubscriberCallback = (value: boolean | null) => void;

/**
 * A store that checks if a date is older than the current time minus a specified interval.
 * @param lastUpdated - The date to check
 * @param intervalMinutes - The interval in minutes
 * @returns A store with the value true if the date is within the interval, false if older, null if the interval is invalid
 */
export function createActiveTimer(lastUpdated: Date | null | undefined, intervalMinutes: number) {
  // Initialize the state
  let subscribers: SubscriberCallback[] = [];
  let value = checkActive(lastUpdated, intervalMinutes);
  let intervalId: number | undefined;
  
  // Function to check if a date is active
  function checkActive(date: Date | null | undefined, interval: number): boolean | null {
    if (interval <= 0) return null;
    if (date === null || date === undefined) return false;
    
    // Use milliseconds for more precise calculation to avoid truncation issues
    // Convert interval to milliseconds (minutes * 60 * 1000)
    const now = new Date();
    const timeDiffMs = now.getTime() - new Date(date).getTime();
    const intervalMs = interval * 60 * 1000;
    
    return timeDiffMs < intervalMs;
  }

  // Function to notify all subscribers
  function notify(): void {
    subscribers.forEach(subscriber => subscriber(value));
  }

  // Start the timer if we're in a browser environment
  if (browser) {
    // Calculate appropriate update interval based on the interval minutes
    const updateFrequency = Math.min(30, Math.max(1, Math.floor(intervalMinutes / 10))) * 1000;
    
    intervalId = window.setInterval(() => {
      const newValue = checkActive(lastUpdated, intervalMinutes);
      if (newValue !== value) {
        value = newValue;
        notify();
      }
    }, updateFrequency);
  }

  // Return the store interface
  return {
    subscribe(callback: SubscriberCallback) {
      subscribers.push(callback);
      // Immediately call with current value
      callback(value);
      
      // Return unsubscribe function
      return () => {
        subscribers = subscribers.filter(sub => sub !== callback);
        // If no more subscribers and we have an interval, clear it
        if (subscribers.length === 0 && intervalId !== undefined && browser) {
          clearInterval(intervalId);
        }
      };
    },
    update(newLastUpdated: Date | null | undefined, newIntervalMinutes: number): void {
      // Update the parameters and recalculate
      lastUpdated = newLastUpdated;
      intervalMinutes = newIntervalMinutes;
      
      // Update the current value
      const newValue = checkActive(lastUpdated, intervalMinutes);
      if (newValue !== value) {
        value = newValue;
        notify();
      }
      
      // If we're in a browser environment, update the interval frequency
      if (browser && intervalId !== undefined) {
        clearInterval(intervalId);
        
        // Calculate appropriate update interval based on the new interval minutes
        const updateFrequency = Math.min(30, Math.max(1, Math.floor(intervalMinutes / 10))) * 1000;
        
        intervalId = window.setInterval(() => {
          const newValue = checkActive(lastUpdated, intervalMinutes);
          if (newValue !== value) {
            value = newValue;
            notify();
          }
        }, updateFrequency);
      }
    }
  };
}