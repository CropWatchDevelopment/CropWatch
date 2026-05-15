<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwChip, CwSeparator } from '@cropwatchdevelopment/cwui';

	type SensorCertificateRow = {
		key: 'sensor' | 'sensor2';
		label: string;
		serial: string;
		product: string;
		downloadDisabledReason: string | null;
	};

	interface Props {
		devEui: string;
		locationId: string;
		sensorCertificates: SensorCertificateRow[];
	}

	let { devEui, locationId, sensorCertificates }: Props = $props();

	let sensorOneCertificate = $derived(
		sensorCertificates.find((target) => target.key === 'sensor') ?? null
	);
	let sensorTwoCertificate = $derived(
		sensorCertificates.find((target) => target.key === 'sensor2') ?? null
	);
	let hasSensorCertificates = $derived(Boolean(sensorOneCertificate || sensorTwoCertificate));
	const sensorTwoCertificateDownloadPath = asset(
		'/files/Sensirion_Humidity_Sensors_SHTxx_Calibration_Certification.pdf'
	);
</script>

<CwCard title={m.devices_sensor_certificates_title()} elevated>
	{#if !hasSensorCertificates}
		<p class="text-muted text-xs">{m.devices_no_sensor_serial()}</p>
	{:else}
		<div class="certificate-list">
			{#if sensorOneCertificate}
				<div class="certificate-item">
					<div class="certificate-item__meta">
						<div class="device-form__header">
							<CwChip label={sensorOneCertificate.label} tone="info" variant="soft" />
							<CwChip
								label={m.devices_sensor_serial_chip({ serial: sensorOneCertificate.serial })}
								tone="secondary"
								variant="soft"
							/>
							{#if sensorOneCertificate.product}
								<CwChip label={sensorOneCertificate.product} tone="secondary" variant="soft" />
							{/if}
						</div>

						<p class="panel-note">{m.devices_sensor_certificate_note()}</p>

						{#if sensorOneCertificate.downloadDisabledReason}
							<p class="field-error">{sensorOneCertificate.downloadDisabledReason}</p>
						{/if}
					</div>

					<form
						method="GET"
						action={resolve(
							'/locations/[location_id]/devices/[dev_eui]/settings/libellus-certificates/[sensor_key]',
							{
								location_id: locationId,
								dev_eui: devEui,
								sensor_key: sensorOneCertificate.key
							}
						)}
						target="_blank"
						class="certificate-download-form"
					>
						<CwButton
							type="submit"
							variant="primary"
							size="sm"
							disabled={Boolean(sensorOneCertificate.downloadDisabledReason)}
						>
							<Icon src={DOWNLOAD_ICON} />
						</CwButton>
					</form>
				</div>
			{/if}

			{#if sensorOneCertificate && sensorTwoCertificate}
				<CwSeparator spacing="0" />
			{/if}

			{#if sensorTwoCertificate}
				<div class="certificate-item">
					<div class="certificate-item__meta">
						<div class="device-form__header">
							<CwChip label={sensorTwoCertificate.label} tone="info" variant="soft" />
							<CwChip
								label={m.devices_sensor_serial_chip({ serial: sensorTwoCertificate.serial })}
								tone="secondary"
								variant="soft"
							/>
							{#if sensorTwoCertificate.product}
								<CwChip label={sensorTwoCertificate.product} tone="secondary" variant="soft" />
							{/if}
						</div>

						<p class="panel-note">{m.devices_sensor_certificate_note()}</p>
					</div>

					<form
						method="GET"
						action={sensorTwoCertificateDownloadPath}
						target="_blank"
						class="certificate-download-form"
					>
						<CwButton type="submit" variant="primary" size="sm">
							<Icon src={DOWNLOAD_ICON} />
						</CwButton>
					</form>
				</div>
			{/if}
		</div>
	{/if}
</CwCard>
