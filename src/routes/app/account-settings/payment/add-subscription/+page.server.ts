import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_DOMAIN } from '$env/static/public';

// This is your test secret API key.
const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
	apiVersion: '2025-06-30.basil', // Use the latest API version or a specific one
	typescript: true
});

const YOUR_DOMAIN = PUBLIC_DOMAIN;

export const load: PageServerLoad = async () => {
	try {
		// Fetch all active subscription products with their prices
		const products = await stripe.products.list({
			active: true,
			expand: ['data.default_price']
		});

		// Fetch all prices for subscription products
		const prices = await stripe.prices.list({
			active: true,
			type: 'recurring',
			expand: ['data.product']
		});

		// Group prices by product
		const subscriptionProducts = products.data
			.filter((product) => product.type === 'service' || product.type === 'good')
			.map((product) => {
				const productPrices = prices.data.filter(
					(price) => typeof price.product === 'object' && price.product.id === product.id
				);

				return {
					id: product.id,
					name: product.name,
					description: product.description,
					images: product.images,
					metadata: product.metadata,
					prices: productPrices.map((price) => ({
						id: price.id,
						unit_amount: price.unit_amount,
						currency: price.currency,
						recurring: price.recurring,
						lookup_key: price.lookup_key,
						nickname: price.nickname
					}))
				};
			})
			.filter((product) => product.prices.length > 0); // Only include products with prices

		return {
			subscriptionProducts
		};
	} catch (error) {
		console.error('Error loading subscription products:', error);
		return {
			subscriptionProducts: [],
			error: 'Failed to load subscription products'
		};
	}
};

export const actions: Actions = {
	'create-checkout-session': async ({ request, url, locals }) => {
		const formData = await request.formData();
		const price_id = formData.get('price_id') as string;

		try {
			// Get the current user
			const { session: userSession, user } = await locals.safeGetSession();

			if (!userSession || !user) {
				return {
					error: 'You must be logged in to create a subscription'
				};
			}

			// Create or retrieve customer
			let customerId;
			try {
				const customers = await stripe.customers.list({
					email: user.email,
					limit: 1
				});

				if (customers.data.length > 0) {
					customerId = customers.data[0].id;
				} else {
					const customer = await stripe.customers.create({
						email: user.email,
						name:
							user.user_metadata?.full_name ||
							`${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
						metadata: {
							user_id: user.id
						}
					});
					customerId = customer.id;
				}
			} catch (customerError) {
				console.error('Error handling customer:', customerError);
				return {
					error: 'Failed to create or retrieve customer'
				};
			}

			const session = await stripe.checkout.sessions.create({
				customer: customerId,
				billing_address_collection: 'auto',
				line_items: [
					{
						price: price_id,
						quantity: 1
					}
				],
				mode: 'subscription',
				success_url: `${YOUR_DOMAIN}/app/account-settings/payment/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${YOUR_DOMAIN}/app/account-settings/payment/cancel`,
				metadata: {
					user_id: user.id
				}
			});

			if (session.url) {
				return {
					success: true,
					redirectUrl: session.url
				};
			} else {
				return {
					error: 'No session URL returned from Stripe'
				};
			}
		} catch (error) {
			console.error('Error creating checkout session:', error);
			return {
				error: 'Failed to create checkout session'
			};
		}
	},

	'create-portal-session': async ({ request }) => {
		const formData = await request.formData();
		const session_id = formData.get('session_id') as string;

		try {
			// For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
			// Typically this is stored alongside the authenticated user in your database.
			const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

			if (!checkoutSession.customer) {
				return {
					error: 'No customer found in checkout session'
				};
			}

			// This is the url to which the customer will be redirected when they're done
			// managing their billing with the portal.
			const returnUrl = `${YOUR_DOMAIN}/app/account-settings/payment`;

			const portalSession = await stripe.billingPortal.sessions.create({
				customer: checkoutSession.customer as string,
				return_url: returnUrl
			});

			return {
				success: true,
				redirectUrl: portalSession.url
			};
		} catch (error) {
			console.error('Error creating portal session:', error);
			return {
				error: 'Failed to create portal session'
			};
		}
	}
};

// Note: Webhook handling should be moved to a separate API route
// Create /src/routes/api/webhook/+server.ts for webhook handling
// This is because webhooks need raw body access and special headers handling
