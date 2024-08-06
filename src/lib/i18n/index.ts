import { browser } from '$app/environment'
import { init, register } from 'svelte-i18n'

const defaultLocale = 'jp';
const getLastSavedLocale = () => {
	if (browser) {
		const saved = localStorage.getItem('lang');
		return saved ? saved : window.navigator.language;
	} else {
		return defaultLocale;
	}
};


register('en', () => import('./locales/en.json'));
register('en-US', () => import('./locales/en.json'));
register('jp', () => import('./locales/jp.json'));

init({
	fallbackLocale: defaultLocale,
	initialLocale: getLastSavedLocale(),
});