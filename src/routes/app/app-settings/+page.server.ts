import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';


export const load: PageServerLoad = async (event) => {
};

export const actions: Actions = {
  default: async (event) => {
    return fail("Invalid action.");
  }
};
