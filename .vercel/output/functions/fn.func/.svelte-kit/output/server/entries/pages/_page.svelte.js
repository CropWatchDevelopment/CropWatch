import { c as create_ssr_component, v as validate_component } from "../../chunks/ssr.js";
import "../../chunks/theme.js";
import { B as Button } from "../../chunks/Button.js";
import { A as AppBar } from "../../chunks/AppBar.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<main class="p-2 grid place-items-center content-center"><h1 class="text-2xl font-semibold mb-2" data-svelte-h="svelte-1sy2o8d">Welcome to ✨Svelte UX✨</h1> <div>${validate_component(Button, "Button").$$render(
    $$result,
    {
      href: "https://svelte-ux.techniq.dev",
      target: "_blank",
      variant: "fill-light",
      color: "primary"
    },
    {},
    {
      default: () => {
        return `Documentation`;
      }
    }
  )} ${validate_component(Button, "Button").$$render(
    $$result,
    {
      href: "https://svelte-ux.techniq.dev/customization",
      target: "_blank",
      variant: "fill-light",
      color: "primary"
    },
    {},
    {
      default: () => {
        return `Customization`;
      }
    }
  )} <div class="grid gap-2">${validate_component(AppBar, "AppBar").$$render(
    $$result,
    {
      title: "Example",
      class: "[--bg-primary:theme(colors.primary)] text-primary-content"
    },
    {},
    {}
  )} ${validate_component(AppBar, "AppBar").$$render(
    $$result,
    {
      title: "Example",
      class: "bg-primary [--text-color:theme(colors.warning)]"
    },
    {},
    {}
  )}</div></div></main>`;
});
export {
  Page as default
};
