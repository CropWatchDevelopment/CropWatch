// src/routes/user_profile/+page.server.js
import { redirect } from "@sveltejs/kit"

export async function load({locals: { getSession } }) {
    const session = await getSession();
    // if the user is not logged in redirect back to the home page
    if (!session) {
        redirect(303, '/');
    }
  }