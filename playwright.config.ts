import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'node scripts/e2e-stack.mjs',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'e2e',
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium'
			}
		},
		{
			name: 'webkit-mobile',
			use: {
				browserName: 'webkit',
				viewport: { width: 390, height: 844 },
				isMobile: true
			}
		}
	],
	use: {
		baseURL: 'http://127.0.0.1:4173'
	}
});
