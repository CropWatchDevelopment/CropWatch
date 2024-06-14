import { redirect, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ url, params, request, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }
    const formObject = await request.json();  // Expect JSON

    const { data, error } = await supabase
        .from('cw_rule_criteria')
        .insert(formObject)
        .select()

    return new Response(
        data ?? error,
        {
            status: 200,
        });
}

export const PUT: RequestHandler = async ({ request, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        throw redirect(303, '/auth/unauthorized');
    }

    const formObject = await request.json();  // Expect JSON

    const { data, error } = await supabase
        .from('cw_rule_criteria')
        .update(formObject)
        .eq('id', formObject.id)
        .select();

    return new Response(
        JSON.stringify(data ?? { error: error.message }),
        {
            status: JSON.stringify(data) ? 200 : 500,
            statusText: 'success',
            headers: {
                'Content-Type': 'application/json'
            }
        });
}
