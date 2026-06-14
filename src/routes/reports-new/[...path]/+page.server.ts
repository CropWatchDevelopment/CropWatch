import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The template-based reports pages took over /reports; keep old bookmarks working.
export const load: PageServerLoad = ({ params }) => {
	const suffix = params.path ? `/${params.path}` : '';
	redirect(301, `/reports${suffix}`);
};
