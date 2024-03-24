import { c as create_ssr_component, h as compute_rest_props, a as subscribe, x as spread, y as escape_attribute_value, e as escape, z as escape_object, f as add_attribute, v as validate_component, o as getContext, b as compute_slots, k as noop, l as each, j as is_promise } from "../../../../../../../../chunks/ssr.js";
import { D as DateRangeField, S as Svelvet, C as Controls, N as Node, a as CWBadge, T as Tabs } from "../../../../../../../../chunks/ContrastTheme.svelte_svelte_type_style_lang.js";
import { isWithinInterval, subSeconds } from "date-fns";
import { g as getComponentClasses, f as decimalCount, c as cls, h as formatDate, P as PeriodType, k as keys, i as flatten } from "../../../../../../../../chunks/theme.js";
import { mdiDragHorizontal, mdiMoleculeCo2, mdiThermometer, mdiWater, mdiGauge, mdiCalendarRange, mdiPlus, mdiChevronLeft } from "@mdi/js";
import { I as Icon, B as Button } from "../../../../../../../../chunks/Button.js";
import { D as Duration } from "../../../../../../../../chunks/Duration.js";
import { C as CWStatCard } from "../../../../../../../../chunks/CWStatCard.js";
import { scaleLinear, scaleBand, scaleTime, scaleOrdinal } from "d3-scale";
import { i as interpolatePath, c as cls$1, f as format } from "../../../../../../../../chunks/ticks.js";
import { s as spring, m as motionStore, a as max, c as createDimensionGetter, T as Text, i as isScaleBand, g as greatestAbs, C as Chart, S as Svg, A as Axis, B as Bars } from "../../../../../../../../chunks/Chart.js";
import { t as tick } from "../../../../../../../../chunks/scheduler.js";
import { w as writable } from "../../../../../../../../chunks/index2.js";
import { c as cubicInOut } from "../../../../../../../../chunks/index3.js";
import { lineRadial, line, areaRadial, area } from "d3-shape";
import { A as Avatar } from "../../../../../../../../chunks/Overlay.js";
import { C as Card, H as Header } from "../../../../../../../../chunks/Card.js";
import moment from "moment";
import "../../../../../../../../chunks/client.js";
import { L as ListItem } from "../../../../../../../../chunks/ListItem.js";
import { p as page } from "../../../../../../../../chunks/stores.js";
const RangeSlider = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let scale;
  let $$restProps = compute_rest_props($$props, ["min", "max", "step", "value", "disabled"]);
  let $start, $$unsubscribe_start;
  let $end, $$unsubscribe_end;
  let { min = 0 } = $$props;
  let { max: max2 = 100 } = $$props;
  let { step = 1 } = $$props;
  let { value = [min, max2] } = $$props;
  let { disabled = false } = $$props;
  const settingsClasses = getComponentClasses("RangeSlider");
  const start = spring(0);
  $$unsubscribe_start = subscribe(start, (value2) => $start = value2);
  const end = spring(0);
  $$unsubscribe_end = subscribe(end, (value2) => $end = value2);
  if ($$props.min === void 0 && $$bindings.min && min !== void 0)
    $$bindings.min(min);
  if ($$props.max === void 0 && $$bindings.max && max2 !== void 0)
    $$bindings.max(max2);
  if ($$props.step === void 0 && $$bindings.step && step !== void 0)
    $$bindings.step(step);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  decimalCount(step);
  scale = scaleLinear().domain([min, max2]).range([0, 1]).clamp(true);
  {
    start.set(scale(value[0]));
  }
  {
    end.set(scale(value[1]));
  }
  $$unsubscribe_start();
  $$unsubscribe_end();
  return ` <div${spread(
    [
      {
        class: escape_attribute_value(cls("RangeSlider", "group relative h-2 bg-surface-content/10 rounded-full select-none outline-none", disabled && " pointer-events-none opacity-50", settingsClasses.root, $$props.class))
      },
      {
        style: "--start: " + escape($start, true) + "; --end: " + escape($end, true) + ";"
      },
      { disabled: disabled || null },
      {
        tabindex: escape_attribute_value(disabled ? -1 : 0)
      },
      escape_object($$restProps)
    ],
    {}
  )}><div style="left: calc(var(--start) * 100%); right: calc((1 - var(--end)) * 100%); " class="range absolute top-0 bottom-0 bg-primary"></div> <div style="left: calc((((var(--end) - var(--start)) / 2 ) + var(--start)) * 100%);"${add_attribute(
    "class",
    cls(
      "range-thumb",
      "absolute top-1/2 w-8 h-4 -translate-x-1/2 -translate-y-1/2",
      "rounded-full",
      "flex items-center justify-center",
      "opacity-0",
      "transition-opacity"
    ),
    0
  )}>${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      path: mdiDragHorizontal,
      class: "text-primary-content"
    },
    {},
    {}
  )}</div> <div style="left: calc(var(--start) * 100%);"${add_attribute("class", cls("thumb", "absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2", "border bg-white rounded-full outline-4", "hover:outline hover:outline-primary/20", "group-focus:outline group-focus:outline-primary/40"), 0)}></div> <div style="left: calc(var(--end) * 100%);"${add_attribute("class", cls("thumb", "absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2", "border bg-white rounded-full outline-4", "outline-primary/20", "hover:outline hover:outline-primary/20", "group-focus:outline group-focus:outline-primary/40"), 0)}></div> ${``} ${``}</div>`;
});
const Group = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["x", "initialX", "y", "initialY", "center", "spring", "tweened"]);
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $tweened_y, $$unsubscribe_tweened_y;
  let $tweened_x, $$unsubscribe_tweened_x;
  const { width, height } = getContext("LayerCake");
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  let { x = void 0 } = $$props;
  let { initialX = x } = $$props;
  let { y = void 0 } = $$props;
  let { initialY = y } = $$props;
  let { center = false } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened = void 0 } = $$props;
  let tweened_x = motionStore(initialX, { spring: spring2, tweened });
  $$unsubscribe_tweened_x = subscribe(tweened_x, (value) => $tweened_x = value);
  let tweened_y = motionStore(initialY, { spring: spring2, tweened });
  $$unsubscribe_tweened_y = subscribe(tweened_y, (value) => $tweened_y = value);
  let transform = void 0;
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.initialX === void 0 && $$bindings.initialX && initialX !== void 0)
    $$bindings.initialX(initialX);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.initialY === void 0 && $$bindings.initialY && initialY !== void 0)
    $$bindings.initialY(initialY);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0)
    $$bindings.center(center);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0)
    $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened !== void 0)
    $$bindings.tweened(tweened);
  {
    tick().then(() => {
      tweened_x.set(x);
      tweened_y.set(y);
    });
  }
  {
    if (x != null || y != null) {
      transform = `translate(${$tweened_x ?? 0}, ${$tweened_y ?? 0})`;
    }
  }
  {
    if (center) {
      transform = `translate(${$width / 2}, ${$height / 2})`;
    }
  }
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_tweened_y();
  $$unsubscribe_tweened_x();
  return `<g${spread(
    [
      {
        transform: escape_attribute_value(transform)
      },
      escape_object($$restProps)
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</g>`;
});
const Spline = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let tweenedOptions;
  let tweened_d;
  let endPoint;
  let $$restProps = compute_rest_props($$props, ["data", "pathData", "radial", "x", "y", "tweened", "draw", "curve", "defined"]);
  let $$slots = compute_slots(slots);
  let $tweened_d, $$unsubscribe_tweened_d = noop, $$subscribe_tweened_d = () => ($$unsubscribe_tweened_d(), $$unsubscribe_tweened_d = subscribe(tweened_d, ($$value) => $tweened_d = $$value), tweened_d);
  let $contextData, $$unsubscribe_contextData;
  let $yGet, $$unsubscribe_yGet;
  let $yScale, $$unsubscribe_yScale;
  let $xGet, $$unsubscribe_xGet;
  let $xScale, $$unsubscribe_xScale;
  let $startPoint, $$unsubscribe_startPoint;
  let $endPoint, $$unsubscribe_endPoint = noop, $$subscribe_endPoint = () => ($$unsubscribe_endPoint(), $$unsubscribe_endPoint = subscribe(endPoint, ($$value) => $endPoint = $$value), endPoint);
  const { data: contextData, xScale, yScale, xGet, yGet } = getContext("LayerCake");
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  let { data = void 0 } = $$props;
  let { pathData = void 0 } = $$props;
  let { radial = false } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { tweened = void 0 } = $$props;
  let { draw = void 0 } = $$props;
  let { curve = void 0 } = $$props;
  let { defined = void 0 } = $$props;
  let d = "";
  let pathEl = void 0;
  const startPoint = writable(void 0);
  $$unsubscribe_startPoint = subscribe(startPoint, (value) => $startPoint = value);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.pathData === void 0 && $$bindings.pathData && pathData !== void 0)
    $$bindings.pathData(pathData);
  if ($$props.radial === void 0 && $$bindings.radial && radial !== void 0)
    $$bindings.radial(radial);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened !== void 0)
    $$bindings.tweened(tweened);
  if ($$props.draw === void 0 && $$bindings.draw && draw !== void 0)
    $$bindings.draw(draw);
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0)
    $$bindings.curve(curve);
  if ($$props.defined === void 0 && $$bindings.defined && defined !== void 0)
    $$bindings.defined(defined);
  tweenedOptions = tweened ? { interpolate: interpolatePath, ...tweened } : false;
  $$subscribe_tweened_d(tweened_d = motionStore("", { tweened: tweenedOptions }));
  {
    {
      const path = radial ? lineRadial().angle((d2) => x ? $xScale(x(d2)) : $xGet(d2)).radius((d2) => y ? $yScale(y(d2)) : $yGet(d2)) : line().x((d2) => x ? $xScale(x(d2)) : $xGet(d2)).y((d2) => y ? $yScale(y(d2)) : $yGet(d2));
      if (curve)
        path.curve(curve);
      if (defined)
        path.defined(defined);
      d = pathData ?? path(data ?? $contextData);
      tweened_d.set(d);
    }
  }
  $$subscribe_endPoint(endPoint = motionStore(void 0, {
    tweened: draw ? {
      duration: typeof draw === "object" && draw.duration || 800,
      easing: typeof draw === "object" && draw.easing || cubicInOut,
      interpolate(a, b) {
        return (t) => {
          const totalLength = pathEl.getTotalLength();
          const point = pathEl.getPointAtLength(totalLength * t);
          return point;
        };
      }
    } : false
  }));
  {
    {
      if ($$slots.start || $$slots.end) {
        tick().then(() => {
        });
      }
    }
  }
  $$unsubscribe_tweened_d();
  $$unsubscribe_contextData();
  $$unsubscribe_yGet();
  $$unsubscribe_yScale();
  $$unsubscribe_xGet();
  $$unsubscribe_xScale();
  $$unsubscribe_startPoint();
  $$unsubscribe_endPoint();
  return `<path${spread(
    [
      { d: escape_attribute_value($tweened_d) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls$1("path-line fill-none", !$$props.stroke && "stroke-surface-content", $$props.class))
      }
    ],
    {}
  )}${add_attribute("this", pathEl, 0)}></path> ${$$slots.start && $startPoint ? `${validate_component(Group, "Group").$$render($$result, { x: $startPoint.x, y: $startPoint.y }, {}, {
    default: () => {
      return `${slots.start ? slots.start({ point: $startPoint }) : ``}`;
    }
  })}` : ``} ${$$slots.end && $endPoint ? `${validate_component(Group, "Group").$$render($$result, { x: $endPoint.x, y: $endPoint.y }, {}, {
    default: () => {
      return `${slots.end ? slots.end({ point: $endPoint }) : ``}`;
    }
  })}` : ``}`;
});
const Area = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let tweenedOptions;
  let tweened_d;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "pathData",
    "radial",
    "x",
    "y0",
    "y1",
    "tweened",
    "clipPath",
    "curve",
    "defined",
    "line"
  ]);
  let $contextData, $$unsubscribe_contextData;
  let $yGet, $$unsubscribe_yGet;
  let $yScale, $$unsubscribe_yScale;
  let $yRange, $$unsubscribe_yRange;
  let $xGet, $$unsubscribe_xGet;
  let $xScale, $$unsubscribe_xScale;
  let $tweened_d, $$unsubscribe_tweened_d = noop, $$subscribe_tweened_d = () => ($$unsubscribe_tweened_d(), $$unsubscribe_tweened_d = subscribe(tweened_d, ($$value) => $tweened_d = $$value), tweened_d);
  const { data: contextData, xScale, yScale, xGet, yGet, yRange } = getContext("LayerCake");
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  let { data = void 0 } = $$props;
  let { pathData = void 0 } = $$props;
  let { radial = false } = $$props;
  let { x = void 0 } = $$props;
  let { y0 = void 0 } = $$props;
  let { y1 = void 0 } = $$props;
  let { tweened = void 0 } = $$props;
  let { clipPath = void 0 } = $$props;
  let { curve = void 0 } = $$props;
  let { defined = void 0 } = $$props;
  let { line: line2 = false } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.pathData === void 0 && $$bindings.pathData && pathData !== void 0)
    $$bindings.pathData(pathData);
  if ($$props.radial === void 0 && $$bindings.radial && radial !== void 0)
    $$bindings.radial(radial);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y0 === void 0 && $$bindings.y0 && y0 !== void 0)
    $$bindings.y0(y0);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0)
    $$bindings.y1(y1);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened !== void 0)
    $$bindings.tweened(tweened);
  if ($$props.clipPath === void 0 && $$bindings.clipPath && clipPath !== void 0)
    $$bindings.clipPath(clipPath);
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0)
    $$bindings.curve(curve);
  if ($$props.defined === void 0 && $$bindings.defined && defined !== void 0)
    $$bindings.defined(defined);
  if ($$props.line === void 0 && $$bindings.line && line2 !== void 0)
    $$bindings.line(line2);
  tweenedOptions = tweened ? { interpolate: interpolatePath, ...tweened } : false;
  $$subscribe_tweened_d(tweened_d = motionStore("", { tweened: tweenedOptions }));
  {
    {
      const path = radial ? areaRadial().angle((d2) => x ? $xScale(x(d2)) : $xGet(d2)).innerRadius((d2) => y0 ? $yScale(y0(d2)) : max($yRange)).outerRadius((d2) => y1 ? $yScale(y1(d2)) : $yGet(d2)) : area().x((d2) => x ? $xScale(x(d2)) : $xGet(d2)).y0((d2) => y0 ? $yScale(y0(d2)) : max($yRange)).y1((d2) => y1 ? $yScale(y1(d2)) : $yGet(d2));
      if (curve)
        path.curve(curve);
      if (defined)
        path.defined(defined);
      const d = pathData ?? path(data ?? $contextData);
      tweened_d.set(d);
    }
  }
  $$unsubscribe_contextData();
  $$unsubscribe_yGet();
  $$unsubscribe_yScale();
  $$unsubscribe_yRange();
  $$unsubscribe_xGet();
  $$unsubscribe_xScale();
  $$unsubscribe_tweened_d();
  return `${line2 ? `${validate_component(Spline, "Spline").$$render($$result, Object.assign({}, { data }, { y: y1 }, { curve }, { defined }, { tweened }, typeof line2 === "object" ? line2 : null), {}, {})}` : ``} <path${spread(
    [
      { d: escape_attribute_value($tweened_d) },
      {
        "clip-path": escape_attribute_value(clipPath)
      },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls$1("path-area", $$props.class))
      }
    ],
    {}
  )}></path>`;
});
const AreaStack = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let lineData;
  let $data, $$unsubscribe_data;
  let $rGet, $$unsubscribe_rGet;
  const { data, rGet } = getContext("LayerCake");
  $$unsubscribe_data = subscribe(data, (value) => $data = value);
  $$unsubscribe_rGet = subscribe(rGet, (value) => $rGet = value);
  let { curve = void 0 } = $$props;
  let { defined = void 0 } = $$props;
  let { opacity = 0.3 } = $$props;
  let { line: line2 = false } = $$props;
  let { tweened = void 0 } = $$props;
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0)
    $$bindings.curve(curve);
  if ($$props.defined === void 0 && $$bindings.defined && defined !== void 0)
    $$bindings.defined(defined);
  if ($$props.opacity === void 0 && $$bindings.opacity && opacity !== void 0)
    $$bindings.opacity(opacity);
  if ($$props.line === void 0 && $$bindings.line && line2 !== void 0)
    $$bindings.line(line2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened !== void 0)
    $$bindings.tweened(tweened);
  lineData = [...$data].reverse();
  $$unsubscribe_data();
  $$unsubscribe_rGet();
  return `${line2 ? `<g class="line-group">${each(lineData, (seriesData) => {
    return `${validate_component(Spline, "Spline").$$render($$result, Object.assign({}, { data: seriesData }, { y: (d) => d[1] }, { stroke: $rGet(seriesData) }, { curve }, { defined }, { tweened }, line2), {}, {})}`;
  })}</g>` : ``} ${slots.default ? slots.default({ data: $data }) : ` <g class="area-group">${each($data, (seriesData) => {
    return `${validate_component(Area, "Area").$$render(
      $$result,
      {
        data: seriesData,
        y0: (d) => d[0],
        y1: (d) => d[1],
        fill: $rGet(seriesData),
        curve,
        defined,
        opacity,
        tweened
      },
      {},
      {}
    )}`;
  })}</g> `}`;
});
const Labels = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let yBaseline;
  let getDimensions;
  let getValue;
  let getLabelValue;
  let getFormattedValue;
  let getTextProps;
  let $$restProps = compute_rest_props($$props, ["significantDigits", "format", "groupBy", "groupPaddingInner", "groupPaddingOuter"]);
  let $yScale, $$unsubscribe_yScale;
  let $getDimensions, $$unsubscribe_getDimensions = noop, $$subscribe_getDimensions = () => ($$unsubscribe_getDimensions(), $$unsubscribe_getDimensions = subscribe(getDimensions, ($$value) => $getDimensions = $$value), getDimensions);
  let $y, $$unsubscribe_y;
  let $x, $$unsubscribe_x;
  let $custom, $$unsubscribe_custom;
  let $flatData, $$unsubscribe_flatData;
  const { flatData, yScale, x, y, custom } = getContext("LayerCake");
  $$unsubscribe_flatData = subscribe(flatData, (value) => $flatData = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_x = subscribe(x, (value) => $x = value);
  $$unsubscribe_y = subscribe(y, (value) => $y = value);
  $$unsubscribe_custom = subscribe(custom, (value) => $custom = value);
  let { significantDigits = 3 } = $$props;
  let { format: format$1 = void 0 } = $$props;
  let { groupBy = void 0 } = $$props;
  let { groupPaddingInner = 0.2 } = $$props;
  let { groupPaddingOuter = 0 } = $$props;
  if ($$props.significantDigits === void 0 && $$bindings.significantDigits && significantDigits !== void 0)
    $$bindings.significantDigits(significantDigits);
  if ($$props.format === void 0 && $$bindings.format && format$1 !== void 0)
    $$bindings.format(format$1);
  if ($$props.groupBy === void 0 && $$bindings.groupBy && groupBy !== void 0)
    $$bindings.groupBy(groupBy);
  if ($$props.groupPaddingInner === void 0 && $$bindings.groupPaddingInner && groupPaddingInner !== void 0)
    $$bindings.groupPaddingInner(groupPaddingInner);
  if ($$props.groupPaddingOuter === void 0 && $$bindings.groupPaddingOuter && groupPaddingOuter !== void 0)
    $$bindings.groupPaddingOuter(groupPaddingOuter);
  yBaseline = $custom?.yBaseline ?? 0;
  $$subscribe_getDimensions(getDimensions = createDimensionGetter(getContext("LayerCake"), {
    // x,
    // y,
    groupBy,
    // padding,
    groupPadding: {
      inner: groupPaddingInner,
      outer: groupPaddingOuter
    }
  }));
  getValue = (item) => isScaleBand($yScale) ? $x(item) : $y(item);
  getLabelValue = (item) => {
    const value = getValue(item);
    return (Array.isArray(value) ? greatestAbs(value) : value) + yBaseline;
  };
  getFormattedValue = (item) => {
    const labelValue = getLabelValue(item);
    let formattedValue = labelValue;
    if (labelValue != null) {
      if (format$1) {
        formattedValue = format(labelValue, format$1 ?? $yScale.tickFormat?.());
      }
    }
    return formattedValue ?? "";
  };
  getTextProps = (item) => {
    const labelValue = getLabelValue(item);
    const dimensions = $getDimensions(item);
    if (isScaleBand($yScale)) {
      if (labelValue < 0) {
        return {
          x: dimensions?.x - 4,
          y: dimensions?.y + (dimensions?.height ?? 0) / 2,
          textAnchor: "end",
          verticalAnchor: "middle",
          capHeight: ".6rem"
        };
      } else {
        return {
          x: dimensions?.x + dimensions?.width + 4,
          y: dimensions?.y + (dimensions?.height ?? 0) / 2,
          textAnchor: "start",
          verticalAnchor: "middle",
          capHeight: ".6rem"
        };
      }
    } else {
      if (labelValue < 0) {
        return {
          x: dimensions?.x + (dimensions?.width ?? 0) / 2,
          y: dimensions?.y + dimensions?.height,
          dy: "0.5em",
          textAnchor: "middle",
          verticalAnchor: "middle"
        };
      } else {
        return {
          x: dimensions?.x + (dimensions?.width ?? 0) / 2,
          y: dimensions?.y,
          dy: "-0.6em",
          textAnchor: "middle",
          verticalAnchor: "middle"
        };
      }
    }
  };
  $$unsubscribe_yScale();
  $$unsubscribe_getDimensions();
  $$unsubscribe_y();
  $$unsubscribe_x();
  $$unsubscribe_custom();
  $$unsubscribe_flatData();
  return `<g class="Labels">${each($flatData, (item, index) => {
    return ` ${validate_component(Text, "Text").$$render(
      $$result,
      Object.assign(
        {},
        { value: getFormattedValue(item) },
        {
          class: "text-xs stroke-surface-100 [stroke-width:2px]"
        },
        getTextProps(item),
        $$restProps
      ),
      {},
      {}
    )}`;
  })}</g>`;
});
const Details = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let co2Data;
  let { sensor } = $$props;
  let earliestData = sensor.sensor.data.at(-1);
  let latestData = sensor.sensor.data.at(0);
  let earliestTime = moment(earliestData.created_at);
  let latestTime = moment(latestData.created_at);
  let maxHours = latestTime.diff(earliestTime, "hours");
  let value = [0, maxHours];
  if ($$props.sensor === void 0 && $$bindings.sensor && sensor !== void 0)
    $$bindings.sensor(sensor);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    co2Data = sensor.sensor.data.filter((f) => {
      const createdAt = moment(f.created_at);
      return isWithinInterval(createdAt.toDate(), {
        start: moment().subtract(value[0], "hours").toDate(),
        // More hours ago, based on the maxHours
        end: moment().subtract(value[1], "hours").toDate()
      });
    });
    $$rendered = `<div class="${"grid grid-cols-" + escape(latestData.pressure !== null ? 4 : 3, true) + " mt-10 gap-4 mb-2"}">${validate_component(CWStatCard, "CWStatCard").$$render(
      $$result,
      {
        icon: mdiMoleculeCo2,
        title: "CO²",
        value: latestData.co2_level,
        optimal: 24.33,
        notation: " PPM",
        counterStartTime: subSeconds(sensor.sensor.data?.at(0).created_at, 0)
      },
      {},
      {}
    )} ${validate_component(CWStatCard, "CWStatCard").$$render(
      $$result,
      {
        icon: mdiThermometer,
        title: "Temperature",
        value: latestData.temperature,
        optimal: 24.33,
        notation: "°c",
        counterStartTime: subSeconds(sensor.sensor.data?.at(0).created_at, 0)
      },
      {},
      {}
    )} ${validate_component(CWStatCard, "CWStatCard").$$render(
      $$result,
      {
        icon: mdiWater,
        title: "Humidity",
        value: latestData.humidity,
        optimal: 25,
        notation: "%",
        counterStartTime: subSeconds(sensor.sensor.data?.at(0).created_at, 0)
      },
      {},
      {}
    )} ${latestData.pressure !== null ? `${validate_component(CWStatCard, "CWStatCard").$$render(
      $$result,
      {
        icon: mdiGauge,
        title: "Pressure",
        value: latestData.pressure,
        optimal: 25,
        notation: "hPa",
        counterStartTime: subSeconds(sensor.sensor.data?.at(0).created_at, 0)
      },
      {},
      {}
    )}` : ``}</div> ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      header: () => {
        return `${validate_component(Header, "Header").$$render(
          $$result,
          {
            title: "CO² History",
            subheading: "CO² Over time",
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
                    return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiMoleculeCo2 }, {}, {})}`;
                  }
                }
              )}</div>`;
            }
          }
        )}`;
      },
      default: () => {
        return `<div class="h-[300px] p-4 border rounded">${validate_component(Chart, "Chart").$$render(
          $$result,
          {
            data: co2Data.map((d) => {
              return {
                date: new Date(d.created_at),
                value: d.co2_level
              };
            }),
            x: "date",
            xScale: scaleBand().padding(0.4),
            y: "value",
            yDomain: [0, null],
            yNice: 4,
            padding: { left: 16, bottom: 24 }
          },
          {},
          {
            default: () => {
              return `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Axis, "Axis").$$render(
                    $$result,
                    {
                      placement: "left",
                      grid: true,
                      rule: true
                    },
                    {},
                    {}
                  )} ${validate_component(Axis, "Axis").$$render(
                    $$result,
                    {
                      placement: "bottom",
                      format: (d) => formatDate(d, PeriodType.DayTime, { variant: "short" }),
                      rule: true
                    },
                    {},
                    {}
                  )} ${validate_component(Bars, "Bars").$$render(
                    $$result,
                    {
                      radius: 4,
                      strokeWidth: 1,
                      class: "fill-primary"
                    },
                    {},
                    {}
                  )}`;
                }
              })}`;
            }
          }
        )} ${validate_component(RangeSlider, "RangeSlider").$$render(
          $$result,
          { min: 0, max: maxHours, value },
          {
            value: ($$value) => {
              value = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div>`;
      }
    })} <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">${validate_component(Card, "Card").$$render($$result, {}, {}, {
      header: () => {
        return `${validate_component(Header, "Header").$$render(
          $$result,
          {
            title: "Temperature History",
            subheading: "Temp Over time",
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
                    return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiThermometer }, {}, {})}`;
                  }
                }
              )}</div>`;
            }
          }
        )}`;
      },
      default: () => {
        return `<div class="h-[300px] p-4 border rounded">${validate_component(Chart, "Chart").$$render(
          $$result,
          {
            data: co2Data.map((d) => {
              return {
                date: new Date(d.created_at),
                value: d.temperature
              };
            }),
            x: "date",
            xScale: scaleTime(),
            y: "value",
            yDomain: [0, null],
            yNice: true,
            padding: { left: 16, bottom: 24 }
          },
          {},
          {
            default: () => {
              return `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Axis, "Axis").$$render(
                    $$result,
                    {
                      placement: "left",
                      grid: true,
                      rule: true
                    },
                    {},
                    {}
                  )} ${validate_component(Axis, "Axis").$$render(
                    $$result,
                    {
                      placement: "bottom",
                      format: (d) => formatDate(d, PeriodType.Day, { variant: "short" }),
                      rule: true
                    },
                    {},
                    {}
                  )} ${validate_component(Spline, "Spline").$$render($$result, { class: "stroke-2 stroke-primary" }, {}, {})} ${validate_component(Labels, "Labels").$$render($$result, { format: "integer" }, {}, {})}`;
                }
              })}`;
            }
          }
        )} ${validate_component(RangeSlider, "RangeSlider").$$render(
          $$result,
          { min: 0, max: maxHours, value },
          {
            value: ($$value) => {
              value = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div>`;
      }
    })} ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      header: () => {
        return `${validate_component(Header, "Header").$$render(
          $$result,
          {
            title: "Humidity History",
            subheading: "Temp Over time",
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
                    return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiWater }, {}, {})}`;
                  }
                }
              )}</div>`;
            }
          }
        )}`;
      },
      default: () => {
        return `<div class="h-[300px] p-4 border rounded">${validate_component(Chart, "Chart").$$render(
          $$result,
          {
            data: co2Data.map((d) => {
              return {
                date: new Date(d.created_at),
                value: d.humidity
              };
            }),
            x: "date",
            xScale: scaleTime(),
            y: "value",
            yDomain: [0, null],
            yNice: true,
            padding: { left: 16, bottom: 24 }
          },
          {},
          {
            default: () => {
              return `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Axis, "Axis").$$render(
                    $$result,
                    {
                      placement: "left",
                      grid: true,
                      rule: true
                    },
                    {},
                    {}
                  )} ${validate_component(Axis, "Axis").$$render(
                    $$result,
                    {
                      placement: "bottom",
                      format: (d) => formatDate(d, PeriodType.Day, { variant: "short" }),
                      rule: true
                    },
                    {},
                    {}
                  )} ${validate_component(Spline, "Spline").$$render($$result, { class: "stroke-2 stroke-primary" }, {}, {})} ${validate_component(Labels, "Labels").$$render($$result, { format: "integer" }, {}, {})}`;
                }
              })}`;
            }
          }
        )} ${validate_component(RangeSlider, "RangeSlider").$$render(
          $$result,
          { min: 0, max: maxHours, value },
          {
            value: ($$value) => {
              value = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div>`;
      }
    })}</div>`;
  } while (!$$settled);
  return $$rendered;
});
const History = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { sensor } = $$props;
  const stackData = stack().keys(keys)(sensor.sensor.data);
  let selectedDateRange = {
    from: /* @__PURE__ */ new Date(),
    to: /* @__PURE__ */ new Date(),
    periodType: PeriodType.Day
  };
  console.log(sensor.sensor.data);
  if ($$props.sensor === void 0 && $$bindings.sensor && sensor !== void 0)
    $$bindings.sensor(sensor);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
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
    )} <div class="h-[300px] p-4 border rounded">${validate_component(Chart, "Chart").$$render(
      $$result,
      {
        data: stackData,
        flatData: flatten(stackData),
        x: (d) => d.data.date,
        xScale: scaleTime(),
        y: [0, 1],
        yNice: true,
        r: "key",
        rScale: scaleOrdinal(),
        rDomain: keys,
        rRange: [
          "hsl(var(--color-danger))",
          "hsl(var(--color-success))",
          "hsl(var(--color-info))"
        ],
        padding: { left: 16, bottom: 24 }
      },
      {},
      {
        default: () => {
          return `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(Axis, "Axis").$$render(
                $$result,
                {
                  placement: "left",
                  grid: true,
                  rule: true
                },
                {},
                {}
              )} ${validate_component(Axis, "Axis").$$render(
                $$result,
                {
                  placement: "bottom",
                  format: (d) => formatDate(d, PeriodType.Day, { variant: "short" }),
                  rule: true
                },
                {},
                {}
              )} ${validate_component(AreaStack, "AreaStack").$$render($$result, { line: { "stroke-width": 2 } }, {}, {})}`;
            }
          })}`;
        }
      }
    )}</div> <ol class="">${each(sensor.sensor.data, (dat) => {
      return `<li>${escape(dat.created_at)} ${escape(dat.temperature)} ${escape(dat.humidity)} - ${escape(dat.co2_level)} </li>`;
    })}</ol></ol></div>`;
  } while (!$$settled);
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
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let { data } = $$props;
  console.log(data);
  let userAvailableTabs = [
    { label: "Dashboard", value: 1 },
    { label: "History", value: 2 },
    { label: "Rules", value: 3 },
    { label: "Notifications", value: 4 },
    { label: "Settings", value: 5 },
    { label: "Permissions", value: 6 }
  ];
  let currentTab = 1;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">${validate_component(Button, "Button").$$render(
      $$result,
      {
        variant: "outline",
        icon: mdiChevronLeft,
        size: "lg"
      },
      {},
      {}
    )} <p class="my-auto" data-svelte-h="svelte-1qwc8gd">CO² Sensor</p></h1> <div class="grid grid-cols-3 grid-flow-row my-4"><div class="flex flex-col"><p class="mb-1 text-gray-600" data-svelte-h="svelte-vwrftt">Serial Number</p> <p class="text-sm">${escape($page.params.sensor_eui)}</p></div> <div class="flex flex-col"><p class="mb-1 text-gray-600" data-svelte-h="svelte-10jov3t">Last Update</p> <p class="text-sm">${escape(new Date(data.sensor.data?.at(0).created_at).toLocaleTimeString())} <small>(${validate_component(Duration, "Duration").$$render(
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
          return `${value === 1 ? `${function(__value) {
            if (is_promise(__value)) {
              __value.then(null, noop);
              return `
				loading...
			`;
            }
            return function(sensor) {
              return ` ${validate_component(Details, "Details").$$render($$result, { sensor }, {}, {})} `;
            }(__value);
          }(data)}` : `${value === 2 ? `${function(__value) {
            if (is_promise(__value)) {
              __value.then(null, noop);
              return `
				loading...
			`;
            }
            return function(sensor) {
              return ` ${validate_component(History, "History").$$render($$result, { sensor }, {}, {})} `;
            }(__value);
          }(data)}` : `${value === 3 ? `${validate_component(Rules, "Rules").$$render($$result, {}, {}, {})}` : `${value === 4 ? `${validate_component(Notifications, "Notifications").$$render($$result, {}, {}, {})}` : `${value === 5 ? `${validate_component(Settings, "Settings").$$render($$result, {}, {}, {})}` : `${value === 6 ? `${validate_component(Permissions, "Permissions").$$render($$result, {}, {}, {})}` : ``}`}`}`}`}`}`;
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
