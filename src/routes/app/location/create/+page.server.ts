import { AddLocationForm } from '$lib/form-schemas/AddLocation.schema';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load = async () => {
  // Server-side initial form setup
  return {
    form: await superValidate(zod(AddLocationForm))
  };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    const form = await superValidate(request, zod(AddLocationForm));

    // Check form validation
    if (!form.valid) {
      // Return failure with validation errors
      return fail(400, { form });
    }

    try {
      // Perform your server-side logic (e.g., send email, save to database)
      const { name, lat, long, description } = form.data;

      // Simulated processing
      console.log('Processing form:', { name, lat, long, description });

      if (!name) {
        // Return failure with a message
        return setError(form, 'Name is required.');
      }

      const { data: locationData, error: locationError } = await supabase.from('cw_locations').insert(
        { name, lat, long, description, owner_id: session.user.id }
      ).select('*')
        .single();
      if (locationError) {
        // Return failure with a message
        return setError(form, locationError.message);
      }

      const { data: locationPermission, error: locationPermissionError } = await supabase.from('cw_location_owners').insert({
        user_id: session.user.id,
        location_id: locationData.location_id
      }).select('*');

      if (locationPermissionError) {
        //remove location as permission was not set
        await supabase.from('cw_locations').delete().eq('location_id', locationData.location_id).match({
          location_id: locationData.location_id
        }).select('*');
        // Return failure with a message
        return setError(form, locationPermissionError.message
        );
      }

      // Return success with a message
      return {
        form,
        status: 'success',
        message: 'Message sent successfully!',
        redirect: `/app/location/${locationData.location_id}`,
      };
    } catch (error) {
      // Handle any server-side errors
      console.error('Form submission error:', error);
      return setError(form, 'Something went wrong. Please try again.');
    }
  }
};