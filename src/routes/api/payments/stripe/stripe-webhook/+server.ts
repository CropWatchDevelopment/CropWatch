// server.js
//
// Use this sample code to handle webhook events in your integration.
//
// 1) Paste this code into a new file (server.js)
//
// 2) Install dependencies
//   npm install stripe
//   npm install express
//
// 3) Run the server on http://localhost:4242
//   node server.js

import { PRIVATE_STRIPE_SECRET_KEY } from "$env/static/private";
import { json, redirect, type RequestHandler } from "@sveltejs/kit";
import Stripe from "stripe";

const stripeInstance = new Stripe(PRIVATE_STRIPE_SECRET_KEY);

export const POST: RequestHandler = async ({ request, locals: { } }) => {
    // This is your Stripe CLI webhook secret for testing your endpoint locally.
    const endpointSecret = "whsec_9e2fc492820467a91cafb446dff8b71c8b2a107643cf7b2a8daf6f12fae423ca";

    const sig = request.headers.get('stripe-signature');
    if (!sig) {
        return json({ error: 'Signature not found' }, { status: 400 });
    }

    const rawBody = await request.text();


    try {
        const event = stripeInstance.webhooks.constructEvent(rawBody, sig, endpointSecret);
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntentSucceeded = event.data.object;
                // Then define and call a function to handle the event payment_intent.succeeded
                break;
            // ... handle other event types
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err) {
        return json({ error: err.raw.message }, { status: 400 });
    }

    return json({ received: true });
};