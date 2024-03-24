import { r as run_all, c as create_ssr_component, d as createEventDispatcher, o as getContext, s as setContext, p as onDestroy, f as add_attribute, e as escape, v as validate_component, q as is_function, t as get_store_value, k as noop, u as identity, a as subscribe, l as each, m as missing_component, w as get_current_component, g as add_styles, i as set_store_value, j as is_promise } from "../../../../../chunks/ssr.js";
import "../../../../../chunks/client.js";
import { mdiWater, mdiCloud, mdiArrowUpThin, mdiWeatherWindy, mdiWeatherSunny, mdiGauge, mdiMeterGas, mdiThermometer, mdiMapMarker, mdiEye, mdiPlus, mdiMinus, mdiMagnify, mdiCloseCircleOutline, mdiCompare, mdiDotsVertical, mdiDevices, mdiChevronLeft, mdiCalendar } from "@mdi/js";
import "../../../../../chunks/theme.js";
import { I as Icon, B as Button, P as ProgressCircle } from "../../../../../chunks/Button.js";
import { A as Avatar } from "../../../../../chunks/Overlay.js";
import { C as Card, H as Header$1 } from "../../../../../chunks/Card.js";
import { M as Menu, a as MenuItem } from "../../../../../chunks/MenuItem.js";
import { T as Toggle } from "../../../../../chunks/Toggle.js";
import { C as Checkbox, L as Leaflet } from "../../../../../chunks/Leaflet.js";
import "leaflet";
import "highcharts";
import "highcharts/modules/windbarb.js";
import "highcharts/highcharts-more.js";
import { f as flush_render_callbacks, t as tick } from "../../../../../chunks/scheduler.js";
import { d as derived, r as readable, w as writable } from "../../../../../chunks/index2.js";
import { p as page } from "../../../../../chunks/stores.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { C as CWStatCard } from "../../../../../chunks/CWStatCard.js";
import { T as TextField } from "../../../../../chunks/TextField.js";
import { s as supabase } from "../../../../../chunks/supabaseClient.js";
import { S as SelectField } from "../../../../../chunks/SelectField.js";
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
const DeviceIntToEnglish = (dev_int_type) => {
  switch (dev_int_type) {
    case 0:
      return "?";
    case 1:
      return "CO² Sensor";
    case 2:
      return "Temp/Humidity/Dew/VPD Sensor";
    case 3:
      return "CropWatch Legacy Box";
    case 4:
      return "CropWatch Soil Sensor V2";
    case 5:
      return "Meter Pulse Sensor";
    case 6:
      return "CO² Sensor";
    default:
      return "?";
  }
};
const WeatherChart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { WeatherJSON = null } = $$props;
  if ($$props.WeatherJSON === void 0 && $$bindings.WeatherJSON && WeatherJSON !== void 0)
    $$bindings.WeatherJSON(WeatherJSON);
  return `<div id="container"></div>`;
});
const Marker = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { width } = $$props;
  let { height } = $$props;
  let { latLng } = $$props;
  let marker;
  let markerElement;
  createEventDispatcher();
  const { getMap } = getContext("map");
  getMap();
  setContext("layer", { getLayer: () => marker });
  onDestroy(() => {
    marker?.remove();
    marker = void 0;
  });
  setContext("layer", { getLayer: () => marker });
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.latLng === void 0 && $$bindings.latLng && latLng !== void 0)
    $$bindings.latLng(latLng);
  return `<div style="z-index: 1000000;"${add_attribute("this", markerElement, 0)}>${marker ? `${slots.default ? slots.default({}) : ``}` : ``}</div>`;
});
const OvercastSky = "/_app/immutable/assets/overcastSky.BRMQeqFw.jpg";
const WeatherWidget = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { TemperatureC } = $$props;
  let { Humidity } = $$props;
  let { WindSpeed } = $$props;
  let { WindDirection = 50 } = $$props;
  let { Pressure } = $$props;
  let { UVI } = $$props;
  let { LUX } = $$props;
  let { Rainfall = 0 } = $$props;
  if ($$props.TemperatureC === void 0 && $$bindings.TemperatureC && TemperatureC !== void 0)
    $$bindings.TemperatureC(TemperatureC);
  if ($$props.Humidity === void 0 && $$bindings.Humidity && Humidity !== void 0)
    $$bindings.Humidity(Humidity);
  if ($$props.WindSpeed === void 0 && $$bindings.WindSpeed && WindSpeed !== void 0)
    $$bindings.WindSpeed(WindSpeed);
  if ($$props.WindDirection === void 0 && $$bindings.WindDirection && WindDirection !== void 0)
    $$bindings.WindDirection(WindDirection);
  if ($$props.Pressure === void 0 && $$bindings.Pressure && Pressure !== void 0)
    $$bindings.Pressure(Pressure);
  if ($$props.UVI === void 0 && $$bindings.UVI && UVI !== void 0)
    $$bindings.UVI(UVI);
  if ($$props.LUX === void 0 && $$bindings.LUX && LUX !== void 0)
    $$bindings.LUX(LUX);
  if ($$props.Rainfall === void 0 && $$bindings.Rainfall && Rainfall !== void 0)
    $$bindings.Rainfall(Rainfall);
  return `<div class="flex flex-col items-center justify-center"> <div class="w-full p-5 rounded-xl z-20" style="${"background-image: URL(" + escape(OvercastSky, true) + ")"}"><div class="flex justify-between"><div class="flex flex-col"><span class="text-6xl font-bold">${escape(TemperatureC != void 0 ? TemperatureC : "--")}°C</span> <span class="font-semibold mt-1 text-gray-500" data-svelte-h="svelte-n8gwd6">西都市,宮崎</span></div> </div> <div class="flex justify-between mt-3"><div class="flex flex-col items-center"><span class="font-semibold text-lg">${escape(Humidity != void 0 ? Humidity : "--")}%</span> ${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      data: mdiWater,
      classes: { root: "w-12 h-12" }
    },
    {},
    {}
  )} <span class="text-xs font-semibold text-gray-400" data-svelte-h="svelte-phiar5">Air Humdity</span></div> <div class="flex flex-col items-center"><span class="font-semibold text-lg">${escape(Rainfall != void 0 ? Rainfall : "--")} mm/h</span> ${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      data: mdiCloud,
      classes: { root: "w-12 h-12" }
    },
    {},
    {}
  )} <span class="text-xs font-semibold text-gray-400" data-svelte-h="svelte-1xq1fyo">Rainfall</span></div> <div class="flex flex-col items-center"><span class="font-semibold text-lg">${escape(WindSpeed != void 0 ? WindSpeed : "--")} mph (
					${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      data: mdiArrowUpThin,
      style: "transform: rotate(" + WindDirection + "deg)"
    },
    {},
    {}
  )}
				)</span> ${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      data: mdiWeatherWindy,
      classes: { root: "w-12 h-12" }
    },
    {},
    {}
  )} <span class="text-xs font-semibold text-gray-400" data-svelte-h="svelte-1hyhma6">Wind Speed</span></div> <div class="flex flex-col items-center"><span class="font-semibold text-lg">${escape(LUX != void 0 ? LUX : "--")} (${escape(UVI != void 0 ? UVI : "--")}UVI)</span> ${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      data: mdiWeatherSunny,
      classes: { root: "w-12 h-12" }
    },
    {},
    {}
  )} <span class="text-xs font-semibold text-gray-400" data-svelte-h="svelte-ivyli6">LUX/UV</span></div> <div class="flex flex-col items-center"><span class="font-semibold text-lg">${escape(Pressure != void 0 ? Pressure : "--")}hPa</span> ${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      data: mdiGauge,
      classes: { root: "w-12 h-12" }
    },
    {},
    {}
  )} <span class="text-xs font-semibold text-gray-400" data-svelte-h="svelte-1ekdg1k">Pressure</span></div></div></div> </div>`;
});
const DAY_IN_SECONDS = 86400;
function createDate(input = void 0) {
  if (input !== void 0) {
    return input instanceof Date ? _fromLocalDate(input) : _fromISOString(input);
  }
  return _fromLocalDate(/* @__PURE__ */ new Date());
}
function createDuration(input) {
  if (typeof input === "number") {
    input = { seconds: input };
  } else if (typeof input === "string") {
    let seconds = 0, exp = 2;
    for (let part of input.split(":", 3)) {
      seconds += parseInt(part, 10) * Math.pow(60, exp--);
    }
    input = { seconds };
  } else if (input instanceof Date) {
    input = { hours: input.getUTCHours(), minutes: input.getUTCMinutes(), seconds: input.getUTCSeconds() };
  }
  let weeks = input.weeks || input.week || 0;
  return {
    years: input.years || input.year || 0,
    months: input.months || input.month || 0,
    days: weeks * 7 + (input.days || input.day || 0),
    seconds: (input.hours || input.hour || 0) * 60 * 60 + (input.minutes || input.minute || 0) * 60 + (input.seconds || input.second || 0),
    inWeeks: !!weeks
  };
}
function cloneDate(date) {
  return new Date(date.getTime());
}
function addDuration(date, duration, x = 1) {
  date.setUTCFullYear(date.getUTCFullYear() + x * duration.years);
  let month = date.getUTCMonth() + x * duration.months;
  date.setUTCMonth(month);
  month %= 12;
  if (month < 0) {
    month += 12;
  }
  while (date.getUTCMonth() !== month) {
    subtractDay(date);
  }
  date.setUTCDate(date.getUTCDate() + x * duration.days);
  date.setUTCSeconds(date.getUTCSeconds() + x * duration.seconds);
  return date;
}
function addDay(date, x = 1) {
  date.setUTCDate(date.getUTCDate() + x);
  return date;
}
function subtractDay(date, x = 1) {
  return addDay(date, -x);
}
function setMidnight(date) {
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
function toLocalDate(date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}
function toISOString(date, len = 19) {
  return date.toISOString().substring(0, len);
}
function datesEqual(date1, ...dates2) {
  return dates2.every((date2) => date1.getTime() === date2.getTime());
}
function nextClosestDay(date, day) {
  let diff2 = day - date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (diff2 >= 0 ? diff2 : diff2 + 7));
  return date;
}
function prevClosestDay(date, day) {
  let diff2 = day - date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (diff2 <= 0 ? diff2 : diff2 - 7));
  return date;
}
function noTimePart(date) {
  return typeof date === "string" && date.length <= 10;
}
function copyTime(toDate, fromDate) {
  toDate.setUTCHours(fromDate.getUTCHours(), fromDate.getUTCMinutes(), fromDate.getUTCSeconds(), 0);
  return toDate;
}
function _fromLocalDate(date) {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ));
}
function _fromISOString(str) {
  const parts = str.match(/\d+/g);
  return new Date(Date.UTC(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
    Number(parts[3] || 0),
    Number(parts[4] || 0),
    Number(parts[5] || 0)
  ));
}
function debounce(fn, handle, queueStore) {
  queueStore.update((queue) => queue.set(handle, fn));
}
function assign(...args) {
  return Object.assign(...args);
}
function keys(object) {
  return Object.keys(object);
}
function symbol() {
  return Symbol("ec");
}
function createElement(tag, className, content, attrs = []) {
  let el = document.createElement(tag);
  el.className = className;
  if (typeof content == "string") {
    el.innerText = content;
  } else if (content.domNodes) {
    el.replaceChildren(...content.domNodes);
  } else if (content.html) {
    el.innerHTML = content.html;
  }
  for (let attr of attrs) {
    el.setAttribute(...attr);
  }
  return el;
}
let payloadProp = symbol();
function hasPayload(el) {
  return !!el?.[payloadProp];
}
function getPayload(el) {
  return el[payloadProp];
}
function getElementWithPayload(x, y, root = document) {
  for (let el of root.elementsFromPoint(x, y)) {
    if (hasPayload(el)) {
      return el;
    }
    if (el.shadowRoot) {
      let shadowEl = getElementWithPayload(x, y, el.shadowRoot);
      if (shadowEl) {
        return shadowEl;
      }
    }
  }
  return null;
}
function createView(view2, _viewTitle, _currentRange, _activeRange) {
  return {
    type: view2,
    title: _viewTitle,
    currentStart: _currentRange.start,
    currentEnd: _currentRange.end,
    activeStart: _activeRange.start,
    activeEnd: _activeRange.end,
    calendar: void 0
  };
}
function toViewWithLocalDates(view2) {
  view2 = assign({}, view2);
  view2.currentStart = toLocalDate(view2.currentStart);
  view2.currentEnd = toLocalDate(view2.currentEnd);
  view2.activeStart = toLocalDate(view2.activeStart);
  view2.activeEnd = toLocalDate(view2.activeEnd);
  return view2;
}
function listView(view2) {
  return view2.startsWith("list");
}
let eventId = 1;
function createEvents(input) {
  return input.map((event) => ({
    id: "id" in event ? String(event.id) : `{generated-${eventId++}}`,
    resourceIds: Array.isArray(event.resourceIds) ? event.resourceIds.map(String) : "resourceId" in event ? [String(event.resourceId)] : [],
    allDay: event.allDay ?? (noTimePart(event.start) && noTimePart(event.end)),
    start: createDate(event.start),
    end: createDate(event.end),
    title: event.title || "",
    titleHTML: event.titleHTML || "",
    editable: event.editable,
    startEditable: event.startEditable,
    durationEditable: event.durationEditable,
    display: event.display || "auto",
    extendedProps: event.extendedProps || {},
    backgroundColor: event.backgroundColor || event.color,
    textColor: event.textColor
  }));
}
function createEventSources(input) {
  return input.map((source) => ({
    events: source.events,
    url: source.url && source.url.trimEnd("&") || "",
    method: source.method && source.method.toUpperCase() || "GET",
    extraParams: source.extraParams || {}
  }));
}
function createEventChunk(event, start, end) {
  return {
    start: event.start > start ? event.start : start,
    end: event.end < end ? event.end : end,
    event
  };
}
function sortEventChunks(chunks) {
  chunks.sort((a, b) => a.start - b.start || b.event.allDay - a.event.allDay);
}
function createEventContent(chunk, displayEventEnd, eventContent, theme, _intlEventTime, _view) {
  let timeText = _intlEventTime.formatRange(
    chunk.start,
    displayEventEnd && chunk.event.display !== "pointer" ? copyTime(cloneDate(chunk.start), chunk.end) : chunk.start
  );
  let content;
  if (eventContent) {
    content = is_function(eventContent) ? eventContent({
      event: toEventWithLocalDates(chunk.event),
      timeText,
      view: toViewWithLocalDates(_view)
    }) : eventContent;
  } else {
    let domNodes;
    switch (chunk.event.display) {
      case "background":
        domNodes = [];
        break;
      case "pointer":
        domNodes = [createTimeElement(timeText, chunk, theme)];
        break;
      default:
        domNodes = [
          ...chunk.event.allDay ? [] : [createTimeElement(timeText, chunk, theme)],
          createElement("h4", theme.eventTitle, chunk.event.title)
        ];
    }
    content = { domNodes };
  }
  return [timeText, content];
}
function createTimeElement(timeText, chunk, theme) {
  return createElement(
    "time",
    theme.eventTime,
    timeText,
    [["datetime", toISOString(chunk.start)]]
  );
}
function createEventClasses(eventClassNames, event, _view) {
  if (eventClassNames) {
    if (is_function(eventClassNames)) {
      eventClassNames = eventClassNames({
        event: toEventWithLocalDates(event),
        view: toViewWithLocalDates(_view)
      });
    }
    return Array.isArray(eventClassNames) ? eventClassNames : [eventClassNames];
  }
  return [];
}
function toEventWithLocalDates(event) {
  return _cloneEvent(event, toLocalDate);
}
function _cloneEvent(event, dateFn) {
  event = assign({}, event);
  event.start = dateFn(event.start);
  event.end = dateFn(event.end);
  return event;
}
function prepareEventChunks(chunks, hiddenDays) {
  let longChunks = {};
  if (chunks.length) {
    sortEventChunks(chunks);
    let prevChunk;
    for (let chunk of chunks) {
      let dates = [];
      let date = setMidnight(cloneDate(chunk.start));
      while (chunk.end > date) {
        if (!hiddenDays.includes(date.getUTCDay())) {
          dates.push(cloneDate(date));
          if (dates.length > 1) {
            let key = date.getTime();
            if (longChunks[key]) {
              longChunks[key].chunks.push(chunk);
            } else {
              longChunks[key] = {
                sorted: false,
                chunks: [chunk]
              };
            }
          }
        }
        addDay(date);
      }
      if (dates.length) {
        chunk.date = dates[0];
        chunk.days = dates.length;
        chunk.dates = dates;
        if (chunk.start < dates[0]) {
          chunk.start = dates[0];
        }
        if (setMidnight(cloneDate(chunk.end)) > dates[dates.length - 1]) {
          chunk.end = dates[dates.length - 1];
        }
      } else {
        chunk.date = setMidnight(cloneDate(chunk.start));
        chunk.days = 1;
        chunk.dates = [chunk.date];
      }
      if (prevChunk && datesEqual(prevChunk.date, chunk.date)) {
        chunk.prev = prevChunk;
      }
      prevChunk = chunk;
    }
  }
  return longChunks;
}
function runReposition(refs, data) {
  refs.length = data.length;
  for (let ref of refs) {
    ref?.reposition?.();
  }
}
function eventIntersects(event, start, end, resource, timeMode) {
  return (event.start < end && event.end > start || !timeMode && datesEqual(event.start, event.end, start)) && (resource === void 0 || event.resourceIds.includes(resource.id));
}
function helperEvent(display) {
  return previewEvent(display) || ghostEvent(display) || pointerEvent(display);
}
function bgEvent(display) {
  return display === "background";
}
function previewEvent(display) {
  return display === "preview";
}
function ghostEvent(display) {
  return display === "ghost";
}
function pointerEvent(display) {
  return display === "pointer";
}
function btnTextMonth(text) {
  return btnText(text, "month");
}
function btnText(text, period) {
  return {
    ...text,
    next: "Next " + period,
    prev: "Previous " + period
  };
}
function themeView(view2) {
  return (theme) => ({ ...theme, view: view2 });
}
function intl(locale, format) {
  return derived([locale, format], ([$locale, $format]) => {
    let intl2 = is_function($format) ? { format: $format } : new Intl.DateTimeFormat($locale, $format);
    return {
      format: (date) => intl2.format(toLocalDate(date))
    };
  });
}
function intlRange(locale, format) {
  return derived([locale, format], ([$locale, $format]) => {
    let formatRange;
    if (is_function($format)) {
      formatRange = $format;
    } else {
      let intl2 = new Intl.DateTimeFormat($locale, $format);
      formatRange = (start, end) => {
        if (start <= end) {
          return intl2.formatRange(start, end);
        } else {
          let parts = intl2.formatRangeToParts(end, start);
          let result = "";
          let sources = ["startRange", "endRange"];
          let processed = [false, false];
          for (let part of parts) {
            let i = sources.indexOf(part.source);
            if (i >= 0) {
              if (!processed[i]) {
                result += _getParts(sources[1 - i], parts);
                processed[i] = true;
              }
            } else {
              result += part.value;
            }
          }
          return result;
        }
      };
    }
    return {
      formatRange: (start, end) => formatRange(toLocalDate(start), toLocalDate(end))
    };
  });
}
function _getParts(source, parts) {
  let result = "";
  for (let part of parts) {
    if (part.source == source) {
      result += part.value;
    }
  }
  return result;
}
function createOptions(plugins) {
  let options = {
    allDayContent: void 0,
    allDaySlot: true,
    buttonText: {
      today: "today"
    },
    date: /* @__PURE__ */ new Date(),
    datesSet: void 0,
    dayHeaderFormat: {
      weekday: "short",
      month: "numeric",
      day: "numeric"
    },
    dayHeaderAriaLabelFormat: {
      dateStyle: "long"
    },
    displayEventEnd: true,
    duration: { weeks: 1 },
    events: [],
    eventAllUpdated: void 0,
    eventBackgroundColor: void 0,
    eventTextColor: void 0,
    eventClassNames: void 0,
    eventClick: void 0,
    eventColor: void 0,
    eventContent: void 0,
    eventDidMount: void 0,
    eventMouseEnter: void 0,
    eventMouseLeave: void 0,
    eventSources: [],
    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit"
    },
    firstDay: 0,
    flexibleSlotTimeLimits: false,
    // ec option
    headerToolbar: {
      start: "title",
      center: "",
      end: "today prev,next"
    },
    height: void 0,
    hiddenDays: [],
    highlightedDates: [],
    // ec option
    lazyFetching: true,
    loading: void 0,
    locale: void 0,
    nowIndicator: false,
    selectable: false,
    scrollTime: "06:00:00",
    slotDuration: "00:30:00",
    slotEventOverlap: true,
    slotHeight: 24,
    // ec option
    slotLabelFormat: {
      hour: "numeric",
      minute: "2-digit"
    },
    slotMaxTime: "24:00:00",
    slotMinTime: "00:00:00",
    theme: {
      allDay: "ec-all-day",
      active: "ec-active",
      bgEvent: "ec-bg-event",
      bgEvents: "ec-bg-events",
      body: "ec-body",
      button: "ec-button",
      buttonGroup: "ec-button-group",
      calendar: "ec",
      compact: "ec-compact",
      content: "ec-content",
      day: "ec-day",
      dayHead: "ec-day-head",
      days: "ec-days",
      event: "ec-event",
      eventBody: "ec-event-body",
      eventTime: "ec-event-time",
      eventTitle: "ec-event-title",
      events: "ec-events",
      extra: "ec-extra",
      handle: "ec-handle",
      header: "ec-header",
      hiddenScroll: "ec-hidden-scroll",
      highlight: "ec-highlight",
      icon: "ec-icon",
      line: "ec-line",
      lines: "ec-lines",
      nowIndicator: "ec-now-indicator",
      otherMonth: "ec-other-month",
      sidebar: "ec-sidebar",
      sidebarTitle: "ec-sidebar-title",
      today: "ec-today",
      time: "ec-time",
      title: "ec-title",
      toolbar: "ec-toolbar",
      view: "",
      weekdays: ["ec-sun", "ec-mon", "ec-tue", "ec-wed", "ec-thu", "ec-fri", "ec-sat"],
      withScroll: "ec-with-scroll"
    },
    titleFormat: {
      year: "numeric",
      month: "short",
      day: "numeric"
    },
    view: void 0,
    viewDidMount: void 0,
    views: {}
  };
  for (let plugin of plugins) {
    plugin.createOptions?.(options);
  }
  return options;
}
function createParsers(plugins) {
  let parsers = {
    date: (date) => setMidnight(createDate(date)),
    duration: createDuration,
    events: createEvents,
    eventSources: createEventSources,
    hiddenDays: (days2) => [...new Set(days2)],
    highlightedDates: (dates) => dates.map(createDate),
    scrollTime: createDuration,
    slotDuration: createDuration,
    slotMaxTime: createDuration,
    slotMinTime: createDuration
  };
  for (let plugin of plugins) {
    plugin.createParsers?.(parsers);
  }
  return parsers;
}
function diff(options, prevOptions) {
  let diff2 = [];
  for (let key of keys(options)) {
    if (options[key] !== prevOptions[key]) {
      diff2.push([key, options[key]]);
    }
  }
  assign(prevOptions, options);
  return diff2;
}
function dayGrid(state) {
  return derived(state.view, ($view) => $view?.startsWith("dayGrid"));
}
function activeRange(state) {
  return derived(
    [state._currentRange, state.firstDay, state.slotMaxTime, state._dayGrid],
    ([$_currentRange, $firstDay, $slotMaxTime, $_dayGrid]) => {
      let start = cloneDate($_currentRange.start);
      let end = cloneDate($_currentRange.end);
      if ($_dayGrid) {
        prevClosestDay(start, $firstDay);
        nextClosestDay(end, $firstDay);
      } else if ($slotMaxTime.days || $slotMaxTime.seconds > DAY_IN_SECONDS) {
        addDuration(subtractDay(end), $slotMaxTime);
        let start2 = subtractDay(cloneDate(end));
        if (start2 < start) {
          start = start2;
        }
      }
      return { start, end };
    }
  );
}
function currentRange(state) {
  return derived(
    [state.date, state.duration, state.firstDay, state._dayGrid],
    ([$date, $duration, $firstDay, $_dayGrid]) => {
      let start = cloneDate($date), end;
      if ($_dayGrid) {
        start.setUTCDate(1);
      } else if ($duration.inWeeks) {
        prevClosestDay(start, $firstDay);
      }
      end = addDuration(cloneDate(start), $duration);
      return { start, end };
    }
  );
}
function viewDates(state) {
  return derived([state._activeRange, state.hiddenDays], ([$_activeRange, $hiddenDays]) => {
    let dates = [];
    let date = setMidnight(cloneDate($_activeRange.start));
    let end = setMidnight(cloneDate($_activeRange.end));
    while (date < end) {
      if (!$hiddenDays.includes(date.getUTCDay())) {
        dates.push(cloneDate(date));
      }
      addDay(date);
    }
    if (!dates.length && $hiddenDays.length && $hiddenDays.length < 7) {
      state.date.update((date2) => {
        while ($hiddenDays.includes(date2.getUTCDay())) {
          addDay(date2);
        }
        return date2;
      });
      dates = get_store_value(state._viewDates);
    }
    return dates;
  });
}
function viewTitle(state) {
  return derived(
    [state.date, state._activeRange, state._intlTitle, state._dayGrid],
    ([$date, $_activeRange, $_intlTitle, $_dayGrid]) => {
      return $_dayGrid ? $_intlTitle.formatRange($date, $date) : $_intlTitle.formatRange($_activeRange.start, subtractDay(cloneDate($_activeRange.end)));
    }
  );
}
function view(state) {
  return derived([state.view, state._viewTitle, state._currentRange, state._activeRange], (args) => createView(...args));
}
function events(state) {
  let _events = writable([]);
  let abortController;
  let fetching = 0;
  let debounceHandle = {};
  derived(
    [state.events, state.eventSources, state._activeRange, state._fetchedRange, state.lazyFetching, state.loading],
    (values, set) => debounce(() => {
      let [$events, $eventSources, $_activeRange, $_fetchedRange, $lazyFetching, $loading] = values;
      if (!$eventSources.length) {
        set($events);
        return;
      }
      if (!$_fetchedRange.start || $_fetchedRange.start > $_activeRange.start || $_fetchedRange.end < $_activeRange.end || !$lazyFetching) {
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();
        if (is_function($loading) && !fetching) {
          $loading(true);
        }
        let stopLoading = () => {
          if (--fetching === 0 && is_function($loading)) {
            $loading(false);
          }
        };
        let events2 = [];
        let failure = (e) => stopLoading();
        let success = (data) => {
          events2 = events2.concat(createEvents(data));
          set(events2);
          stopLoading();
        };
        let startStr = toISOString($_activeRange.start);
        let endStr = toISOString($_activeRange.end);
        for (let source of $eventSources) {
          if (is_function(source.events)) {
            let result = source.events({
              start: toLocalDate($_activeRange.start),
              end: toLocalDate($_activeRange.end),
              startStr,
              endStr
            }, success, failure);
            if (result !== void 0) {
              Promise.resolve(result).then(success, failure);
            }
          } else {
            let params = is_function(source.extraParams) ? source.extraParams() : assign({}, source.extraParams);
            params.start = startStr;
            params.end = endStr;
            params = new URLSearchParams(params);
            let url = source.url, headers = {}, body;
            if (["GET", "HEAD"].includes(source.method)) {
              url += (url.includes("?") ? "&" : "?") + params;
            } else {
              headers["content-type"] = "application/x-www-form-urlencoded;charset=UTF-8";
              body = String(params);
            }
            fetch(url, { method: source.method, headers, body, signal: abortController.signal, credentials: "same-origin" }).then((response) => response.json()).then(success).catch(failure);
          }
          ++fetching;
        }
        $_fetchedRange.start = $_activeRange.start;
        $_fetchedRange.end = $_activeRange.end;
      }
    }, debounceHandle, state._queue),
    []
  ).subscribe(_events.set);
  return _events;
}
function now() {
  return readable(createDate(), (set) => {
    let interval = setInterval(() => {
      set(createDate());
    }, 1e3);
    return () => clearInterval(interval);
  });
}
function today(state) {
  return derived(state._now, ($_now) => setMidnight(cloneDate($_now)));
}
class State {
  constructor(plugins, input) {
    plugins = plugins || [];
    let options = createOptions(plugins);
    let parsers = createParsers(plugins);
    options = parseOpts(options, parsers);
    input = parseOpts(input, parsers);
    for (let [option, value] of Object.entries(options)) {
      this[option] = writable(value);
    }
    this._queue = writable(/* @__PURE__ */ new Map());
    this._queue2 = writable(/* @__PURE__ */ new Map());
    this._tasks = /* @__PURE__ */ new Map();
    this._auxiliary = writable([]);
    this._dayGrid = dayGrid(this);
    this._currentRange = currentRange(this);
    this._activeRange = activeRange(this);
    this._fetchedRange = writable({ start: void 0, end: void 0 });
    this._events = events(this);
    this._now = now();
    this._today = today(this);
    this._intlEventTime = intlRange(this.locale, this.eventTimeFormat);
    this._intlSlotLabel = intl(this.locale, this.slotLabelFormat);
    this._intlDayHeader = intl(this.locale, this.dayHeaderFormat);
    this._intlDayHeaderAL = intl(this.locale, this.dayHeaderAriaLabelFormat);
    this._intlTitle = intlRange(this.locale, this.titleFormat);
    this._bodyEl = writable(void 0);
    this._scrollable = writable(false);
    this._viewTitle = viewTitle(this);
    this._viewDates = viewDates(this);
    this._view = view(this);
    this._viewComponent = writable(void 0);
    this._resBgColor = writable(noop);
    this._resTxtColor = writable(noop);
    this._interaction = writable({});
    this._iEvents = writable([null, null]);
    this._iClasses = writable(identity);
    this._iClass = writable(void 0);
    this._set = (key, value) => {
      if (validKey(key, this)) {
        if (parsers[key]) {
          value = parsers[key](value);
        }
        this[key].set(value);
      }
    };
    this._get = (key) => validKey(key, this) ? get_store_value(this[key]) : void 0;
    for (let plugin of plugins) {
      plugin.createStores?.(this);
    }
    if (input.view) {
      this.view.set(input.view);
    }
    let views = /* @__PURE__ */ new Set([...keys(options.views), ...keys(input.views ?? {})]);
    for (let view2 of views) {
      let defOpts = mergeOpts(options, options.views[view2] ?? {});
      let opts = mergeOpts(defOpts, input, input.views?.[view2] ?? {});
      let component = opts.component;
      filterOpts(opts, this);
      for (let key of keys(opts)) {
        let { set, _set = set, ...rest } = this[key];
        this[key] = {
          // Set value in all views
          set: ["buttonText", "theme"].includes(key) ? (value) => {
            if (is_function(value)) {
              let result = value(defOpts[key]);
              opts[key] = result;
              set(set === _set ? result : value);
            } else {
              opts[key] = value;
              set(value);
            }
          } : (value) => {
            opts[key] = value;
            set(value);
          },
          _set,
          ...rest
        };
      }
      this.view.subscribe((newView) => {
        if (newView === view2) {
          this._viewComponent.set(component);
          if (is_function(opts.viewDidMount)) {
            tick().then(() => opts.viewDidMount(get_store_value(this._view)));
          }
          for (let key of keys(opts)) {
            this[key]._set(opts[key]);
          }
        }
      });
    }
  }
}
function parseOpts(opts, parsers) {
  let result = { ...opts };
  for (let key of keys(parsers)) {
    if (key in result) {
      result[key] = parsers[key](result[key]);
    }
  }
  if (opts.views) {
    result.views = {};
    for (let view2 of keys(opts.views)) {
      result.views[view2] = parseOpts(opts.views[view2], parsers);
    }
  }
  return result;
}
function mergeOpts(...args) {
  let result = {};
  for (let opts of args) {
    let override = {};
    for (let key of ["buttonText", "theme"]) {
      if (is_function(opts[key])) {
        override[key] = opts[key](result[key]);
      }
    }
    result = {
      ...result,
      ...opts,
      ...override
    };
  }
  return result;
}
function filterOpts(opts, state) {
  keys(opts).filter((key) => !validKey(key, state) || key == "view").forEach((key) => delete opts[key]);
}
function validKey(key, state) {
  return state.hasOwnProperty(key) && key[0] !== "_";
}
const Buttons = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_duration;
  let $$unsubscribe_date;
  let $$unsubscribe_hiddenDays;
  let $_currentRange, $$unsubscribe__currentRange;
  let $theme, $$unsubscribe_theme;
  let $$unsubscribe__viewTitle;
  let $buttonText, $$unsubscribe_buttonText;
  let $view, $$unsubscribe_view;
  let { buttons } = $$props;
  let { _currentRange, _viewTitle, buttonText, date, duration, hiddenDays, theme, view: view2 } = getContext("state");
  $$unsubscribe__currentRange = subscribe(_currentRange, (value) => $_currentRange = value);
  $$unsubscribe__viewTitle = subscribe(_viewTitle, (value) => value);
  $$unsubscribe_buttonText = subscribe(buttonText, (value) => $buttonText = value);
  $$unsubscribe_date = subscribe(date, (value) => value);
  $$unsubscribe_duration = subscribe(duration, (value) => value);
  $$unsubscribe_hiddenDays = subscribe(hiddenDays, (value) => value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe_view = subscribe(view2, (value) => $view = value);
  let today2 = setMidnight(createDate()), isToday;
  if ($$props.buttons === void 0 && $$bindings.buttons && buttons !== void 0)
    $$bindings.buttons(buttons);
  isToday = today2 >= $_currentRange.start && today2 < $_currentRange.end || null;
  $$unsubscribe_duration();
  $$unsubscribe_date();
  $$unsubscribe_hiddenDays();
  $$unsubscribe__currentRange();
  $$unsubscribe_theme();
  $$unsubscribe__viewTitle();
  $$unsubscribe_buttonText();
  $$unsubscribe_view();
  return `${each(buttons, (button) => {
    return `${button == "title" ? ` <h2${add_attribute("class", $theme.title, 0)}></h2>` : `${button == "prev" ? `<button class="${escape($theme.button, true) + " ec-" + escape(button, true)}"${add_attribute("aria-label", $buttonText.prev, 0)}${add_attribute("title", $buttonText.prev, 0)}><i class="${escape($theme.icon, true) + " ec-" + escape(button, true)}"></i></button>` : `${button == "next" ? `<button class="${escape($theme.button, true) + " ec-" + escape(button, true)}"${add_attribute("aria-label", $buttonText.next, 0)}${add_attribute("title", $buttonText.next, 0)}><i class="${escape($theme.icon, true) + " ec-" + escape(button, true)}"></i></button>` : `${button == "today" ? `<button class="${escape($theme.button, true) + " ec-" + escape(button, true)}" ${isToday ? "disabled" : ""}>${escape($buttonText[button])}</button>` : `${button != "" ? `<button class="${escape($theme.button, true) + escape($view === button ? " " + $theme.active : "", true) + " ec-" + escape(button, true)}">${escape($buttonText[button])}</button>` : ``}`}`}`}`}`;
  })}`;
});
const Toolbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $headerToolbar, $$unsubscribe_headerToolbar;
  let $theme, $$unsubscribe_theme;
  let { headerToolbar, theme } = getContext("state");
  $$unsubscribe_headerToolbar = subscribe(headerToolbar, (value) => $headerToolbar = value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  let sections = { start: [], center: [], end: [] };
  {
    {
      for (let key of Object.keys(sections)) {
        sections[key] = $headerToolbar[key].split(" ").map((group) => group.split(","));
      }
    }
  }
  $$unsubscribe_headerToolbar();
  $$unsubscribe_theme();
  return `<nav${add_attribute("class", $theme.toolbar, 0)}>${each(Object.keys(sections), (key) => {
    return `<div>${each(sections[key], (buttons) => {
      return `${buttons.length > 1 ? `<div${add_attribute("class", $theme.buttonGroup, 0)}>${validate_component(Buttons, "Buttons").$$render($$result, { buttons }, {}, {})} </div>` : `${validate_component(Buttons, "Buttons").$$render($$result, { buttons }, {}, {})}`}`;
    })} </div>`;
  })}</nav>`;
});
const Auxiliary = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $_view, $$unsubscribe__view;
  let $datesSet, $$unsubscribe_datesSet;
  let $_activeRange, $$unsubscribe__activeRange;
  let $_auxiliary, $$unsubscribe__auxiliary;
  let { datesSet, _auxiliary, _activeRange, _queue, _view } = getContext("state");
  $$unsubscribe_datesSet = subscribe(datesSet, (value) => $datesSet = value);
  $$unsubscribe__auxiliary = subscribe(_auxiliary, (value) => $_auxiliary = value);
  $$unsubscribe__activeRange = subscribe(_activeRange, (value) => $_activeRange = value);
  $$unsubscribe__view = subscribe(_view, (value) => $_view = value);
  let debounceHandle = {};
  function runDatesSet(_activeRange2) {
    if (is_function($datesSet)) {
      debounce(
        () => $datesSet({
          start: toLocalDate(_activeRange2.start),
          end: toLocalDate(_activeRange2.end),
          startStr: toISOString(_activeRange2.start),
          endStr: toISOString(_activeRange2.end),
          view: toViewWithLocalDates($_view)
        }),
        debounceHandle,
        _queue
      );
    }
  }
  {
    runDatesSet($_activeRange);
  }
  $$unsubscribe__view();
  $$unsubscribe_datesSet();
  $$unsubscribe__activeRange();
  $$unsubscribe__auxiliary();
  return `${each($_auxiliary, (component) => {
    return `${validate_component(component || missing_component, "svelte:component").$$render($$result, {}, {}, {})}`;
  })}`;
});
const Calendar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe__bodyEl;
  let $_scrollable, $$unsubscribe__scrollable;
  let $$unsubscribe__queue2;
  let $$unsubscribe__queue;
  let $_interaction, $$unsubscribe__interaction;
  let $_events, $$unsubscribe__events;
  let $theme, $$unsubscribe_theme;
  let $_iClass, $$unsubscribe__iClass;
  let $height, $$unsubscribe_height;
  let $view, $$unsubscribe_view;
  let $_viewComponent, $$unsubscribe__viewComponent;
  let { plugins = [] } = $$props;
  let { options = {} } = $$props;
  let component = get_current_component();
  let state = new State(plugins, options);
  setContext("state", state);
  let { _viewComponent, _bodyEl, _interaction, _iClass, _events, _queue, _queue2, _tasks, _scrollable, height, theme, view: view2 } = state;
  $$unsubscribe__viewComponent = subscribe(_viewComponent, (value) => $_viewComponent = value);
  $$unsubscribe__bodyEl = subscribe(_bodyEl, (value) => value);
  $$unsubscribe__interaction = subscribe(_interaction, (value) => $_interaction = value);
  $$unsubscribe__iClass = subscribe(_iClass, (value) => $_iClass = value);
  $$unsubscribe__events = subscribe(_events, (value) => $_events = value);
  $$unsubscribe__queue = subscribe(_queue, (value) => value);
  $$unsubscribe__queue2 = subscribe(_queue2, (value) => value);
  $$unsubscribe__scrollable = subscribe(_scrollable, (value) => $_scrollable = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe_view = subscribe(view2, (value) => $view = value);
  let prevOptions = { ...options };
  function setOption(name, value) {
    state._set(name, value);
    return this;
  }
  function getOption(name) {
    let value = state._get(name);
    return value instanceof Date ? toLocalDate(value) : value;
  }
  function refetchEvents() {
    state._fetchedRange.set({ start: void 0, end: void 0 });
    return this;
  }
  function getEvents() {
    return $_events.map(toEventWithLocalDates);
  }
  function getEventById(id) {
    for (let event of $_events) {
      if (event.id == id) {
        return toEventWithLocalDates(event);
      }
    }
    return null;
  }
  function addEvent(event) {
    $_events.push(createEvents([event])[0]);
    _events.set($_events);
    return this;
  }
  function updateEvent(event) {
    for (let e of $_events) {
      if (e.id == event.id) {
        assign(e, createEvents([event])[0]);
        _events.set($_events);
        break;
      }
    }
    return this;
  }
  function removeEventById(id) {
    let idx = $_events.findIndex((event) => event.id == id);
    if (idx >= 0) {
      $_events.splice(idx, 1);
      _events.set($_events);
    }
    return this;
  }
  function getView() {
    return toViewWithLocalDates(get_store_value(state._view));
  }
  function unselect() {
    if ($_interaction.action) {
      $_interaction.action.unselect();
    }
    return this;
  }
  function dateFromPoint(x, y) {
    let dayEl = getElementWithPayload(x, y);
    return dayEl ? getPayload(dayEl)(y) : null;
  }
  function destroy() {
    destroy_component(component, true);
  }
  if ($$props.plugins === void 0 && $$bindings.plugins && plugins !== void 0)
    $$bindings.plugins(plugins);
  if ($$props.options === void 0 && $$bindings.options && options !== void 0)
    $$bindings.options(options);
  if ($$props.setOption === void 0 && $$bindings.setOption && setOption !== void 0)
    $$bindings.setOption(setOption);
  if ($$props.getOption === void 0 && $$bindings.getOption && getOption !== void 0)
    $$bindings.getOption(getOption);
  if ($$props.refetchEvents === void 0 && $$bindings.refetchEvents && refetchEvents !== void 0)
    $$bindings.refetchEvents(refetchEvents);
  if ($$props.getEvents === void 0 && $$bindings.getEvents && getEvents !== void 0)
    $$bindings.getEvents(getEvents);
  if ($$props.getEventById === void 0 && $$bindings.getEventById && getEventById !== void 0)
    $$bindings.getEventById(getEventById);
  if ($$props.addEvent === void 0 && $$bindings.addEvent && addEvent !== void 0)
    $$bindings.addEvent(addEvent);
  if ($$props.updateEvent === void 0 && $$bindings.updateEvent && updateEvent !== void 0)
    $$bindings.updateEvent(updateEvent);
  if ($$props.removeEventById === void 0 && $$bindings.removeEventById && removeEventById !== void 0)
    $$bindings.removeEventById(removeEventById);
  if ($$props.getView === void 0 && $$bindings.getView && getView !== void 0)
    $$bindings.getView(getView);
  if ($$props.unselect === void 0 && $$bindings.unselect && unselect !== void 0)
    $$bindings.unselect(unselect);
  if ($$props.dateFromPoint === void 0 && $$bindings.dateFromPoint && dateFromPoint !== void 0)
    $$bindings.dateFromPoint(dateFromPoint);
  if ($$props.destroy === void 0 && $$bindings.destroy && destroy !== void 0)
    $$bindings.destroy(destroy);
  {
    for (let [name, value] of diff(options, prevOptions)) {
      setOption(name, value);
    }
  }
  $$unsubscribe__bodyEl();
  $$unsubscribe__scrollable();
  $$unsubscribe__queue2();
  $$unsubscribe__queue();
  $$unsubscribe__interaction();
  $$unsubscribe__events();
  $$unsubscribe_theme();
  $$unsubscribe__iClass();
  $$unsubscribe_height();
  $$unsubscribe_view();
  $$unsubscribe__viewComponent();
  return `<div class="${escape($theme.calendar, true) + " " + escape($theme.view, true) + escape($_scrollable ? " " + $theme.withScroll : "", true) + escape($_iClass ? " " + $theme[$_iClass] : "", true)}"${add_attribute("role", listView($view) ? "list" : "table", 0)}${add_styles({ "height": $height })}>${validate_component(Toolbar, "Toolbar").$$render($$result, {}, {}, {})} ${validate_component($_viewComponent || missing_component, "svelte:component").$$render($$result, {}, {}, {})}</div> ${validate_component(Auxiliary, "Auxiliary").$$render($$result, {}, {}, {})} `;
});
function days(state) {
  return derived([state.date, state.firstDay, state.hiddenDays], ([$date, $firstDay, $hiddenDays]) => {
    let days2 = [];
    let day = cloneDate($date);
    let max = 7;
    while (day.getUTCDay() !== $firstDay && max) {
      subtractDay(day);
      --max;
    }
    for (let i = 0; i < 7; ++i) {
      if (!$hiddenDays.includes(day.getUTCDay())) {
        days2.push(cloneDate(day));
      }
      addDay(day);
    }
    return days2;
  });
}
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $theme, $$unsubscribe_theme;
  let $_days, $$unsubscribe__days;
  let $_intlDayHeaderAL, $$unsubscribe__intlDayHeaderAL;
  let $$unsubscribe__intlDayHeader;
  let { theme, _intlDayHeader, _intlDayHeaderAL, _days } = getContext("state");
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe__intlDayHeader = subscribe(_intlDayHeader, (value) => value);
  $$unsubscribe__intlDayHeaderAL = subscribe(_intlDayHeaderAL, (value) => $_intlDayHeaderAL = value);
  $$unsubscribe__days = subscribe(_days, (value) => $_days = value);
  $$unsubscribe_theme();
  $$unsubscribe__days();
  $$unsubscribe__intlDayHeaderAL();
  $$unsubscribe__intlDayHeader();
  return `<div${add_attribute("class", $theme.header, 0)}><div${add_attribute("class", $theme.days, 0)} role="row">${each($_days, (day) => {
    return `<div class="${escape($theme.day, true) + " " + escape($theme.weekdays?.[day.getUTCDay()], true)}" role="columnheader"><span${add_attribute("aria-label", $_intlDayHeaderAL.format(day), 0)}></span> </div>`;
  })}</div> <div${add_attribute("class", $theme.hiddenScroll, 0)}></div></div>`;
});
const Body = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $theme, $$unsubscribe_theme;
  let $dayMaxEvents, $$unsubscribe_dayMaxEvents;
  let $_bodyEl, $$unsubscribe__bodyEl;
  let { dayMaxEvents, _bodyEl, theme } = getContext("state");
  $$unsubscribe_dayMaxEvents = subscribe(dayMaxEvents, (value) => $dayMaxEvents = value);
  $$unsubscribe__bodyEl = subscribe(_bodyEl, (value) => $_bodyEl = value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe_theme();
  $$unsubscribe_dayMaxEvents();
  $$unsubscribe__bodyEl();
  return `<div class="${escape($theme.body, true) + escape($dayMaxEvents === true ? " " + $theme.uniform : "", true)}"${add_attribute("this", $_bodyEl, 0)}><div${add_attribute("class", $theme.content, 0)}>${slots.default ? slots.default({}) : ``}</div></div>`;
});
const Event = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $eventClick, $$unsubscribe_eventClick;
  let $$unsubscribe__hiddenEvents;
  let $$unsubscribe_dayMaxEvents;
  let $$unsubscribe__popupDate;
  let $_interaction, $$unsubscribe__interaction;
  let $_view, $$unsubscribe__view;
  let $$unsubscribe_eventAllUpdated;
  let $$unsubscribe_eventDidMount;
  let $_intlEventTime, $$unsubscribe__intlEventTime;
  let $theme, $$unsubscribe_theme;
  let $eventContent, $$unsubscribe_eventContent;
  let $displayEventEnd, $$unsubscribe_displayEventEnd;
  let $eventClassNames, $$unsubscribe_eventClassNames;
  let $_iClasses, $$unsubscribe__iClasses;
  let $eventTextColor, $$unsubscribe_eventTextColor;
  let $_resTxtColor, $$unsubscribe__resTxtColor;
  let $eventColor, $$unsubscribe_eventColor;
  let $eventBackgroundColor, $$unsubscribe_eventBackgroundColor;
  let $_resBgColor, $$unsubscribe__resBgColor;
  let $$unsubscribe_eventMouseEnter;
  let $$unsubscribe_eventMouseLeave;
  let { chunk } = $$props;
  let { longChunks = {} } = $$props;
  let { inPopup = false } = $$props;
  let { dayMaxEvents, displayEventEnd, eventAllUpdated, eventBackgroundColor, eventTextColor, eventClick, eventColor, eventContent, eventClassNames, eventDidMount, eventMouseEnter, eventMouseLeave, theme, _view, _intlEventTime, _interaction, _iClasses, _resBgColor, _resTxtColor, _hiddenEvents, _popupDate, _tasks } = getContext("state");
  $$unsubscribe_dayMaxEvents = subscribe(dayMaxEvents, (value) => value);
  $$unsubscribe_displayEventEnd = subscribe(displayEventEnd, (value) => $displayEventEnd = value);
  $$unsubscribe_eventAllUpdated = subscribe(eventAllUpdated, (value) => value);
  $$unsubscribe_eventBackgroundColor = subscribe(eventBackgroundColor, (value) => $eventBackgroundColor = value);
  $$unsubscribe_eventTextColor = subscribe(eventTextColor, (value) => $eventTextColor = value);
  $$unsubscribe_eventClick = subscribe(eventClick, (value) => $eventClick = value);
  $$unsubscribe_eventColor = subscribe(eventColor, (value) => $eventColor = value);
  $$unsubscribe_eventContent = subscribe(eventContent, (value) => $eventContent = value);
  $$unsubscribe_eventClassNames = subscribe(eventClassNames, (value) => $eventClassNames = value);
  $$unsubscribe_eventDidMount = subscribe(eventDidMount, (value) => value);
  $$unsubscribe_eventMouseEnter = subscribe(eventMouseEnter, (value) => value);
  $$unsubscribe_eventMouseLeave = subscribe(eventMouseLeave, (value) => value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe__view = subscribe(_view, (value) => $_view = value);
  $$unsubscribe__intlEventTime = subscribe(_intlEventTime, (value) => $_intlEventTime = value);
  $$unsubscribe__interaction = subscribe(_interaction, (value) => $_interaction = value);
  $$unsubscribe__iClasses = subscribe(_iClasses, (value) => $_iClasses = value);
  $$unsubscribe__resBgColor = subscribe(_resBgColor, (value) => $_resBgColor = value);
  $$unsubscribe__resTxtColor = subscribe(_resTxtColor, (value) => $_resTxtColor = value);
  $$unsubscribe__hiddenEvents = subscribe(_hiddenEvents, (value) => value);
  $$unsubscribe__popupDate = subscribe(_popupDate, (value) => value);
  let el;
  let event;
  let classes;
  let style;
  let margin = 1;
  let display;
  let onclick;
  function createHandler(fn, display2) {
    return !helperEvent(display2) && is_function(fn) ? (jsEvent) => fn({
      event: toEventWithLocalDates(event),
      el,
      jsEvent,
      view: toViewWithLocalDates($_view)
    }) : void 0;
  }
  function reposition() {
    {
      return;
    }
  }
  if ($$props.chunk === void 0 && $$bindings.chunk && chunk !== void 0)
    $$bindings.chunk(chunk);
  if ($$props.longChunks === void 0 && $$bindings.longChunks && longChunks !== void 0)
    $$bindings.longChunks(longChunks);
  if ($$props.inPopup === void 0 && $$bindings.inPopup && inPopup !== void 0)
    $$bindings.inPopup(inPopup);
  if ($$props.reposition === void 0 && $$bindings.reposition && reposition !== void 0)
    $$bindings.reposition(reposition);
  event = chunk.event;
  {
    {
      display = event.display;
      let bgColor = event.backgroundColor || $_resBgColor(event) || $eventBackgroundColor || $eventColor;
      let txtColor = event.textColor || $_resTxtColor(event) || $eventTextColor;
      style = `width:calc(${chunk.days * 100}% + ${(chunk.days - 1) * 7}px);margin-top:${margin}px;`;
      if (bgColor) {
        style += `background-color:${bgColor};`;
      }
      if (txtColor) {
        style += `color:${txtColor};`;
      }
      classes = [
        $theme.event,
        ...$_iClasses([], event),
        ...createEventClasses($eventClassNames, event, $_view)
      ].join(" ");
    }
  }
  createEventContent(chunk, $displayEventEnd, $eventContent, $theme, $_intlEventTime, $_view);
  onclick = createHandler($eventClick, display);
  $$unsubscribe_eventClick();
  $$unsubscribe__hiddenEvents();
  $$unsubscribe_dayMaxEvents();
  $$unsubscribe__popupDate();
  $$unsubscribe__interaction();
  $$unsubscribe__view();
  $$unsubscribe_eventAllUpdated();
  $$unsubscribe_eventDidMount();
  $$unsubscribe__intlEventTime();
  $$unsubscribe_theme();
  $$unsubscribe_eventContent();
  $$unsubscribe_displayEventEnd();
  $$unsubscribe_eventClassNames();
  $$unsubscribe__iClasses();
  $$unsubscribe_eventTextColor();
  $$unsubscribe__resTxtColor();
  $$unsubscribe_eventColor();
  $$unsubscribe_eventBackgroundColor();
  $$unsubscribe__resBgColor();
  $$unsubscribe_eventMouseEnter();
  $$unsubscribe_eventMouseLeave();
  return ` <article${add_attribute("class", classes, 0)}${add_attribute("style", style, 0)}${add_attribute("role", onclick ? "button" : void 0, 0)}${add_attribute("tabindex", onclick ? 0 : void 0, 0)}${add_attribute("this", el, 0)}><div${add_attribute("class", $theme.eventBody, 0)}></div> ${validate_component($_interaction.resizer || missing_component, "svelte:component").$$render($$result, { event }, {}, {})}</article>`;
});
const Popup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe__interaction;
  let $_popupDate, $$unsubscribe__popupDate;
  let $_popupChunks, $$unsubscribe__popupChunks;
  let $theme, $$unsubscribe_theme;
  let $$unsubscribe__intlDayPopover;
  let $buttonText, $$unsubscribe_buttonText;
  let { buttonText, theme, _interaction, _intlDayPopover, _popupDate, _popupChunks } = getContext("state");
  $$unsubscribe_buttonText = subscribe(buttonText, (value) => $buttonText = value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe__interaction = subscribe(_interaction, (value) => value);
  $$unsubscribe__intlDayPopover = subscribe(_intlDayPopover, (value) => value);
  $$unsubscribe__popupDate = subscribe(_popupDate, (value) => $_popupDate = value);
  $$unsubscribe__popupChunks = subscribe(_popupChunks, (value) => $_popupChunks = value);
  let el;
  let style = "";
  $$unsubscribe__interaction();
  $$unsubscribe__popupDate();
  $$unsubscribe__popupChunks();
  $$unsubscribe_theme();
  $$unsubscribe__intlDayPopover();
  $$unsubscribe_buttonText();
  return `<div${add_attribute("class", $theme.popup, 0)}${add_attribute("style", style, 0)}${add_attribute("this", el, 0)}><div${add_attribute("class", $theme.dayHead, 0)}><time${add_attribute("datetime", toISOString($_popupDate, 10), 0)}></time>  <a role="button" tabindex="0"${add_attribute("aria-label", $buttonText.close, 0)}>×</a></div> <div${add_attribute("class", $theme.events, 0)}>${each($_popupChunks, (chunk) => {
    return `${validate_component(Event, "Event").$$render($$result, { chunk, inPopup: true }, {}, {})}`;
  })}</div></div>`;
});
const Day = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $_popupChunks, $$unsubscribe__popupChunks;
  let $_popupDate, $$unsubscribe__popupDate;
  let $moreLinkContent, $$unsubscribe_moreLinkContent;
  let $_hiddenEvents, $$unsubscribe__hiddenEvents;
  let $highlightedDates, $$unsubscribe_highlightedDates;
  let $currentDate, $$unsubscribe_currentDate;
  let $_today, $$unsubscribe__today;
  let $theme, $$unsubscribe_theme;
  let $$unsubscribe__interaction;
  let $$unsubscribe__intlDayCell;
  let { date } = $$props;
  let { chunks } = $$props;
  let { longChunks } = $$props;
  let { iChunks = [] } = $$props;
  let { date: currentDate, dayMaxEvents, highlightedDates, moreLinkContent, theme, _hiddenEvents, _intlDayCell, _popupDate, _popupChunks, _today, _interaction, _queue } = getContext("state");
  $$unsubscribe_currentDate = subscribe(currentDate, (value) => $currentDate = value);
  $$unsubscribe_highlightedDates = subscribe(highlightedDates, (value) => $highlightedDates = value);
  $$unsubscribe_moreLinkContent = subscribe(moreLinkContent, (value) => $moreLinkContent = value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  $$unsubscribe__hiddenEvents = subscribe(_hiddenEvents, (value) => $_hiddenEvents = value);
  $$unsubscribe__intlDayCell = subscribe(_intlDayCell, (value) => value);
  $$unsubscribe__popupDate = subscribe(_popupDate, (value) => $_popupDate = value);
  $$unsubscribe__popupChunks = subscribe(_popupChunks, (value) => $_popupChunks = value);
  $$unsubscribe__today = subscribe(_today, (value) => $_today = value);
  $$unsubscribe__interaction = subscribe(_interaction, (value) => value);
  let el;
  let dayChunks;
  let isToday;
  let otherMonth;
  let highlight;
  let hiddenEvents = /* @__PURE__ */ new Set();
  let showPopup;
  let refs = [];
  function setPopupChunks() {
    let nextDay = addDay(cloneDate(date));
    let chunks2 = dayChunks.concat(longChunks[date.getTime()]?.chunks || []);
    set_store_value(_popupChunks, $_popupChunks = chunks2.map((chunk) => assign({}, chunk, createEventChunk(chunk.event, date, nextDay), { days: 1, dates: [date] })).sort((a, b) => a.top - b.top), $_popupChunks);
  }
  function reposition() {
    runReposition(refs, dayChunks);
  }
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.chunks === void 0 && $$bindings.chunks && chunks !== void 0)
    $$bindings.chunks(chunks);
  if ($$props.longChunks === void 0 && $$bindings.longChunks && longChunks !== void 0)
    $$bindings.longChunks(longChunks);
  if ($$props.iChunks === void 0 && $$bindings.iChunks && iChunks !== void 0)
    $$bindings.iChunks(iChunks);
  if ($$props.reposition === void 0 && $$bindings.reposition && reposition !== void 0)
    $$bindings.reposition(reposition);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      {
        dayChunks = [];
        hiddenEvents.clear();
        hiddenEvents = hiddenEvents;
        for (let chunk of chunks) {
          if (datesEqual(chunk.date, date)) {
            dayChunks.push(chunk);
          }
        }
      }
    }
    set_store_value(_hiddenEvents, $_hiddenEvents[date.getTime()] = hiddenEvents, $_hiddenEvents);
    isToday = datesEqual(date, $_today);
    {
      {
        otherMonth = date.getUTCMonth() !== $currentDate.getUTCMonth();
        highlight = $highlightedDates.some((d) => datesEqual(d, date));
      }
    }
    {
      if ($_hiddenEvents && hiddenEvents.size) {
        let text = "+" + hiddenEvents.size + " more";
        if ($moreLinkContent) {
          is_function($moreLinkContent) ? $moreLinkContent({ num: hiddenEvents.size, text }) : $moreLinkContent;
        }
      }
    }
    showPopup = $_popupDate && datesEqual(date, $_popupDate);
    {
      if (showPopup && longChunks && dayChunks) {
        tick().then(setPopupChunks);
      }
    }
    $$rendered = `<div class="${escape($theme.day, true) + " " + escape($theme.weekdays?.[date.getUTCDay()], true) + escape(isToday ? " " + $theme.today : "", true) + escape(otherMonth ? " " + $theme.otherMonth : "", true) + escape(highlight ? " " + $theme.highlight : "", true)}" role="cell"${add_attribute("this", el, 0)}><time${add_attribute("class", $theme.dayHead, 0)}${add_attribute("datetime", toISOString(date, 10), 0)}></time>  ${iChunks[1] && datesEqual(iChunks[1].date, date) ? `<div${add_attribute("class", $theme.events, 0)}>${validate_component(Event, "Event").$$render($$result, { chunk: iChunks[1] }, {}, {})}</div>` : ``}  ${iChunks[0] && datesEqual(iChunks[0].date, date) ? `<div class="${escape($theme.events, true) + " " + escape($theme.preview, true)}">${validate_component(Event, "Event").$$render($$result, { chunk: iChunks[0] }, {}, {})}</div>` : ``} <div${add_attribute("class", $theme.events, 0)}>${each(dayChunks, (chunk, i) => {
      return `${validate_component(Event, "Event").$$render(
        $$result,
        { chunk, longChunks, this: refs[i] },
        {
          this: ($$value) => {
            refs[i] = $$value;
            $$settled = false;
          }
        },
        {}
      )}`;
    })}</div> ${showPopup ? `${validate_component(Popup, "Popup").$$render($$result, {}, {}, {})}` : ``} <div${add_attribute("class", $theme.dayFoot, 0)}>${hiddenEvents.size ? `  <a role="button" tabindex="0" aria-haspopup="true"></a>` : ``}</div></div>`;
  } while (!$$settled);
  $$unsubscribe__popupChunks();
  $$unsubscribe__popupDate();
  $$unsubscribe_moreLinkContent();
  $$unsubscribe__hiddenEvents();
  $$unsubscribe_highlightedDates();
  $$unsubscribe_currentDate();
  $$unsubscribe__today();
  $$unsubscribe_theme();
  $$unsubscribe__interaction();
  $$unsubscribe__intlDayCell();
  return $$rendered;
});
const Week = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $_hiddenEvents, $$unsubscribe__hiddenEvents;
  let $hiddenDays, $$unsubscribe_hiddenDays;
  let $_iEvents, $$unsubscribe__iEvents;
  let $_events, $$unsubscribe__events;
  let $theme, $$unsubscribe_theme;
  let { dates } = $$props;
  let { _events, _iEvents, _queue2, _hiddenEvents, hiddenDays, theme } = getContext("state");
  $$unsubscribe__events = subscribe(_events, (value) => $_events = value);
  $$unsubscribe__iEvents = subscribe(_iEvents, (value) => $_iEvents = value);
  $$unsubscribe__hiddenEvents = subscribe(_hiddenEvents, (value) => $_hiddenEvents = value);
  $$unsubscribe_hiddenDays = subscribe(hiddenDays, (value) => $hiddenDays = value);
  $$unsubscribe_theme = subscribe(theme, (value) => $theme = value);
  let chunks, longChunks, iChunks = [];
  let start;
  let end;
  let refs = [];
  let debounceHandle = {};
  function reposition() {
    debounce(() => runReposition(refs, dates), debounceHandle, _queue2);
  }
  if ($$props.dates === void 0 && $$bindings.dates && dates !== void 0)
    $$bindings.dates(dates);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      {
        start = dates[0];
        end = addDay(cloneDate(dates[dates.length - 1]));
      }
    }
    {
      {
        chunks = [];
        for (let event of $_events) {
          if (!bgEvent(event.display) && eventIntersects(event, start, end)) {
            let chunk = createEventChunk(event, start, end);
            chunks.push(chunk);
          }
        }
        longChunks = prepareEventChunks(chunks, $hiddenDays);
        reposition();
      }
    }
    iChunks = $_iEvents.map((event) => {
      let chunk;
      if (event && eventIntersects(event, start, end)) {
        chunk = createEventChunk(event, start, end);
        prepareEventChunks([chunk], $hiddenDays);
      } else {
        chunk = null;
      }
      return chunk;
    });
    {
      if ($_hiddenEvents) {
        reposition();
      }
    }
    $$rendered = `<div${add_attribute("class", $theme.days, 0)} role="row">${each(dates, (date, i) => {
      return `${validate_component(Day, "Day").$$render(
        $$result,
        {
          date,
          chunks,
          longChunks,
          iChunks,
          this: refs[i]
        },
        {
          this: ($$value) => {
            refs[i] = $$value;
            $$settled = false;
          }
        },
        {}
      )}`;
    })}</div> `;
  } while (!$$settled);
  $$unsubscribe__hiddenEvents();
  $$unsubscribe_hiddenDays();
  $$unsubscribe__iEvents();
  $$unsubscribe__events();
  $$unsubscribe_theme();
  return $$rendered;
});
const View = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $_viewDates, $$unsubscribe__viewDates;
  let $$unsubscribe_dayMaxEvents;
  let $_hiddenEvents, $$unsubscribe__hiddenEvents;
  let $hiddenDays, $$unsubscribe_hiddenDays;
  let { _viewDates, _hiddenEvents, dayMaxEvents, hiddenDays } = getContext("state");
  $$unsubscribe__viewDates = subscribe(_viewDates, (value) => $_viewDates = value);
  $$unsubscribe__hiddenEvents = subscribe(_hiddenEvents, (value) => $_hiddenEvents = value);
  $$unsubscribe_dayMaxEvents = subscribe(dayMaxEvents, (value) => value);
  $$unsubscribe_hiddenDays = subscribe(hiddenDays, (value) => $hiddenDays = value);
  let weeks;
  let days2;
  {
    {
      weeks = [];
      days2 = 7 - $hiddenDays.length;
      set_store_value(_hiddenEvents, $_hiddenEvents = {}, $_hiddenEvents);
      for (let i = 0; i < $_viewDates.length / days2; ++i) {
        let dates = [];
        for (let j = 0; j < days2; ++j) {
          dates.push($_viewDates[i * days2 + j]);
        }
        weeks.push(dates);
      }
    }
  }
  $$unsubscribe__viewDates();
  $$unsubscribe_dayMaxEvents();
  $$unsubscribe__hiddenEvents();
  $$unsubscribe_hiddenDays();
  return `${validate_component(Header, "Header").$$render($$result, {}, {}, {})} ${validate_component(Body, "Body").$$render($$result, {}, {}, {
    default: () => {
      return `${each(weeks, (dates) => {
        return `${validate_component(Week, "Week").$$render($$result, { dates }, {}, {})}`;
      })}`;
    }
  })}`;
});
const TimeGrid = {
  createOptions(options) {
    options.dayMaxEvents = false;
    options.dayCellFormat = { day: "numeric" };
    options.dayPopoverFormat = { month: "long", day: "numeric", year: "numeric" };
    options.moreLinkContent = void 0;
    options.buttonText.dayGridMonth = "month";
    options.buttonText.close = "Close";
    options.theme.uniform = "ec-uniform";
    options.theme.dayFoot = "ec-day-foot";
    options.theme.popup = "ec-popup";
    options.view = "dayGridMonth";
    options.views.dayGridMonth = {
      buttonText: btnTextMonth,
      component: View,
      dayHeaderFormat: { weekday: "short" },
      dayHeaderAriaLabelFormat: { weekday: "long" },
      displayEventEnd: false,
      duration: { months: 1 },
      theme: themeView("ec-day-grid ec-month-view"),
      titleFormat: { year: "numeric", month: "long" }
    };
  },
  createStores(state) {
    state._days = days(state);
    state._intlDayCell = intl(state.locale, state.dayCellFormat);
    state._intlDayPopover = intl(state.locale, state.dayPopoverFormat);
    state._hiddenEvents = writable({});
    state._popupDate = writable(null);
    state._popupChunks = writable([]);
  }
};
const StatsQuickView = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  let { sensor } = $$props;
  let open = false;
  if ($$props.sensor === void 0 && $$bindings.sensor && sensor !== void 0)
    $$bindings.sensor(sensor);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${sensor.type == 5 ? `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        data: mdiMeterGas,
        size: "3em",
        class: "text-blue-700"
      },
      {},
      {}
    )}` : `${sensor.type == 4 || sensor.type == 3 ? `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        data: mdiThermometer,
        size: "3em",
        class: "text-orange-900"
      },
      {},
      {}
    )}` : `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        data: mdiMapMarker,
        size: "3em",
        class: "text-slate-900"
      },
      {},
      {}
    )}`}`} ${validate_component(Dialog, "Dialog").$$render(
      $$result,
      { open },
      {
        open: ($$value) => {
          open = $$value;
          $$settled = false;
        }
      },
      {
        actions: () => {
          return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { variant: "fill", color: "primary" }, {}, {
            default: () => {
              return `Close`;
            }
          })} ${validate_component(Button, "Button").$$render(
            $$result,
            {
              variant: "fill-light",
              color: "accent",
              icon: mdiEye
            },
            {},
            {
              default: () => {
                return `View Details`;
              }
            }
          )}</div>`;
        },
        title: () => {
          return `<div slot="title">${escape(DeviceIntToEnglish(sensor.type))}</div>`;
        },
        default: () => {
          return `${sensor.type == 5 ? `0` : `${sensor.type == 4 ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "Temperature",
              counterStartTime: sensor.cw_ss_tmepnpk[0].created_at,
              value: sensor.cw_ss_tmepnpk[0].soil_temperatureC,
              icon: mdiThermometer,
              optimal: 19
            },
            {},
            {}
          )} ${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "Soil Moisture",
              counterStartTime: sensor.cw_ss_tmepnpk[0].created_at,
              value: sensor.cw_ss_tmepnpk[0].soil_moisture,
              icon: mdiWater,
              optimal: 26
            },
            {},
            {}
          )}</div>` : `${sensor.type == 3 ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 m-2">${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "Temperature",
              counterStartTime: sensor.cw_ss_tmepnpk[0].created_at,
              value: sensor.cw_ss_tmepnpk[0].soil_temperatureC,
              icon: mdiThermometer,
              optimal: 19
            },
            {},
            {}
          )} ${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "Soil Moisture",
              counterStartTime: sensor.cw_ss_tmepnpk[0].created_at,
              value: sensor.cw_ss_tmepnpk[0].soil_moisture,
              icon: mdiWater,
              optimal: 26
            },
            {},
            {}
          )}</div>` : `${sensor.type == 6 ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-2 m-2">${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "Air Temperature",
              counterStartTime: sensor.seeed_co2_lorawan_uplinks[0].created_at,
              value: sensor.seeed_co2_lorawan_uplinks[0].temperature,
              icon: mdiThermometer,
              optimal: 23.88
            },
            {},
            {}
          )} ${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "Air Humidity",
              counterStartTime: sensor.seeed_co2_lorawan_uplinks[0].created_at,
              value: sensor.seeed_co2_lorawan_uplinks[0].humidity,
              icon: mdiWater,
              optimal: 75,
              notation: "%"
            },
            {},
            {}
          )} ${validate_component(CWStatCard, "CwStatCard").$$render(
            $$result,
            {
              title: "CO²",
              counterStartTime: sensor.seeed_co2_lorawan_uplinks[0].created_at,
              value: sensor.seeed_co2_lorawan_uplinks[0].co2_level,
              icon: mdiWater,
              optimal: 800,
              notation: "PPM"
            },
            {},
            {}
          )}</div>` : `<pre>			${escape(JSON.stringify(sensor, null, 2))}
		</pre>`}`}`}`}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_page();
  return $$rendered;
});
const AddDevice = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let getAllDeviceTypes;
  let allDeviceTypes;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let open = false;
  let numberValue = 0;
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    getAllDeviceTypes = async () => {
      const { data, error } = await supabase.from("cw_device_type").select("*");
      if (error) {
        return [];
      }
      const response = data.map((t) => {
        return { label: t.name, value: t.id };
      });
      return response;
    };
    allDeviceTypes = getAllDeviceTypes();
    $$rendered = `${validate_component(Button, "Button").$$render($$result, { variant: "fill", icon: mdiPlus }, {}, {
      default: () => {
        return `Add Device`;
      }
    })} ${validate_component(Dialog, "Dialog").$$render(
      $$result,
      { persistent: true, open },
      {
        open: ($$value) => {
          open = $$value;
          $$settled = false;
        }
      },
      {
        actions: () => {
          return `<div slot="actions">${validate_component(Button, "Button").$$render(
            $$result,
            {
              variant: "fill",
              color: "primary",
              type: "button"
            },
            {},
            {
              default: () => {
                return `Close`;
              }
            }
          )}</div>`;
        },
        title: () => {
          return `<div slot="title" class="p-4">${validate_component(Icon, "Icon").$$render($$result, { data: mdiPlus }, {}, {})}
		Add a new Device</div>`;
        },
        default: () => {
          return `<form class="grid gap-2 p-4" method="post" action="/api/add-device"><h2 data-svelte-h="svelte-yvewmm">Device Details</h2> <input type="hidden" id="location_id" name="location_id"${add_attribute("value", $page.params.location_id, 0)}> ${validate_component(TextField, "TextField").$$render($$result, { name: "name", label: "Device Name" }, {}, {})} ${validate_component(TextField, "TextField").$$render(
            $$result,
            {
              name: "dev_eui",
              label: "Device EUI (dev_eui)"
            },
            {},
            {}
          )} ${function(__value) {
            if (is_promise(__value)) {
              __value.then(null, noop);
              return `
			loading...
		`;
            }
            return function(devices) {
              return ` ${validate_component(SelectField, "SelectField").$$render(
                $$result,
                {
                  name: "type",
                  label: "Device Type",
                  options: devices
                },
                {},
                {}
              )} `;
            }(__value);
          }(allDeviceTypes)} ${validate_component(TextField, "TextField").$$render(
            $$result,
            {
              name: "intraval",
              label: "Device Send Frequency (-1 = unknown)",
              type: "integer",
              align: "center",
              class: "w-full",
              value: numberValue
            },
            {
              value: ($$value) => {
                numberValue = $$value;
                $$settled = false;
              }
            },
            {
              append: () => {
                return `<div slot="append" class="flex">${validate_component(Button, "Button").$$render(
                  $$result,
                  {
                    variant: "fill-light",
                    icon: mdiPlus,
                    size: "sm"
                  },
                  {},
                  {}
                )}</div>`;
              },
              prepend: () => {
                return `<div slot="prepend" class="flex">${validate_component(Button, "Button").$$render(
                  $$result,
                  {
                    variant: "fill-light",
                    icon: mdiMinus,
                    size: "sm"
                  },
                  {},
                  {}
                )}</div>`;
              }
            }
          )} <div class="grid grid-flow-col gap-2">${validate_component(TextField, "TextField").$$render($$result, { name: "lat", label: "Latitude" }, {}, {})} ${validate_component(TextField, "TextField").$$render($$result, { name: "long", label: "Longitude" }, {}, {})}</div> ${validate_component(Button, "Button").$$render(
            $$result,
            {
              variant: "fill",
              color: "primary",
              type: "submit"
            },
            {},
            {
              default: () => {
                return `Save`;
              }
            }
          )}</form>`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_page();
  return $$rendered;
});
const DeviceSelect = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let devicesView;
  let { sensors = [] } = $$props;
  let value = "";
  let group = [];
  if ($$props.sensors === void 0 && $$bindings.sensors && sensors !== void 0)
    $$bindings.sensors(sensors);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    devicesView = sensors;
    $$rendered = `${validate_component(Card, "Card").$$render($$result, { class: "col-span-12 lg:col-span-4" }, {}, {
      contents: () => {
        return `<div slot="contents" class="flex flex-col max-h-[360px] overflow-auto">${validate_component(TextField, "TextField").$$render(
          $$result,
          { label: "Search", icon: mdiMagnify, value },
          {
            value: ($$value) => {
              value = $$value;
              $$settled = false;
            }
          },
          {
            append: () => {
              return `<span slot="append">${validate_component(Button, "Button").$$render(
                $$result,
                {
                  icon: mdiCloseCircleOutline,
                  class: "text-surface-content/50 p-2"
                },
                {},
                {}
              )}</span>`;
            }
          }
        )} <div class="border-y p-1 my-4"><ol class="flex flex-col gap-4 my-4">${each(devicesView, (device) => {
          return `${validate_component(Checkbox, "Checkbox").$$render(
            $$result,
            {
              value: device.dev_eui,
              disabled: group.length == 0 ? false : device.cw_devices.type != sensors.find((d) => d.dev_eui == group[0]).cw_devices.type,
              group
            },
            {
              group: ($$value) => {
                group = $$value;
                $$settled = false;
              }
            },
            {
              default: () => {
                return `${escape(device.cw_devices.name)} `;
              }
            }
          )}`;
        })}</ol></div> <div class="flex flex-row gap-3">${validate_component(AddDevice, "AddDevice").$$render($$result, {}, {}, {})} <span class="flex flex-1"></span> ${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "outline",
            classes: { root: "justify-end" }
          },
          {},
          {
            default: () => {
              return `clear`;
            }
          }
        )} ${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "outline",
            classes: { root: "justify-end" },
            disabled: group.length < 2,
            icon: mdiCompare
          },
          {},
          {
            default: () => {
              return `Compare`;
            }
          }
        )}</div></div>`;
      },
      header: () => {
        return `${validate_component(Header$1, "Header").$$render(
          $$result,
          {
            title: "Device Quick View",
            slot: "header"
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
                              return `Add Device`;
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
                    return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiDevices }, {}, {})}`;
                  }
                }
              )}</div>`;
            }
          }
        )}`;
      }
    })}`;
  } while (!$$settled);
  return $$rendered;
});
let zoom = 19;
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let view2 = [32.14088948246444, 131.3853159103882];
  let mapWidth = 100;
  let mapHeight = 100;
  let plugins = [TimeGrid];
  let options = {
    view: "dayGridMonth",
    date: /* @__PURE__ */ new Date(),
    events: [],
    locale: "ja-jp"
  };
  options.events.push({
    id: "a",
    title: `Rainfall Total: 34mm`,
    editable: false,
    allDay: true,
    backgroundColor: "#a90f0f",
    start: /* @__PURE__ */ new Date(),
    end: /* @__PURE__ */ new Date()
  });
  view2 = [data.location.latitude, data.location.longitude];
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  {
    console.log(data);
  }
  return `<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">${validate_component(Button, "Button").$$render(
    $$result,
    {
      variant: "outline",
      icon: mdiChevronLeft,
      size: "lg"
    },
    {},
    {}
  )} ${function(__value) {
    if (is_promise(__value)) {
      __value.then(null, noop);
      return ` ${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})} `;
    }
    return function(location) {
      return ` <p class="my-auto">${escape(location.name)}</p> `;
    }(__value);
  }(data.location)}</h1> <div class="my-4">${validate_component(WeatherWidget, "WeatherWidget").$$render(
    $$result,
    {
      TemperatureC: data.weatherJSON.properties.timeseries.at(0).data.instant.details.air_temperature,
      Humidity: data.weatherJSON.properties.timeseries.at(0).data.instant.details.relative_humidity,
      WindSpeed: data.weatherJSON.properties.timeseries.at(0).data.instant.details.wind_speed,
      WindDirection: data.weatherJSON.properties.timeseries.at(0).data.instant.details.wind_from_direction,
      Pressure: data.weatherJSON.properties.timeseries.at(0).data.instant.details.air_pressure_at_sea_level,
      UVI: data.weatherJSON.properties.timeseries.at(0).data.instant.details.ultraviolet_index_clear_sky
    },
    {},
    {}
  )}</div> ${validate_component(Card, "Card").$$render($$result, { class: "my-2" }, {}, {
    contents: () => {
      return `<div slot="contents"><div class="relative mb-4 overflow-hidden">${function(__value) {
        if (is_promise(__value)) {
          __value.then(null, noop);
          return ` ${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})} `;
        }
        return function(weather) {
          return ` ${validate_component(WeatherChart, "WeatherChart").$$render($$result, { WeatherJSON: weather }, {}, {})} `;
        }(__value);
      }(data.weatherJSON)}</div></div>`;
    },
    header: () => {
      return `${validate_component(Header$1, "Header").$$render($$result, { slot: "header", class: "gap-0" }, {}, {
        actions: () => {
          return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { icon: mdiDotsVertical }, {}, {})}</div>`;
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
                return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiWeatherSunny }, {}, {})}`;
              }
            }
          )}</div>`;
        },
        title: () => {
          return `<div slot="title" class="text-nowrap text-xl font-medium" data-svelte-h="svelte-2l54nm">Weather</div>`;
        }
      })}`;
    }
  })} <div class="grid grid-cols-1 md:grid-cols-12 grid-flow-row gap-4">${validate_component(Card, "Card").$$render($$result, { class: "col-span-12 lg:col-span-8" }, {}, {
    contents: () => {
      return `<div slot="contents"><div class="w-full min-h-96">${function(__value) {
        if (is_promise(__value)) {
          __value.then(null, noop);
          return ` ${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})} `;
        }
        return function(sensors) {
          return `  ${sensors ? `${validate_component(Leaflet, "Leaflet").$$render(
            $$result,
            {
              view: view2,
              zoom,
              disableZoom: true,
              width: mapWidth,
              height: mapHeight,
              heatMapLatLngs: sensors?.filter((i) => i.cw_devices.type === 3 || i.cw_devices.type === 4).map((s) => {
                if (s.cw_devices.cw_ss_tmepnpk.length > 0)
                  return [
                    s.cw_devices.lat,
                    s.cw_devices.long,
                    s.cw_devices.cw_ss_tmepnpk[0].soil_temperatureC
                  ];
              })
            },
            {},
            {
              default: () => {
                return `${each(sensors, (sensor) => {
                  return `${sensor.cw_devices.lat && sensor.cw_devices.long ? `${validate_component(Marker, "Marker").$$render(
                    $$result,
                    {
                      latLng: [sensor.cw_devices.lat, sensor.cw_devices.long],
                      width: 40,
                      height: 40
                    },
                    {},
                    {
                      default: () => {
                        return `${validate_component(StatsQuickView, "StatsQuickView").$$render($$result, { sensor: sensor.cw_devices }, {}, {})} `;
                      }
                    }
                  )}` : ``}`;
                })}`;
              }
            }
          )}` : ``} `;
        }(__value);
      }(data.streamed.sensors)}</div></div>`;
    },
    header: () => {
      return `${validate_component(Header$1, "Header").$$render($$result, { slot: "header", class: "gap-0" }, {}, {
        avatar: () => {
          return `<div slot="avatar">${validate_component(Avatar, "Avatar").$$render(
            $$result,
            {
              class: "bg-accent-500 text-white font-bold mr-4"
            },
            {},
            {
              default: () => {
                return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiMapMarker }, {}, {})}`;
              }
            }
          )}</div>`;
        },
        title: () => {
          return `<div slot="title" class="text-nowrap text-xl font-medium" data-svelte-h="svelte-1xje8t5">Overview Map</div>`;
        }
      })}`;
    }
  })} ${function(__value) {
    if (is_promise(__value)) {
      __value.then(null, noop);
      return ` ${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})} `;
    }
    return function(sensors) {
      return ` ${validate_component(DeviceSelect, "DeviceSelect").$$render($$result, { sensors }, {}, {})} `;
    }(__value);
  }(data.streamed.sensors)}</div> ${validate_component(Card, "Card").$$render(
    $$result,
    {
      id: "list",
      class: "grid-flow-row col-span-2 justify-start my-2",
      title: "Location List"
    },
    {},
    {
      contents: () => {
        return `<div slot="contents">${validate_component(Calendar, "Calendar").$$render($$result, { plugins, options }, {}, {})}</div>`;
      },
      header: () => {
        return `${validate_component(Header$1, "Header").$$render(
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
                              return `Add Event`;
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
                    return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiCalendar }, {}, {})}`;
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
