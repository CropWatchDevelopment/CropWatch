import { c as create_ssr_component, d as createEventDispatcher, f as add_attribute } from "./ssr.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
const Popover = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { open = false } = $$props;
  let { placement = void 0 } = $$props;
  let { autoPlacement = false } = $$props;
  let { anchorEl = void 0 } = $$props;
  let { offset = 0 } = $$props;
  let { padding = 4 } = $$props;
  let { matchWidth = false } = $$props;
  let { resize = false } = $$props;
  const dispatch = createEventDispatcher();
  const settingsClasses = getComponentClasses("Popover");
  function close(reason = "unknown") {
    if (open) {
      dispatch("close", reason);
      open = false;
    }
  }
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.autoPlacement === void 0 && $$bindings.autoPlacement && autoPlacement !== void 0)
    $$bindings.autoPlacement(autoPlacement);
  if ($$props.anchorEl === void 0 && $$bindings.anchorEl && anchorEl !== void 0)
    $$bindings.anchorEl(anchorEl);
  if ($$props.offset === void 0 && $$bindings.offset && offset !== void 0)
    $$bindings.offset(offset);
  if ($$props.padding === void 0 && $$bindings.padding && padding !== void 0)
    $$bindings.padding(padding);
  if ($$props.matchWidth === void 0 && $$bindings.matchWidth && matchWidth !== void 0)
    $$bindings.matchWidth(matchWidth);
  if ($$props.resize === void 0 && $$bindings.resize && resize !== void 0)
    $$bindings.resize(resize);
  return ` ${open ? `<div${add_attribute("class", cls("Popover absolute z-50 outline-none", settingsClasses.root, $$props.class), 0)} tabindex="-1">${slots.default ? slots.default({ close }) : ``}</div>` : ``}`;
});
export {
  Popover as P
};
