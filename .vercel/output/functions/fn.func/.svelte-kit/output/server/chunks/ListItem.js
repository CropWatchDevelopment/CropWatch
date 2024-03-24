import { c as create_ssr_component, f as add_attribute, v as validate_component, e as escape } from "./ssr.js";
import { O as Overlay, A as Avatar } from "./Overlay.js";
import { P as ProgressCircle, I as Icon } from "./Button.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
const ListItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = null } = $$props;
  let { subheading = null } = $$props;
  let { icon = null } = $$props;
  let { avatar = null } = $$props;
  let { list = "parent" } = $$props;
  let { noShadow = false } = $$props;
  let { noBackground = false } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("ListItem");
  let { loading = null } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.subheading === void 0 && $$bindings.subheading && subheading !== void 0)
    $$bindings.subheading(subheading);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.avatar === void 0 && $$bindings.avatar && avatar !== void 0)
    $$bindings.avatar(avatar);
  if ($$props.list === void 0 && $$bindings.list && list !== void 0)
    $$bindings.list(list);
  if ($$props.noShadow === void 0 && $$bindings.noShadow && noShadow !== void 0)
    $$bindings.noShadow(noShadow);
  if ($$props.noBackground === void 0 && $$bindings.noBackground && noBackground !== void 0)
    $$bindings.noBackground(noBackground);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  return ` <li${add_attribute(
    "class",
    cls(
      "ListItem",
      "flex gap-4 items-center border-t border-surface-content/10 py-2 px-4",
      "relative",
      // Needed for loading overlay
      list === "type" && "first-of-type:border-t-0 first-of-type:rounded-t last-of-type:rounded-b",
      list === "parent" && "first:border-t-0 first:rounded-t last:rounded-b",
      list === "group" && "group-first:border-t-0 group-first:rounded-t group-last:rounded-b",
      noShadow !== true && "elevation-1",
      noBackground !== true && "bg-surface-100",
      settingsClasses.root,
      classes.root,
      $$props.class
    ),
    0
  )}>${loading ? `${validate_component(Overlay, "Overlay").$$render($$result, { center: true, class: "rounded" }, {}, {
    default: () => {
      return `${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})}`;
    }
  })}` : ``} ${slots.avatar ? slots.avatar({}) : ` ${icon != null ? `${avatar ? `${validate_component(Avatar, "Avatar").$$render(
    $$result,
    Object.assign(
      {},
      {
        class: cls(settingsClasses.avatar, classes.avatar)
      },
      avatar
    ),
    {},
    {
      default: () => {
        return `${validate_component(Icon, "Icon").$$render(
          $$result,
          {
            path: icon,
            class: cls(settingsClasses.icon, classes.icon)
          },
          {},
          {}
        )}`;
      }
    }
  )}` : `${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      path: icon,
      class: cls(settingsClasses.icon, classes.icon)
    },
    {},
    {}
  )}`}` : ``} `} <div class="flex-grow">${slots.title ? slots.title({}) : ` ${title != null ? `<div${add_attribute("class", cls(settingsClasses.title, classes.title), 0)}>${escape(title)}</div>` : ``} `} ${slots.subheading ? slots.subheading({}) : ` ${subheading != null ? `<div${add_attribute("class", cls("text-sm text-surface-content/50", settingsClasses.subheading, classes.subheading), 0)}>${escape(subheading)}</div>` : ``} `}</div> ${slots.actions ? slots.actions({}) : ``}</li>`;
});
export {
  ListItem as L
};
