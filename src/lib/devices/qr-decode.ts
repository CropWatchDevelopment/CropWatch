/**
 * QR decoding for the device setup scanner, using CropWatch's own reader
 * (@cropwatchdevelopment/qr-scanner) in a Web Worker.
 *
 * Live frames alternate between two views: the centre square the on-screen
 * guide frames, at full camera resolution (a label code held up to the
 * camera sits there and stays sharp), and the whole frame scaled down, for
 * codes held off-centre. Photos are read whole, then their centre in detail.
 */
import type { QrWorkerRequest, QrWorkerResponse } from './qr-worker';

export interface QrDecoder {
	/** Decodes the current frame of a playing video; null when no code was read. */
	decodeFrame(video: HTMLVideoElement): Promise<string | null>;
	/** Decodes a still photo, trying every strategy. */
	decodePhoto(photo: ImageBitmap): Promise<string | null>;
	/** Stops the worker; pending decodes resolve to null. */
	close(): void;
}

interface Region {
	x: number;
	y: number;
	width: number;
	height: number;
}

type Mode = QrWorkerRequest['mode'];
type Backend = (mode: Mode, image: ImageData) => Promise<string | null>;

/** Share of the shorter side covered by the centre view (guide frame plus margin). */
const CENTRE_SHARE = 0.75;
/** Longest edge (px) of each analysed view: detail for small codes, speed for the loop. */
const CENTRE_MAX = 1080;
const FULL_MAX = 1280;
const PHOTO_MAX = 1600;

function centre(width: number, height: number, share: number): Region {
	const side = Math.round(Math.min(width, height) * share);
	return {
		x: Math.round((width - side) / 2),
		y: Math.round((height - side) / 2),
		width: side,
		height: side
	};
}

/**
 * Decodes in a worker; null when workers are unavailable here. `onFailure`
 * runs if the worker dies (e.g. its script fails to load).
 */
function workerBackend(onFailure: () => void): { decode: Backend; close: () => void } | null {
	let worker: Worker;
	try {
		worker = new Worker(new URL('./qr-worker.ts', import.meta.url), { type: 'module' });
	} catch {
		return null;
	}
	let nextId = 0;
	const pending = new Map<number, (text: string | null) => void>();
	const settleAll = () => {
		for (const resolve of pending.values()) resolve(null);
		pending.clear();
	};
	worker.onmessage = (event: MessageEvent<QrWorkerResponse>) => {
		pending.get(event.data.id)?.(event.data.text);
		pending.delete(event.data.id);
	};
	worker.onerror = (event) => {
		console.error('QR worker failed', event.message);
		worker.terminate();
		settleAll();
		onFailure();
	};
	return {
		decode: (mode, image) =>
			new Promise((resolve) => {
				const id = nextId++;
				pending.set(id, resolve);
				const request: QrWorkerRequest = {
					id,
					mode,
					width: image.width,
					height: image.height,
					pixels: image.data.buffer
				};
				worker.postMessage(request, [request.pixels]);
			}),
		close: () => {
			worker.terminate();
			settleAll();
		}
	};
}

/** Decodes on the main thread (no worker support): still correct, just less smooth. */
function localBackend(): Backend {
	const reader = import('@cropwatchdevelopment/qr-scanner').then((qr) => ({
		qr,
		video: qr.createVideoDecoder()
	}));
	return async (mode, image) => {
		const { qr, video } = await reader;
		return (mode === 'photo' ? qr.decodeQr(image) : video.decode(image))?.text ?? null;
	};
}

export function createQrDecoder(): QrDecoder {
	let decode: Backend;
	const worker = workerBackend(() => (decode = localBackend()));
	decode = worker?.decode ?? localBackend();
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d', { willReadFrequently: true });
	let frame = 0;

	/** The pixels of `region`, scaled so its longest edge is at most `maxEdge`. */
	const grab = (source: CanvasImageSource, region: Region, maxEdge: number): ImageData | null => {
		if (!context || region.width < 1 || region.height < 1) return null;
		const scale = Math.min(1, maxEdge / Math.max(region.width, region.height));
		canvas.width = Math.max(1, Math.round(region.width * scale));
		canvas.height = Math.max(1, Math.round(region.height * scale));
		context.drawImage(
			source,
			region.x,
			region.y,
			region.width,
			region.height,
			0,
			0,
			canvas.width,
			canvas.height
		);
		return context.getImageData(0, 0, canvas.width, canvas.height);
	};

	const read = async (mode: Mode, image: ImageData | null) => (image ? decode(mode, image) : null);

	return {
		decodeFrame(video) {
			const { videoWidth: width, videoHeight: height } = video;
			if (!width || !height) return Promise.resolve(null);
			const whole = frame++ % 2 === 1;
			const image = whole
				? grab(video, { x: 0, y: 0, width, height }, FULL_MAX)
				: grab(video, centre(width, height, CENTRE_SHARE), CENTRE_MAX);
			return read('video', image);
		},
		async decodePhoto(photo) {
			const { width, height } = photo;
			return (
				(await read('photo', grab(photo, { x: 0, y: 0, width, height }, PHOTO_MAX))) ??
				(await read('photo', grab(photo, centre(width, height, 0.5), PHOTO_MAX)))
			);
		},
		close() {
			worker?.close();
		}
	};
}
