import { flushSync } from 'svelte';

/** The `CwDropdown` whose trigger has `id`: its selected label and its native (posted) value. */
export function dropdown(id: string) {
	const trigger = document.getElementById(id) as HTMLButtonElement | null;
	if (!trigger) throw new Error(`No dropdown #${id}`);
	const root = trigger.closest('.cw-dropdown') as HTMLElement;
	return {
		trigger,
		/** The text on the trigger (the selected option's label, or the placeholder). */
		label: () => trigger.textContent?.trim() ?? '',
		/** What the form posts (only rendered when the dropdown has a `name`). */
		value: () =>
			(root.querySelector('.cw-dropdown__native-input') as HTMLInputElement | null)?.value ?? null,
		/** The labels of the options, in order (opens the list to read them). */
		options: () => {
			open(trigger);
			const labels = [...root.querySelectorAll<HTMLElement>('[role="option"]')].map(
				(option) => option.textContent?.trim() ?? ''
			);
			trigger.click();
			flushSync();
			return labels;
		}
	};
}

function open(trigger: HTMLButtonElement) {
	if (trigger.getAttribute('aria-expanded') !== 'true') {
		trigger.click();
		flushSync();
	}
}

/** Opens the dropdown whose trigger has `id` and clicks the option labelled `label`. */
export function chooseOption(id: string, label: string) {
	const { trigger } = dropdown(id);
	open(trigger);
	const root = trigger.closest('.cw-dropdown') as HTMLElement;
	const option = [...root.querySelectorAll<HTMLElement>('[role="option"]')].find(
		(element) => element.textContent?.trim() === label
	);
	if (!option) throw new Error(`No option "${label}" in #${id}`);
	option.click();
	flushSync();
}
