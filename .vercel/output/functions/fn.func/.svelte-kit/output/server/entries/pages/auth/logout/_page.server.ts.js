import { r as redirect } from "../../../../chunks/index.js";
const actions = {
  async default({ locals: { supabase } }) {
    console.log("CALLING SERVBER LOGOUT!!!");
    await supabase.auth.signOut();
    throw redirect(303, "/");
  }
};
export {
  actions
};
