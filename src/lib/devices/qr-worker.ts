/**
 * Web Worker that decodes QR codes with CropWatch's own reader, off the main
 * thread so the camera preview never stutters. Live frames go through one
 * video decoder (fast per frame; its fallbacks rotate across frames); photos
 * get every strategy at once.
 */
import { createVideoDecoder, decodeQr } from '@cropwatchdevelopment/qr-scanner';

export interface QrWorkerRequest {
	id: number;
	mode: 'video' | 'photo';
	width: number;
	height: number;
	/** RGBA pixels, transferred. */
	pixels: ArrayBuffer;
}

export interface QrWorkerResponse {
	id: number;
	text: string | null;
}

const video = createVideoDecoder();

self.onmessage = (event: MessageEvent<QrWorkerRequest>) => {
	const { id, mode, width, height, pixels } = event.data;
	let text: string | null = null;
	try {
		const image = { data: new Uint8ClampedArray(pixels), width, height };
		text = (mode === 'photo' ? decodeQr(image) : video.decode(image))?.text ?? null;
	} catch (error) {
		console.error('QR decoding failed', error);
	}
	self.postMessage({ id, text } satisfies QrWorkerResponse);
};
