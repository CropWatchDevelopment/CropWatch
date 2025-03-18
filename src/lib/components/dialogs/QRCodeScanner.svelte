<script lang="ts">
    import { mdiQrcodeScan } from '@mdi/js';
    import { Button, Dialog, Tooltip } from 'svelte-ux';
    import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

    let { qrcode = $bindable() } = $props();
    let open: boolean = $state(false);
    let videoElement: HTMLVideoElement;
    let result: string = $state('');
    let scanning: boolean = $state(false);
    let codeReader: BrowserMultiFormatReader;

    // Initialize the QR code reader with specific hints
    $effect(() => {
        codeReader = new BrowserMultiFormatReader();
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
        // codeReader.setHints(hints);
    });

    // Start/Stop scanning when dialog opens/closes
    $effect(() => {
        if (open && videoElement) {
            startScanning();
        } else if (!open && scanning) {
            stopScanning();
        }
    });

    async function startScanning() {
        try {
            scanning = true;
            codeReader.decodeFromVideoDevice(
                null, // Use default camera
                videoElement,
                (result, error) => {
                    if (result) {
                        handleSuccess(result.getText());
                    }
                    if (error) {
                        console.error('QR Code scanning error:', error);
                    }
                }
            );
        } catch (error) {
            console.error('Failed to start scanning:', error);
            scanning = false;
        }
    }

    function stopScanning() {
        if (scanning) {
            codeReader.reset();
            scanning = false;
        }
    }

    function handleSuccess(text: string) {
        result = text;
        qrcode = text;
        stopScanning();
        open = false;
        // Dispatch an event with the result
        dispatchEvent(new CustomEvent('qrcode', { detail: text }));
    }

    // Cleanup on component destruction
    $effect(() => {
        return () => {
            if (scanning) {
                stopScanning();
            }
        };
    });
</script>

<Tooltip title="Scan QR Code">
    <Button variant="outline" on:click={() => (open = !open)} rounded icon={mdiQrcodeScan} />
</Tooltip>

<Dialog {open} on:close={() => (open = false)} width="md">
    <div slot="title">Scan QR Code</div>
    <div class="flex flex-col items-center gap-4">
        <video
            bind:this={videoElement}
            class="w-full max-w-[640px] rounded-lg border border-surface-300"
        />
        {#if result}
            <p class="text-center text-sm text-surface-500">Last scan result: {result}</p>
        {/if}
    </div>
    <div slot="actions">
        <Button variant="fill" color="primary" on:click={() => (open = false)}>Close</Button>
    </div>
</Dialog>

<style>
    video {
        transform: scaleX(1); /* Mirror the video feed */
    }
</style>
