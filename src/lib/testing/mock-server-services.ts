import { vi, type Mocked } from 'vitest';
import type { LibellusConfigurationProblem } from '$lib/server/libellus';
import type { RecaptchaVerifier } from '$lib/server/recaptcha';
import type { ServerServices } from '$lib/server/services';
import type { SupabaseAuthGateway } from '$lib/server/supabase';
import { createMockServices, type MockServices } from './mock-services';

export type MockServerServices = MockServices & {
	recaptcha: Mocked<RecaptchaVerifier>;
	supabaseAuth: Mocked<SupabaseAuthGateway>;
	libellus: {
		configurationProblem: LibellusConfigurationProblem | null;
		fetchSensorCertificate: Mocked<ServerServices['libellus']>['fetchSensorCertificate'];
	};
};

const unstubbed = (name: string) =>
	vi.fn(() => Promise.reject(new Error(`services.${name}() was called but not stubbed`)));

/**
 * {@link createMockServices} plus mocks of the server-only gateways, for
 * `locals.services` in load, action and endpoint tests. Libellus starts
 * configured; reCAPTCHA and Supabase calls reject until stubbed.
 */
export function createMockServerServices(): MockServerServices {
	return {
		...createMockServices(),
		recaptcha: { verify: unstubbed('recaptcha.verify') },
		supabaseAuth: {
			verifyOtp: unstubbed('supabaseAuth.verifyOtp'),
			resetPasswordForEmail: unstubbed('supabaseAuth.resetPasswordForEmail'),
			signUp: unstubbed('supabaseAuth.signUp'),
			updatePasswordWithRecoveryToken: unstubbed('supabaseAuth.updatePasswordWithRecoveryToken'),
			verifyAccessToken: unstubbed('supabaseAuth.verifyAccessToken'),
			refreshSession: unstubbed('supabaseAuth.refreshSession'),
			signOut: unstubbed('supabaseAuth.signOut')
		},
		libellus: {
			configurationProblem: null,
			fetchSensorCertificate: unstubbed('libellus.fetchSensorCertificate')
		}
	} as MockServerServices;
}
