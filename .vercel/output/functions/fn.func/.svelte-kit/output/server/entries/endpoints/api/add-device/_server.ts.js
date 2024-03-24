import { e as error, j as json } from "../../../../chunks/index.js";
const POST = async ({ request, locals: { supabase, getSession } }) => {
  const session = await getSession();
  const formData = await request.formData();
  console.log(session, formData);
  if (!session) {
    throw error(401, { message: "Unauthorized" });
  }
  const cw_devices_response = await supabase.from("cw_devices").insert({
    dev_eui: formData.get("dev_eui"),
    name: formData.get("name"),
    type: 3,
    // formData.type,
    upload_interval: formData.get("interval"),
    lat: formData.get("lat"),
    long: formData.get("long")
  });
  let cw_device_locations_response;
  if (!cw_devices_response.error) {
    cw_device_locations_response = await supabase.from("cw_device_locations").insert({
      dev_eui: formData.get("dev_eui"),
      location_id: formData.get("location_id")
    });
  }
  let cw_device_owners_resposne;
  if (!cw_device_locations_response?.error) {
    cw_device_owners_resposne = await supabase.from("cw_device_owners").insert({
      user_id: session.user.id,
      dev_eui: formData.get("dev_eui"),
      permission_level: 3
    });
  }
  return json({
    cw_device_locations_response,
    cw_device_owners_resposne,
    cw_devices_response
  });
};
export {
  POST
};
