type ManifestIcon = {
	src: string;
	sizes: string;
	type: string;
	purpose?: string;
};

type ManifestShortcut = {
	name: string;
	short_name?: string;
	description?: string;
	url: string;
	icons?: ManifestIcon[];
};

type WebAppManifest = {
	id: string;
	name: string;
	short_name: string;
	description: string;
	lang: string;
	dir: 'ltr' | 'rtl' | 'auto';
	display: 'standalone';
	display_override: Array<'window-controls-overlay' | 'standalone' | 'minimal-ui' | 'browser'>;
	scope: string;
	start_url: string;
	background_color: string;
	theme_color: string;
	categories: string[];
	prefer_related_applications: boolean;
	icons: ManifestIcon[];
	shortcuts: ManifestShortcut[];
};

function normalizeBasePath(basePath: string): string {
	if (!basePath || basePath === '/') {
		return '';
	}

	return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
}

function rootPath(basePath: string): string {
	const normalizedBasePath = normalizeBasePath(basePath);
	return normalizedBasePath ? `${normalizedBasePath}/` : '/';
}

function withBase(basePath: string, path: string): string {
	if (path === '/') {
		return rootPath(basePath);
	}

	return `${normalizeBasePath(basePath)}${path}`;
}

export function buildManifest(basePath = ''): WebAppManifest {
	const appRoot = rootPath(basePath);
	const shortcutIcon: ManifestIcon = {
		src: withBase(basePath, '/icons/maskable-icon-192x192.png'),
		sizes: '192x192',
		type: 'image/png'
	};

	return {
		id: appRoot,
		name: 'CropWatch',
		short_name: 'CropWatch',
		description:
			'Monitor locations, devices, rules, and reports with an installable CropWatch app experience.',
		lang: 'en-US',
		dir: 'ltr',
		display: 'standalone',
		display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
		scope: appRoot,
		start_url: appRoot,
		background_color: '#1f283b',
		theme_color: '#1f283b',
		categories: ['business', 'productivity', 'utilities'],
		prefer_related_applications: false,
		icons: [
			{
				src: withBase(basePath, '/icons/maskable-icon-192x192.png'),
				sizes: '192x192',
				type: 'image/png'
			},
			{
				src: withBase(basePath, '/icons/maskable-icon-512x512.png'),
				sizes: '512x512',
				type: 'image/png'
			},
			{
				src: withBase(basePath, '/icons/maskable-icon-192x192.png'),
				sizes: '192x192',
				type: 'image/png',
				purpose: 'maskable'
			},
			{
				src: withBase(basePath, '/icons/maskable-icon-512x512.png'),
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable'
			}
		],
		shortcuts: [
			{
				name: 'Dashboard',
				description: 'Open the device dashboard.',
				url: appRoot,
				icons: [shortcutIcon]
			},
			{
				name: 'Locations',
				description: 'Jump straight to all locations.',
				url: withBase(basePath, '/locations'),
				icons: [shortcutIcon]
			},
			{
				name: 'Rules',
				description: 'Review and manage rules.',
				url: withBase(basePath, '/rules'),
				icons: [shortcutIcon]
			},
			{
				name: 'Reports',
				description: 'Open reporting history and schedules.',
				url: withBase(basePath, '/reports'),
				icons: [shortcutIcon]
			}
		]
	};
}
