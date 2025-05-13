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

    // Fetch user profiles from the database
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, username')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({ error: 'Failed to fetch users' }, { status: 500 });
  }
};