import { c as create_ssr_component, v as validate_component, j as is_promise, k as noop, l as each } from "../../../../chunks/ssr.js";
import { mdiDotsVertical, mdiPlus, mdiMapSearch, mdiChevronRight, mdiMapMarker } from "@mdi/js";
import "../../../../chunks/theme.js";
import { P as ProgressCircle, B as Button, I as Icon } from "../../../../chunks/Button.js";
import { L as ListItem } from "../../../../chunks/ListItem.js";
import { A as Avatar } from "../../../../chunks/Overlay.js";
import { C as Card, H as Header } from "../../../../chunks/Card.js";
import { M as Menu, a as MenuItem } from "../../../../chunks/MenuItem.js";
import { T as Toggle } from "../../../../chunks/Toggle.js";
import "../../../../chunks/client.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${validate_component(Card, "Card").$$render(
    $$result,
    {
      id: "list",
      class: "grid-flow-row col-span-2 mr-4 justify-start",
      title: "Location List"
    },
    {},
    {
      contents: () => {
        return `<div slot="contents"><ol>${function(__value) {
          if (is_promise(__value)) {
            __value.then(null, noop);
            return ` ${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})} `;
          }
          return function(locations) {
            return ` ${locations ? `${each(locations, (location) => {
              return `${location && location.cw_locations ? `${validate_component(ListItem, "ListItem").$$render($$result, { title: location.cw_locations.name }, {}, {
                actions: () => {
                  return `<div slot="actions">${validate_component(Button, "Button").$$render(
                    $$result,
                    {
                      icon: mdiChevronRight,
                      variant: "fill-light",
                      color: "accent",
                      class: "p-2 text-black/50"
                    },
                    {},
                    {}
                  )} </div>`;
                },
                avatar: () => {
                  return `<div slot="avatar">${validate_component(Icon, "Icon").$$render($$result, { data: mdiMapMarker }, {}, {})} </div>`;
                }
              })}` : `<li data-svelte-h="svelte-1qqfjfx">You don&#39;t have any locations yet</li>`}`;
            })}` : ``} `;
          }(__value);
        }(data.locations)}</ol></div>`;
      },
      header: () => {
        return `${validate_component(Header, "Header").$$render(
          $$result,
          {
            title: "Your Locations",
            slot: "header",
            class: "gap-0"
          },
          {},
          {
            actions: () => {
              return `<div slot="actions">${validate_component(Toggle, "Toggle").$$render($$result, {}, {}, {
                default: ({ on: open, toggle }) => {
                  return `${validate_component(Button, "Button").$$render($$result, { icon: mdiDotsVertical }, {}, {
                    default: () => {
                      return `${validate_component(Menu, "Menu").$$render($$result, { open }, {}, {
                        default: () => {
                          return `${validate_component(MenuItem, "MenuItem").$$render($$result, { icon: mdiPlus }, {}, {
                            default: () => {
                              return `Add Location`;
                            }
                          })}`;
                        }
                      })}`;
                    }
                  })}`;
                }
              })}</div>`;
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
                    return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiMapSearch }, {}, {})}`;
                  }
                }
              )}</div>`;
            }
          }
        )}`;
      }
    }
  )}`;
});
export {
  Page as default
};
