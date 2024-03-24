import { c as create_ssr_component, f as add_attribute } from "./ssr.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
const Backdrop = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { blur = false } = $$props;
  let { portal = false } = $$props;
  let { fadeParams = { duration: 300 } } = $$props;
  const settingsClasses = getComponentClasses("Backdrop");
  if ($$props.blur === void 0 && $$bindings.blur && blur !== void 0)
    $$bindings.blur(blur);
  if ($$props.portal === void 0 && $$bindings.portal && portal !== void 0)
    $$bindings.portal(portal);
  if ($$props.fadeParams === void 0 && $$bindings.fadeParams && fadeParams !== void 0)
    $$bindings.fadeParams(fadeParams);
  return `<div${add_attribute("class", cls("Backdrop", "fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center bg-surface-content/50 dark:bg-surface-300/70", blur && "backdrop-blur-sm", settingsClasses.root, $$props.class), 0)}>${slots.default ? slots.default({}) : ``}</div>`;
});
export {
  Backdrop as B
};
