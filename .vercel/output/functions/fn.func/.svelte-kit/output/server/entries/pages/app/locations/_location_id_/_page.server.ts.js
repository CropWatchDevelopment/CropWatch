import { r as redirect } from "../../../../../chunks/index.js";
async function load({ params, locals: { supabase, getSession } }) {
  const session = await getSession();
  if (!session)
    throw redirect(304, "/auth/login");
  const user_id = session?.user.id;
  return {
    location: await checkLocationOwner(supabase, +params.location_id, user_id),
    streamed: {
      sensors: load_AllSensors(supabase, +params.location_id)
    },
    weatherJSON: await getWeatherAPIData()
  };
}
async function checkLocationOwner(supabase, id, user_id) {
  const { data, error } = await supabase.from("cw_locations").select("*, cw_location_owners(id, user_id), cw_device_locations(*, cw_devices(*, cw_ss_tmepnpk(soil_moisture, soil_temperatureC)))").eq("cw_location_owners.user_id", user_id).eq("location_id", id).single();
  if (error) {
    console.error(error);
    throw redirect(304, "/auth/login");
  }
  return data;
}
async function load_AllSensors(supabase, location_id) {
  const { data, error } = await supabase.from("cw_device_locations").select("*, cw_devices(*, cw_ss_tmepnpk(*), seeed_co2_lorawan_uplinks(*))").eq("location_id", location_id).order("created_at", { referencedTable: "cw_devices.seeed_co2_lorawan_uplinks", ascending: false }).limit(1, { referencedTable: "cw_devices.cw_ss_tmepnpk" }).limit(1, { referencedTable: "cw_devices.seeed_co2_lorawan_uplinks" });
  return data;
}
async function getWeatherAPIData() {
  try {
    const weatherRequest = await fetch(
      "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=32.1359004857804&lon=131.39106608149575"
    );
    const weatherJSON = weatherRequest.json();
    return weatherJSON;
  } catch (error) {
  }
}
export {
  load
};
