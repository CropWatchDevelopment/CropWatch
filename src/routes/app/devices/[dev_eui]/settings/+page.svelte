<script>
	import { page } from '$app/stores';
	import { mdiDevices, mdiFunction, mdiInformation, mdiLock } from '@mdi/js';
	import { Icon } from 'svelte-ux';
	import GeneralSettings from './GeneralSettings.svelte';
	import RulesSettings from './RulesSettings.svelte';
	import PermissionsSettings from './PermissionsSettings.svelte';
	import InformationSettings from './InformationSettings.svelte';
	import { _ } from 'svelte-i18n';

	$: currentQuery = $page.url.searchParams.get('page') || 'general'; // Default to "general" if no query is set
</script>

<div>
	<div class="sm:block">
		<div class="border-b border-gray-200">
			<nav class="-mb-px flex space-x-8" aria-label="Tabs">
				<a href="?page=general"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiDevices} class="h-5 w-5 {currentQuery === 'general' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>{$_('devices.settings.general')}</span>
				</a>
				<a href="?page=rules"
					class="hidden md:inline-flex group items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'rules' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiFunction} class="h-5 w-5 {currentQuery === 'rules' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>{$_('devices.settings.rules')}</span>
				</a>
				<a href="?page=permissions"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'permissions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiLock} class="h-5 w-5 {currentQuery === 'permissions' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>{$_('devices.settings.permissions')}</span>
				</a>
				<a href="?page=information"
					class="group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium 
					{currentQuery === 'information' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}">
					<Icon data={mdiInformation} class="h-5 w-5 {currentQuery === 'information' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}" />
					<span>{$_('devices.settings.Information')}</span>
				</a>
			</nav>
		</div>
	</div>
</div>

<!-- Conditionally render content in the slot based on currentQuery -->
{#if currentQuery === 'general'}
	<GeneralSettings />
{:else if currentQuery === 'rules'}
	<RulesSettings />
{:else if currentQuery === 'permissions'}
	<PermissionsSettings />
{:else if currentQuery === 'information'}
	<InformationSettings />
{:else}
	<!-- Optionally handle an unknown query by showing a default component or a 404 message -->
	<p>{$_('app.pageNotFound')}</p>
{/if}
