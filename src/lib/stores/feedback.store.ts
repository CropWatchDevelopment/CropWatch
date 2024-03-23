import { writable } from 'svelte/store';

export const feedbackOpenState = writable<boolean>(false);

export function openFeedback() {
    feedbackOpenState.set(true);
}

export function closeFeedback() {
    feedbackOpenState.set(false);
}