import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const locationId = parseInt(params.locationId);

    if (isNaN(locationId)) {
      return json({ error: 'Invalid location ID' }, { status: 400 });
    }

    return json({}, { status: 200 });
  } catch (error) {
    console.error(`Error fetching devices for location ${params.locationId}:`, error);
    return json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
};