import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { fail, setError } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';

// Create a schema for profile settings
const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  full_name: z.string().min(2, 'Full name is required'),
  employer: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  avatar_url: z.string().optional(),
  discord_username: z.string().optional(),
  measurement_system: z.enum(['metric', 'imperial']).default('metric'),
  color_theme: z.enum(['light', 'dark', 'system']).default('system'),
  notification_preferences: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    discord: z.boolean().default(false)
  }).default({
    email: true,
    push: true,
    discord: false
  })
});

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  
  if (!session || !session.user) {
    return {
      form: await superValidate(zod(profileSchema))
    };
  }

  // Fetch the user profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return {
      form: await superValidate(zod(profileSchema))
    };
  }

  // If the profile doesn't have notification_preferences, add defaults
  if (!profile.notification_preferences) {
    profile.notification_preferences = {
      email: true,
      push: true,
      discord: false
    };
  }

  // If the profile doesn't have a color_theme, set default
  if (!profile.color_theme) {
    profile.color_theme = 'system';
  }

  // If the profile doesn't have a measurement_system, set default
  if (!profile.measurement_system) {
    profile.measurement_system = 'metric';
  }

  // Create and return the form with the user's data
  const form = await superValidate(profile, zod(profileSchema));
  
  return {
    form,
    profile
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session || !session.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const form = await superValidate(request, zod(profileSchema));
    
    if (!form.valid) {
      return fail(400, { form });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: form.data.username,
        full_name: form.data.full_name,
        employer: form.data.employer,
        website: form.data.website,
        avatar_url: form.data.avatar_url,
        measurement_system: form.data.measurement_system,
        color_theme: form.data.color_theme,
        notification_preferences: form.data.notification_preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      return setError(form, '', error.message);
    }

    return {
      form: message(form, {
        type: 'success',
        text: 'Profile updated successfully'
      })
    };
  }
};
