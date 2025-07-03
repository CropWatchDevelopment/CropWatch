import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			srcDir: 'static',
			filename: 'sw.js',
			strategies: 'injectManifest',
			manifest: {
				name: 'CropWatch UI',
				short_name: 'CW UI',
				description: 'CropWatch User Interface',
				start_url: '/',
				id: '/',
				display: 'standalone',
				display_override: ['window-controls-overlay', 'standalone'],
				background_color: '#ffffff',
				theme_color: '#50C878',
				orientation: 'portrait-primary',
				handle_links: 'preferred',
				iarc_rating_id: 'e1234567890',
				dir: 'ltr',
				prefer_related_applications: false,
				scope_extensions: [
					{
						origin: 'https://api.cropwatch.io'
					}
				],
				edge_side_panel: {
					preferred_width: 300
				},
				protocol_handlers: [
					{
						protocol: 'web+cropwatch',
						url: '/handle-protocol?url=%s'
					}
				],
				file_handlers: [
					{
						action: '/open-file',
						accept: {
							'application/json': ['.json']
						}
					}
				],
				icons: [
					{
						src: '/icons/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				],
				screenshots: [
					{
						src: '/screenshots/screenshot-1280x720.png',
						sizes: '1280x720',
						type: 'image/png',
						label: 'Login screen'
					},
					{
						src: '/screenshots/screenshot-dashboard-1280x720.png',
						sizes: '1280x720',
						type: 'image/png',
						label: 'Dashboard'
					}
				],
				categories: [
					'Smart Agriculture',
					'Cold Chain Management',
					'IoT Applications',
					'Data Analytics'
				],
				launch_handler: {
					client_mode: 'navigate-existing' // or 'focus-existing', 'auto'
				}
			}
		})
	],
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
