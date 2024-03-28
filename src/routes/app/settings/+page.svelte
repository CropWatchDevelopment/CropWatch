<script>
	import { mdiTemperatureCelsius, mdiTemperatureFahrenheit, mdiTemperatureKelvin, mdiTrashCan } from '@mdi/js';
	import { Button, SelectField, ThemeSwitch } from 'svelte-ux';
</script>

<h1 class="text-lg font-bold border-b">User Interface Settings</h1>

<div class="flex flex-col gap-2">
	<h1>Dark / Light Theme</h1>
	<ThemeSwitch />

	<h1>Temperature Notation</h1>
	<SelectField
		value={1}
		options={[
			{ label: 'Centigrade', value: 1, icon: mdiTemperatureCelsius },
			{ label: 'Fahrenheit', value: 2, icon: mdiTemperatureFahrenheit },
			{ label: 'Kelvin', value: 3, icon: mdiTemperatureKelvin }
		]}
		on:change={(e) => console.log('on:change', e.detail)}
	/>

	<h1>EC Units</h1>
	<SelectField
		value={1}
		options={[
			{ label: 'μs/cm', value: 1 },
			{ label: 'dS/m', value: 2 }
		]}
		on:change={(e) => console.log('on:change', e.detail)}
	/>

	<h1>N/P/K Units</h1>
	<SelectField
		value={1}
		options={[
			{ label: 'mg/kg', value: 1 },
			{ label: 'mg/l', value: 2 },
			{ label: 'mg/100g', value: 3 }
		]}
		on:change={(e) => console.log('on:change', e.detail)}
	/>

    <h1>Speed Units</h1>
	<SelectField
		value={1}
		options={[
			{ label: 'Meters Per Hour', value: 1 },
			{ label: 'Miles Per Hour', value: 2 },
		]}
		on:change={(e) => console.log('on:change', e.detail)}
	/>

	<h1>Login Page:</h1>
	<Button icon={mdiTrashCan} variant="fill-outline" color="danger" on:click={() => { 
		localStorage.removeItem('email');
		localStorage.removeItem('password');
		localStorage.removeItem('rememberMe');
	 }}>Forget Me!</Button>
</div>
