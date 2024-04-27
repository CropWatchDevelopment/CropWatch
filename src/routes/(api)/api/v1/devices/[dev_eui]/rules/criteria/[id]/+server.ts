import { redirect, type RequestHandler } from "@sveltejs/kit";

// export const POST: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
//     const { session } = await safeGetSession();
//     if (!session) {
//         throw redirect(303, '/auth/unauthorized');
//     }
//     const formData = await request.formData();
//     const formObject = JSON.parse(JSON.stringify(Object.fromEntries(formData)));

//     console.log(formObject)
//     const { data, error } = await supabase
//         .from('cw_rules')
//         .update(formObject)
//         .eq('ruleGroupId', formObject.ruleGroupId)
//         .select()

//     return new Response(
//         data ?? error,
//         {
//             status: 200,
//         });
// }

// export const PUT: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
//     const { session } = await safeGetSession();
//     if (!session) {
//         throw redirect(303, '/auth/unauthorized');
//     }
//     const formData = await request.formData();
//     const formObject = JSON.parse(JSON.stringify(Object.fromEntries(formData)));

//     console.log(formObject)
//     const { data, error } = await supabase
//         .from('cw_rule_criteria')
//         .update(formObject)
//         .eq('id', formObject.id)
//         .select()

//     return new Response(
//         data ?? error,
//         {
//             status: data ? 200 : 500,
//             statusText: data ? 'OK' : error.message,
//         });
// }




export const PUT: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
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
