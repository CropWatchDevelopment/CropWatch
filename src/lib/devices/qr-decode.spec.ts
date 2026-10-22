import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QrWorkerRequest } from './qr-worker';
import { createQrDecoder } from './qr-decode';

// The main-thread fallback loads the QR reader package: a third-party boundary, mocked.
const scanner = vi.hoisted(() => ({
	decodeQr: vi.fn(),
	videoDecode: vi.fn(),
	createVideoDecoder: vi.fn()
}));
vi.mock('@cropwatchdevelopment/qr-scanner', () => ({
	decodeQr: scanner.decodeQr,
	createVideoDecoder: scanner.createVideoDecoder
}));

/** A stand-in for the decoder's worker: records requests, answers through `answer`. */
class FakeWorker {
	static instances: FakeWorker[] = [];
	/** What the worker "reads" for a request; undefined leaves the request pending. */
	static answer: (request: QrWorkerRequest) => string | null | undefined = () => null;

	onmessage: ((event: { data: { id: number; text: string | null } }) => void) | null = null;
	onerror: ((event: { message: string }) => void) | null = null;
	readonly requests: QrWorkerRequest[] = [];
	readonly transfers: unknown[] = [];
	readonly terminate = vi.fn();

	constructor(
		readonly url: URL | string,
		readonly options: unknown
	) {
		FakeWorker.instances.push(this);
	}

	postMessage(request: QrWorkerRequest, transfer: unknown[]) {
		this.requests.push(request);
		this.transfers.push(transfer);
		const text = FakeWorker.answer(request);
		if (text !== undefined) {
			queueMicrotask(() => this.onmessage?.({ data: { id: request.id, text } }));
		}
	}
}

/** The 2D canvas the decoder grabs pixels with. */
function fakeCanvas(hasContext = true) {
	const context = {
		drawImage: vi.fn(),
		getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
			width,
			height,
			data: new Uint8ClampedArray(width * height * 4)
		}))
	};
	const canvas = {
		width: 300,
		height: 150,
		getContext: vi.fn(() => (hasContext ? context : null))
	};
	return { canvas, context };
}

let canvas: ReturnType<typeof fakeCanvas>['canvas'];
let context: ReturnType<typeof fakeCanvas>['context'];

function useCanvas(hasContext = true) {
	({ canvas, context } = fakeCanvas(hasContext));
	vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
}

const video = (videoWidth: number, videoHeight: number) =>
	({ videoWidth, videoHeight }) as HTMLVideoElement;
const photo = (width: number, height: number) => ({ width, height }) as ImageBitmap;

