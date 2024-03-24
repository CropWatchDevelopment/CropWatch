import { c as create_ssr_component, a as subscribe, v as validate_component, l as each, e as escape } from "../../../../../../../../chunks/ssr.js";
import { D as DateRangeField, S as Svelvet, C as Controls, N as Node, a as CWBadge, T as Tabs } from "../../../../../../../../chunks/ContrastTheme.svelte_svelte_type_style_lang.js";
import { subSeconds } from "date-fns";
import { P as PeriodType } from "../../../../../../../../chunks/theme.js";
import { mdiThermometer, mdiWater, mdiBeaker, mdiShaker, mdiCalendarRange, mdiPlus, mdiChevronLeft } from "@mdi/js";
import { B as Button } from "../../../../../../../../chunks/Button.js";
import { D as Duration } from "../../../../../../../../chunks/Duration.js";
import "../../../../../../../../chunks/client.js";
import { p as page } from "../../../../../../../../chunks/stores.js";
import { C as CWStatCard } from "../../../../../../../../chunks/CWStatCard.js";
import "highcharts";
import "highcharts/highcharts-more.js";
import { C as Card, H as Header } from "../../../../../../../../chunks/Card.js";
import { w as writable } from "../../../../../../../../chunks/index2.js";
import { L as ListItem } from "../../../../../../../../chunks/ListItem.js";
const LineChart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { seriesData = [] } = $$props;
  ({
    chart: { height: 200 },
    title: { text: "", align: "left" },
    yAxis: { title: { text: "" } },
    xAxis: { type: "datetime" },
    plotOptions: {
      series: { label: { connectorAllowed: false } }
    },
    series: [{ name: "", data: [...seriesData] }],
    responsive: {
      rules: [
        {
          condition: { maxWidth: 800, maxHeight: 100 },
          chartOptions: {}
        }
      ]
    }
  });
  if ($$props.seriesData === void 0 && $$bindings.seriesData && seriesData !== void 0)
    $$bindings.seriesData(seriesData);
  return `<div class="container"></div>`;
});
const sensorDataState = writable([]);
const RadarChart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { N = 0 } = $$props;
  let { P = 0 } = $$props;
  let { K = 0 } = $$props;
  let { label = "" } = $$props;
  if ($$props.N === void 0 && $$bindings.N && N !== void 0)
    $$bindings.N(N);
  if ($$props.P === void 0 && $$bindings.P && P !== void 0)
    $$bindings.P(P);
  if ($$props.K === void 0 && $$bindings.K && K !== void 0)
    $$bindings.K(K);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  return `<div class="container"></div>`;
});
const Details = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let latest;
  let latestCollected_Time;
  let $sensorDataState, $$unsubscribe_sensorDataState;
  $$unsubscribe_sensorDataState = subscribe(sensorDataState, (value) => $sensorDataState = value);
  {
    console.log("sensor data", $sensorDataState.map((vals) => [new Date(vals.created_at), vals.soil_moisture]));
  }
  latest = $sensorDataState.at(0);
  latestCollected_Time = latest?.created_at;
  $$unsubscribe_sensorDataState();
  return `<div class="grid grid-cols-2 mt-10 gap-4 mb-2">${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      icon: mdiThermometer,
      title: "Temperature",
      value: $sensorDataState.at(0)?.soil_temperatureC,
      optimal: 24.33,
      notation: "°c",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )} ${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      icon: mdiWater,
      title: "Moisture",
      value: $sensorDataState.at(0)?.soil_moisture,
      optimal: 25,
      notation: "%",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )}</div> <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">${validate_component(Card, "Card").$$render($$result, {}, {}, {
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "Soil Temperature",
          slot: "header",
          class: "gap-0"
        },
        {},
        {
          subheading: () => {
            return `<div slot="subheading">Last Update ${validate_component(Duration, "Duration").$$render(
              $$result,
              {
                start: subSeconds(latestCollected_Time, 0),
                totalUnits: 1
              },
              {},
              {}
            )} ago</div>`;
          }
        }
      )}`;
    },
    default: () => {
      return `${validate_component(LineChart, "LineChart").$$render(
        $$result,
        {
          seriesData: $sensorDataState.map((vals) => {
            return {
              x: Math.floor(new Date(vals.created_at).getTime() / 1e3),
              y: vals.soil_temperatureC
            };
          })
        },
        {},
        {}
      )}`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, {}, {}, {
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "Soil Moisture",
          slot: "header",
          class: "gap-0"
        },
        {},
        {
          subheading: () => {
            return `<div slot="subheading">Last Update ${validate_component(Duration, "Duration").$$render(
              $$result,
              {
                start: subSeconds(latestCollected_Time, 0),
                totalUnits: 1
              },
              {},
              {}
            )} ago</div>`;
          }
        }
      )}`;
    },
    default: () => {
      return `<div class="flex flex-row">${validate_component(LineChart, "LineChart").$$render(
        $$result,
        {
          seriesData: $sensorDataState.map((vals) => {
            return {
              x: Math.floor(new Date(vals.created_at).getTime() / 1e3),
              y: vals.soil_moisture
            };
          })
        },
        {},
        {}
      )}</div>`;
    }
  })}</div> <div class="grid grid-cols-1 md:grid-cols-3 mt-2 gap-4 mb-2">${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      title: "Soil N",
      value: $sensorDataState.at(0)?.soil_N,
      optimal: 25,
      notation: "mg/kg",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )} ${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      title: "Soil P",
      value: $sensorDataState.at(0)?.soil_P,
      optimal: 25,
      notation: "mg/kg",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )} ${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      title: "Soil K",
      value: $sensorDataState.at(0)?.soil_K,
      optimal: 25,
      notation: "mg/kg",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )}</div> <div class="grid grid-cols-2 mt-2 gap-4 mb-2">${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      icon: mdiBeaker,
      title: "Soil pH",
      value: $sensorDataState.at(0)?.soil_PH,
      optimal: 5.6,
      notation: "pH",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )} ${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      icon: mdiShaker,
      title: "Soil EC",
      value: $sensorDataState.at(0)?.soil_EC,
      optimal: 1300,
      notation: "µs/cm",
      counterStartTime: latestCollected_Time
    },
    {},
    {}
  )}</div> ${validate_component(Card, "Card").$$render($$result, {}, {}, {
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "Soil NPK Map",
          slot: "header",
          class: "gap-0"
        },
        {},
        {
          subheading: () => {
            return `<div slot="subheading">Last Update ${validate_component(Duration, "Duration").$$render(
              $$result,
              {
                start: subSeconds(latestCollected_Time, 0),
                totalUnits: 1
              },
              {},
              {}
            )} ago</div>`;
          }
        }
      )}`;
    },
    default: () => {
      return `${validate_component(RadarChart, "RadarChart").$$render(
        $$result,
        {
          N: $sensorDataState.at(0)?.soil_N,
          P: $sensorDataState.at(0)?.soil_P,
          K: $sensorDataState.at(0)?.soil_K
        },
        {},
        {}
      )}`;
    }
  })} `;
});
const History = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let data;
  let $sensorDataState, $$unsubscribe_sensorDataState;
  $$unsubscribe_sensorDataState = subscribe(sensorDataState, (value) => $sensorDataState = value);
  let selectedDateRange = {
    from: /* @__PURE__ */ new Date(),
    to: /* @__PURE__ */ new Date(),
    periodType: PeriodType.Day
  };
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    data = $sensorDataState;
    $$rendered = `<div class="m-4"><h2 data-svelte-h="svelte-1ug1muq">History list</h2> <ol class="mt-2">${validate_component(DateRangeField, "DateRangeField").$$render(
      $$result,
      {
        stepper: true,
        icon: mdiCalendarRange,
        value: selectedDateRange
      },
      {
        value: ($$value) => {
          selectedDateRange = $$value;
          $$settled = false;
        }
      },
      {}
    )} <ol>${each(data, (uplink) => {
      return `${validate_component(ListItem, "ListItem").$$render(
        $$result,
        {
          title: uplink.soil_temperatureC,
          subheading: "Subheading"
        },
        {},
        {}
      )}`;
    })}</ol></ol></div>`;
  } while (!$$settled);
  $$unsubscribe_sensorDataState();
  return $$rendered;
});
const css = {
  code: ":root[svelvet-theme='custom-theme']{--node-color:hsl(225, 30%, 50%);--node-border-color:hsl(225, 20%, 40%);--node-selection-color:hsl(45, 90%, 60%);--text-color:hsl(0, 0%, 100%);--background-color:hsl(225, 20%, 27%);--dot-color:hsl(225, 10%, 50%);--accent-color:hsl(45, 90%, 60%);--primary-color:hsl(225, 30%, 66%);--edge-color:hsl(0, 0%, 100%);--target-edge-color:hsl(225, 20%, 40%);--anchor-color:hsl(45, 90%, 67%);--anchor-border-color:hsl(45, 90%, 87%);--anchor-connected:hsl(45, 90%, 100%);--anchor-connected-border:hsl(225, 20%, 20%);--anchor-connecting:hsl(225, 30%, 40%);--anchor-connecting-border:hsl(0, 0%, 100%);--anchor-hovering:hsl(225, 20%, 46%);--anchor-hovering-border:hsl(0, 0%, 0%);--minimap-background-color:hsl(225, 20%, 27%);--minimap-node-color:hsl(225, 30%, 20%);--controls-background-color:hsl(225, 20%, 27%);--controls-text-color:hsl(0, 0%, 100%);--theme-toggle-text-color:hsl(0, 0%, 100%);--theme-toggle-color:hsl(225, 20%, 27%)}",
  map: null
};
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
const Rules = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let divWidth = 300;
  let ifs = [
    {
      id: uuidv4(),
      label: "new IF",
      inputs: 1,
      outputs: 2
    }
  ];
  $$result.css.add(css);
  {
    console.log(divWidth);
  }
  return `<h1 class="text-4xl font-semibold text-slate-700 mb-4" data-svelte-h="svelte-1fhxmg2">Sensor Rules</h1> <div class="mr-4">${validate_component(Svelvet, "Svelvet").$$render(
    $$result,
    {
      height: 500,
      theme: "dark",
      zoom: 0.5,
      minimap: true
    },
    {},
    {
      controls: () => {
        return `${validate_component(Controls, "Controls").$$render($$result, { slot: "controls", horizontal: true }, {}, {})}`;
      },
      default: () => {
        return `${validate_component(Node, "Node").$$render(
          $$result,
          {
            label: "This Sensor",
            position: { x: divWidth / 2, y: -200 },
            locked: true,
            inputs: 0,
            outputs: 1,
            TD: true
          },
          {},
          {}
        )} ${each(ifs, (i) => {
          return `${validate_component(Node, "Node").$$render(
            $$result,
            {
              id: i.id,
              label: i.label,
              inputs: i.inputs,
              outputs: i.outputs,
              TD: true
            },
            {},
            {}
          )}`;
        })}`;
      }
    }
  )} ${validate_component(Button, "Button").$$render($$result, { icon: mdiPlus }, {}, {
    default: () => {
      return `New IF`;
    }
  })} </div>`;
});
const Notifications = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const notifications = [];
  return `<div class="m-4"><h2 data-svelte-h="svelte-1uqojne">Notifications</h2> <ol>${each(notifications, (notification) => {
    return `${validate_component(ListItem, "ListItem").$$render(
      $$result,
      {
        title: notification.title,
        subheading: notification.subtitle,
        icon: notification.icon,
        avatar: { class: "bg-gray-400 text-white/90" }
      },
      {},
      {}
    )}`;
  })} ${notifications.length === 0 ? `<h3 class="text-center" data-svelte-h="svelte-de1kkv">All Cought Up!</h3>` : ``}</ol></div>`;
});
const Settings = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `Settings`;
});
const Permissions = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `Permissions`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  let userAvailableTabs = [
    { label: "Dashboard", value: 1 },
    { label: "History", value: 2 },
    { label: "Rules", value: 3 },
    { label: "Notifications", value: 4 },
    { label: "Settings", value: 5 },
    { label: "Permissions", value: 6 }
  ];
  let currentTab = 1;
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      console.log("page data", data.sensor.data);
    }
    {
      sensorDataState.set(data.sensor.error ? [] : data.sensor.data);
    }
    $$rendered = ` <h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">${validate_component(Button, "Button").$$render(
      $$result,
      {
        variant: "outline",
        icon: mdiChevronLeft,
        size: "lg"
      },
      {},
      {}
    )} <p class="my-auto" data-svelte-h="svelte-yxkzft">CW-SS-THEPNPK</p></h1> <div class="grid grid-cols-3 grid-flow-row my-4"><div class="flex flex-col" data-svelte-h="svelte-1z8ot3"><p class="mb-1 text-gray-600">Serial Number</p> <p class="text-sm">3234313765327904</p></div> <div class="flex flex-col"><p class="mb-1 text-gray-600" data-svelte-h="svelte-10jov3t">Last Update</p> <p class="text-sm">${escape(new Date(data.sensor.data?.at(0).created_at).toLocaleTimeString())} <small>(${validate_component(Duration, "Duration").$$render(
      $$result,
      {
        start: subSeconds(data.sensor.data?.at(0).created_at, 0),
        totalUnits: 1
      },
      {},
      {}
    )} ago)</small></p></div> <div class="flex flex-col"><p class="mb-1 text-gray-600" data-svelte-h="svelte-16miroz">Tags</p> <div>${validate_component(CWBadge, "CwBadge").$$render(
      $$result,
      {
        text: "test",
        twTextColor: "text-blue-800",
        twBgColor: "bg-blue-100"
      },
      {},
      {}
    )}</div></div></div> ${validate_component(Tabs, "Tabs").$$render(
      $$result,
      {
        options: userAvailableTabs,
        classes: {
          content: "border px-4 py-2 rounded-b rounded-tr",
          tab: { root: "rounded-t" }
        },
        value: currentTab
      },
      {
        value: ($$value) => {
          currentTab = $$value;
          $$settled = false;
        }
      },
      {
        content: ({ value }) => {
          return `${value === 1 ? `${validate_component(Details, "Details").$$render($$result, {}, {}, {})}` : `${value === 2 ? `${validate_component(History, "History").$$render($$result, {}, {}, {})}` : `${value === 3 ? `${validate_component(Rules, "Rules").$$render($$result, {}, {}, {})}` : `${value === 4 ? `${validate_component(Notifications, "Notifications").$$render($$result, {}, {}, {})}` : `${value === 5 ? `${validate_component(Settings, "Settings").$$render($$result, {}, {}, {})}` : `${value === 6 ? `${validate_component(Permissions, "Permissions").$$render($$result, {}, {}, {})}` : ``}`}`}`}`}`}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_page();
  return $$rendered;
});
export {
  Page as default
};
