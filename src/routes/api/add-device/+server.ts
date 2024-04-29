

// src/routes/api/protected-route/+server.ts
import { json, error } from '@sveltejs/kit'

export const POST = async ({request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  const formData = await request.formData();
  console.log(session, formData);
  if (!session) {
    // the user is not signed in
    throw error(401, { message: 'Unauthorized' })
  }
  
  //Validate Dev_eui
  const cw_devices_response = await supabase.from('cw_devices').insert({
    dev_eui: formData.get('dev_eui'),
    name: formData.get('name'),
    type: 3,// formData.type,
    upload_interval: formData.get('interval'),
    lat: formData.get('lat'),
    long: formData.get('long'),
  });

  let cw_device_locations_response;
  if (!cw_devices_response.error) {
    cw_device_locations_response = await supabase.from('cw_device_locations')
    .insert({
      dev_eui: formData.get('dev_eui'),
      location_id: formData.get('location_id'),
    });
  }

  let cw_device_owners_resposne;
  if (!cw_device_locations_response?.error) {
    cw_device_owners_resposne = await supabase.from('cw_device_owners').insert({
      user_id: session.user.id,
      dev_eui: formData.get('dev_eui'),
      permission_level: 3,
    })
  }


  return json({
    cw_device_locations_response,
    cw_device_owners_resposne,
    cw_devices_response,
  })
}



// import { json, type RequestEvent } from '@sveltejs/kit'

// export async function POST(event: RequestEvent, { locals: { supabase, getSession }}) {
//     const session = await getSession();
//     const form = await event.request.formData();

//     console.log(form, session);
  
//     return json({a:1})
//   }