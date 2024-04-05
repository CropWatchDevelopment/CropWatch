// src/lib/i18n/index.ts
import { browser } from '$app/environment'
import { init, register } from 'svelte-i18n'

const defaultLocale = 'jp'

register('en', () => import('./locales/en.json'));
register('en-US', () => import('./locales/en.json'));
register('jp', () => import('./locales/jp.json'));

init({
	fallbackLocale: defaultLocale,
	initialLocale: browser ? window.navigator.language : defaultLocale,
})