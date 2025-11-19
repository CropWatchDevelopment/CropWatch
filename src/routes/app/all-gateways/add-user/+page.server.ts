import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { GatewayRepository } from '$lib/repositories/GatewayRepository';
import { GatewayService } from '$lib/services/GatewayService';
import { GatewayOwnersRepository } from '$lib/repositories/GatewayOwnersRepository';
import { GatewayOwnersService } from '$lib/services/GatewayOwnersService';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const sessionService = new SessionService(supabase);
	const { session, user } = await sessionService.getSafeSession();

	if (!session || !user) {
		throw redirect(302, '/auth/login');
	}

	const errorHandler = new ErrorHandlingService();
	const gatewayRepository = new GatewayRepository(supabase, errorHandler);
	const gatewayService = new GatewayService(gatewayRepository);
	const gateways = await gatewayService.getGatewaysByUser(user.id);

	return {
		gateways
	};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const gatewayIdentifier = (formData.get('gatewayId') as string)?.trim();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const values = {
			gatewayId: gatewayIdentifier,
			email
		};

		const sessionService = new SessionService(supabase);
		const { session, user } = await sessionService.getSafeSession();

		if (!session || !user) {
			return fail(401, { error: 'Authentication required', values });
		}

		if (!gatewayIdentifier || !email) {
			return fail(400, { error: 'Gateway ID and email are required', values });
		}

		const errorHandler = new ErrorHandlingService();
		const gatewayRepository = new GatewayRepository(supabase, errorHandler);
		const gatewayOwnersRepository = new GatewayOwnersRepository(supabase, errorHandler);
		const gatewayService = new GatewayService(gatewayRepository);
		const gatewayOwnersService = new GatewayOwnersService(gatewayOwnersRepository);

		try {
			const gateway = await gatewayService.getGatewayByGatewayId(gatewayIdentifier);
			if (!gateway?.id) {
				return fail(404, { error: 'Gateway not found', values });
			}

			const currentPermission = await gatewayOwnersRepository.findByGatewayAndUser(
				gateway.id,
				user.id
			);

			if (!currentPermission) {
				return fail(403, {
					error: 'You do not have permission to manage this gateway',
					values
				});
			}

			const { data: targetUser, error: userLookupError } = await supabase
				.from('profiles')
				.select('id, email')
				.eq('email', email)
				.maybeSingle();

			if (userLookupError) {
				console.error('Failed to look up user by email', userLookupError);
				return fail(500, { error: 'Unable to search for user', values });
			}

			if (!targetUser?.id) {
				return fail(404, { error: 'User not found', values });
			}

			const existingOwner = await gatewayOwnersRepository.findByGatewayAndUser(
				gateway.id,
				targetUser.id
			);

			if (existingOwner) {
				return fail(400, { error: 'User already has access to this gateway', values });
			}

			await gatewayOwnersService.addOwner(gateway.id, targetUser.id);

			return {
				success: true,
				message: `${email} now has access to ${gateway.gateway_name || gateway.gateway_id}`
			};
		} catch (err) {
			console.error('Failed to add gateway user', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to add user to gateway',
				values
			});
		}
	}
};
