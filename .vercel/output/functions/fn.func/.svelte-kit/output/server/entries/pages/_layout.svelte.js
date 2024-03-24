import { c as create_ssr_component } from "../../chunks/ssr.js";
import { s as settings } from "../../chunks/theme.js";
import "../../chunks/client.js";
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  settings({
    themes: {
      light: ["light", "winter"],
      dark: ["dark", "black", "dracula"]
    },
    components: {
      AppBar: {
        classes: "bg-primary text-white shadow-md"
      },
      AppLayout: { classes: { nav: "bg-neutral-800" } },
      NavItem: {
        classes: {
          root: "text-sm text-gray-400 pl-6 py-2 hover:text-white hover:bg-gray-300/10 [&:where(.is-active)]:text-sky-400 [&:where(.is-active)]:bg-gray-500/10"
        }
      },
      ListItem: {
        classes: {
          root: "bg-white mb-1 text-sm text-primary-400 pl-6 py-2 hover:text-white hover:bg-gray-300/10 [&:where(.is-active)]:text-sky-400 [&:where(.is-active)]:bg-gray-500/10"
        }
      },
      Card: {},
      // classes: 'bg-white shadow-md'
      Table: {
        classes: { container: "bg-white shadow-md" }
      }
    }
  });
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<main>${slots.default ? slots.default({}) : ``}</main>`;
});
export {
  Layout as default
};
