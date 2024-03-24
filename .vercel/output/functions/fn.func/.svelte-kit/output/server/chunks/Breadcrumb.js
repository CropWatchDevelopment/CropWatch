import { c as create_ssr_component, h as compute_rest_props, x as spread, z as escape_object, y as escape_attribute_value, l as each, e as escape, v as validate_component } from "./ssr.js";
import { mdiChevronRight } from "@mdi/js";
import { I as Icon } from "./Button.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
const Breadcrumb = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let displayItems;
  let $$restProps = compute_rest_props($$props, ["items", "divider", "inline"]);
  let { items = [] } = $$props;
  let { divider = void 0 } = $$props;
  let { inline = false } = $$props;
  const settingsClasses = getComponentClasses("Breadcrumb");
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  if ($$props.divider === void 0 && $$bindings.divider && divider !== void 0)
    $$bindings.divider(divider);
  if ($$props.inline === void 0 && $$bindings.inline && inline !== void 0)
    $$bindings.inline(inline);
  displayItems = items?.filter((x) => x != null) ?? [];
  return `<div${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("Breadcrumb", inline ? "inline-flex" : "flex", "items-center justify-start flex-wrap", settingsClasses.root, $$props.class))
      }
    ],
    {}
  )}>${each(displayItems, (item, index) => {
    return `${slots.item ? slots.item({ item }) : ` <div class="item">${escape(item)}</div> `} ${index < displayItems.length - 1 ? `${slots.divider ? slots.divider({}) : ` ${divider ? `<div class="divider opacity-25">${escape(divider)}</div>` : `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        path: mdiChevronRight,
        class: "divider opacity-25"
      },
      {},
      {}
    )}`} `}` : ``}`;
  })}</div>`;
});
export {
  Breadcrumb as B
};
