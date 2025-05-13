import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IAuthService } from '$lib/interfaces/IAuthService';

export const GET: RequestHandler = async () => {
  try {
    // Get services from IoC container
    const supabase = container.get<SupabaseClient>(TYPES.SupabaseClient);
    const authService = container.get<IAuthService>(TYPES.AuthService);

    // Check if the user is authenticated
    const sessionData = await authService.getSession();
    if (!sessionData) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch permission levels from the database
    const { data, error } = await supabase
      .from('cw_permission_level_types')
      .select('*')
      .order('permission_level_id', { ascending: true });

    if (error) {
      console.error('Error fetching permission levels:', error);
      return json({ error: 'Failed to fetch permission levels' }, { status: 500 });
    }

    return json(data);
  } catch (error) {
    console.error('Error fetching permission levels:', error);
    return json({ error: 'Failed to fetch permission levels' }, { status: 500 });
  }
};