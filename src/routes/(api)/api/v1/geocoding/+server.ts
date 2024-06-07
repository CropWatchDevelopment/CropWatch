import { PRIVATE_GEOCODING_API_KEY } from "$env/static/private";
import { redirect, type RequestHandler } from "@sveltejs/kit";



export const GET: RequestHandler = async ({ url, fetch, locals: { safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) {
      throw redirect(303, '/auth/unauthorized');
    }

    const lat = url.searchParams.get('lat');
    const long = url.searchParams.get('long');
  
    const response = await fetch(`https://geocode.maps.co/reverse?lat=${lat}&lon=${long}&api_key=${PRIVATE_GEOCODING_API_KEY}`);
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  }