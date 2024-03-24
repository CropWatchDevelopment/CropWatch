import { r as redirect } from "../../../../chunks/index.js";
const GET = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  throw redirect(303, "/");
};
export {
  GET
};
