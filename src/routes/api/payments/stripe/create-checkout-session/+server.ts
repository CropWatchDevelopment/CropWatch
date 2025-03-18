// src/routes/create-checkout-session/+server.ts
import { DOMAIN, PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import type { DeviceRegistrationData } from '$lib/interfaces/TTI-Device-Registration.interface';
import type { RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';


export const POST: RequestHandler = async ({ request }) => {
    const stripeInstance = new Stripe(PRIVATE_STRIPE_SECRET_KEY);
    // Read the incoming JSON payload (make sure your client sends the correct Content-Type)
    const lookup_key = (await request.text()).replace('lookup_key=', '');

    // List prices for the lookup key
    const prices = await stripeInstance.prices.list();
    const priceObject = prices.data.find(price => price.lookup_key === lookup_key);

    if (!priceObject) {
        return new Response(JSON.stringify({ error: 'No price found' }), { status: 400 });
    }

    if (!prices.data.length) {
        return new Response(JSON.stringify({ error: 'No price found' }), { status: 400 });
    }

    const customer = await stripeInstance.customers.list({
        email: 'kevin@cropwatch.io',
        limit: 1,
    });

    if (!customer.data.length) {
        return new Response(JSON.stringify({ error: 'No customer found' }), { status: 400 });
    }

    try {
        const subscription = await stripeInstance.subscriptions.create({
            customer: customer.data[0].id,
            items: [
                {
                    price: priceObject.id,
                },
            ],
        });
        if (subscription.status !== 'active') {
            return new Response(JSON.stringify({ error: 'Subscription not active' }), { status: 400 });
        }
        if (subscription.status === 'active') {
            // Create TTI device

        }
    } catch (error) {
        console.log('Error creating checkout session:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    // Redirect with a 303 (See Other) status code
    return new Response(null, {
        status: 303,
        headers: { Location: session.url }
    });
};







async function addDeviceToTTI(device) {

    async function registerTTIDevice(data: DeviceRegistrationData) {
        const apiEndpoint = 'https://cropwatch.au1.cloud.thethings.industries/api/v3';

        const deviceData = {
            end_device: {
                ids: {
                    device_id: data.deviceId,
                    dev_eui: data.devEui,
                    join_eui: data.joinEui,
                    application_ids: {
                        application_id: data.applicationId
                    }
                },
                name: data.name,
                description: data.description,
                attributes: {
                    organization_id: "cropwatch",
                },
                lorawan: {
                    frequency_plan_id: data.frequencyPlanId,
                    lorawan_version: data.lorawanVersion,
                    lorawan_phy_version: data.lorawanPhyVersion,
                    network_key: {
                        key: data.networkKey
                    },
                    application_key: {
                        key: data.applicationKey
                    }
                }
            }
        };

        try {
            const response = await fetch(
                `${apiEndpoint}/applications/${data.applicationId}/devices`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(deviceData)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`TTI API Error: ${errorData.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error registering TTI device:', error);
            throw error;
        }
    }


    const stripeInstance = new Stripe(PRIVATE_STRIPE_SECRET_KEY);

    try {
        const requestData = await request.json();
        const { lookup_key, deviceRegistrationData } = requestData;

        // Handle Stripe subscription creation
        const prices = await stripeInstance.prices.list();
        const priceObject = prices.data.find(price => price.lookup_key === lookup_key);

        if (!priceObject) {
            return new Response(JSON.stringify({ error: 'No price found' }), { status: 400 });
        }

        const customer = await stripeInstance.customers.list({
            email: 'kevin@cropwatch.io',
            limit: 1,
        });

        if (!customer.data.length) {
            return new Response(JSON.stringify({ error: 'No customer found' }), { status: 400 });
        }

        // Create Stripe subscription
        const subscription = await stripeInstance.subscriptions.create({
            customer: customer.data[0].id,
            items: [{ price: priceObject.id }],
        });

        // Register device with TTI
        const ttiDevice = await registerTTIDevice(deviceRegistrationData);

        // Return combined response
        return new Response(JSON.stringify({
            status: 'success',
            subscription: subscription,
            device: ttiDevice
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({
            error: error.message || 'An error occurred'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

}