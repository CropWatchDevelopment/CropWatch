import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceQrPayload } from '$lib/devices/qr-payload';
import type { QrWorkerRequest } from '$lib/devices/qr-worker';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DeviceQrScanner from './DeviceQrScanner.svelte';

const LABEL =
	'app:24E124C0002A0001,dev:24E124126E270425,key:2B7E151628AED2A6ABF7158809CF4F3C,type:TH';
const LABEL_PAYLOAD: DeviceQrPayload = {
	devEui: '24E124126E270425',
	joinEui: '24E124C0002A0001',
	appKey: '2B7E151628AED2A6ABF7158809CF4F3C',
	appKeyMasked: undefined,
	typeCode: 'TH',
	deviceTypeId: 2
};

/**
 * The decoder's worker (a browser boundary): each request is answered by
 * `answer`; `undefined` leaves it pending.
 */
class FakeWorker {
	static instances: FakeWorker[] = [];
	static answer: (request: QrWorkerRequest) => string | null | undefined = () => null;

	onmessage: ((event: { data: { id: number; text: string | null } }) => void) | null = null;
	onerror: (() => void) | null = null;
	readonly requests: QrWorkerRequest[] = [];
	readonly terminate = vi.fn();

	constructor() {
		FakeWorker.instances.push(this);
	}

	postMessage(request: QrWorkerRequest) {
		this.requests.push(request);
		const text = FakeWorker.answer(request);
		if (text !== undefined) {
			queueMicrotask(() => this.onmessage?.({ data: { id: request.id, text } }));
		}
	}
}

/** A real MediaStream (from a canvas) standing in for the camera. */
function cameraStream() {
	const canvas = document.createElement('canvas');
	canvas.width = 4;
	canvas.height = 4;
	canvas.getContext('2d')?.fillRect(0, 0, 4, 4);
	const stream = canvas.captureStream(0);
	const [track] = stream.getVideoTracks();
	return {
		stream,
		stop: vi.spyOn(track, 'stop'),
		applyConstraints: vi.spyOn(track, 'applyConstraints').mockResolvedValue(undefined)
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;
let getUserMedia: ReturnType<typeof vi.spyOn>;
let play: ReturnType<typeof vi.spyOn>;
let camera: ReturnType<typeof cameraStream>;
/** What the camera picture looks like to the scanner. */
const picture = { readyState: 4, width: 640, height: 480 };
const onresult = vi.fn();

function render(initiallyOpen: boolean) {
	let open = $state(initiallyOpen);
	view = renderWithServices(DeviceQrScanner, {
		props: {
			get open() {
				return open;
			},
			set open(value: boolean) {
				open = value;
			},
			onresult
		} as never
	});
	const video = document.querySelector<HTMLVideoElement>('video.scanner__video');
	if (!video) throw new Error('no video element');
	Object.defineProperty(video, 'readyState', { configurable: true, get: () => picture.readyState });
	Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => picture.width });
	Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => picture.height });
	return {
		video,
		isOpen: () => open,
		setOpen(value: boolean) {
			open = value;
			flushSync();
		}
	};
}

const dialog = () => document.querySelector('dialog');

/** Closes the dialog and waits for the native dialog's close, after which it can reopen. */
async function close(scanner: ReturnType<typeof render>) {
	const closed = new Promise((resolve) =>
		dialog()?.addEventListener('close', resolve, { once: true })
	);
	scanner.setOpen(false);
	await closed;
}
const hint = () => document.querySelector('.scanner__hint')?.textContent?.trim() ?? '';
const notice = () => document.querySelector('.scanner .app-notice');
const viewport = () => document.querySelector<HTMLElement>('.scanner__viewport');
const photoInput = () => document.querySelector<HTMLInputElement>('.scanner__photo-input');
const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const frameRequests = () =>
	FakeWorker.instances.flatMap((worker) => worker.requests).filter((r) => r.mode === 'video');

async function imageFile(): Promise<File> {
	const canvas = document.createElement('canvas');
	canvas.width = 8;
	canvas.height = 8;
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	return new File([blob as Blob], 'label.png', { type: 'image/png' });
}

function choosePhoto(file: File | null) {
	const input = photoInput();
	if (!input) throw new Error('no photo input');
	const transfer = new DataTransfer();
	if (file) transfer.items.add(file);
	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	FakeWorker.instances = [];
	FakeWorker.answer = () => null;
	vi.stubGlobal('Worker', FakeWorker);
	camera = cameraStream();
	getUserMedia = vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(camera.stream);
	play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
	Object.assign(picture, { readyState: 4, width: 640, height: 480 });
});

