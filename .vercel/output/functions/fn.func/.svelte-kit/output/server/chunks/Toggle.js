import { c as create_ssr_component, d as createEventDispatcher } from "./ssr.js";
const Toggle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const dispatch = createEventDispatcher();
  let { on = false } = $$props;
  function toggle() {
    on = !on;
    dispatch("toggle", on);
    if (on) {
      dispatch("toggleOn");
    } else {
      dispatch("toggleOff");
    }
  }
  function toggleOn() {
    on = true;
    dispatch("toggle", on);
    dispatch("toggleOn");
  }
  function toggleOff() {
    on = false;
    dispatch("toggle", on);
    dispatch("toggleOff");
  }
  if ($$props.on === void 0 && $$bindings.on && on !== void 0)
    $$bindings.on(on);
  return `${slots.default ? slots.default({ on, toggle, toggleOn, toggleOff }) : ``}`;
});
export {
  Toggle as T
};
