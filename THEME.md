# Theme System

Centralized theme management supports three modes: `light`, `dark`, and `system`.

## How It Works
- User preference stored in `localStorage` under `theme.mode`.
- `themeStore` (in `src/lib/stores/theme.ts`) exposes `{ mode, effective, system }`.
- `effective` is the applied theme (`light` or `dark`). If `mode === 'system'`, it mirrors OS preference; otherwise user selection overrides OS.
- The `<html>` element gets the `dark` class when effective theme is dark, plus a `data-theme="light|dark"` attribute for additional hooks.

## API
```ts
import { themeStore, setThemeMode, toggleExplicitLightDark } from '$lib/stores/theme';
setThemeMode('dark'); // force dark
setThemeMode('light'); // force light
setThemeMode('system'); // follow OS
```

## UI Component: ThemeModeSelector
Use the built-in selector component for a user-facing control:
```svelte
<script lang="ts">
	import ThemeModeSelector from '$lib/components/theme/ThemeModeSelector.svelte';
</script>

<ThemeModeSelector />
```
Desktop renders a segmented control; mobile falls back to a `<select>`. It updates the store and persists automatically.

## Adding Theme-aware Styles
Prefer CSS variables defined in `src/app.css`:
```css
background: var(--color-background);
color: var(--color-text);
```
Dark variants automatically applied when `.dark` is on `<html>`.

## Buttons
All buttons unified through `src/lib/components/ui/base/Button.svelte`.
Props:
- `variant`: `primary | secondary | ghost | outline | danger`
- `size`: `sm | md | lg`
- `href`: Navigates (SPA if internal)

Legacy button components now wrap the base component for backward compatibility.

## Migration Notes
- Avoid direct `matchMedia('(prefers-color-scheme: dark)')` checks; subscribe to `themeStore` instead.
- If you must react to theme changes in a component:
```ts
import { themeStore } from '$lib/stores/theme';
let theme;
const unsub = themeStore.subscribe(v => theme = v.effective);
```
- Remove any manual DOM class toggling (central store owns it).

## Future Enhancements
- Add high-contrast mode.
- Expose user-accessible palette customization.
- Persist expanded design tokens into Tailwind config for full JIT class generation.
