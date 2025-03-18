import { PRIVATE_STRIPE_SECRET_KEY } from "$env/static/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import Stripe from 'stripe';

export const GET: RequestHandler = async () => {
    try {
        const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
            apiVersion: '2025-01-27.acacia' // Use latest API version
        });

        // Get all products with prices in a single call
        const products = await stripe.products.list({
            expand: ['data.default_price'],
            active: true
        });

        // Get all prices for each product
        const prices = await stripe.prices.list({
            active: true
        });

        // Combine products with their prices
        const productsWithPrices = products.data.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            image: product.images?.[0] || null,
            active: product.active,
            default_price: product.default_price,
            metadata: product.metadata,
            prices: prices.data.filter(price => price.product === product.id)
        }));

        return json({
            products: productsWithPrices
        });
    } catch (error) {
        console.error('Error fetching Stripe products:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};