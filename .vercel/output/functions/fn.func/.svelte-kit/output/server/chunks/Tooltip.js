import { c as create_ssr_component, h as compute_rest_props, v as validate_component, f as add_attribute, e as escape, b as compute_slots } from "./ssr.js";
import { P as Popover } from "./Popover.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
const Tooltip = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let hasTitle;
  let $$restProps = compute_rest_props($$props, [
    "title",
    "open",
    "offset",
    "delay",
    "underline",
    "cursor",
    "enabled",
    "placement",
    "autoPlacement",
    "matchWidth",
    "classes"
  ]);
  let $$slots = compute_slots(slots);
  let { title = "" } = $$props;
  let { open = false } = $$props;
  let { offset = 0 } = $$props;
  let { delay = 500 } = $$props;
  let { underline = false } = $$props;
  let { cursor = false } = $$props;
  let { enabled = true } = $$props;
  let { placement = "bottom" } = $$props;
  let { autoPlacement = false } = $$props;
  let { matchWidth = false } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Tooltip");
  let containerEl;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.offset === void 0 && $$bindings.offset && offset !== void 0)
    $$bindings.offset(offset);
  if ($$props.delay === void 0 && $$bindings.delay && delay !== void 0)
    $$bindings.delay(delay);
  if ($$props.underline === void 0 && $$bindings.underline && underline !== void 0)
    $$bindings.underline(underline);
  if ($$props.cursor === void 0 && $$bindings.cursor && cursor !== void 0)
    $$bindings.cursor(cursor);
  if ($$props.enabled === void 0 && $$bindings.enabled && enabled !== void 0)
    $$bindings.enabled(enabled);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.autoPlacement === void 0 && $$bindings.autoPlacement && autoPlacement !== void 0)
    $$bindings.autoPlacement(autoPlacement);
  if ($$props.matchWidth === void 0 && $$bindings.matchWidth && matchWidth !== void 0)
    $$bindings.matchWidth(matchWidth);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  hasTitle = title || $$slots.title;
  return `${enabled && (title || $$slots.title) ? `${validate_component(Popover, "Popover").$$render(
    $$result,
    Object.assign(
      {},
      { anchorEl: containerEl?.firstElementChild },
      { placement },
      { autoPlacement },
      { offset },
      { matchWidth },
      { open },
      {
        class: cls("Tooltip pointer-events-none", settingsClasses.popover, classes.popover)
      },
      $$restProps
    ),
    {},
    {
      default: () => {
        return `${slots.title ? slots.title({}) : ` <div${add_attribute("class", cls("text-xs text-surface-100 bg-surface-content px-2 py-1 rounded whitespace-nowrap", settingsClasses.title, classes.title), 0)}>${escape(title)}</div> `}`;
      }
    }
  )}` : ``}  <div${add_attribute("class", cls("contents", settingsClasses.content, classes.content), 0)}${add_attribute("this", containerEl, 0)}>${$$props.class || underline || cursor ? `<span${add_attribute("class", cls(hasTitle && underline && "border-b border-dotted", hasTitle && cursor && "cursor-help", settingsClasses.root, classes.root, $$props.class), 0)}>${slots.default ? slots.default({}) : ``}</span>` : `${slots.default ? slots.default({}) : ``}`}</div>`;
});
export {
  Tooltip as T
};
