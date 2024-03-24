import { c as create_ssr_component, h as compute_rest_props, d as createEventDispatcher, x as spread, z as escape_object, y as escape_attribute_value, f as add_attribute, e as escape, g as add_styles, v as validate_component } from "./ssr.js";
import { mdiChevronDown, mdiDotsVertical } from "@mdi/js";
import { subSeconds } from "date-fns";
import { g as getComponentClasses, c as cls } from "./theme.js";
import { I as Icon, B as Button } from "./Button.js";
import { A as Avatar } from "./Overlay.js";
import { C as Card, H as Header } from "./Card.js";
import { s as slide } from "./index3.js";
import { M as Menu } from "./MenuItem.js";
import { D as Duration } from "./Duration.js";
import { T as Toggle } from "./Toggle.js";
const Collapse = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "name",
    "value",
    "group",
    "open",
    "popout",
    "disabled",
    "icon",
    "transition",
    "transitionParams",
    "classes",
    "list"
  ]);
  const dispatch = createEventDispatcher();
  let { name = "" } = $$props;
  let { value = void 0 } = $$props;
  let { group = void 0 } = $$props;
  let { open = false } = $$props;
  let { popout = false } = $$props;
  let { disabled = false } = $$props;
  let { icon = mdiChevronDown } = $$props;
  let { transition = slide } = $$props;
  let { transitionParams = {} } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Collapse");
  let { list = "parent" } = $$props;
  if ($$props.name === void 0 && $$bindings.name && name !== void 0)
    $$bindings.name(name);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.group === void 0 && $$bindings.group && group !== void 0)
    $$bindings.group(group);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.popout === void 0 && $$bindings.popout && popout !== void 0)
    $$bindings.popout(popout);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.transitionParams === void 0 && $$bindings.transitionParams && transitionParams !== void 0)
    $$bindings.transitionParams(transitionParams);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.list === void 0 && $$bindings.list && list !== void 0)
    $$bindings.list(list);
  open = group !== void 0 ? group === value : open;
  {
    dispatch("change", { open, name });
  }
  return `<div${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("Collapse", popout && "transition-all duration-all", popout && open && "my-3", popout && list === "type" && "first-of-type:mt-0 last-of-type:mb-0", popout && list === "parent" && "first:mt-0 last:mb-0", popout && list === "group" && "group-first:mt-0 group-last:mb-0", settingsClasses.root, classes.root, $$props.class))
      },
      {
        "aria-expanded": escape_attribute_value(open)
      }
    ],
    {}
  )}><button type="button" class="flex items-center w-full text-left select-text focus:outline-none" ${disabled ? "disabled" : ""}>${slots.trigger ? slots.trigger({ open }) : `<span${add_attribute("class", cls("flex-1", settingsClasses.trigger, classes.trigger), 0)}>${escape(name)}</span>`} ${slots.icon ? slots.icon({ open }) : ` <div${add_attribute("data-open", open, 0)}${add_attribute("class", cls("transition-all duration-[var(--duration)] transform", "data-[open=true]:-rotate-180", settingsClasses.icon, classes.icon), 0)}${add_styles({
    "--duration": `${transitionParams.duration ?? 300}ms`
  })}>${validate_component(Icon, "Icon").$$render($$result, { path: icon }, {}, {})}</div> `}</button> ${open ? `<div${add_attribute("class", cls(settingsClasses.content, classes.content), 0)}>${slots.default ? slots.default({ open }) : ``}</div>` : ``}</div>`;
});
const CWStatCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = "New Card" } = $$props;
  let { counterStartTime = /* @__PURE__ */ new Date() } = $$props;
  let { value = 0 } = $$props;
  let { optimal = value } = $$props;
  let { notation = "°c" } = $$props;
  let { icon = null } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.counterStartTime === void 0 && $$bindings.counterStartTime && counterStartTime !== void 0)
    $$bindings.counterStartTime(counterStartTime);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.optimal === void 0 && $$bindings.optimal && optimal !== void 0)
    $$bindings.optimal(optimal);
  if ($$props.notation === void 0 && $$bindings.notation && notation !== void 0)
    $$bindings.notation(notation);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  return `${validate_component(Card, "Card").$$render($$result, {}, {}, {
    contents: () => {
      return `<div slot="contents" class="mb-2">${optimal ? `${validate_component(Collapse, "Collapse").$$render($$result, {}, {}, {
        trigger: () => {
          return `<div slot="trigger" class="flex-1 px-3 py-3 border-t"><h1 class="text-4xl md:text-2xl lg:text-4xl text-gray-700">${escape(value)}${escape(notation)}</h1></div>`;
        },
        default: () => {
          return `<div class="grid grid-cols-2 text-center md:text-md"><div class="border-t border-r"><h3 class="font-medium" data-svelte-h="svelte-12iqc0">Optimal</h3> <p class="text-gray-700">${escape(optimal)}${escape(notation)}</p></div> <div class="border-t"><h3 class="font-medium" data-svelte-h="svelte-37z71v">Difference</h3> <p class="text-gray-700">${escape(value - optimal > 0 ? "+" : "")}${escape((value - optimal).toFixed(2))}${escape(notation)}</p></div></div>`;
        }
      })}` : `<h1 class="text-4xl text-gray-700">${escape(value)}${escape(notation)}</h1>`}</div>`;
    },
    header: () => {
      return `${validate_component(Header, "Header").$$render($$result, { slot: "header", class: "gap-0" }, {}, {
        actions: () => {
          return `<div slot="actions">${validate_component(Toggle, "Toggle").$$render($$result, {}, {}, {
            default: ({ on: open, toggle }) => {
              return `${validate_component(Button, "Button").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiDotsVertical }, {}, {})} ${validate_component(Menu, "Menu").$$render($$result, { open }, {}, {
                    default: () => {
                      return `${slots.headerMore ? slots.headerMore({}) : ``}`;
                    }
                  })}`;
                }
              })}`;
            }
          })}</div>`;
        },
        subheading: () => {
          return `<div slot="subheading" class="text-sm text-gray-500">${counterStartTime ? `Last Update ${validate_component(Duration, "Duration").$$render(
            $$result,
            {
              start: subSeconds(counterStartTime, 0),
              totalUnits: 1
            },
            {},
            {}
          )} ago` : ``}</div>`;
        },
        avatar: () => {
          return `<div slot="avatar">${validate_component(Avatar, "Avatar").$$render(
            $$result,
            {
              class: "bg-accent-500 text-white font-bold mr-4"
            },
            {},
            {
              default: () => {
                return `${icon ? `${validate_component(Icon, "Icon").$$render($$result, { data: icon }, {}, {})}` : ``}`;
              }
            }
          )}</div>`;
        },
        title: () => {
          return `<div slot="title" class="text-nowrap text-md md:text-md lg:text-xl font-medium">${escape(title)}</div>`;
        }
      })}`;
    }
  })}`;
});
export {
  CWStatCard as C
};
