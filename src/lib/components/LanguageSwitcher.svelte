<script lang="ts">
	import { getLocale, setLocale } from '$lib/paraglide/runtime';

	type SupportedLocale = 'ja' | 'en';

	interface Props {
		compact?: boolean;
		class?: string;
	}

	let { compact = false, class: className = '' }: Props = $props();

	let currentLocale = $derived(getLocale().startsWith('en') ? 'en' : 'ja');

	async function selectLocale(locale: SupportedLocale): Promise<void> {
		if (locale === currentLocale) return;
		await setLocale(locale);
	}
</script>

<div class={`language-switcher ${compact ? 'language-switcher--compact' : ''} ${className}`}>
	<button
		type="button"
		class:language-switcher__button--active={currentLocale === 'ja'}
		class="language-switcher__button"
		onclick={() => void selectLocale('ja')}
		aria-pressed={currentLocale === 'ja'}
	>
		日本語
	</button>
	<button
		type="button"
		class:language-switcher__button--active={currentLocale === 'en'}
		class="language-switcher__button"
		onclick={() => void selectLocale('en')}
		aria-pressed={currentLocale === 'en'}
	>
		English
	</button>
</div>

<style>
	.language-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.2rem;
		border: 1px solid var(--cw-border-muted);
		border-radius: 999px;
		background: var(--cw-bg-surface);
	}

	.language-switcher__button {
		border: 0;
		border-radius: 999px;
		padding: 0.35rem 0.7rem;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--cw-text-secondary);
		background: transparent;
		cursor: pointer;
		transition:
			background-color 0.16s ease,
			color 0.16s ease;
	}

	.language-switcher__button:hover {
		color: var(--cw-text-primary);
		background: var(--cw-bg-muted);
	}

	.language-switcher__button--active {
		color: var(--cw-bg-base);
		background: var(--cw-primary-500);
	}

	.language-switcher--compact .language-switcher__button {
		padding: 0.28rem 0.6rem;
		font-size: 0.76rem;
	}
</style>
