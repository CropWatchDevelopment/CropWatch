import { browser } from '$app/environment';

export function clickOutside(node: HTMLElement, callback: () => void) {
	if (!browser) return { destroy: () => {} };
	
	// Flag to prevent the action from being triggered during initialization
	let isInitialized = false;
	
	setTimeout(() => {
		isInitialized = true;
	}, 100);
	
	function handleClick(event: MouseEvent) {
		if (!isInitialized) return;
		
		// Check if the click was outside the node
		if (node && !node.contains(event.target as Node) && event.target !== node) {
			callback();
		}
	}
	
	// Use capture phase to ensure we handle the event before other handlers
	document.addEventListener('click', handleClick, true);
	
	return {
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
}
