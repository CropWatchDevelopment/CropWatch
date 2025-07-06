<script lang="ts">
	import { locale, locales } from 'svelte-i18n';

	const languageOptions = [
		{ code: 'en', label: '🇺🇸 English' },
		{ code: 'ja', label: '🇯🇵 日本語' }
		// { code: 'es', label: '🇭🇳 Español' },
	];

	let selected = $state($locale);

	const handleChange = (event: Event) => {
		const newLang = (event.target as HTMLSelectElement).value;
		locale.set(newLang);
	};
</script>

<select
	bind:value={selected}
	onchange={handleChange}
	class="user-select-none border-none bg-transparent text-slate-400 outline-none hover:text-green-400 dark:bg-transparent"
	aria-label="Select language"
>
	{#each languageOptions as option}
		<option value={option.code} class="dark:bg-slate-500 dark:text-white">
			{option.label}
		</option>
	{/each}
</select>
