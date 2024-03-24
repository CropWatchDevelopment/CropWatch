import { c as create_ssr_component, h as compute_rest_props, v as validate_component, d as createEventDispatcher, e as escape, n as null_to_empty, l as each, f as add_attribute } from "./ssr.js";
import "./client.js";
import { mdiContentCopy, mdiDevices, mdiMapMarker, mdiLock } from "@mdi/js";
import { e as getComponentSettings, c as cls, D as DurationUnits } from "./theme.js";
import { B as Button, I as Icon } from "./Button.js";
import { T as Tooltip } from "./Tooltip.js";
import { D as Duration } from "./Duration.js";
const CopyButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let restProps;
  let $$restProps = compute_rest_props($$props, ["value"]);
  const { classes: settingsClasses, defaults } = getComponentSettings("CopyButton");
  let { value } = $$props;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  restProps = { ...defaults, ...$$restProps };
  return `${validate_component(Button, "Button").$$render(
    $$result,
    Object.assign({}, { icon: mdiContentCopy }, restProps, {
      class: cls("CopyButton", settingsClasses.root, $$props.class)
    }),
    {},
    {
      default: () => {
        return `${``}`;
      }
    }
  )}`;
});
const css = {
  code: "table.svelte-1l8trgr.svelte-1l8trgr{border:1px solid #ccc;border-collapse:separate;border-radius:20px;margin:0;padding:0;table-layout:fixed}table.svelte-1l8trgr tr.svelte-1l8trgr{background-color:#f8f8f8;border:1px solid #ddd;padding:0.35em}table.svelte-1l8trgr tr.svelte-1l8trgr:hover{background-color:#f8fccc}table.svelte-1l8trgr th.svelte-1l8trgr,table.svelte-1l8trgr td.svelte-1l8trgr{padding:0.625em;text-align:center}table.svelte-1l8trgr th.svelte-1l8trgr{font-size:0.85em;letter-spacing:0.1em;text-transform:uppercase}table.svelte-1l8trgr th .svelte-1l8trgr:first{border-radius:20px}@media screen and (max-width: 600px){table.svelte-1l8trgr.svelte-1l8trgr{border-collapse:separate;margin:0;padding:0;width:100%;table-layout:fixed}thead.svelte-1l8trgr tr th.svelte-1l8trgr{background-color:#f6f5fd;color:#6058e8}table.svelte-1l8trgr thead.svelte-1l8trgr{border:none;clip:rect(0 0 0 0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;width:1px;border-radius:20px 20px 0 0}table.svelte-1l8trgr tr.svelte-1l8trgr{display:block;margin-bottom:0.625em}table.svelte-1l8trgr td.svelte-1l8trgr{border-bottom:1px solid #ddd;display:block;font-size:0.8em;text-align:right}table.svelte-1l8trgr td.svelte-1l8trgr::before{content:attr(data-label);float:left;font-weight:bold;text-transform:uppercase}table.svelte-1l8trgr td.svelte-1l8trgr:last-child{border-bottom:0}}.break.svelte-1l8trgr.svelte-1l8trgr:before{word-wrap:break-word}",
  map: null
};
const CWTable = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let headers;
  let { data = [] } = $$props;
  console.log(data);
  createEventDispatcher();
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  $$result.css.add(css);
  headers = data.length > 0 ? Object.keys(data[0]).filter((key) => key !== "component" && key !== "Location") : [];
  return `<table class="${escape(null_to_empty($$props.class), true) + " svelte-1l8trgr"}"><thead class="svelte-1l8trgr"><tr class="svelte-1l8trgr">${each(headers, (header) => {
    return `${header != "model" && header != "Location" ? `<th scope="col" class="svelte-1l8trgr">${escape(header)}</th>` : ``}`;
  })}</tr></thead> <tbody class="svelte-1l8trgr">${each(data, (row, rowIndex) => {
    return `<tr class="svelte-1l8trgr">${each(headers, (header) => {
      return `${header != "model" && header != "Location" ? `${header == "lastSeen" ? `<td data-label="Last Seen" class="svelte-1l8trgr"> ${validate_component(Duration, "Duration").$$render(
        $$result,
        {
          start: new Date(row.lastSeen),
          totalUnits: 2,
          minUnits: DurationUnits.Second
        },
        {},
        {}
      )} </td>` : `${header == "locationName" ? `<td data-label="Location Name" class="svelte-1l8trgr">${escape(row.locationName)} </td>` : `${header == "devEui" ? `<td data-label="DEV Eui" class="svelte-1l8trgr">${validate_component(Tooltip, "Tooltip").$$render($$result, { title: "Copy Dev EUI", "}": true }, {}, {
        default: () => {
          return `${escape(row[header])}${validate_component(CopyButton, "CopyButton").$$render($$result, { value: row["devEui"], size: "sm" }, {}, {})} `;
        }
      })} </td>` : `${header == "url" ? `<td class="flex flex-row gap-2 justify-center svelte-1l8trgr" data-label="Actions">${row.Location?.cw_locations?.location_id ? `${validate_component(Tooltip, "Tooltip").$$render($$result, { title: "View device details" }, {}, {
        default: () => {
          return `${validate_component(Button, "Button").$$render($$result, { variant: "outline", icon: mdiDevices }, {}, {})} `;
        }
      })} ${validate_component(Tooltip, "Tooltip").$$render($$result, { title: "View Location of device" }, {}, {
        default: () => {
          return `${validate_component(Button, "Button").$$render($$result, { variant: "outline", icon: mdiMapMarker }, {}, {})} `;
        }
      })}` : `${validate_component(Tooltip, "Tooltip").$$render($$result, { title: "Not available or no permission" }, {}, {
        default: () => {
          return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiLock }, {}, {})} `;
        }
      })}`} </td>` : `<td${add_attribute("data-label", header, 0)} class="svelte-1l8trgr"><b class="svelte-1l8trgr">${escape(row[header])}</b> </td>`}`}`}`}` : ``}`;
    })} </tr>`;
  })}</tbody> </table>`;
});
export {
  CWTable as C
};
