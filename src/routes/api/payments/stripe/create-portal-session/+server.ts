// src/routes/create-portal-session/+server.ts
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_DOMAIN } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';


const stripeInstance = new Stripe(PRIVATE_STRIPE_SECRET_KEY);

export const POST: RequestHandler = async ({ request }) => {
  // Parse the incoming JSON payload to retrieve the session_id
  const { session_id } = await request.json();

  // Retrieve the Checkout Session to get the customer ID
  const checkoutSession = await stripeInstance.checkout.sessions.retrieve(session_id);

  // Define a return URL for the billing portal
  const returnUrl = PUBLIC_DOMAIN;

  // Create a billing portal session for the customer
  const portalSession = await stripeInstance.billingPortal.sessions.create({
    customer: checkoutSession.customer as string,
    return_url: returnUrl
  });

  // Redirect the client to the portal session URL
  return new Response(null, {
    status: 303,
    headers: { Location: portalSession.url }
  });
};
