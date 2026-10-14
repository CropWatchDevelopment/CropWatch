<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import Icon from '$lib/components/Icon.svelte';
	import LOCATION_ICON from '$lib/images/icons/location.svg';
	import DEVICE_ICON from '$lib/images/icons/device.svg';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import { m } from '$lib/paraglide/messages.js';
	import LocationMap from '../LocationMap.svelte';
	import {
		centreOf,
		isValidLatitude,
		isValidLongitude,
		parseCoordinateText
	} from './location-coordinates';

	interface Props {
		locationName: string;
		coordinates: { lat: number; long: number } | null;
		mapZoom: number | null;
		devicePositions: { lat: number | null; long: number | null }[];
	}

	let { locationName, coordinates, mapZoom, devicePositions }: Props = $props();
	const toast = useCwToast();

	// Seed once from the saved values; the fields are edited locally after that.
	const initial = (() => ({ coordinates, mapZoom }))();
	let latText = $state(initial.coordinates ? String(initial.coordinates.lat) : '');
	let longText = $state(initial.coordinates ? String(initial.coordinates.long) : '');
	let zoom = $state<number | null>(initial.mapZoom);
	let pasteText = $state('');
	let pasteError = $state('');
	let notice = $state<{ tone: 'info' | 'warning'; message: string } | null>(null);
	let locating = $state(false);
	let submitting = $state(false);

	const lat = $derived(latText.trim() === '' ? NaN : Number(latText));
	const long = $derived(longText.trim() === '' ? NaN : Number(longText));
	const latError = $derived(
		latText.trim() !== '' && !isValidLatitude(lat) ? m.location_coordinates_invalid_latitude() : ''
	);
	const longError = $derived(
		longText.trim() !== '' && !isValidLongitude(long)
			? m.location_coordinates_invalid_longitude()
			: ''
	);
	const hasPosition = $derived(isValidLatitude(lat) && isValidLongitude(long));
	const isClearing = $derived(latText.trim() === '' && longText.trim() === '');
	const isDirty = $derived(
		latText.trim() !== (coordinates ? String(coordinates.lat) : '') ||
			longText.trim() !== (coordinates ? String(coordinates.long) : '') ||
			(hasPosition && zoom !== mapZoom)
	);
	const canSave = $derived(!submitting && isDirty && (hasPosition || isClearing));
	const deviceCentre = $derived(centreOf(devicePositions));

	function setPosition(nextLat: number, nextLong: number) {
		latText = String(nextLat);
		longText = String(nextLong);
	}

	function applyPaste() {
		const parsed = parseCoordinateText(pasteText);
		if (!parsed) {
			pasteError = pasteText.trim() ? m.location_coordinates_paste_invalid() : '';
			return;
		}
		pasteError = '';
		notice = null;
		pasteText = '';
		setPosition(parsed.lat, parsed.long);
	}

	function useMyLocation() {
		notice = null;
		if (!('geolocation' in navigator)) {
			notice = { tone: 'warning', message: m.location_coordinates_geolocation_unsupported() };
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				locating = false;
				const round = (value: number) => Math.round(value * 1e6) / 1e6;
				setPosition(round(position.coords.latitude), round(position.coords.longitude));
				notice = {
					tone: 'info',
					message: m.location_coordinates_geolocation_accuracy({
						meters: Math.round(position.coords.accuracy)
					})
				};
			},
			(error) => {
				locating = false;
				notice = {
					tone: 'warning',
					message:
						error.code === error.PERMISSION_DENIED
							? m.location_coordinates_geolocation_denied()
							: m.location_coordinates_geolocation_failed()
				};
			},
			{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
		);
	}

	function reset() {
		latText = coordinates ? String(coordinates.lat) : '';
		longText = coordinates ? String(coordinates.long) : '';
		zoom = mapZoom;
		notice = null;
		pasteError = '';
	}
</script>

<CwCard
	title={m.location_coordinates_title()}
	subtitle={m.location_coordinates_subtitle()}
	elevated
