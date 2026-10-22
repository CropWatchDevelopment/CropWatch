import { flushSync, mount, unmount, type Component, type ComponentProps } from 'svelte';
import type { AppContext } from '$lib/appContext.svelte';
import type { AppServices } from '$lib/services/app-services';
import { createMockServices, type MockServices } from './mock-services';
import TestHarness, { type HarnessHandles } from './TestHarness.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any component under test
export interface RenderOptions<C extends Component<any>> {
	props?: ComponentProps<C>;
	/** Defaults to a fresh {@link createMockServices}. */
	services?: AppServices;
	/** Initial app context (session, accessToken, devices…). */
	app?: Partial<AppContext>;
}

/**
 * Mounts `component` the way the app does — inside the services, app and
 * toast contexts — and returns handles for assertions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any component under test
export function renderWithServices<C extends Component<any>, S extends AppServices = MockServices>(
	component: C,
	options: RenderOptions<C> & { services?: S } = {}
) {
	const services = (options.services ?? createMockServices()) as S;
	const target = document.body.appendChild(document.createElement('div'));
	let handles: HarnessHandles | undefined;

	const instance = mount(TestHarness, {
		target,
		props: {
			component,
			componentProps: (options.props ?? {}) as Record<string, unknown>,
			services,
			app: options.app,
			onReady: (ready: HarnessHandles) => (handles = ready)
		}
	});
	flushSync();

	if (!handles) throw new Error('TestHarness did not initialise');
	const { app, toast } = handles;

	return {
		target,
		services,
		app,
		/** The toasts added so far, oldest first. */
		toasts: () => toast.items,
		unmount: () => {
			unmount(instance);
			target.remove();
		}
	};
}