/** Lets queued worker answers and dynamic imports settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	FakeWorker.instances = [];
	FakeWorker.answer = () => null;
	vi.stubGlobal('Worker', FakeWorker);
	scanner.createVideoDecoder.mockReturnValue({ decode: scanner.videoDecode });
	useCanvas();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	scanner.decodeQr.mockReset();
	scanner.videoDecode.mockReset();
	scanner.createVideoDecoder.mockReset();
});

describe('createQrDecoder with a worker', () => {
	it('starts its module worker and a canvas made for frequent reads', () => {
		createQrDecoder();

		expect(FakeWorker.instances).toHaveLength(1);
		const [worker] = FakeWorker.instances;
		expect(String(worker.url)).toContain('qr-worker');
		expect(worker.options).toEqual({ type: 'module' });
		expect(document.createElement).toHaveBeenCalledWith('canvas');
		expect(canvas.getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true });
	});

	it('alternates between the centre square at full resolution and the whole frame scaled down', async () => {
		FakeWorker.answer = (request) => (request.id === 0 ? 'dev:24E124126E270425' : null);
		const decoder = createQrDecoder();
		const camera = video(1920, 1080);

		await expect(decoder.decodeFrame(camera)).resolves.toBe('dev:24E124126E270425');
		await expect(decoder.decodeFrame(camera)).resolves.toBeNull();

		expect(context.drawImage.mock.calls).toEqual([
			// 75 % of the shorter side, centred, kept sharp (under the 1080 px cap).
			[camera, 555, 135, 810, 810, 0, 0, 810, 810],
			// The whole frame, scaled to a 1280 px long edge.
			[camera, 0, 0, 1920, 1080, 0, 0, 1280, 720]
		]);
		const [worker] = FakeWorker.instances;
		expect(
			worker.requests.map(({ id, mode, width, height }) => ({ id, mode, width, height }))
		).toEqual([
			{ id: 0, mode: 'video', width: 810, height: 810 },
			{ id: 1, mode: 'video', width: 1280, height: 720 }
		]);
		// The pixels are transferred, not copied.
		expect(worker.transfers[0]).toEqual([worker.requests[0].pixels]);
		expect(worker.requests[0].pixels).toBeInstanceOf(ArrayBuffer);
	});

	it('caps the centre view of a large camera at 1080 px', async () => {
		const decoder = createQrDecoder();

		await decoder.decodeFrame(video(3840, 2160));

		expect(context.drawImage).toHaveBeenCalledWith(
			expect.anything(),
			1110,
			270,
			1620,
			1620,
			0,
			0,
			1080,
			1080
		);
	});

	it('reads nothing from a video without a picture yet', async () => {
		const decoder = createQrDecoder();

		await expect(decoder.decodeFrame(video(0, 0))).resolves.toBeNull();
		await expect(decoder.decodeFrame(video(640, 0))).resolves.toBeNull();

		expect(context.drawImage).not.toHaveBeenCalled();
		expect(FakeWorker.instances[0].requests).toHaveLength(0);
	});

	it('reads a photo whole first, then its centre in detail', async () => {
		FakeWorker.answer = (request) =>
			request.id === 1 ? 'LW:D0:70B3D57ED0000000:00137A10000441DF' : null;
		const decoder = createQrDecoder();
		const picture = photo(4000, 3000);

		await expect(decoder.decodePhoto(picture)).resolves.toBe(
			'LW:D0:70B3D57ED0000000:00137A10000441DF'
		);

		expect(context.drawImage.mock.calls).toEqual([
			[picture, 0, 0, 4000, 3000, 0, 0, 1600, 1200],
			[picture, 1250, 750, 1500, 1500, 0, 0, 1500, 1500]
		]);
		expect(FakeWorker.instances[0].requests.map((request) => request.mode)).toEqual([
			'photo',
			'photo'
		]);
	});

	it('stops at the whole photo when it holds a code', async () => {
		FakeWorker.answer = () => '00137A10000441DF';
		const decoder = createQrDecoder();

		await expect(decoder.decodePhoto(photo(800, 600))).resolves.toBe('00137A10000441DF');

		expect(context.drawImage).toHaveBeenCalledTimes(1);
	});

	it('keeps at least one pixel when scaling a very thin photo', async () => {
		const decoder = createQrDecoder();

		await expect(decoder.decodePhoto(photo(4000, 1))).resolves.toBeNull();

		expect(context.drawImage.mock.calls[0]).toEqual([
			expect.anything(),
			0,
			0,
			4000,
			1,
			0,
			0,
			1600,
			1
		]);
	});

	it('reads nothing from an empty photo', async () => {
		const decoder = createQrDecoder();

		await expect(decoder.decodePhoto(photo(5, 0))).resolves.toBeNull();

		expect(context.drawImage).not.toHaveBeenCalled();
	});

	it('reads nothing without a 2D canvas', async () => {
		useCanvas(false);
		const decoder = createQrDecoder();

		await expect(decoder.decodeFrame(video(640, 480))).resolves.toBeNull();
		await expect(decoder.decodePhoto(photo(640, 480))).resolves.toBeNull();

		expect(FakeWorker.instances[0].requests).toHaveLength(0);
	});

	it('settles pending decodes with null and stops the worker when closed', async () => {
		FakeWorker.answer = () => undefined;
		const decoder = createQrDecoder();

		const pending = decoder.decodeFrame(video(640, 480));
		decoder.close();

		await expect(pending).resolves.toBeNull();
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
	});

	it('ignores an answer for a request it no longer waits for', async () => {
		FakeWorker.answer = () => undefined;
		const decoder = createQrDecoder();
		const pending = decoder.decodeFrame(video(640, 480));
		const [worker] = FakeWorker.instances;

		worker.onmessage?.({ data: { id: 99, text: 'stray' } });
		worker.onmessage?.({ data: { id: 0, text: '00137A10000441DF' } });
		worker.onmessage?.({ data: { id: 0, text: 'late duplicate' } });

		await expect(pending).resolves.toBe('00137A10000441DF');
	});

	it('moves to the main thread when the worker dies, settling what was pending', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		FakeWorker.answer = () => undefined;
		scanner.videoDecode.mockReturnValue({ text: 'dev:24E124126E270425' });
		const decoder = createQrDecoder();
		const pending = decoder.decodeFrame(video(640, 480));
		const [worker] = FakeWorker.instances;

		worker.onerror?.({ message: 'Failed to load the worker script' });

		await expect(pending).resolves.toBeNull();
		expect(consoleError).toHaveBeenCalledWith(
			'QR worker failed',
			'Failed to load the worker script'
		);
		expect(worker.terminate).toHaveBeenCalledTimes(1);

		await expect(decoder.decodeFrame(video(640, 480))).resolves.toBe('dev:24E124126E270425');
		expect(worker.requests).toHaveLength(1);
	});
});

describe('createQrDecoder without workers', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'Worker',
			class {
				constructor() {
					throw new DOMException('Workers are not allowed', 'SecurityError');
				}
			}
		);
	});

	it('decodes frames on the main thread with one video decoder', async () => {
		scanner.videoDecode.mockReturnValueOnce({ text: 'first' }).mockReturnValueOnce(null);
		const decoder = createQrDecoder();

		await expect(decoder.decodeFrame(video(640, 480))).resolves.toBe('first');
		await expect(decoder.decodeFrame(video(640, 480))).resolves.toBeNull();

		expect(scanner.createVideoDecoder).toHaveBeenCalledTimes(1);
		// The centre square first, then the whole frame.
		expect(scanner.videoDecode.mock.calls.map(([image]) => [image.width, image.height])).toEqual([
			[360, 360],
			[640, 480]
		]);
		expect(scanner.decodeQr).not.toHaveBeenCalled();
	});

	it('decodes photos with every strategy, and closing is harmless', async () => {
		scanner.decodeQr.mockReturnValueOnce(null).mockReturnValueOnce({ text: 'centre' });
		const decoder = createQrDecoder();

		await expect(decoder.decodePhoto(photo(1000, 1000))).resolves.toBe('centre');
		expect(scanner.decodeQr).toHaveBeenCalledTimes(2);

		expect(() => decoder.close()).not.toThrow();
		await settle();
	});
});
