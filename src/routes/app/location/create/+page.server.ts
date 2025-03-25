import { AddLocationForm } from '$lib/form-schemas/AddLocation.schema';
import { fail, type Actions } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load = async () => {
  // Server-side initial form setup
  return {
    form: await superValidate(zod(AddLocationForm))
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod(AddLocationForm));
    
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

      // Return success with a message
      return {
        form,
        message: 'Message sent successfully!'
      };
    } catch (error) {
      // Handle any server-side errors
      console.error('Form submission error:', error);
      return setError(form, 'Something went wrong. Please try again.');
    }
  }
};