import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Note: Install stripe package: pnpm add stripe
// Also add STRIPE_SECRET_KEY to your .env file

// Type helper for Stripe (when package is installed)
type StripeClient = {
	customers: {
		create: (params: { email?: string; metadata?: Record<string, string> }) => Promise<{ id: string }>;
	};
	checkout: {
		sessions: {
			create: (params: Record<string, unknown>) => Promise<{ url: string | null }>;
			retrieve: (id: string, params?: { expand?: string[] }) => Promise<{
				payment_status: string;
				subscription: {
					id: string;
					items: { data: Array<{ id: string; quantity?: number }> };
				} | null;
			}>;
		};
	};
	subscriptions: {
		list: (params: { customer: string; status: string; limit: number }) => Promise<{ data: StripeSubscription[] }>;
		retrieve: (id: string) => Promise<{ items: { data: Array<{ id: string; quantity?: number }> } }>;
	};
	subscriptionItems: {
		update: (id: string, params: { quantity: number }) => Promise<unknown>;
	};
	invoices: {
		list: (params: { customer: string; limit: number }) => Promise<{ data: StripeInvoice[] }>;
	};
};

interface StripeSubscription {
	id: string;
	status: string;
	current_period_start: number;
	current_period_end: number;
	items: { data: Array<{ quantity?: number }> };
}

interface StripeInvoice {
	id: string;
	number: string | null;
	amount_paid: number;
	currency: string;
	status: string | null;
	created: number;
	hosted_invoice_url: string | null;
	invoice_pdf: string | null;
}

let stripeClient: StripeClient | null = null;

async function getStripe(): Promise<StripeClient> {
	if (!stripeClient) {
		// Dynamic import of stripe module
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const StripeModule = await import('stripe') as any;
		const envModule = await import('$env/static/private');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const secretKey = (envModule as any).STRIPE_SECRET_KEY as string | undefined;
		if (!secretKey) {
			throw new Error('STRIPE_SECRET_KEY environment variable is not set');
		}
		stripeClient = new StripeModule.default(secretKey) as unknown as StripeClient;
	}
	return stripeClient;
}

// Stripe Product and Price IDs (created earlier)
const DEVICE_SEAT_PRICE_ID = 'price_1SZrUrFvjxXrUyebK37ukkxW';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	// Fetch user's devices (devices they own)
	const { data: deviceOwners, error: deviceError } = await supabase
		.from('cw_device_owners')
		.select(`
			dev_eui,
			cw_devices (
				dev_eui,
				name,
				type,
				cw_device_type (
					name,
					manufacturer,
					model
				)
			)
		`)
		.eq('user_id', session.user.id);

	if (deviceError) {
		console.error('Error fetching devices:', deviceError);
	}

	// Fetch user's device seats
	const { data: seats, error: seatsError } = await supabase
		.from('device_seats')
		.select('*')
		.eq('profile_id', session.user.id)
		.order('seat_number', { ascending: true });

	if (seatsError) {
		console.error('Error fetching seats:', seatsError);
	}

	// Fetch Stripe customer info if exists
	const { data: stripeCustomer } = await supabase
		.from('stripe_customers')
		.select('*')
		.eq('email', session.user.email)
		.single();

	// Get subscription details from Stripe if customer exists
	let subscriptions: StripeSubscription[] = [];
	let paymentHistory: StripeInvoice[] = [];

	if (stripeCustomer?.id) {
		try {
			const stripeClient = await getStripe();
			const subsResponse = await stripeClient.subscriptions.list({
				customer: stripeCustomer.id,
				status: 'all',
				limit: 10
			});
			subscriptions = subsResponse.data;

			const invoicesResponse = await stripeClient.invoices.list({
				customer: stripeCustomer.id,
				limit: 20
			});
			paymentHistory = invoicesResponse.data;
		} catch (err) {
			console.error('Error fetching Stripe data:', err);
		}
	}

	// Format devices for the dropdown
	const devices = (deviceOwners ?? []).map((owner) => {
		const device = owner.cw_devices as unknown as { name: string; cw_device_type?: { name: string } } | null;
		return {
			dev_eui: owner.dev_eui,
			name: device?.name ?? owner.dev_eui,
			type: device?.cw_device_type?.name ?? 'Unknown'
		};
	});

	return {
		devices,
		seats: seats ?? [],
		subscriptions,
		paymentHistory: paymentHistory.map((inv) => ({
			id: inv.id,
			number: inv.number,
			amount: inv.amount_paid,
			currency: inv.currency,
			status: inv.status,
			created: inv.created,
			hostedUrl: inv.hosted_invoice_url,
			pdfUrl: inv.invoice_pdf
		})),
		stripeCustomerId: stripeCustomer?.id ?? null,
		user: session.user
	};
};

