import { c as create_ssr_component, d as createEventDispatcher, v as validate_component, f as add_attribute, b as compute_slots } from "./ssr.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
import { B as Backdrop } from "./Backdrop.js";
import { P as ProgressCircle } from "./Button.js";
import { O as Overlay } from "./Overlay.js";
const Dialog = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$slots = compute_slots(slots);
  const dispatch = createEventDispatcher();
  let { open = false } = $$props;
  let { portal = true } = $$props;
  let { persistent = false } = $$props;
  let { loading = null } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Dialog");
  let dialogEl;
  let actionsEl;
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.portal === void 0 && $$bindings.portal && portal !== void 0)
    $$bindings.portal(portal);
  if ($$props.persistent === void 0 && $$bindings.persistent && persistent !== void 0)
    $$bindings.persistent(persistent);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  {
    if (open === false) {
      dispatch("close", { open });
    }
  }
  return `${open ? `${validate_component(Backdrop, "Backdrop").$$render(
    $$result,
    {
      class: cls("z-50", settingsClasses.backdrop, classes.backdrop),
      fadeParams: { duration: 150 },
      portal
    },
    {},
    {}
  )} <div${add_attribute("class", cls("Dialog", "fixed top-0 left-0 w-full h-full z-50 flex items-center justify-center pointer-events-none", settingsClasses.root, classes.root), 0)}><div${add_attribute("class", cls("dialog rounded bg-surface-100 elevation-4 overflow-y-auto pointer-events-auto relative outline-none", settingsClasses.dialog, classes.dialog, $$props.class), 0)}${add_attribute("style", $$props.style, 0)}${add_attribute("this", dialogEl, 0)}>${loading ? `${validate_component(Overlay, "Overlay").$$render($$result, { center: true, class: "rounded" }, {}, {
    default: () => {
      return `${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})}`;
    }
  })}` : ``} ${slots.header ? slots.header({}) : ` ${$$slots.title ? `<div${add_attribute("class", cls("text-xl font-bold pt-4 pb-2 px-6", settingsClasses.title, classes.title), 0)}>${slots.title ? slots.title({}) : ``}</div>` : ``} `} ${slots.default ? slots.default({}) : ``} ${$$slots.actions ? `<div${add_attribute("class", cls("actions flex w-full justify-end p-2 bg-surface-content/5 border-t", settingsClasses.actions, classes.actions), 0)}${add_attribute("this", actionsEl, 0)}>${slots.actions ? slots.actions({}) : ``}</div>` : ``}</div></div>` : ``}`;
});
export {
  Dialog as D
};
