



import type { Tables } from '$lib/types/supabaseSchema';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

// Define outside the load function so the adapter can be cached
const schema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long').default(''),
    deveui: z.string(),
    joinEui: z.string().default('').optional(),
    secretKey: z.string().optional(),
    type: z.number().min(1, 'Device type must be selected').default(0),
    lat: z.number().min(-90, 'Latitude must be at least -90').max(90, 'Latitude must be at most 90'),
    long: z.number().min(-180, 'Longitude must be at least -180').max(180, 'Longitude must be at most 180'),
    serialNumber: z.string().min(3, 'Serial number must be at least 3 characters long').default('').optional(),
    uploadInterval: z.number().min(10, 'Upload interval must be at least 10').default(15),
    locationId: z.number()
});

export const load = (async ({ params, fetch }) => {
    const form = await superValidate(zod(schema));
    const locationId = params.location_id;

    const deviceTypes: Tables<'cw_device_type'>[] = await fetch('/api/v1/devices/types').then(res => res.json());
    const deviceTypeOptions = deviceTypes.map(deviceType => ({ value: deviceType.id, label: deviceType.name, upload_interval: deviceType.default_upload_interval }));
    const location = await fetch(`/api/v1/locations/${locationId}`).then(res => res.json());
    if (!location) {
        return fail(400, { text: 'Server Side Error', form });
    }
    form.data.lat = location.lat;
    form.data.long = location.long;
    // Always return { form } in load functions
    return { form, deviceTypeOptions };
});




export const actions = {
    default: async ({ request, params, fetch }) => {
        const form = await superValidate(request, zod(schema));
        console.log(form);

        const location_id = +params.location_id;
        if (!location_id) {
            return fail(400, { form });
        }
        form.data.locationId = location_id;

        if (!form.valid) {
            // Again, return { form } and things will just work.
            return fail(400, { form });
        }



        // TODO: Do something with the validated form.data
        const newId = await fetch('/api/v1/devices', {
            method: 'POST',
            body: JSON.stringify(form.data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(data => data.dev_eui);

        // Display a success status message
        return message(form, { text: 'Form posted successfully!', dev_eui: newId });
    }
};




















// import { message, superValidate } from 'sveltekit-superforms';
// import { fail } from '@sveltejs/kit';
// import { zod } from 'sveltekit-superforms/adapters';
// import type { Tables } from '$lib/types/supabaseSchema.js';


// import { z } from 'zod';

// const AddDeviceSchema = z.object({
//     name: z.string().min(3, 'Name must be at least 3 characters long').default(''),
//     deveui: z.string(),
//     joinEui: z.string().min(16, 'Join EUI must be at least 8 characters long').max(16, 'Join EUI must be at most 8 characters long').default('').optional(),
//     secretKey: z.string().min(32, 'App Key must be at least 32 characters long').max(32, 'App Key must be at most 32 characters long').default('').optional(),
//     type: z.number().default(0),
//     lat: z.number().min(-90, 'Latitude must be at least -90').max(90, 'Latitude must be at most 90'),
//     long: z.number().min(-180, 'Longitude must be at least -180').max(180, 'Longitude must be at most 180'),
//     serialNumber: z.string().min(3, 'Serial number must be at least 3 characters long').default('').optional(),
//     uploadInterval: z.number().min(10, 'Upload interval must be at least 10').default(15),
//     locationId: z.number()
// });


// export const load = (async ({ params, fetch }) => {
//     const form = await superValidate(zod(AddDeviceSchema));

//     const locationId = params.location_id;
//     if (!locationId) {
//         return fail(400, { text: 'Server Side Error', form });
//     }

//     const deviceTypes: Tables<'cw_device_type'>[] = await fetch('/api/v1/devices/types').then(res => res.json());
//     const deviceTypeOptions = deviceTypes.map(deviceType => ({ value: deviceType.id, label: deviceType.name, upload_interval: deviceType.default_upload_interval }));

//     const location = await fetch(`/api/v1/locations/${locationId}`).then(res => res.json());
//     if (!location) {
//         return fail(400, { text: 'Server Side Error', form });
//     }
//     form.data.lat = location.lat;
//     form.data.long = location.long;
//     form.data.locationId = +locationId;

//     // Always return { form } in load functions
//     return { form, deviceTypeOptions };
// });

// export const actions = {
//     default: async ({ request, fetch }) => {
//         const rawFormData = await request.formData();
//         console.log("Raw form data:", Object.fromEntries(rawFormData));

//         const form = await superValidate(request, zod(AddDeviceSchema));
//         console.log(form);

//         if (!form.valid) {
//             return fail(400, { text: 'aabbcc', form });
//         }

//         // TODO: Do something with the validated form.data
//         const newId = await fetch('/api/v1/devices', {
//             method: 'POST',
//             body: JSON.stringify(form.data),
//             headers: {
//                 'Content-Type': 'application/json'
//             }
//         }).then(res => res.json()).then(data => data.location_id);

//         if (!newId) {
//             // Display an error status message
//             return fail(500, { text: 'Server Side Error', form });
//         }

//         // Display a success status message
//         return message(form, { text: 'Location Created Successfully', id: newId });
//     }
// };