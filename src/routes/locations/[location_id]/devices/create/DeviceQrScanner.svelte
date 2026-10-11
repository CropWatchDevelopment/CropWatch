<script lang="ts">
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
	import { AppNotice } from '$lib/components/layout';
	import { createQrDecoder, type QrDecoder } from '$lib/devices/qr-decode';
	import { parseDeviceQr, type DeviceQrPayload } from '$lib/devices/qr-payload';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		onresult: (payload: DeviceQrPayload) => void;
	}

	let { open = $bindable(), onresult }: Props = $props();

	type ScanProblem = 'denied' | 'unavailable' | 'unrecognized' | 'photo_no_code' | null;

	let video = $state<HTMLVideoElement | null>(null);
	let photoInput = $state<HTMLInputElement | null>(null);
	let problem = $state<ScanProblem>(null);
	/** What an unrecognized QR code said, so the user can see why it was rejected. */
	let unrecognizedText = $state('');
	let readingPhoto = $state(false);

	let cameraBlocked = $derived(problem === 'denied' || problem === 'unavailable');

	const MAX_SHOWN = 80;
	/** Pause between frames: decoding runs in a worker, this just leaves the page room to breathe. */
	const FRAME_GAP_MS = 30;

	/** The open dialog's decoder (one worker per opening). */
	let decoder: QrDecoder | null = null;

	/** Hands a recognized code to the page; returns false when it holds no DevEUI. */
	function accept(text: string): boolean {
		const payload = parseDeviceQr(text);
		if (!payload) {
			unrecognizedText = text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
			problem = 'unrecognized';
			return false;
		}
		open = false;
		onresult(payload);
		return true;
	}

	// Camera and decoder run only while the dialog is open; closing it always releases both.
	$effect(() => {
		if (!open || !video) return;
		const element = video;
		const frameDecoder = createQrDecoder();
		decoder = frameDecoder;
		let stream: MediaStream | null = null;
		let stopped = false;
		let timer: ReturnType<typeof setTimeout> | null = null;
		problem = null;
		unrecognizedText = '';

		const stop = () => {
			stopped = true;
			if (timer) clearTimeout(timer);
			stream?.getTracks().forEach((track) => track.stop());
			element.srcObject = null;
		};

		const start = async () => {
			if (!navigator.mediaDevices?.getUserMedia) {
				problem = 'unavailable';
				return;
			}
			try {
				// High resolution matters: label codes are small.
				stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: { ideal: 'environment' },
						width: { ideal: 1920 },
						height: { ideal: 1080 }
					},
					audio: false
				});
			} catch (error) {
				problem =
					error instanceof DOMException && error.name === 'NotAllowedError'
						? 'denied'
						: 'unavailable';
				return;
			}
			if (stopped) return stop();

			// Continuous autofocus where the camera supports it (non-standard; ignored elsewhere).
			const [track] = stream.getVideoTracks();
			await track
				?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
				.catch(() => undefined);

			element.srcObject = stream;
			await element.play().catch(() => undefined);

			const scan = async () => {
				if (stopped) return;
				const text =
					element.readyState >= element.HAVE_CURRENT_DATA
						? await frameDecoder.decodeFrame(element)
						: null;
				// The dialog may have closed while a frame was being decoded.
				if (stopped) return;
				if (text && accept(text)) {
					stop();
					return;
				}
				timer = setTimeout(() => void scan(), FRAME_GAP_MS);
			};
			if (!stopped) void scan();
		};

		void start();
		return () => {
			stop();
			frameDecoder.close();
			if (decoder === frameDecoder) decoder = null;
		};
	});

	/** Decodes a still photo — sharper and higher resolution than a live webcam frame. */
	async function readPhoto(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		readingPhoto = true;
		const reader = decoder ?? createQrDecoder();
		try {
			const bitmap = await createImageBitmap(file);
			try {
				const text = await reader.decodePhoto(bitmap);
				if (!text) {
					problem = 'photo_no_code';
					return;
				}
				accept(text);
			} finally {
				bitmap.close();
			}
		} catch {
			problem = 'photo_no_code';
		} finally {
			if (reader !== decoder) reader.close();
			readingPhoto = false;
		}
	}
</script>

<CwDialog bind:open title={m.device_setup_scanner_title()}>
	<div class="scanner">
		{#if cameraBlocked}
			<AppNotice tone="warning">
				<p>
					{problem === 'denied'
						? m.device_setup_scanner_denied()
						: m.device_setup_scanner_unavailable()}
				</p>
			</AppNotice>
		{/if}
		<!-- Kept mounted so reopening the dialog can retry the camera. -->
		<div class="scanner__viewport" hidden={cameraBlocked}>
			<video bind:this={video} class="scanner__video" autoplay playsinline muted></video>
			<span class="scanner__frame" aria-hidden="true"></span>
		</div>
		<p class="scanner__hint" aria-live="polite">
			{#if problem === 'unrecognized'}
				{m.device_setup_scanner_unrecognized_text({ text: unrecognizedText })}
			{:else if problem === 'photo_no_code'}
				{m.device_setup_scanner_photo_no_code()}
			{:else if !cameraBlocked}
				{m.device_setup_scanner_hint()}
			{/if}
		</p>
		<input
			bind:this={photoInput}
			class="scanner__photo-input"
			type="file"
			accept="image/*"
			capture="environment"
			tabindex="-1"
			aria-hidden="true"
			onchange={(event) => void readPhoto(event)}
		/>
	</div>
	{#snippet actions()}
		<CwButton
			id="device-setup-scanner-photo"
			variant="secondary"
			loading={readingPhoto}
			onclick={() => photoInput?.click()}
		>
			{m.device_setup_scanner_use_photo()}
		</CwButton>
		<CwButton id="device-setup-scanner-close" variant="secondary" onclick={() => (open = false)}>
			{m.device_setup_scanner_type_instead()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.scanner {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		width: min(28rem, 80vw);
	}

	.scanner__viewport[hidden] {
		display: none;
	}

	.scanner__viewport {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: var(--cw-radius-lg);
		background: #0d1522;
	}

	.scanner__video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.scanner__frame {
		position: absolute;
		inset: 18%;
		border: 3px solid var(--cw-accent);
		border-radius: var(--cw-radius-lg);
		box-shadow: 0 0 0 999px rgb(0 0 0 / 0.35);
	}

	.scanner__hint {
		margin: 0;
		min-height: 1.25rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--cw-text-muted);
		overflow-wrap: anywhere;
	}

	.scanner__photo-input {
		display: none;
	}
</style>
