<script>
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';

	let loading = false;

	const handleSubmit = () => {
		loading = true;
		return async () => {
			loading = false;
		};
	};
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="w-full border-b pb-4">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
				🌍 {$_('Units & Display Settings')}
			</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">
				{$_('Choose your preferred units of measurement and display options for your account.')}
			</p>
		</div>
		<div class="search-container"></div>
	</div>

	<!-- Main Content -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Units Settings -->
		<div class="card p-6">
			<h2 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
				{$_('Unit Preferences')}
			</h2>

			<form method="post" action="?/update" use:enhance={handleSubmit} class="space-y-6">
				<!-- Timezone -->
				<div>
					<label
						for="timezone"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('Timezone')}
					</label>
					<select
						id="timezone"
						name="timezone"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="utc">🌎 {$_('UTC')}</option>
						<option value="eastern">🇺🇸 {$_('Eastern Time (EST)')}</option>
						<option value="central">🇺🇸 {$_('Central Time (CST)')}</option>
						<option value="mountain">🇺🇸 {$_('Mountain Time (MT)')}</option>
						<option value="pacific">🇺🇸 {$_('Pacific Time (PST)')}</option>
						<option value="greenwich">{$_('Greenwich Mean Time (GMT)')}</option>
						<option value="cest">{$_('Central European Summer Time (CEST)')}</option>
						<option value="cet">{$_('Central European Time (CET)')}</option>
						<option value="ist">🇮🇳 {$_('Indian Standard Time (IST)')}</option>
						<option value="jst">🇯🇵 {$_('Japan Standard Time (JST)')}</option>
						<option value="aest">🇦🇺 {$_('Australian Eastern Standard Time (AEST)')}</option>
						<option value="nzst">🇳🇿 {$_('New Zealand Standard Time (NZST)')}</option>
					</select>
				</div>

				<!-- Temperature Unit -->
				<div>
					<label
						for="temperature-unit"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('Temperature Unit')}
					</label>
					<select
						id="temperature-unit"
						name="temperatureUnit"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="celsius">{$_('Celsius')}</option>
						<option value="fahrenheit">{$_('Fahrenheit')}</option>
						<option value="kelvin">{$_('Kelvin')}</option>
					</select>
				</div>

				<!-- Distance Unit -->
				<div>
					<label
						for="distance-unit"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('Distance Unit')}
					</label>
					<select
						id="distance-unit"
						name="distanceUnit"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="meters">{$_('Meters')}</option>
						<option value="millimeters">{$_('Millimeters')}</option>
						<option value="centimetres">{$_('Centimetre')}</option>
						<option value="feet">{$_('Feet')}</option>
						<option value="inches">{$_('Inches')}</option>
						<option value="yards">{$_('Yards')}</option>
					</select>
				</div>

				<!-- EC Unit -->
				<div>
					<label
						for="ec-unit"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('EC Unit')}
					</label>
					<select
						id="ec-unit"
						name="ecUnit"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="microsiemens">µS/cm</option>
						<option value="millisiemens">mS/cm</option>
						<option value="decisiemens">dS/cm</option>
						<option value="microsiemens-m">µS/m</option>
						<option value="millisiemens-m">mS/m</option>
						<option value="decisiemens-m">dS/m</option>
					</select>
				</div>

				<!-- Save Button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={loading}
						class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
					>
						{loading ? $_('Loading...') : $_('Save Settings')}
					</button>
				</div>
			</form>
		</div>

		<!-- Display Settings -->
		<div class="card p-6">
			<h2 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
				{$_('Display Preferences')}
			</h2>

			<form method="post" action="?/updateDisplay" use:enhance={handleSubmit} class="space-y-6">
				<!-- Date Format -->
				<div>
					<label
						for="date-format"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('Date Format')}
					</label>
					<select
						id="date-format"
						name="dateFormat"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="dd-mm-yyyy">{$_('DD-MM-YYYY')}</option>
						<option value="mm-dd-yyyy">{$_('MM-DD-YYYY')}</option>
						<option value="yyyy-mm-dd">{$_('YYYY-MM-DD')}</option>
						<option value="dd/mm/yyyy">{$_('DD/MM/YYYY')}</option>
						<option value="mm/dd/yyyy">{$_('MM/DD/YYYY')}</option>
						<option value="yyyy/mm/dd">{$_('YYYY/MM/DD')}</option>
						<option value="dd.mm.yyyy">{$_('DD.MM.YYYY')}</option>
						<option value="mm.dd.yyyy">{$_('MM.DD.YYYY')}</option>
						<option value="yyyy.mm.dd">{$_('YYYY.MM.DD')}</option>
						<option value="iso">{$_('ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)')}</option>
					</select>
				</div>

				<!-- Time Format -->
				<div>
					<label
						for="time-format"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('Time Format')}
					</label>
					<select
						id="time-format"
						name="timeFormat"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="12-hour">{$_('12-Hour')}</option>
						<option value="24-hour">{$_('24-Hour')}</option>
						<option value="iso">{$_('ISO 8601 (HH:mm:ss)')}</option>
					</select>
				</div>

				<!-- Number Format -->
				<div>
					<label
						for="number-format"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{$_('Number Format')}
					</label>
					<select
						id="number-format"
						name="numberFormat"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="no_decimal">{$_('No Decimal Places')}</option>
						<option value="one_decimal">{$_('One Decimal Place')}</option>
						<option value="two_decimals">{$_('Two Decimal Places')}</option>
						<option value="three_decimals">{$_('Three Decimal Places')}</option>
					</select>
				</div>

				<!-- Save Button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={loading}
						class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
					>
						{loading ? $_('Loading...') : $_('Save Settings')}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
