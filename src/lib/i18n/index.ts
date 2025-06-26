import { addMessages, init } from 'svelte-i18n';

/**
 * Initializes the Svelte i18n library with messages from locale files.
 * @see https://github.com/kaisermann/svelte-i18n/blob/main/docs/Getting%20Started.md
 * @see https://vitejs.dev/guide/features.html#glob-import
 */
export const initI18n = ({
	fallbackLocale = 'en',
	initialLocale = 'en'
}: { fallbackLocale?: string; initialLocale?: string } = {}) => {
	const modules: Record<string, { strings: Record<string, string> }> = import.meta.glob(
		'./locales/*.ts',
		{ eager: true }
	);

	Object.entries(modules).forEach(([path, { strings }]) => {
		const [, locale] = path.match(/([a-zA-Z-]+)\.ts/) as string[];

		addMessages(locale, strings);
	});

	init({ fallbackLocale, initialLocale });
};
