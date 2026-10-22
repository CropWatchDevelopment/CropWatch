import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The template-based rules pages took over /rules; keep old bookmarks working,
// query string included (e.g. the `?dev_eui=` preselection).
export const load: PageServerLoad = ({ params, url }) => {
	const suffix = params.path ? `/${params.path}` : '';
	redirect(301, `/rules${suffix}${url.search}`);
};