export const actions: Actions = {
	/**
	 * Create a Stripe Checkout session for purchasing device seats
	 */
	createCheckout: async ({ request, locals: { supabase, safeGetSession }, url }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const quantity = parseInt(formData.get('quantity') as string, 10);

		if (!quantity || quantity < 1 || quantity > 100) {
			return fail(400, { error: 'Please select a valid number of seats (1-100)' });
		}

		try {
			const stripe = await getStripe();
			
			// Check if customer exists in Stripe
			let customerId: string | undefined;
			const { data: stripeCustomer } = await supabase
				.from('stripe_customers')
				.select('id')
				.eq('email', session.user.email)
				.single();

			if (stripeCustomer?.id) {
				customerId = stripeCustomer.id;
			} else {
				// Create a new Stripe customer
				const customer = await stripe.customers.create({
					email: session.user.email ?? undefined,
					metadata: {
						supabase_user_id: session.user.id
					}
				});
				customerId = customer.id;
			}

			// Create Checkout Session
			const checkoutSession = await stripe.checkout.sessions.create({
				customer: customerId,
				mode: 'subscription',
				line_items: [
					{
						price: DEVICE_SEAT_PRICE_ID,
						quantity: quantity
					}
				],
				success_url: `${url.origin}/account/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${url.origin}/account/payments?cancelled=true`,
				metadata: {
					supabase_user_id: session.user.id,
					seat_quantity: quantity.toString()
				},
				subscription_data: {
					metadata: {
						supabase_user_id: session.user.id
					}
				}
			});

			if (checkoutSession.url) {
				throw redirect(303, checkoutSession.url);
			}

			return fail(500, { error: 'Failed to create checkout session' });
		} catch (err) {
			if (err instanceof Response) throw err;
			console.error('Checkout error:', err);
			return fail(500, { error: 'Failed to create checkout session' });
		}
	},

	/**
	 * Process successful checkout and create device seats
	 */
	processCheckoutSuccess: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const checkoutSessionId = formData.get('session_id') as string;

		if (!checkoutSessionId) {
			return fail(400, { error: 'Missing session ID' });
		}

		try {
			const stripe = await getStripe();
			
			// Retrieve the checkout session
			const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
				expand: ['subscription', 'subscription.items']
			});

			if (checkoutSession.payment_status !== 'paid') {
				return fail(400, { error: 'Payment not completed' });
			}

			const subscription = checkoutSession.subscription;
			if (!subscription) {
				return fail(400, { error: 'No subscription found' });
			}

			const subscriptionItem = subscription.items.data[0];
			const quantity = subscriptionItem.quantity ?? 1;

			// Check how many seats already exist for this subscription
			const { data: existingSeats } = await supabase
				.from('device_seats')
				.select('seat_number')
				.eq('stripe_subscription_id', subscription.id);

			const existingSeatNumbers = new Set((existingSeats ?? []).map((s) => s.seat_number));
			const seatsToCreate = [];

			// Create seats for each new quantity
			for (let i = 1; i <= quantity; i++) {
				if (!existingSeatNumbers.has(i)) {
					seatsToCreate.push({
						profile_id: session.user.id,
						stripe_subscription_id: subscription.id,
						stripe_subscription_item_id: subscriptionItem.id,
						seat_number: i,
						dev_eui: null,
						status: 'active'
					});
				}
			}

			if (seatsToCreate.length > 0) {
				const { error: insertError } = await supabase
					.from('device_seats')
					.insert(seatsToCreate);

				if (insertError) {
					console.error('Error creating seats:', insertError);
					return fail(500, { error: 'Failed to create device seats' });
				}
			}

			return { success: true, message: `Successfully created ${seatsToCreate.length} device seat(s)` };
		} catch (err) {
			console.error('Process checkout error:', err);
			return fail(500, { error: 'Failed to process checkout' });
		}
	},

	/**
	 * Assign a device to a seat
	 */
	assignDevice: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const seatId = formData.get('seat_id') as string;
		const devEui = formData.get('dev_eui') as string;

		if (!seatId) {
			return fail(400, { error: 'Missing seat ID' });
		}

		try {
			// Verify the seat belongs to the user
			const { data: seat, error: seatError } = await supabase
				.from('device_seats')
				.select('*')
				.eq('id', seatId)
				.eq('profile_id', session.user.id)
				.single();

			if (seatError || !seat) {
				return fail(404, { error: 'Seat not found' });
			}

			// If assigning a device, verify the user owns it
			if (devEui && devEui !== '') {
				const { data: deviceOwner, error: ownerError } = await supabase
					.from('cw_device_owners')
					.select('dev_eui')
					.eq('dev_eui', devEui)
					.eq('user_id', session.user.id)
					.single();

				if (ownerError || !deviceOwner) {
					return fail(403, { error: 'You do not own this device' });
				}

				// Check if device is already assigned to another seat
				const { data: existingAssignment } = await supabase
					.from('device_seats')
					.select('id')
					.eq('dev_eui', devEui)
					.neq('id', seatId)
					.single();

				if (existingAssignment) {
					return fail(400, { error: 'This device is already assigned to another seat' });
				}
			}

			// Update the seat
			const { error: updateError } = await supabase
				.from('device_seats')
				.update({
					dev_eui: devEui === '' ? null : devEui,
					updated_at: new Date().toISOString()
				})
				.eq('id', seatId);

			if (updateError) {
				console.error('Error updating seat:', updateError);
				return fail(500, { error: 'Failed to update seat assignment' });
			}

			return { success: true, message: devEui ? 'Device assigned to seat' : 'Device removed from seat' };
		} catch (err) {
			console.error('Assign device error:', err);
			return fail(500, { error: 'Failed to assign device' });
		}
	},

	/**
	 * Add more seats to an existing subscription
	 */
	addSeats: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const additionalSeats = parseInt(formData.get('additional_seats') as string, 10);
		const subscriptionId = formData.get('subscription_id') as string;

		if (!additionalSeats || additionalSeats < 1) {
			return fail(400, { error: 'Please enter a valid number of additional seats' });
		}

		if (!subscriptionId) {
			return fail(400, { error: 'Missing subscription ID' });
		}

		try {
			const stripe = await getStripe();
			
			// Verify the subscription belongs to the user
			const { data: existingSeat, error: seatError } = await supabase
				.from('device_seats')
				.select('stripe_subscription_item_id')
				.eq('stripe_subscription_id', subscriptionId)
				.eq('profile_id', session.user.id)
				.limit(1)
				.single();

			if (seatError || !existingSeat) {
				return fail(404, { error: 'Subscription not found' });
			}

			// Get current quantity
			const subscription = await stripe.subscriptions.retrieve(subscriptionId);
			const subscriptionItem = subscription.items.data[0];
			const currentQuantity = subscriptionItem.quantity ?? 0;
			const newQuantity = currentQuantity + additionalSeats;

			// Update subscription quantity in Stripe
			await stripe.subscriptionItems.update(subscriptionItem.id, {
				quantity: newQuantity
			});

			// Create new seat records
			const seatsToCreate = [];
			for (let i = currentQuantity + 1; i <= newQuantity; i++) {
				seatsToCreate.push({
					profile_id: session.user.id,
					stripe_subscription_id: subscriptionId,
					stripe_subscription_item_id: subscriptionItem.id,
					seat_number: i,
					dev_eui: null,
					status: 'active'
				});
			}

			const { error: insertError } = await supabase
				.from('device_seats')
				.insert(seatsToCreate);

			if (insertError) {
				console.error('Error creating additional seats:', insertError);
				return fail(500, { error: 'Failed to create additional seats' });
			}

			return { success: true, message: `Successfully added ${additionalSeats} seat(s)` };
		} catch (err) {
			console.error('Add seats error:', err);
			return fail(500, { error: 'Failed to add seats' });
		}
	}
};
