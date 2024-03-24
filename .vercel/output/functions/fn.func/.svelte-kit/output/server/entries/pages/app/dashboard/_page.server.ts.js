import { r as redirect } from "../../../../chunks/index.js";
async function load({ fetch, locals: { supabase, getSession } }) {
  const session = await getSession();
  if (!session)
    throw redirect(304, "/auth/login");
  session?.user.id;
  const deviceTableResponse = await fetch("/api/device-table", { method: "GET" });
  const devices = await deviceTableResponse.json();
  let online = devices.filter((x) => x.active == "🟢") ?? [];
  let offline = devices.filter((x) => x.active == "🔴") ?? [];
  return {
    sensors: devices,
    online,
    offline
  };
}
export {
  load
};
