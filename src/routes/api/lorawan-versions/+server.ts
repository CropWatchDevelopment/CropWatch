import { json } from '@sveltejs/kit';
import { PRIVATE_TTI_API_KEY, PRIVATE_TTI_API_URL } from '$env/static/private';

export async function GET({ url }) {
    const frequencyPlan = url.searchParams.get('frequency_plan');

    if (!frequencyPlan) {
        return json({ error: 'Frequency plan is required' }, { status: 400 });
    }

    try {
        const response = await fetch(
            `${PRIVATE_TTI_API_URL}/api/v3/configuration/lorawan-versions?frequency_plan=${frequencyPlan}`,
            {
                headers: {
                    'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`,
                    'Accept': 'application/json',
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch LoRaWAN versions');
        }

        const data = await response.json();
        return json(data.versions);
    } catch (error) {
        console.error('Error fetching LoRaWAN versions:', error);
        return json({ error: 'Failed to fetch LoRaWAN versions' }, { status: 500 });
    }
}