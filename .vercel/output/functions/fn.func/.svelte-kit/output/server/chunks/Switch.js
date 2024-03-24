import { c as create_ssr_component, f as add_attribute } from "./ssr.js";
import { u as uniqueId } from "./Button.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
const Switch = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { id = uniqueId("switch-") } = $$props;
  let { value = void 0 } = $$props;
  let { checked = false } = $$props;
  let { disabled = false } = $$props;
  let { size = "lg" } = $$props;
  let { color = "primary" } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Switch");
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0)
    $$bindings.checked(checked);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<div${add_attribute("class", cls("Switch", "inline-block", settingsClasses.root, classes.root), 0)}><input${add_attribute("id", id, 0)} type="checkbox"${add_attribute("value", value, 0)}${add_attribute("class", cls("peer appearance-none inline", settingsClasses.input, classes.input), 0)} ${disabled ? "disabled" : ""}${add_attribute("checked", checked, 1)}> <label${add_attribute("for", id, 0)}${add_attribute("data-checked", checked, 0)}${add_attribute(
    "class",
    cls(
      "switch",
      "border rounded-full grid align-items p-[2px] transition-shadow",
      {
        "w-6 h-4": size === "sm",
        "w-8 h-5": size === "md",
        "w-10 h-6": size === "lg"
      },
      checked && {
        primary: "bg-primary border-primary",
        secondary: "bg-secondary border-secondary",
        accent: "bg-accent border-accent",
        neutral: "bg-neutral border-neutral",
        info: "bg-info border-info",
        success: "bg-success border-success",
        warning: "bg-warning border-warning",
        danger: "bg-danger border-danger"
      }[color],
      {
        primary: "ring-primary/60",
        secondary: "ring-secondary/60",
        accent: "ring-accent/60",
        neutral: "ring-neutral/60",
        info: "ring-info/60",
        success: "ring-success/60",
        warning: "ring-warning/60",
        danger: "ring-danger/60"
      }[color],
      checked === false && "bg-surface-content/20",
      disabled ? "opacity-50" : "cursor-pointer peer-focus-visible:ring-2 ring-offset-1",
      settingsClasses.switch,
      classes.switch,
      $$props.class
    ),
    0
  )}><div${add_attribute("data-checked", checked, 0)}${add_attribute("class", cls("toggle w-1/2 aspect-square h-full rounded-full transition-all duration-200 bg-surface-100 grid items-center justify-center transform", checked && "translate-x-full", checked === null && "border", settingsClasses.toggle, classes.toggle), 0)}>${slots.default ? slots.default({ checked, value }) : ``}</div></label></div>`;
});
export {
  Switch as S
};
