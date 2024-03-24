import { c as create_ssr_component, f as add_attribute, v as validate_component } from "./ssr.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
import { I as Icon } from "./Button.js";
import { f as fade } from "./index3.js";
const Avatar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = "md" } = $$props;
  let { icon = void 0 } = $$props;
  const settingsClasses = getComponentClasses("Avatar");
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  return `<div${add_attribute(
    "class",
    cls(
      "Avatar",
      "rounded-full inline-flex items-center justify-center flex-shrink-0",
      {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-14 h-14"
      }[size],
      settingsClasses.root,
      $$props.class
    ),
    0
  )}>${slots.default ? slots.default({}) : ` ${icon ? `${validate_component(Icon, "Icon").$$render($$result, { path: icon }, {}, {})}` : ``} `}</div>`;
});
const Overlay = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { center = false } = $$props;
  let { transition = [fade, { duration: 100 }] } = $$props;
  const settingsClasses = getComponentClasses("Overlay");
  if ($$props.center === void 0 && $$bindings.center && center !== void 0)
    $$bindings.center(center);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  return `<div${add_attribute("class", cls("Overlay", "absolute top-0 bottom-0 left-0 right-0 z-30 bg-surface-100/75", center && "flex items-center justify-center", settingsClasses.root, $$props.class), 0)}>${slots.default ? slots.default({}) : ``}</div>`;
});
export {
  Avatar as A,
  Overlay as O
};
