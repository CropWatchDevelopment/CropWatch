import { r as redirect, j as json } from "../../../../chunks/index.js";
import moment from "moment";
async function GET({ request, response, locals: { supabase, getSession } }) {
  const session = await getSession();
  if (!session)
    throw redirect(304, "/auth/login");
  const user_id = session?.user.id;
  const sensors = await getAllSensorsForUser(supabase, user_id);
  for (let i = 0; i < sensors.length; i++) {
    const data_table = sensors[i].cw_devices.cw_device_type.data_table;
    if (data_table) {
      const dev_data = await getDataForSensor(supabase, data_table, sensors[i].cw_devices.dev_eui);
      sensors[i].data = Object.assign({}, sensors[i], dev_data);
    }
  }
  console.log(sensors);
  const transformedData = sensors.map((sensor) => {
    const name = sensor.cw_devices.name;
    const lastSeen = sensor.data?.created_at ?? sensor.cw_devices.cw_device_type.created_at;
    const devEui = sensor.cw_devices.dev_eui;
    const Location = sensor.cw_devices?.cw_device_locations;
    const model = sensor.cw_devices.cw_device_type.id;
    const primaryData = sensor.data[sensor.cw_devices.cw_device_type.primary_data] ? `${sensor.data[sensor.cw_devices.cw_device_type.primary_data]}${sensor.cw_devices.cw_device_type.primary_data_notation}` : "N/A";
    let active = "⚪";
    if (sensor.cw_devices.upload_interval > 0) {
      if (moment(lastSeen).add(sensor.cw_devices.upload_interval, "minutes").isAfter(moment().utc())) {
        active = "🟢";
      } else {
        active = "🔴";
      }
    }
    const url = sensor.cw_devices.cw_device_type.device_app;
    const locationName = Location?.cw_locations?.name ?? "N/A";
    console.log(locationName);
    return { active, name, locationName, Location, devEui, lastSeen, model, primaryData, url };
  });
  return json(transformedData);
}
async function getAllSensorsForUser(supabase, user_id) {
  const { data, error } = await supabase.from("cw_device_owners").select("*, cw_devices(*, cw_device_locations(id, cw_locations(*)), cw_device_type(*))").eq("user_id", user_id);
  if (!data) {
    console.log(error);
    return [];
  } else {
    return data;
  }
}
async function getDataForSensor(supabase, data_table, dev_eui) {
  const { data, error } = await supabase.from(data_table).select("*").eq("dev_eui", dev_eui).order("created_at", { ascending: false }).limit(1).single();
  if (!data) {
    console.log(error);
    return [];
  } else {
    return data;
  }
}
export {
  GET
};
