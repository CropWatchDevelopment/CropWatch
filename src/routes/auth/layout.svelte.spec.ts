import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import AuthLayout from './+layout.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	const children = createRawSnippet(() => ({
		render: () => '<p class="page-child">Sign in here</p>'
	}));
	view = renderWithServices(AuthLayout, { props: { children, data: {}, params: {} } as never });
	return view;
}

const particles = () => [...document.querySelectorAll<HTMLElement>('.particle-layer > span')];
const sizeOf = (particle: HTMLElement) =>
	[...particle.classList].find((name) => name.startsWith('bg-dot--'))?.slice('bg-dot--'.length);

/** The particle's styles as the browser holds them, `!important` ones marked. */
function particleStyle(particle: HTMLElement) {
	const { style } = particle;
	const value = (property: string) =>
		`${style.getPropertyValue(property)}${style.getPropertyPriority(property) ? ' !important' : ''}`;
	return Object.fromEntries(
		[
			'left',
			'--bg-dot-rise-x',
			'--bg-dot-duration',
			'--bg-dot-delay',
			'--bg-dot-shimmer-duration',
			'--bg-dot-shimmer-delay',
			'--bg-dot-opacity',
			'animation-name',
			'animation-duration',
			'animation-timing-function',
			'animation-iteration-count',
			'animation-delay'
		].map((property) => [property, value(property)])
	);
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('auth layout', () => {
	it('frames the auth page in the always-dark scene', () => {
		render();

		const scene = document.querySelector('section.auth-scene');
		expect(scene?.getAttribute('data-theme')).toBe('dark');
		expect(scene?.className).toContain('p-0 md:p-8');
		expect([...(scene?.children ?? [])].map((child) => child.className.split(' ')[0])).toEqual([
			'auth-locale-switcher',
			'scene-gradient',
			'scene-vignette',
			'particle-layer',
			'auth-content'
		]);
		const content = document.querySelector('.auth-content');
		expect(content?.className).toContain('relative z-2 w-full md:max-w-md');
		expect(content?.querySelector('.page-child')?.textContent).toBe('Sign in here');
	});

	it('offers the compact language switcher', () => {
		render();

		const switcher = document.querySelector('.auth-locale-switcher > .language-switcher');
		expect(switcher?.classList.contains('language-switcher--compact')).toBe(true);
		expect(
			[...(switcher?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim())
		).toEqual(['日本語', 'English']);
	});

	it('draws 28 decorative particles, hidden from assistive technology', () => {
		render();

		expect(document.querySelector('.particle-layer')?.getAttribute('aria-hidden')).toBe('true');
		expect(particles()).toHaveLength(28);
		for (const particle of particles()) {
			expect(particle.classList.contains('bg-dot')).toBe(true);
			expect(['sm', 'md', 'lg']).toContain(sizeOf(particle));
		}
	});

	it('lays the particles out the same way on every visit (seeded)', () => {
		render();

		expect(particles().map(sizeOf)).toEqual(
			'sm,sm,sm,lg,sm,lg,md,md,sm,sm,lg,md,sm,md,md,sm,lg,md,sm,md,md,lg,sm,md,sm,md,lg,sm'.split(
				','
			)
		);
		expect(particles().map((particle) => particle.style.left)).toEqual(
			'50.27,80.46,39.72,84.09,83.83,46.94,19.48,14.55,62.08,11.37,6.31,69.48,82.85,73.35,67.13,64.59,44.12,86.68,69.02,29.75,12.07,27.32,47.26,25.05,37.08,85.46,21.30,48.73'
				.split(',')
				.map((left) => `${Number(left)}%`)
		);
		expect(particleStyle(particles()[0])).toEqual({
			left: '50.27%',
			'--bg-dot-rise-x': '-0.49vw',
			'--bg-dot-duration': '28.46s',
			'--bg-dot-delay': '-5.49s',
			'--bg-dot-shimmer-duration': '5.15s',
			'--bg-dot-shimmer-delay': '-0.38s',
			'--bg-dot-opacity': '0.36',
			'animation-name': 'bg-rise, bg-shimmer !important',
			'animation-duration': '28.46s, 5.15s !important',
			'animation-timing-function': 'linear, ease-in-out !important',
			'animation-iteration-count': 'infinite, infinite !important',
			'animation-delay': '-5.49s, -0.38s !important'
		});
		expect(particleStyle(particles()[27])).toEqual({
			left: '48.73%',
			'--bg-dot-rise-x': '1.47vw',
			'--bg-dot-duration': '30.51s',
			'--bg-dot-delay': '-23.50s',
			'--bg-dot-shimmer-duration': '6.44s',
			'--bg-dot-shimmer-delay': '-0.95s',
			'--bg-dot-opacity': '0.33',
			'animation-name': 'bg-rise, bg-shimmer !important',
			'animation-duration': '30.51s, 6.44s !important',
			'animation-timing-function': 'linear, ease-in-out !important',
			'animation-iteration-count': 'infinite, infinite !important',
			'animation-delay': '-23.5s, -0.95s !important'
		});

		const first = particles().map(particleStyle);
		view?.unmount();
		render();
		expect(particles().map(particleStyle)).toEqual(first);
	});
});
