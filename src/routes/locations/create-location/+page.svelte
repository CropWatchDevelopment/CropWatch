<script lang="ts">
	import { enhance } from '$app/forms';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';

	interface FormData {
		error?: string;
		name?: string;
		description?: string;
		lat?: string;
		long?: string;
	}

	interface Props {
		form: FormData | null;
	}

	let { form }: Props = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Create Location - CropWatch Temp</title>
</svelte:head>

<div class="min-h-screen p-6">
	<div class="mx-auto max-w-2xl space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<CWBackButton fallback="/locations" />
			<div>
				<h1 class="text-2xl font-bold text-slate-100">Create Location</h1>
				<p class="mt-1 text-sm text-slate-400">Add a new monitoring location</p>
			</div>
		</div>

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
			<!-- Error Message -->
			{#if form?.error}
				<div class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
					{form.error}
				</div>
			{/if}

			<!-- Basic Information -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<h2 class="mb-4 text-lg font-semibold text-slate-100">Basic Information</h2>

				<div class="space-y-4">
					<div>
						<label for="name" class="mb-1 block text-sm font-medium text-slate-300">
							Location Name <span class="text-red-400">*</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							value={form?.name ?? ''}
							placeholder="e.g., Greenhouse A, Field North, Barn 2"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
					</div>

					<div>
						<label for="description" class="mb-1 block text-sm font-medium text-slate-300">
							Description
						</label>
						<textarea
							id="description"
							name="description"
							rows="3"
							value={form?.description ?? ''}
							placeholder="Optional description of this location..."
							class="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						></textarea>
					</div>
				</div>
			</div>

			<!-- Location Coordinates -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
				<div class="mb-4">
					<h2 class="text-lg font-semibold text-slate-100">Location Coordinates</h2>
					<p class="mt-1 text-sm text-slate-400">
						Optional GPS coordinates for map display
					</p>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="lat" class="mb-1 block text-sm font-medium text-slate-300">
							Latitude
						</label>
						<input
							id="lat"
							name="lat"
							type="number"
							step="any"
							min="-90"
							max="90"
							value={form?.lat ?? ''}
							placeholder="e.g., 40.7128"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
						<p class="mt-1 text-xs text-slate-400">Between -90 and 90</p>
					</div>

					<div>
						<label for="long" class="mb-1 block text-sm font-medium text-slate-300">
							Longitude
						</label>
						<input
							id="long"
							name="long"
							type="number"
							step="any"
							min="-180"
							max="180"
							value={form?.long ?? ''}
							placeholder="e.g., -74.0060"
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
						/>
						<p class="mt-1 text-xs text-slate-400">Between -180 and 180</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-3">
				<a href="/locations">
					<CWButton variant="ghost" type="button">Cancel</CWButton>
				</a>
				<CWButton variant="primary" type="submit" loading={isSubmitting}>
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
					Create Location
				</CWButton>
			</div>
		</form>
	</div>
</div>
