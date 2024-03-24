import { s as supabase } from "../../../../../../../../chunks/supabaseClient.js";
async function load({ params }) {
  return {
    sensor: await supabase.from("cw_ss_tmepnpk").select("*").eq("dev_eui", params.sensor_eui).order("created_at", { ascending: false }).limit(100)
  };
}
export {
  load
};