afterEach(() => {
	view?.unmount();
	view = null;
	onresult.mockReset();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('DeviceQrScanner camera', () => {
	it('leaves the camera alone while closed', async () => {
		render(false);
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(getUserMedia).not.toHaveBeenCalled();
		expect(FakeWorker.instances).toHaveLength(0);
		expect(dialog()?.open).toBe(false);
	});

	it('starts the back camera in high resolution with continuous focus', async () => {
		const { video } = render(true);

		expect(dialog()?.open).toBe(true);
		expect(dialog()?.querySelector('.cw-dialog__title')?.textContent).toBe(
			m.device_setup_scanner_title()
		);
		expect(getUserMedia).toHaveBeenCalledWith({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1920 },
				height: { ideal: 1080 }
			},
			audio: false
		});
		await expect.poll(() => video.srcObject).toBe(camera.stream);
		expect(camera.applyConstraints).toHaveBeenCalledWith({
			advanced: [{ focusMode: 'continuous' }]
		});
		expect(play).toHaveBeenCalled();
		expect(hint()).toBe(m.device_setup_scanner_hint());
		expect(viewport()?.hidden).toBe(false);
		expect(notice()).toBeNull();
	});

	it('hands a recognised code to the page, then closes and releases the camera', async () => {
		FakeWorker.answer = (request) => (request.id === 0 ? LABEL : null);
		const scanner = render(true);

		await vi.waitFor(() => expect(onresult).toHaveBeenCalledWith(LABEL_PAYLOAD));
		expect(onresult).toHaveBeenCalledTimes(1);
		expect(scanner.isOpen()).toBe(false);
		flushSync();
		expect(dialog()?.open).toBe(false);
		expect(camera.stop).toHaveBeenCalled();
		expect(scanner.video.srcObject).toBeNull();
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
		// The centre square of the 640×480 picture went to the worker.
		expect(frameRequests()[0]).toMatchObject({ mode: 'video', width: 360, height: 360 });
	});

	it('shows what an unrecognised code said, and keeps scanning', async () => {
		let frames = 0;
		FakeWorker.answer = (request) => {
			if (request.mode !== 'video') return null;
			frames += 1;
			return frames === 1 ? 'WIFI:S:Barn;T:WPA;P:secret;;' : frames < 4 ? null : LABEL;
		};
		render(true);

		await expect
			.poll(hint)
			.toBe(m.device_setup_scanner_unrecognized_text({ text: 'WIFI:S:Barn;T:WPA;P:secret;;' }));
		await vi.waitFor(() => expect(onresult).toHaveBeenCalledWith(LABEL_PAYLOAD));
	});

	it('shortens a long unrecognised code', async () => {
		const long = `https://example.com/${'x'.repeat(100)}`;
		FakeWorker.answer = () => long;
		render(true);

		await expect
			.poll(hint)
			.toBe(m.device_setup_scanner_unrecognized_text({ text: `${long.slice(0, 80)}…` }));
		expect(onresult).not.toHaveBeenCalled();
	});

	it('waits for a picture before decoding frames', async () => {
		picture.readyState = 1;
		const { video } = render(true);
		await expect.poll(() => video.srcObject).toBe(camera.stream);
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(frameRequests()).toHaveLength(0);

		picture.readyState = 2;
		await expect.poll(() => frameRequests().length).toBeGreaterThan(0);
	});

	it('explains a camera the user blocked', async () => {
		getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
		render(true);

		await expect.poll(() => notice()?.textContent?.trim()).toBe(m.device_setup_scanner_denied());
		expect(notice()?.classList).toContain('app-notice--warning');
		expect(viewport()?.hidden).toBe(true);
		expect(hint()).toBe('');
	});

	it('explains a missing or failing camera', async () => {
		getUserMedia.mockRejectedValue(new DOMException('No camera', 'NotFoundError'));
		render(true);
		await expect
			.poll(() => notice()?.textContent?.trim())
			.toBe(m.device_setup_scanner_unavailable());
		view?.unmount();

		getUserMedia.mockRejectedValue(new Error('not a DOMException'));
		render(true);
		await expect
			.poll(() => notice()?.textContent?.trim())
			.toBe(m.device_setup_scanner_unavailable());
	});

	it('explains a browser without camera access', async () => {
		vi.spyOn(navigator, 'mediaDevices', 'get').mockReturnValue(undefined as never);
		render(true);

		await expect
			.poll(() => notice()?.textContent?.trim())
			.toBe(m.device_setup_scanner_unavailable());
		expect(getUserMedia).not.toHaveBeenCalled();
	});

	it('tries the camera again when reopened', async () => {
		getUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));
		const scanner = render(true);
		await expect.poll(() => notice()?.textContent?.trim()).toBe(m.device_setup_scanner_denied());

		byId('device-setup-scanner-close')?.click();
		flushSync();
		expect(scanner.isOpen()).toBe(false);
		// The native dialog reports its close in a later task; reopen after it, as a user would.
		await new Promise((resolve) => dialog()?.addEventListener('close', resolve, { once: true }));
		scanner.setOpen(true);

		await expect.poll(() => scanner.video.srcObject).toBe(camera.stream);
		expect(scanner.isOpen()).toBe(true);
		expect(getUserMedia).toHaveBeenCalledTimes(2);
		expect(notice()).toBeNull();
		expect(hint()).toBe(m.device_setup_scanner_hint());
	});

	it('stops the camera and the decoder when the user types instead', async () => {
		const scanner = render(true);
		await expect.poll(() => scanner.video.srcObject).toBe(camera.stream);

		expect(byId('device-setup-scanner-close')?.textContent?.trim()).toBe(
			m.device_setup_scanner_type_instead()
		);
		byId('device-setup-scanner-close')?.click();
		flushSync();

		expect(scanner.isOpen()).toBe(false);
		expect(dialog()?.open).toBe(false);
		expect(camera.stop).toHaveBeenCalled();
		expect(scanner.video.srcObject).toBeNull();
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
		expect(onresult).not.toHaveBeenCalled();
	});

	it('releases a camera that arrives after the dialog closed', async () => {
		let grant!: (stream: MediaStream) => void;
		getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
		const scanner = render(true);

		scanner.setOpen(false);
		grant(camera.stream);

		await vi.waitFor(() => expect(camera.stop).toHaveBeenCalled());
		expect(scanner.video.srcObject).toBeNull();
		expect(play).not.toHaveBeenCalled();
	});

	it('never hands the video a camera that finished focusing after the dialog closed', async () => {
		let focused!: () => void;
		camera.applyConstraints.mockReturnValue(new Promise<void>((resolve) => (focused = resolve)));
		const scanner = render(true);
		await vi.waitFor(() => expect(camera.applyConstraints).toHaveBeenCalled());

		await close(scanner);
		expect(camera.stop).toHaveBeenCalled();
		const next = cameraStream();
		let grant!: (stream: MediaStream) => void;
		getUserMedia.mockReturnValueOnce(new Promise((resolve) => (grant = resolve)));
		scanner.setOpen(true);
		await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));

		// The closed camera's focus request answers late, just before the new camera arrives:
		// its (stopped) stream must not reach the video the reopened dialog now uses.
		focused();
		grant(next.stream);

		await expect.poll(() => scanner.video.srcObject).toBe(next.stream);
		expect(play).toHaveBeenCalledTimes(1);
		expect(next.stop).not.toHaveBeenCalled();
	});

	it('releases a camera that arrives after closing without touching the reopened one', async () => {
		let grantFirst!: (stream: MediaStream) => void;
		getUserMedia.mockReturnValueOnce(new Promise((resolve) => (grantFirst = resolve)));
		const scanner = render(true);
		await close(scanner);
		const next = cameraStream();
		getUserMedia.mockResolvedValueOnce(next.stream);
		scanner.setOpen(true);
		await expect.poll(() => scanner.video.srcObject).toBe(next.stream);

		grantFirst(camera.stream);

		await vi.waitFor(() => expect(camera.stop).toHaveBeenCalled());
		expect(scanner.video.srcObject).toBe(next.stream);
		expect(next.stop).not.toHaveBeenCalled();
	});

	it('keeps scanning when the camera cannot autofocus or autoplay is refused', async () => {
		camera.applyConstraints.mockRejectedValue(
			new DOMException('Unsupported', 'OverconstrainedError')
		);
		play.mockRejectedValue(new DOMException('Autoplay refused', 'NotAllowedError'));
		FakeWorker.answer = (request) => (request.mode === 'video' ? LABEL : null);
		render(true);

		await vi.waitFor(() => expect(onresult).toHaveBeenCalledWith(LABEL_PAYLOAD));
		expect(camera.applyConstraints).toHaveBeenCalled();
		expect(play).toHaveBeenCalled();
	});

	it('does not start scanning when the dialog closed while the video was starting', async () => {
		let started!: () => void;
		play.mockReturnValue(new Promise<void>((resolve) => (started = resolve)));
		const scanner = render(true);
		await vi.waitFor(() => expect(play).toHaveBeenCalled());

		scanner.setOpen(false);
		started();
		await new Promise((resolve) => setTimeout(resolve, 60));

		expect(camera.stop).toHaveBeenCalled();
		expect(frameRequests()).toHaveLength(0);
	});

	it('drops a frame that finishes decoding after the dialog closed', async () => {
		FakeWorker.answer = () => undefined;
		const scanner = render(true);
		await expect.poll(() => frameRequests().length).toBe(1);

		scanner.setOpen(false);
		await new Promise((resolve) => setTimeout(resolve, 60));

		expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
		expect(frameRequests()).toHaveLength(1);
		expect(onresult).not.toHaveBeenCalled();
	});
});

