<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { fade, slide, fly } from 'svelte/transition';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWDevEuiInput from '$lib/components/CWDevEuiInput.svelte';
	import CWSelect from '$lib/components/CWSelect.svelte';
	import CWPermissionRowItem from '$lib/components/CWPermissionRowItem.svelte';
	import type { PermissionUser } from '$lib/components/CWPermissionRowItem.svelte';

	// Get data from server
	let { data, form } = $props();

	const locationId = $derived($page.params.location_id);

	// Form state - use type assertion for form data since it includes field values on validation errors
	type FormData = { error?: string; devEui?: string; name?: string; deviceType?: string } | null;
	const formData = form as FormData;

	let devEui = $state(formData?.devEui ?? '');
	let deviceName = $state(formData?.name ?? '');
	let deviceType = $state(formData?.deviceType ?? '');
	let serialNumber = $state('');
	let sensorSerial = $state('');
	let applyLocationPermissions: boolean = $state<boolean>(true);

	// UI state
	let isSubmitting = $state(false);
	let currentStep = $state(1);
	let showAdvancedOptions = $state(false);
	let deviceNameTouched = $state(false);

	// Database check state (prior registration)
	let dbCheckState = $state<'idle' | 'checking' | 'available' | 'exists' | 'error'>('idle');
	let dbCheckError = $state<string | null>(null);
	let existingDeviceInfo = $state<{ devEui?: string; name?: string; locationName?: string; createdAt?: string } | null>(null);
	let lastCheckedDevEui = $state<string | null>(null);

	// TTI Verification state
	let ttiVerificationState = $state<'idle' | 'verifying' | 'verified' | 'error' | 'not-found'>('idle');
	let ttiVerificationError = $state<string | null>(null);
	let ttiDeviceInfo = $state<{ deviceId?: string; name?: string; description?: string } | null>(null);
	let lastVerifiedDevEui = $state<string | null>(null);

	// Validation states
	const isDevEuiValid = $derived(devEui.length === 16 && /^[A-Fa-f0-9]+$/.test(devEui));
	const isDeviceNameValid = $derived(deviceName.trim().length >= 2);
	const isDbCheckPassed = $derived(dbCheckState === 'available' && lastCheckedDevEui === devEui);
	const isTtiVerified = $derived(ttiVerificationState === 'verified' && lastVerifiedDevEui === devEui);
	const canProceedToStep2 = $derived(isDevEuiValid && isDeviceNameValid && isDbCheckPassed && isTtiVerified);
	const isFormValid = $derived(isDevEuiValid && isDeviceNameValid && isDbCheckPassed && isTtiVerified);

	// Steps configuration
	const steps = [
		{ id: 1, title: 'Device Details', icon: 'device' },
		{ id: 2, title: 'Permissions', icon: 'permissions' },
		{ id: 3, title: 'Review', icon: 'review' }
	];

	// Get the count of active location users for the checkbox description
	const locationUserCount = $derived(data.locationUsers?.length ?? 0);

	// Transform location users to PermissionUser format for CWPermissionRowItem
	const permissionUsers = $derived<PermissionUser[]>(
		(data.locationUsers ?? []).map((locUser) => {
			const profile = Array.isArray(locUser.profiles) ? locUser.profiles[0] : locUser.profiles;
			return {
				id: locUser.id?.toString() ?? '',
				user_id: locUser.user_id ?? '',
				full_name: profile?.full_name ?? 'Unknown',
				email: profile?.email ?? '',
				avatar_url: null,
				permission_level: locUser.permission_level ?? 1,
				is_active: locUser.is_active ?? true
			};
		})
	);

	// Format device type options for CWSelect
	const deviceTypeOptions = $derived(
		(data.deviceTypes ?? []).map(
			(dt: { id: number; name: string; manufacturer: string | null; model: string | null; TTI_application_id: string | null }) => ({
				value: dt.id.toString(),
				label: dt.manufacturer && dt.model ? `${dt.name} (${dt.manufacturer} ${dt.model})` : dt.name,
				ttiApplicationId: dt.TTI_application_id
			})
		)
	);

	// Get selected device type label for review
	const selectedDeviceTypeLabel = $derived(
		deviceTypeOptions.find((dt: { value: string; label: string }) => dt.value === deviceType)
			?.label ?? 'Not selected'
	);

	// Get selected device type's TTI application ID
	const selectedTtiApplicationId = $derived(
		selectedDeviceTypeLabel
			? deviceTypeOptions.find((dt: { value: string; ttiApplicationId: string | null }) => dt.value === deviceType)
				?.ttiApplicationId ?? null
			: null
	);
    // let selectedTtiApplicationId = $state<string | null>(null);

	// Check if DevEUI has changed since last checks (for UI display)
	const hasDevEuiChangedSinceDbCheck = $derived(
		lastCheckedDevEui !== null && devEui !== lastCheckedDevEui
	);
	const hasDevEuiChangedSinceVerification = $derived(
		lastVerifiedDevEui !== null && devEui !== lastVerifiedDevEui
	);

	// Database check function (prior registration)
	async function checkDeviceInDatabase() {
		if (!isDevEuiValid) {
			dbCheckError = 'Please enter a valid DevEUI first.';
			dbCheckState = 'error';
			return;
		}

		dbCheckState = 'checking';
		dbCheckError = null;
		existingDeviceInfo = null;

		try {
			const response = await fetch('/api/private/devices/check-exists', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ devEui })
			});

			const result = await response.json();

			if (result.success && result.exists) {
				dbCheckState = 'exists';
				existingDeviceInfo = result.device;
				dbCheckError = result.message || 'This device is already registered.';
			} else if (result.success && !result.exists) {
				dbCheckState = 'available';
				lastCheckedDevEui = devEui;
			} else {
				dbCheckState = 'error';
				dbCheckError = result.error || 'Failed to check device registration.';
			}
		} catch (error) {
			console.error('Database check error:', error);
			dbCheckState = 'error';
			dbCheckError = 'Failed to connect to the server. Please try again.';
		}
	}

	// TTI Verification function
	async function verifyDeviceWithTti() {
		if (!isDevEuiValid) {
			ttiVerificationError = 'Please enter a valid DevEUI first.';
			ttiVerificationState = 'error';
			return;
		}

		if (!deviceType || !selectedTtiApplicationId) {
			ttiVerificationError = 'Please select a device type first. The device type determines which TTI application to verify against.';
			ttiVerificationState = 'error';
			return;
		}

		ttiVerificationState = 'verifying';
		ttiVerificationError = null;
		ttiDeviceInfo = null;

		try {
			const response = await fetch('/api/private/tti/verify-device', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					devEui: devEui,
					applicationId: selectedTtiApplicationId
				})
			});

			const result = await response.json();

			if (result.success && result.exists) {
				ttiVerificationState = 'verified';
				ttiDeviceInfo = result.device;
				lastVerifiedDevEui = devEui;
			} else if (result.exists === false) {
				ttiVerificationState = 'not-found';
				ttiVerificationError = result.error || 'Device not found in TTI.';
			} else {
				ttiVerificationState = 'error';
				ttiVerificationError = result.error || 'Failed to verify device.';
			}
		} catch (error) {
			console.error('TTI verification error:', error);
			ttiVerificationState = 'error';
			ttiVerificationError = 'Failed to connect to verification service. Please try again.';
		}
	}

	function goToStep(step: number) {
		if (step === 1 || (step === 2 && canProceedToStep2) || (step === 3 && canProceedToStep2)) {
			currentStep = step;
		}
	}

	function nextStep() {
		if (currentStep < 3 && (currentStep === 1 ? canProceedToStep2 : true)) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}
