import { c as create_ssr_component, f as add_attribute, v as validate_component, e as escape, h as compute_rest_props, x as spread, z as escape_object, y as escape_attribute_value, b as compute_slots } from "./ssr.js";
import { P as ProgressCircle } from "./Button.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
import { B as Breadcrumb } from "./Breadcrumb.js";
import { O as Overlay } from "./Overlay.js";
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = null } = $$props;
  let { subheading = null } = $$props;
  const settingsClasses = getComponentClasses("Header");
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.subheading === void 0 && $$bindings.subheading && subheading !== void 0)
    $$bindings.subheading(subheading);
  return `<div${add_attribute("class", cls("Header", "flex items-center gap-4", settingsClasses.root, $$props.class), 0)}>${slots.avatar ? slots.avatar({}) : ``} <div class="flex-1">${slots.title ? slots.title({}) : ` ${title ? `${Array.isArray(title) ? `${validate_component(Breadcrumb, "Breadcrumb").$$render($$result, { items: title, class: "text-lg" }, {}, {})}` : `<div class="text-lg">${escape(title)}</div>`}` : ``} `} ${slots.subheading ? slots.subheading({}) : ` ${subheading ? `${Array.isArray(subheading) ? `${validate_component(Breadcrumb, "Breadcrumb").$$render(
    $$result,
    {
      items: subheading,
      class: "text-sm text-surface-content/50"
    },
    {},
    {}
  )}` : `<div class="text-sm text-surface-content/50">${escape(subheading)}</div>`}` : ``} `}</div> ${slots.actions ? slots.actions({}) : ``}</div>`;
});
const Card = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["title", "subheading", "loading"]);
  let $$slots = compute_slots(slots);
  let { title = null } = $$props;
  let { subheading = null } = $$props;
  let { loading = null } = $$props;
  const settingsClasses = getComponentClasses("Card");
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.subheading === void 0 && $$bindings.subheading && subheading !== void 0)
    $$bindings.subheading(subheading);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  return ` <div${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("Card", "relative z-0 bg-surface-100 border rounded elevation-1 flex flex-col justify-between", settingsClasses.root, $$props.class))
      }
    ],
    {}
  )}>${loading ? `${validate_component(Overlay, "Overlay").$$render($$result, { center: true, class: "rounded" }, {}, {
    default: () => {
      return `${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})}`;
    }
  })}` : ``} ${title || subheading || $$slots.header ? `<div class="p-4">${slots.header ? slots.header({}) : ` ${validate_component(Header, "Header").$$render($$result, { title, subheading }, {}, {})} `}</div>` : ``} ${slots.default ? slots.default({}) : ``} ${$$slots.contents ? `<div class="px-4 flex-1">${slots.contents ? slots.contents({}) : ``}</div>` : ``} ${$$slots.actions ? `<div class="py-2 px-1">${slots.actions ? slots.actions({}) : ``}</div>` : ``}</div>`;
});
export {
  Card as C,
  Header as H
};
