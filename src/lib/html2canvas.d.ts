// Type definitions for html2canvas
interface Html2CanvasOptions {
	scale?: number;
	useCORS?: boolean;
	logging?: boolean;
	letterRendering?: boolean;
	scrollX?: number;
	scrollY?: number;
	[key: string]: any;
}

declare global {
	interface Window {
		html2canvas: (element: HTMLElement, options?: Html2CanvasOptions) => Promise<HTMLCanvasElement>;
	}
}

export {};
