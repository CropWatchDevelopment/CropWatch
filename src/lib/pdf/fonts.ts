/**
 * Utility for loading fonts for PDF generation
 */

// We'll use this function to load the font from the static folder
export async function loadNotoSansJP() {
	try {
		// In a browser environment, fetch the font file
		const fontResponse = await fetch('/fonts/NotoSansJP-Regular.ttf');
		if (!fontResponse.ok) {
			throw new Error(`Failed to load font: ${fontResponse.statusText}`);
		}

		// Convert the font file to an ArrayBuffer
		const fontArrayBuffer = await fontResponse.arrayBuffer();

		// Convert ArrayBuffer to base64 string
		const fontBase64 = arrayBufferToBase64(fontArrayBuffer);

		return fontBase64;
	} catch (error) {
		console.error('Error loading font:', error);
		throw error;
	}
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;

	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return btoa(binary);
}