describe('DeviceQrScanner photos', () => {
	it('reads a photo of the label with the open dialog’s decoder', async () => {
		FakeWorker.answer = (request) => (request.mode === 'photo' ? LABEL : null);
		const scanner = render(true);
		await expect.poll(() => scanner.video.srcObject).toBe(camera.stream);

		choosePhoto(await imageFile());

		await vi.waitFor(() => expect(onresult).toHaveBeenCalledWith(LABEL_PAYLOAD));
		expect(FakeWorker.instances).toHaveLength(1);
		expect(scanner.isOpen()).toBe(false);
		expect(photoInput()?.value).toBe('');
	});

	it('shows the photo button busy while it reads, and opens the photo picker', async () => {
		FakeWorker.answer = (request) => (request.mode === 'photo' ? undefined : null);
		render(true);
		const input = photoInput();
		if (!input) throw new Error('no photo input');
		const pick = vi.spyOn(input, 'click').mockImplementation(() => {});

		expect(byId('device-setup-scanner-photo')?.textContent?.trim()).toBe(
			m.device_setup_scanner_use_photo()
		);
		byId('device-setup-scanner-photo')?.click();
		expect(pick).toHaveBeenCalledTimes(1);

		choosePhoto(await imageFile());
		await expect
			.poll(() => byId('device-setup-scanner-photo')?.getAttribute('aria-busy'))
			.toBe('true');
	});

	it('says when a photo holds no code', async () => {
		FakeWorker.answer = () => null;
		render(true);

		choosePhoto(await imageFile());

		await expect.poll(hint).toBe(m.device_setup_scanner_photo_no_code());
		const photos = FakeWorker.instances[0].requests.filter((r) => r.mode === 'photo');
		expect(photos).toHaveLength(2);
		expect(byId('device-setup-scanner-photo')?.getAttribute('aria-busy')).toBeNull();
		expect(onresult).not.toHaveBeenCalled();
	});

	it('says when a file is not a readable picture', async () => {
		render(true);

		choosePhoto(new File(['not an image'], 'notes.txt', { type: 'text/plain' }));

		await expect.poll(hint).toBe(m.device_setup_scanner_photo_no_code());
		expect(onresult).not.toHaveBeenCalled();
	});

	it('shows what an unrecognised photo said', async () => {
		FakeWorker.answer = (request) => (request.mode === 'photo' ? 'https://cropwatch.io' : null);
		render(true);

		choosePhoto(await imageFile());

		await expect
			.poll(hint)
			.toBe(m.device_setup_scanner_unrecognized_text({ text: 'https://cropwatch.io' }));
		expect(onresult).not.toHaveBeenCalled();
	});

	it('reads a photo without an open camera using a decoder of its own', async () => {
		FakeWorker.answer = (request) => (request.mode === 'photo' ? LABEL : null);
		render(false);

		choosePhoto(await imageFile());

		await vi.waitFor(() => expect(onresult).toHaveBeenCalledWith(LABEL_PAYLOAD));
		expect(FakeWorker.instances).toHaveLength(1);
		await vi.waitFor(() => expect(FakeWorker.instances[0].terminate).toHaveBeenCalled());
		expect(getUserMedia).not.toHaveBeenCalled();
	});

	it('ignores an empty selection', async () => {
		render(true);

		choosePhoto(null);
		await new Promise((resolve) => setTimeout(resolve, 30));

		expect(byId('device-setup-scanner-photo')?.getAttribute('aria-busy')).toBeNull();
		expect(FakeWorker.instances[0].requests.filter((r) => r.mode === 'photo')).toHaveLength(0);
	});
});
