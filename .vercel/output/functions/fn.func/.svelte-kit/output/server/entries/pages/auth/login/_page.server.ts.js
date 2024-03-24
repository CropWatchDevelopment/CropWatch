import { f as fail, r as redirect } from "../../../../chunks/index.js";
import { D as DEV } from "../../../../chunks/prod-ssr.js";
import { s as supabase } from "../../../../chunks/supabaseClient.js";
const dev = DEV;
const load = async (locals) => {
  return {
    data: {}
  };
};
const actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, schema);
    console.log("POST", form);
    if (!form.valid) {
      return fail(400, { form });
    }
    let creds = {
      email: form.data.email,
      password: form.data.password
    };
    const { data, error } = await supabase.auth.signInWithPassword(creds);
    cookies.set("au", JSON.stringify({
      email: form.data.email,
      password: form.data.password,
      rememberMe: form.data.rememberMe
    }), {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: !dev,
      maxAge: 60 * 60 * 24 * 30
    });
    console.log("returning...", form);
    if (!error)
      throw redirect(300, "/app/locations");
    return { form };
  }
};
export {
  actions,
  load
};