</script>

<svelte:head>
	<title>Add New Device - CropWatch Temp</title>
</svelte:head>

<pre>{JSON.stringify(selectedDeviceTypeLabel, null, 2)}</pre>
<pre>{JSON.stringify(selectedTtiApplicationId, null, 2)}</pre>
<pre>{JSON.stringify(applyLocationPermissions, null, 2)}</pre>

<div class="p-6">
	<div class="mx-auto max-w-2xl space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<CWBackButton fallback="/locations/location/{locationId}" />
			<div>
				<h1 class="text-2xl font-bold text-slate-100">Add New Device</h1>
				<p class="mt-1 text-sm text-slate-400">
					Add a device to <span class="text-slate-300"
						>{data.location?.name ?? 'this location'}</span
					>
				</p>
			</div>
		</div>

		<!-- Progress Steps -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<div class="flex items-center justify-between">
				{#each steps as step, index (step.id)}
					<button
						type="button"
						onclick={() => goToStep(step.id)}
						disabled={step.id > 1 && !canProceedToStep2}
						class="group flex flex-1 flex-col items-center gap-2 {step.id > 1 && !canProceedToStep2
							? 'cursor-not-allowed opacity-50'
							: 'cursor-pointer'}"
					>
						<div class="flex items-center gap-2 w-full">
							{#if index > 0}
								<div
									class="h-0.5 flex-1 rounded {currentStep > index ? 'bg-sky-500' : 'bg-slate-700'}"
								></div>
							{/if}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all
									{currentStep === step.id
									? 'border-sky-500 bg-sky-500/20 text-sky-400'
									: currentStep > step.id
										? 'border-sky-500 bg-sky-500 text-white'
										: 'border-slate-700 bg-slate-800 text-slate-400'}"
							>
								{#if currentStep > step.id}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{:else if step.icon === 'device'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
										/>
									</svg>
								{:else if step.icon === 'permissions'}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								{/if}
							</div>
							{#if index < steps.length - 1}
								<div
									class="h-0.5 flex-1 rounded {currentStep > step.id
										? 'bg-sky-500'
										: 'bg-slate-700'}"
								></div>
							{/if}
						</div>
						<span
							class="text-xs font-medium {currentStep === step.id
								? 'text-sky-400'
								: 'text-slate-400'}">{step.title}</span
						>
					</button>
				{/each}
			</div>
		</div>

		<!-- Error message -->
		{#if formData?.error}
			<div transition:slide class="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-red-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-sm text-red-300">{formData.error}</p>
				</div>
			</div>
		{/if}

		<!-- Form -->
		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
			class="space-y-6"
		>
			<!-- Step 1: Device Information -->
			{#if currentStep === 1}
				<div
					transition:fly={{ x: -20, duration: 200 }}
					class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
				>
					<div class="mb-6 flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
								/>
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-slate-100">Device Information</h2>
							<p class="text-sm text-slate-400">Enter the basic details for your new device</p>
						</div>
					</div>

					<div class="space-y-5">
						<!-- Device EUI -->
						<CWDevEuiInput bind:value={devEui} required />

						<!-- Device Name -->
						<div>
							<label for="name" class="mb-1.5 block text-sm font-medium text-slate-300">
								Device Name <span class="text-red-400">*</span>
							</label>
							<div class="relative">
								<input
									id="name"
									name="name"
									type="text"
									bind:value={deviceName}
									onblur={() => (deviceNameTouched = true)}
									required
									placeholder="e.g., Greenhouse Sensor 1"
									class="w-full rounded-xl border bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:outline-none focus:ring-2 focus:ring-sky-500/20
										{deviceNameTouched && !isDeviceNameValid && deviceName.length > 0
										? 'border-amber-500/50 focus:border-amber-500'
										: deviceNameTouched && isDeviceNameValid
											? 'border-green-500/50 focus:border-green-500'
											: 'border-slate-700 focus:border-sky-500'}"
								/>
								{#if deviceNameTouched && isDeviceNameValid}
									<div
										class="absolute right-3 top-1/2 -translate-y-1/2"
										transition:fade={{ duration: 150 }}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-5 w-5 text-green-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</div>
								{/if}
							</div>
							<p class="mt-1.5 text-xs text-slate-400">
								Give your device a memorable name to easily identify it later
							</p>
						</div>

						<!-- Device Type -->
						<CWSelect
							bind:value={deviceType}
							options={deviceTypeOptions}
							label="Device Type"
							required
							requiredHint="required for TTI verification"
							placeholder="Select a device type..."
							name="device_type"
							id="device_type"
						/>

						<!-- Prior Registration Check -->
						<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
							<div class="mb-3 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
								</svg>
								<h3 class="text-sm font-medium text-slate-200">Prior Registration</h3>
								<span class="text-xs text-red-400">*</span>
							</div>
							<p class="mb-4 text-xs text-slate-400">
								Check if this device is already registered in CropWatch.
							</p>

							{#if dbCheckState === 'idle'}
								<CWButton 
									variant="secondary" 
									type="button" 
									onclick={checkDeviceInDatabase}
									disabled={!isDevEuiValid}
									class="w-full"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									Check Registration
								</CWButton>
								{#if !isDevEuiValid}
									<p class="mt-2 text-xs text-slate-400">Enter a valid DevEUI first.</p>
								{/if}

							{:else if dbCheckState === 'checking'}
								<div class="flex items-center gap-3 text-purple-400">
									<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									<span class="text-sm">Checking registration...</span>
								</div>

							{:else if dbCheckState === 'available' && !hasDevEuiChangedSinceDbCheck}
								<div transition:slide class="space-y-3">
									<div class="flex items-center gap-2 text-green-400">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm font-medium">Device available for registration</span>
									</div>
									<button 
										type="button" 
										onclick={() => { dbCheckState = 'idle'; existingDeviceInfo = null; lastCheckedDevEui = null; }}
										class="text-xs text-purple-400 hover:text-purple-300"
									>
										Check again
									</button>
								</div>

							{:else if dbCheckState === 'available' && hasDevEuiChangedSinceDbCheck}
								<div transition:slide class="space-y-3">
									<div class="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										<div>
											<p class="text-sm font-medium text-amber-400">DevEUI Changed</p>
											<p class="mt-1 text-xs text-amber-400/80">The DevEUI has changed. Please check registration again.</p>
										</div>
									</div>
									<CWButton 
										variant="secondary" 
										type="button" 
										onclick={checkDeviceInDatabase}
										disabled={!isDevEuiValid}
										class="w-full"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
										Check New DevEUI
									</CWButton>
								</div>

							{:else if dbCheckState === 'exists'}
								<div transition:slide class="space-y-3">
									<div class="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<div>
											<p class="text-sm font-medium text-red-400">Device Already Registered</p>
											<p class="mt-1 text-xs text-red-400/80">This device cannot be registered again.</p>
										</div>
									</div>
									{#if existingDeviceInfo}
										<div class="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
											<div class="space-y-1 text-xs">
												{#if existingDeviceInfo.name}
													<p class="text-slate-400">Device Name: <span class="text-slate-200">{existingDeviceInfo.name}</span></p>
												{/if}
												{#if existingDeviceInfo.locationName}
													<p class="text-slate-400">Location: <span class="text-slate-200">{existingDeviceInfo.locationName}</span></p>
												{/if}
												{#if existingDeviceInfo.createdAt}
													<p class="text-slate-400">Registered: <span class="text-slate-200">{new Date(existingDeviceInfo.createdAt).toLocaleDateString()}</span></p>
												{/if}
											</div>
										</div>
									{/if}
									<CWButton 
										variant="secondary" 
										type="button" 
										onclick={() => { dbCheckState = 'idle'; existingDeviceInfo = null; lastCheckedDevEui = null; }}
										class="w-full"
									>
										Check Different DevEUI
									</CWButton>
								</div>

							{:else if dbCheckState === 'error'}
								<div transition:slide class="space-y-3">
									<div class="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<div>
											<p class="text-sm font-medium text-red-400">Check Failed</p>
											<p class="mt-1 text-xs text-red-400/80">{dbCheckError}</p>
										</div>
									</div>
									<CWButton 
										variant="secondary" 
										type="button" 
										onclick={() => checkDeviceInDatabase()}
										class="w-full"
									>
										Try Again
									</CWButton>
								</div>
							{/if}
						</div>

						<!-- TTI Device Verification -->
						<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
							<div class="mb-3 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
								<h3 class="text-sm font-medium text-slate-200">TTI Verification</h3>
								<span class="text-xs text-red-400">*</span>
							</div>
							<p class="mb-4 text-xs text-slate-400">
								Verify that this device exists in The Things Industries before adding it to CropWatch.
							</p>

							{#if ttiVerificationState === 'idle'}
								<CWButton 
									variant="secondary" 
									type="button" 
									onclick={verifyDeviceWithTti}
									disabled={!isDevEuiValid || !deviceType}
									class="w-full"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									Verify Device in TTI
								</CWButton>
								{#if !isDevEuiValid || !deviceType}
									<p class="mt-2 text-xs text-slate-400">
										{#if !isDevEuiValid}
											Enter a valid DevEUI first.
										{:else if !deviceType}
											Select a device type to verify.
										{/if}
									</p>
								{/if}

							{:else if ttiVerificationState === 'verifying'}
								<div class="flex items-center gap-3 text-sky-400">
									<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									<span class="text-sm">Verifying device with TTI...</span>
								</div>

							{:else if ttiVerificationState === 'verified' && !hasDevEuiChangedSinceVerification}
								<div transition:slide class="space-y-3">
									<div class="flex items-center gap-2 text-green-400">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm font-medium">Device verified successfully</span>
									</div>
									{#if ttiDeviceInfo}
										<div class="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
											<div class="space-y-1 text-xs">
												{#if ttiDeviceInfo.deviceId}
													<p class="text-slate-400">TTI Device ID: <span class="text-slate-200 font-mono">{ttiDeviceInfo.deviceId}</span></p>
												{/if}
												{#if ttiDeviceInfo.name}
													<p class="text-slate-400">TTI Name: <span class="text-slate-200">{ttiDeviceInfo.name}</span></p>
												{/if}
											</div>
										</div>
									{/if}
									<button 
										type="button" 
										onclick={() => { ttiVerificationState = 'idle'; ttiDeviceInfo = null; lastVerifiedDevEui = null; }}
										class="text-xs text-sky-400 hover:text-sky-300"
									>
										Verify again
									</button>
								</div>

							{:else if ttiVerificationState === 'verified' && hasDevEuiChangedSinceVerification}
								<div transition:slide class="space-y-3">
									<div class="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										<div>
											<p class="text-sm font-medium text-amber-400">DevEUI Changed</p>
											<p class="mt-1 text-xs text-amber-400/80">The DevEUI has changed since verification. Please verify the new DevEUI.</p>
										</div>
									</div>
									<CWButton 
										variant="secondary" 
										type="button" 
										onclick={verifyDeviceWithTti}
										disabled={!isDevEuiValid || !deviceType}
										class="w-full"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
										Verify New DevEUI
									</CWButton>
								</div>

							{:else if ttiVerificationState === 'not-found'}
								<div transition:slide class="space-y-3">
									<div class="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										<div>
											<p class="text-sm font-medium text-amber-400">Device Not Found</p>
											<p class="mt-1 text-xs text-amber-400/80">{ttiVerificationError}</p>
										</div>
									</div>
									<CWButton 
										variant="secondary" 
										type="button" 
										onclick={verifyDeviceWithTti}
										class="w-full"
									>
										Try Again
									</CWButton>
								</div>

							{:else if ttiVerificationState === 'error'}
								<div transition:slide class="space-y-3">
									<div class="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<div>
											<p class="text-sm font-medium text-red-400">Verification Failed</p>
											<p class="mt-1 text-xs text-red-400/80">{ttiVerificationError}</p>
										</div>
									</div>
									<CWButton 
										variant="secondary" 
										type="button" 
										onclick={() => verifyDeviceWithTti()}
										class="w-full"
									>
										Try Again
									</CWButton>
								</div>
							{/if}
						</div>

						<!-- Advanced Options Toggle -->
						<button
							type="button"
							onclick={() => (showAdvancedOptions = !showAdvancedOptions)}
							class="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-left transition hover:border-slate-700 hover:bg-slate-800/50"
						>
							<span class="text-sm font-medium text-slate-400">Advanced Options</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-slate-400 transition-transform {showAdvancedOptions
									? 'rotate-180'
									: ''}"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</button>

						{#if showAdvancedOptions}
							<div
								transition:slide
								class="space-y-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4"
							>
								<!-- Serial Number -->
								<div>
									<label
										for="serial_number"
										class="mb-1.5 block text-sm font-medium text-slate-300"
									>
										Serial Number
									</label>
									<input
										id="serial_number"
										name="serial_number"
										type="text"
										bind:value={serialNumber}
										placeholder="e.g., SN-12345678"
										class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
									/>
								</div>

								<!-- Sensor Serial -->
								<div>
									<label
										for="sensor_serial"
										class="mb-1.5 block text-sm font-medium text-slate-300"
									>
										Sensor Serial
									</label>
									<input
										id="sensor_serial"
										name="sensor_serial"
										type="text"
										bind:value={sensorSerial}
										placeholder="e.g., SENS-87654321"
										class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
									/>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Step 2: Permissions -->
			{#if currentStep === 2}
				<div
					transition:fly={{ x: 20, duration: 200 }}
					class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
				>
					<div class="mb-6 flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-slate-100">Permissions</h2>
							<p class="text-sm text-slate-400">Choose who can access this device</p>
						</div>
					</div>

					<!-- Permission Options -->
					<div class="space-y-4">
						<!-- Option 1: Apply location permissions -->
						<button
							type="button"
							onclick={() => (applyLocationPermissions = true)}
							class="group w-full rounded-xl border-2 p-4 text-left transition
								{applyLocationPermissions
								? 'border-sky-500 bg-sky-500/10'
								: 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}"
						>
							<div class="flex items-start gap-3">
								<div
									class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2
									{applyLocationPermissions ? 'border-sky-500 bg-sky-500' : 'border-slate-600'}"
								>
									{#if applyLocationPermissions}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3 w-3 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="3"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</div>
								<div class="flex-1">
									<p class="font-medium text-slate-200">Inherit location permissions</p>
									<p class="mt-1 text-sm text-slate-400">
										All {locationUserCount} user{locationUserCount !== 1 ? 's' : ''} with access to this
										location will automatically get access to this device.
									</p>
								</div>
								<div
									class="flex h-8 items-center rounded-full bg-sky-500/20 px-3 text-xs font-medium text-sky-400"
								>
									Recommended
								</div>
							</div>
						</button>

						<!-- Option 2: Owner only -->
						<button
							type="button"
							onclick={() => (applyLocationPermissions = false)}
							class="group w-full rounded-xl border-2 p-4 text-left transition
								{!applyLocationPermissions
								? 'border-amber-500 bg-amber-500/10'
								: 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}"
						>
							<div class="flex items-start gap-3">
								<div
									class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2
									{!applyLocationPermissions ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}"
								>
									{#if !applyLocationPermissions}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3 w-3 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="3"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</div>
								<div class="flex-1">
									<p class="font-medium text-slate-200">Owner only (Private)</p>
									<p class="mt-1 text-sm text-slate-400">
										Only you will have access to this device. You can add other users later.
									</p>
								</div>
							</div>
						</button>
					</div>

					<!-- Hidden checkbox for form submission -->
					<input
						type="hidden"
						name="applyLocationPermissions"
						value={applyLocationPermissions}
					/>

					{#if applyLocationPermissions && locationUserCount > 0}
						<div class="mt-6" transition:slide>
							<p class="mb-3 text-sm font-medium text-slate-400">Users who will receive access:</p>
							<div
								class="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800/30 p-3"
							>
								{#each permissionUsers as user (user.id)}
									<CWPermissionRowItem
										{user}
										supabase={data.supabase}
										canEdit={false}
										canRemove={false}
									/>
								{/each}
							</div>
						</div>
					{/if}

					{#if !applyLocationPermissions}
						<div
							class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
							transition:slide
						>
							<div class="flex items-start gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<p class="text-sm text-amber-400/80">
									This device will only be visible to you. You can manually add users later from the
									device settings.
								</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 3: Review -->
			{#if currentStep === 3}
				<div
					transition:fly={{ x: 20, duration: 200 }}
					class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
				>
					<div class="mb-6 flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-slate-100">Review & Create</h2>
							<p class="text-sm text-slate-400">Confirm your device details before creating</p>
						</div>
					</div>

					<!-- Summary -->
					<div class="space-y-4">
						<!-- Device Details Summary -->
						<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-sm font-medium text-slate-400">Device Details</h3>
								<button
									type="button"
									onclick={() => (currentStep = 1)}
									class="text-xs text-sky-400 hover:text-sky-300">Edit</button
								>
							</div>
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-sm text-slate-400">Device EUI</span>
									<span class="font-mono text-sm font-medium text-slate-200">{devEui}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-slate-400">Device Name</span>
									<span class="text-sm font-medium text-slate-200">{deviceName}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-slate-400">Device Type</span>
									<span class="text-sm text-slate-200">{selectedDeviceTypeLabel}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-slate-400">Prior Registration</span>
									<div class="flex items-center gap-1.5">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm text-green-400">Available</span>
									</div>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-slate-400">TTI Verification</span>
									<div class="flex items-center gap-1.5">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm text-green-400">Verified</span>
									</div>
								</div>
								{#if serialNumber}
									<div class="flex items-center justify-between">
										<span class="text-sm text-slate-400">Serial Number</span>
										<span class="text-sm text-slate-200">{serialNumber}</span>
									</div>
								{/if}
								{#if sensorSerial}
									<div class="flex items-center justify-between">
										<span class="text-sm text-slate-400">Sensor Serial</span>
										<span class="text-sm text-slate-200">{sensorSerial}</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Permissions Summary -->
						<div class="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-sm font-medium text-slate-400">Permissions</h3>
								<button
									type="button"
									onclick={() => (currentStep = 2)}
									class="text-xs text-sky-400 hover:text-sky-300">Edit</button
								>
							</div>
							<div class="flex items-center gap-3">
								{#if applyLocationPermissions}
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-400"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
											/>
										</svg>
									</div>
									<div>
										<p class="text-sm font-medium text-slate-200">Shared with location users</p>
										<p class="text-xs text-slate-400">
											{locationUserCount} user{locationUserCount !== 1 ? 's' : ''} will have access
										</p>
									</div>
								{:else}
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
											/>
										</svg>
									</div>
									<div>
										<p class="text-sm font-medium text-slate-200">Private (Owner only)</p>
										<p class="text-xs text-slate-400">Only you will have access</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Location Info -->
						<div
							class="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4"
						>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-slate-400">Adding to location</p>
								<p class="text-sm font-medium text-slate-200">{data.location?.name ?? 'Unknown'}</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Hidden inputs for form data that needs to persist across steps -->
			<input type="hidden" name="dev_eui" value={devEui} />
			<input type="hidden" name="name" value={deviceName} />
			<input type="hidden" name="device_type" value={deviceType} />
			<input type="hidden" name="serial_number" value={serialNumber} />
			<input type="hidden" name="sensor_serial" value={sensorSerial} />
			<input type="hidden" name="tti_name" value={ttiDeviceInfo?.deviceId ?? ''} />
			<input type="hidden" name="apply_location_permissions" value={applyLocationPermissions} />

			<!-- Form Actions -->
			<div class="flex items-center justify-between gap-3">
				<div>
					{#if currentStep > 1}
						<CWButton variant="secondary" type="button" onclick={prevStep}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
							</svg>
							Back
						</CWButton>
					{:else}
						<a href="/locations/location/{locationId}">
							<CWButton variant="ghost" type="button">Cancel</CWButton>
						</a>
					{/if}
				</div>

				<div class="flex gap-3">
					{#if currentStep < 3}
						<CWButton
							variant="primary"
							type="button"
							onclick={nextStep}
							disabled={currentStep === 1 && !canProceedToStep2}
						>
							Continue
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</CWButton>
					{:else}
						<CWButton
							variant="primary"
							type="submit"
							loading={isSubmitting}
							disabled={!isFormValid}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
							</svg>
							Create Device
						</CWButton>
					{/if}
				</div>
			</div>
		</form>
	</div>
</div>
