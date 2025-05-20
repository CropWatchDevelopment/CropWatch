<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // extract route params
  let locationId: string;
  $: locationId = $page.params.location_id;
</script>

<svelte:head>
  <title>Device Error | CropWatch</title>
</svelte:head>

<!-- Styled error page similar to auth section -->
<div class="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center p-5 transition-colors duration-300">
  <div class="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark max-w-md w-full rounded-lg p-8 shadow-md">
    <div class="flex flex-col items-center">
      <div class="text-red-500 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold mb-4 text-center">Device Error</h1>
      <p class="text-center mb-6">
        There was an error loading the device. Please try again or contact our support team for assistance.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 w-full">
        <button
          class="bg-primary hover:bg-primary-hover flex-1 rounded px-4 py-2 font-medium text-white transition-colors duration-200"
          on:click={() => goto(`/app/dashboard/location/${locationId}/devices`)}
        >
          Back to Devices
        </button>
        <button
          class="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 flex-1 rounded px-4 py-2 font-medium transition-colors duration-200"
          on:click={() => window.location.href = 'https://cropwatch.io/contact-us'}
        >
          Contact Support
        </button>
      </div>
      <button
        class="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        on:click={() => goto(`${$page.params.devEui}/settings`)}
      >Go to Device Settings</button>
    </div>
  </div>
</div>