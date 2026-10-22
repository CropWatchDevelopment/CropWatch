import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QrWorkerRequest } from './qr-worker';

// The QR reader is a third-party boundary: mocked, so each test decides what it reads.
const scanner = vi.hoisted(() => ({
	decodeQr: vi.fn(),
	videoDecode: vi.fn(),
	createVideoDecoder: vi.fn()
}));
vi.mock('@cropwatchdevelopment/qr-scanner', () => ({
	decodeQr: scanner.decodeQr,
	createVideoDecoder: scanner.createVideoDecoder
}));

/** The worker's global scope, as the worker module sees it. */
interface WorkerScope {
	onmessage: ((event: { data: QrWorkerRequest }) => void) | null;
	postMessage: ReturnType<typeof vi.fn>;
}

let scope: WorkerScope;

/** Loads the worker module fresh into a fake worker scope. */
async function startWorker(): Promise<WorkerScope> {
	scope = { onmessage: null, postMessage: vi.fn() };
	vi.stubGlobal('self', scope);
	vi.resetModules();
	await import('./qr-worker');
	return scope;
}

function send(request: Omit<QrWorkerRequest, 'pixels'> & { pixels?: ArrayBuffer }) {
	const pixels = request.pixels ?? new ArrayBuffer(request.width * request.height * 4);
	scope.onmessage?.({ data: { ...request, pixels } });
	return pixels;
}

beforeEach(() => {
	scanner.createVideoDecoder.mockReturnValue({ decode: scanner.videoDecode });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	scanner.decodeQr.mockReset();
	scanner.videoDecode.mockReset();
	scanner.createVideoDecoder.mockReset();
});

describe('QR worker', () => {
	it('reads live frames with one video decoder, over the transferred pixels', async () => {
		await startWorker();
		scanner.videoDecode
			.mockReturnValueOnce({ text: 'dev:24E124126E270425' })
			.mockReturnValueOnce(null);

		const pixels = send({ id: 1, mode: 'video', width: 2, height: 1 });
		send({ id: 2, mode: 'video', width: 2, height: 1 });

		expect(scanner.createVideoDecoder).toHaveBeenCalledTimes(1);
		const [image] = scanner.videoDecode.mock.calls[0];
		expect(image).toMatchObject({ width: 2, height: 1 });
		expect(image.data).toBeInstanceOf(Uint8ClampedArray);
		expect(image.data.buffer).toBe(pixels);
		expect(scanner.decodeQr).not.toHaveBeenCalled();
		expect(scope.postMessage.mock.calls).toEqual([
			[{ id: 1, text: 'dev:24E124126E270425' }],
			[{ id: 2, text: null }]
		]);
	});

	it('reads photos with every strategy', async () => {
		await startWorker();
		scanner.decodeQr.mockReturnValueOnce({ text: 'LW:D0:70B3D57ED0000000:00137A10000441DF' });
		scanner.decodeQr.mockReturnValueOnce({ text: undefined });

		send({ id: 7, mode: 'photo', width: 4, height: 4 });
		send({ id: 8, mode: 'photo', width: 4, height: 4 });

		expect(scanner.decodeQr).toHaveBeenCalledWith(
			expect.objectContaining({ width: 4, height: 4, data: expect.any(Uint8ClampedArray) })
		);
		expect(scanner.videoDecode).not.toHaveBeenCalled();
		expect(scope.postMessage.mock.calls).toEqual([
			[{ id: 7, text: 'LW:D0:70B3D57ED0000000:00137A10000441DF' }],
			[{ id: 8, text: null }]
		]);
	});

	it('answers null, and logs, when decoding throws', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		await startWorker();
		const failure = new RangeError('bad image');
		scanner.decodeQr.mockImplementation(() => {
			throw failure;
		});

		send({ id: 3, mode: 'photo', width: 1, height: 1 });

		expect(consoleError).toHaveBeenCalledWith('QR decoding failed', failure);
		expect(scope.postMessage).toHaveBeenCalledWith({ id: 3, text: null });
	});
});
