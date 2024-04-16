<script lang="ts">
	import { Button, Menu, MenuItem, Tooltip, cls, getSettings } from 'svelte-ux';
	import { _, locale, locales } from 'svelte-i18n';
	// const { locale } = getSettings();

	let open = false;

	type Language = {
		name: string;
		code: string;
		flag: string;
	};

	export let languagesDemo: Language[] = [
		{ name: '日本語', code: 'jp', flag: '🇯🇵' }, // KEEP JAPAN FIRST AS IT IS DEFULAT!
		{ name: 'English', code: 'en', flag: '🇬🇧' },
		{ name: 'English (Improved)', code: 'en-US', flag: '🇺🇸' },
		{ name: 'Español', code: 'es', flag: '🇭🇳' },
		{ name: 'Italiano', code: 'it', flag: '🇮🇹' },
		{ name: 'Français', code: 'jp', flag: '🇫🇷' }
		// add more for the demo
	];

	$: languageSelected = languagesDemo.find((lang) => lang.code == $locale) || languagesDemo[0];
</script>

<Button on:click={() => (open = !open)} class="font-mono font-semibold" iconOnly={true}>
	<Tooltip title={languageSelected.name}>
		{languageSelected.flag}
	</Tooltip>
	<Menu bind:open on:close={() => (open = false)} offset={4} explicitClose resize>
		<div class="grid gap-2 p-2 border-b border-surface-content/10">
			{#each languagesDemo as language}
				<MenuItem
					on:click={() => {
						$locale = language.code;
						const settings = getSettings();
						settings.locale.set(language.code);
						languageSelected = language;
						localStorage.setItem('lang', language.code);
					}}
					class={cls(
						'bg-surface-100 text-surface-content font-semibold border shadow',
						languageSelected === language && 'ring-2 ring-surface-content'
					)}
				>
					{language.flag} - {language.name}
				</MenuItem>
			{/each}
		</div>
	</Menu>
</Button>
