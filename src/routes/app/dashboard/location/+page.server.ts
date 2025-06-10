import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export interface LocationWithDevices {
  location_id: number;
  name: string;
  description?: string | null;
  lat?: number | null;
  long?: number | null;
  owner_id?: string | null;
  created_at: string;
  map_zoom?: number | null;
  cw_devices?: DeviceBasic[];
}

export interface DeviceBasic {
  dev_eui: string;
  name: string;
  device_type?: string | null;
  lat?: number | null;
  long?: number | null;
  created_at: string;
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  
  if (!session || !session.user) {
    throw redirect(303, '/auth/signin');
  }

  try {
    // Fetch all locations for the user
    const { data: locations, error } = await supabase
      .from('cw_locations')
      .select(`
        *,
        cw_devices(*)
        )
      `)
      .eq('owner_id', session.user.id)
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      return {
        locations: []
      };
    }

    return {
      locations: (locations || []) as LocationWithDevices[]
    };
  } catch (err) {
    console.error('Error in load function:', err);
    return {
      locations: [] as LocationWithDevices[]
    };
  }
};