>
	<form
		id="location-coordinates-form"
		method="POST"
		action="?/updateLocationCoordinates"
		use:enhance={({ cancel }) => {
			if (!canSave) {
				cancel();
				return;
			}
			submitting = true;
			return async ({ result }) => {
				try {
					await applyAction(result);
					if (result.type === 'success' || result.type === 'failure') {
						const message = result.data?.message;
						if (typeof message === 'string' && message) {
							toast.add({ message, tone: result.type === 'success' ? 'success' : 'danger' });
						}
					}
					if (result.type === 'success') {
						notice = null;
						await invalidateAll();
					}
				} finally {
					submitting = false;
				}
			};
		}}
	>
		<AppFormStack>
			<div class="coordinates-actions">
				<CwButton
					id="location-coordinates-geolocate-button"
					type="button"
					variant="secondary"
					loading={locating}
					onclick={useMyLocation}
				>
					<Icon src={LOCATION_ICON} alt="" />
					{m.location_coordinates_use_my_location()}
				</CwButton>
				<CwButton
					id="location-coordinates-centre-button"
					type="button"
					variant="secondary"
					disabled={!deviceCentre}
					title={deviceCentre ? undefined : m.location_coordinates_centre_on_devices_none()}
					onclick={() => {
						if (!deviceCentre) return;
						notice = null;
						setPosition(deviceCentre.lat, deviceCentre.long);
					}}
				>
					<Icon src={DEVICE_ICON} alt="" />
					{m.location_coordinates_centre_on_devices()}
				</CwButton>
				{#if !isClearing}
					<CwButton
						id="location-coordinates-clear-button"
						type="button"
						variant="ghost"
						onclick={() => {
							latText = '';
							longText = '';
							notice = null;
						}}
					>
						{m.location_coordinates_clear()}
					</CwButton>
				{/if}
			</div>

			<div class="coordinates-paste">
				<CwInput
					id="location-coordinates-paste-input"
					label={m.location_coordinates_paste_label()}
					placeholder={m.location_coordinates_paste_placeholder()}
					bind:value={pasteText}
					class="coordinates-paste__input"
					aria-describedby={pasteError ? 'location-coordinates-paste-error' : undefined}
					oninput={() => (pasteError = '')}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							applyPaste();
						}
					}}
				/>
				<CwButton
					id="location-coordinates-paste-button"
					type="button"
					variant="secondary"
					disabled={!pasteText.trim()}
					onclick={applyPaste}
				>
					{m.location_coordinates_paste_apply()}
				</CwButton>
			</div>

			{#if pasteError}
				<p id="location-coordinates-paste-error" class="coordinates-paste__error" role="alert">
					{pasteError}
				</p>
			{/if}

			{#if notice}
				<AppNotice tone={notice.tone} ariaLive="polite">
					<p>{notice.message}</p>
				</AppNotice>
			{/if}

			<div class="coordinates-map">
				<LocationMap
					lat={hasPosition ? lat : null}
					long={hasPosition ? long : null}
					{zoom}
					name={locationName}
					editable
					onpick={(nextLat, nextLong) => {
						notice = null;
						setPosition(nextLat, nextLong);
					}}
					onzoomchange={(nextZoom) => (zoom = nextZoom)}
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<CwInput
					id="location-coordinates-lat-input"
					name="lat"
					label={m.location_detail_latitude()}
					placeholder={m.locations_latitude_placeholder()}
					bind:value={latText}
					error={latError}
				/>
				<CwInput
					id="location-coordinates-long-input"
					name="long"
					label={m.location_detail_longitude()}
					placeholder={m.locations_longitude_placeholder()}
					bind:value={longText}
					error={longError}
				/>
			</div>
			<input type="hidden" name="map_zoom" value={zoom ?? ''} />

			<AppActionRow>
				<CwButton
					id="location-coordinates-reset-button"
					type="button"
					variant="ghost"
					disabled={!isDirty || submitting}
					onclick={reset}
				>
					{m.location_coordinates_reset()}
				</CwButton>
				<CwButton
					id="location-coordinates-save-button"
					type="submit"
					variant="primary"
					loading={submitting}
					disabled={!canSave}
				>
					<Icon src={SAVE_ICON} alt="" />
					{m.action_save_changes()}
				</CwButton>
			</AppActionRow>
		</AppFormStack>
	</form>
</CwCard>

<style>
	.coordinates-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-2);
	}

	.coordinates-paste {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--cw-space-2);
	}

	.coordinates-paste :global(.coordinates-paste__input) {
		flex: 1 1 20rem;
		min-width: 0;
	}

	.coordinates-paste__error {
		margin: calc(-1 * var(--cw-space-2)) 0 0;
		font-size: var(--cw-text-xs);
		color: var(--cw-tone-danger-text);
	}

	.coordinates-map {
		height: 22rem;
		display: flex;
	}
</style>
