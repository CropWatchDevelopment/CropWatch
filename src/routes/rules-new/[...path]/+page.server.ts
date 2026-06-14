import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The template-based rules pages took over /rules; keep old bookmarks working.
export const load: PageServerLoad = ({ params }) => {
	const suffix = params.path ? `/${params.path}` : '';
	redirect(301, `/rules${suffix}`);
};
