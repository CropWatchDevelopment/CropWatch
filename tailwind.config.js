/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class', // 'media' for OS preference, 'class' for manual toggle
	theme: {
		extend: {
			colors: {
				// You can customize your color palette here
				primary: {
					light: '#4CAF50',
					dark: '#3a8c3f'
				},
				foreground: {
					light: 'var(--color-foreground-light)',
					DEFAULT: 'var(--color-foreground)',
					dark: 'var(--color-foreground-dark)'
				},
				background: {
					light: '#f5f5f5',
					dark: '#1a1a1a'
				},
				card: {
					light: 'var(--color-card, #ffffff)',
					dark: 'var(--color-card, #2d2d2d)'
				},
				text: {
					light: '#333333',
					dark: '#e0e0e0'
				},
				air: {
					light: '#e6f7ff',
					dark: '#0d3b66'
				},
				soil: {
					light: '#f6ffed',
					dark: '#1e4620'
				},
				hotpink: {
					50: '#fdf2f8',
					100: '#fce7f3',
					200: '#fbcfe8',
					300: '#f9a8d4',
					400: '#f472b6', // This will create --color-hotpink-400
					500: '#ec4899',
					600: '#db2777',
					700: '#be185d',
					800: '#9d174d',
					900: '#831843'
				}
			},
			// Define spacing scale explicitly for Tailwind v4
			spacing: {
				0: '0px',
				0.5: '0.125rem',
				1: '0.25rem',
				1.5: '0.375rem',
				2: '0.5rem',
				2.5: '0.625rem',
				3: '0.75rem',
				3.5: '0.875rem',
				4: '1rem',
				5: '1.25rem', // Ensure gap-5 uses this value
				6: '1.5rem',
				7: '1.75rem',
				8: '2rem',
				9: '2.25rem',
				10: '2.5rem',
				11: '2.75rem',
				12: '3rem',
				14: '3.5rem',
				16: '4rem',
				20: '5rem',
				24: '6rem',
				28: '7rem',
				32: '8rem',
				36: '9rem',
				40: '10rem',
				44: '11rem',
				48: '12rem',
				52: '13rem',
				56: '14rem',
				60: '15rem',
				64: '16rem',
				72: '18rem',
				80: '20rem',
				96: '24rem'
			}
		}
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
	// Explicitly enable core plugins needed
	corePlugins: {
		preflight: true,
		// Layout
		display: true,
		flexDirection: true,
		gridTemplateColumns: true,
		// Spacing
		padding: true,
		margin: true,
		gap: true, // Explicitly enable gap
		// Sizing
		width: true,
		height: true,
		minHeight: true,
		// Typography
		fontSize: true,
		fontWeight: true,
		lineHeight: true,
		textAlign: true,
		textColor: true,
		// Backgrounds
		backgroundColor: true,
		// Borders
		borderRadius: true,
		borderWidth: true,
		borderColor: true,
		// Effects
		boxShadow: true,
		// Transitions
		transitionProperty: true,
		transitionDuration: true,
		transitionTimingFunction: true,
		// Interactivity
		cursor: true,
		appearance: true,
		outlineStyle: true,
		ringWidth: true,
		ringColor: true,
		// SVG
		fill: true,
		stroke: true,
		strokeWidth: true
	}
};
