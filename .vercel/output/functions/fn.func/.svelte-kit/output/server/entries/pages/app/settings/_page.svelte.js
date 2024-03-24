import { c as create_ssr_component, h as compute_rest_props, a as subscribe, v as validate_component } from "../../../../chunks/ssr.js";
import { mdiWeatherNight, mdiWhiteBalanceSunny, mdiTemperatureCelsius, mdiTemperatureFahrenheit, mdiTemperatureKelvin } from "@mdi/js";
import { j as getSettings } from "../../../../chunks/theme.js";
import { S as SelectField } from "../../../../chunks/SelectField.js";
import { S as Switch } from "../../../../chunks/Switch.js";
import { I as Icon } from "../../../../chunks/Button.js";
const ThemeSwitch = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, []);
  let $currentTheme, $$unsubscribe_currentTheme;
  const { currentTheme } = getSettings();
  $$unsubscribe_currentTheme = subscribe(currentTheme, (value) => $currentTheme = value);
  $$unsubscribe_currentTheme();
  return `${validate_component(Switch, "Switch").$$render(
    $$result,
    Object.assign(
      {},
      { checked: $currentTheme.dark },
      {
        classes: {
          switch: "dark:bg-primary dark:border-primary",
          toggle: "translate-x-0 dark:translate-x-full"
        }
      },
      $$restProps
    ),
    {},
    {
      default: () => {
        return `<div class="grid grid-cols-1 grid-rows-1">${validate_component(Icon, "Icon").$$render(
          $$result,
          {
            data: mdiWeatherNight,
            size: ".8rem",
            class: "row-[1] col-[1] text-primary opacity-0 dark:opacity-100"
          },
          {},
          {}
        )} ${validate_component(Icon, "Icon").$$render(
          $$result,
          {
            data: mdiWhiteBalanceSunny,
            size: ".8rem",
            class: "row-[1] col-[1] text-primary opacity-100 dark:opacity-0"
          },
          {},
          {}
        )}</div>`;
      }
    }
  )}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<h1 class="text-lg font-bold border-b" data-svelte-h="svelte-1au5jj5">User Interface Settings</h1> <div class="flex flex-col gap-2"><h1 data-svelte-h="svelte-1ex3ats">Dark / Light Theme</h1> ${validate_component(ThemeSwitch, "ThemeSwitch").$$render($$result, {}, {}, {})} <h1 data-svelte-h="svelte-mktv0">Temperature Notation</h1> ${validate_component(SelectField, "SelectField").$$render(
    $$result,
    {
      value: 1,
      options: [
        {
          label: "Centigrade",
          value: 1,
          icon: mdiTemperatureCelsius
        },
        {
          label: "Fahrenheit",
          value: 2,
          icon: mdiTemperatureFahrenheit
        },
        {
          label: "Kelvin",
          value: 3,
          icon: mdiTemperatureKelvin
        }
      ]
    },
    {},
    {}
  )} <h1 data-svelte-h="svelte-b5of9f">EC Units</h1> ${validate_component(SelectField, "SelectField").$$render(
    $$result,
    {
      value: 1,
      options: [{ label: "μs/cm", value: 1 }, { label: "dS/m", value: 2 }]
    },
    {},
    {}
  )} <h1 data-svelte-h="svelte-1haa1ai">N/P/K Units</h1> ${validate_component(SelectField, "SelectField").$$render(
    $$result,
    {
      value: 1,
      options: [
        { label: "mg/kg", value: 1 },
        { label: "mg/l", value: 2 },
        { label: "mg/100g", value: 3 }
      ]
    },
    {},
    {}
  )} <h1 data-svelte-h="svelte-1qg6op2">Speed Units</h1> ${validate_component(SelectField, "SelectField").$$render(
    $$result,
    {
      value: 1,
      options: [
        { label: "Meters Per Hour", value: 1 },
        { label: "Miles Per Hour", value: 2 }
      ]
    },
    {},
    {}
  )}</div>`;
});
export {
  Page as default
};
