import { c as create_ssr_component, v as validate_component, j as is_promise, k as noop } from "../../../../chunks/ssr.js";
import { C as CWTable } from "../../../../chunks/CWTable.js";
import { mdiDevices } from "@mdi/js";
import "../../../../chunks/theme.js";
import { I as Icon } from "../../../../chunks/Button.js";
import { A as Avatar } from "../../../../chunks/Overlay.js";
import { C as Card, H as Header } from "../../../../chunks/Card.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${validate_component(Card, "Card").$$render($$result, { class: "" }, {}, {
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "All Devices",
          subheading: "All Devices in your account",
          slot: "header"
        },
        {},
        {
          avatar: () => {
            return `<div slot="avatar">${validate_component(Avatar, "Avatar").$$render(
              $$result,
              {
                class: "bg-primary text-primary-content font-bold"
              },
              {},
              {
                default: () => {
                  return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiDevices }, {}, {})}`;
                }
              }
            )}</div>`;
          }
        }
      )}`;
    },
    default: () => {
      return `${function(__value) {
        if (is_promise(__value)) {
          __value.then(null, noop);
          return ` <div data-svelte-h="svelte-194gxkm">Loading...</div> `;
        }
        return function(sensorData) {
          return ` ${validate_component(CWTable, "CwTable").$$render($$result, { data: sensorData }, {}, {})} `;
        }(__value);
      }(data.sensors)}`;
    }
  })}`;
});
export {
  Page as default
};
