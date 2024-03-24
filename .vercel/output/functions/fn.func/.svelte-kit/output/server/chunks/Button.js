import { c as create_ssr_component, e as escape, n as null_to_empty, g as add_styles, D as merge_ssr_styles, f as add_attribute, l as each, b as compute_slots, x as spread, z as escape_object, y as escape_attribute_value, s as setContext, o as getContext, h as compute_rest_props, v as validate_component } from "./ssr.js";
import { g as getComponentClasses, c as cls, e as getComponentSettings } from "./theme.js";
const void_element_names = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;
function is_void(name) {
  return void_element_names.test(name) || name.toLowerCase() === "!doctype";
}
function isLiteralObject(obj) {
  return obj && typeof obj === "object" && obj.constructor === Object;
}
function omit(obj, keys) {
  if (keys.length === 0) {
    return obj;
  } else {
    return Object.fromEntries(Object.entries(obj).filter(([key, value]) => !keys.includes(key)));
  }
}
const idMap = /* @__PURE__ */ new Map();
function uniqueId(prefix = "") {
  let id = (idMap.get(prefix) ?? 0) + 1;
  idMap.set(prefix, id);
  return prefix + id;
}
const css$1 = {
  code: ".icon-container.svelte-uen7q8 > svg{width:var(--width);height:var(--height)}",
  map: null
};
let cache = /* @__PURE__ */ new Map();
const Icon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let isLabelled;
  let $$slots = compute_slots(slots);
  let { size = "1.5em" } = $$props;
  let { width = size } = $$props;
  let { height = size } = $$props;
  let { viewBox = "0 0 24 24" } = $$props;
  let { path = "" } = $$props;
  let { data = void 0 } = $$props;
  let { svg = void 0 } = $$props;
  let { svgUrl = void 0 } = $$props;
  let { title = void 0 } = $$props;
  let { desc = void 0 } = $$props;
  let { titleId = title ? uniqueId("title-") : "" } = $$props;
  let { descId = desc ? uniqueId("desc-") : "" } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Icon");
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.viewBox === void 0 && $$bindings.viewBox && viewBox !== void 0)
    $$bindings.viewBox(viewBox);
  if ($$props.path === void 0 && $$bindings.path && path !== void 0)
    $$bindings.path(path);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.svg === void 0 && $$bindings.svg && svg !== void 0)
    $$bindings.svg(svg);
  if ($$props.svgUrl === void 0 && $$bindings.svgUrl && svgUrl !== void 0)
    $$bindings.svgUrl(svgUrl);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.desc === void 0 && $$bindings.desc && desc !== void 0)
    $$bindings.desc(desc);
  if ($$props.titleId === void 0 && $$bindings.titleId && titleId !== void 0)
    $$bindings.titleId(titleId);
  if ($$props.descId === void 0 && $$bindings.descId && descId !== void 0)
    $$bindings.descId(descId);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  $$result.css.add(css$1);
  isLabelled = title || desc;
  {
    if (typeof data === "object" && data && "icon" in data) {
      const [_width, _height, _ligatures, _unicode, _path] = data.icon;
      viewBox = `0 0 ${_width} ${_height}`;
      path = _path;
      width = "1.0rem";
      height = "1.0rem";
    } else if (typeof data === "string") {
      const dataStr = data.toLowerCase();
      if (dataStr.includes("<svg")) {
        svg = data;
      } else if (dataStr.includes("http")) {
        svgUrl = data;
      } else {
        path = data;
      }
    }
  }
  {
    if (svgUrl) {
      let promise;
      if (cache.has(svgUrl)) {
        cache.get(svgUrl)?.then((text) => svg = text);
      } else {
        promise = fetch(svgUrl).then((resp) => resp.text()).catch(() => {
          if (svgUrl && typeof svgUrl === "string") {
            cache.delete(svgUrl);
          }
          return "";
        });
        cache.set(svgUrl, promise);
        promise.then((text) => {
          svg = text;
        });
      }
    }
  }
  {
    if (svg?.includes("fontawesome.com")) {
      width = "1.0rem";
      height = "1.0rem";
    }
  }
  return `${svg || svgUrl || $$slots.default ? `<span class="${escape(null_to_empty(cls("Icon", "icon-container inline-block flex-shrink-0 align-middle fill-current", settingsClasses.root, classes.root, $$props.class)), true) + " svelte-uen7q8"}"${add_styles(merge_ssr_styles(escape($$props.style, true), {
    width,
    height,
    "--width": width,
    "--height": height
  }))}${add_attribute("role", isLabelled ? "img" : "presentation", 0)}${add_attribute("aria-labelledby", isLabelled ? `${titleId} ${descId}` : void 0, 0)}>${slots.default ? slots.default({}) : ` <!-- HTML_TAG_START -->${svg ?? ""}<!-- HTML_TAG_END --> `}</span>` : `<svg${add_attribute("width", width, 0)}${add_attribute("height", height, 0)}${add_attribute("viewBox", viewBox, 0)} class="${escape(null_to_empty(cls("Icon", "inline-block flex-shrink-0 fill-current", settingsClasses.root, classes.root, $$props.class)), true) + " svelte-uen7q8"}"${add_attribute("style", $$props.style, 0)}${add_attribute("role", isLabelled ? "img" : "presentation", 0)}${add_attribute("aria-labelledby", isLabelled ? `${titleId} ${descId}` : void 0, 0)}>${title ? `<title${add_attribute("id", titleId, 0)}>${escape(title)}</title>` : ``}${desc ? `<desc${add_attribute("id", descId, 0)}>${escape(desc)}</desc>` : ``}${each(Array.isArray(path) ? path : [path], (d, i) => {
    return `<path${add_attribute("d", d, 0)} fill="currentColor" class="${escape(
      null_to_empty(cls(
        Array.isArray(settingsClasses.path) ? settingsClasses.path[i] : settingsClasses.path,
        Array.isArray(classes.path) ? classes.path[i] : classes.path
      )),
      true
    ) + " svelte-uen7q8"}"></path>`;
  })}</svg>`}`;
});
const css = {
  code: "svg.svelte-1lcn4pd.svelte-1lcn4pd{width:100%;height:100%;margin:auto;position:absolute;top:0;bottom:0;left:0;right:0;z-index:0}.indeterminate.svelte-1lcn4pd>svg.svelte-1lcn4pd{animation:svelte-1lcn4pd-rotate 1.4s linear infinite;transform-origin:center center;transition:all 0.2s ease-in-out}.indeterminate.svelte-1lcn4pd .path.svelte-1lcn4pd{animation:svelte-1lcn4pd-dash 1.4s ease-in-out infinite;stroke-linecap:round;stroke-dasharray:80, 200;stroke-dashoffset:0px}.info.svelte-1lcn4pd.svelte-1lcn4pd{align-items:center;display:flex;justify-content:center}.track.svelte-1lcn4pd.svelte-1lcn4pd{stroke:var(--track-color, rgba(0, 0, 0, 0.1));z-index:1}.path.svelte-1lcn4pd.svelte-1lcn4pd{stroke:var(--path-color, currentColor);z-index:2;transition:all 0.6s ease-in-out}@keyframes svelte-1lcn4pd-dash{0%{stroke-dasharray:1, 200;stroke-dashoffset:0px}50%{stroke-dasharray:100, 200;stroke-dashoffset:-15px}100%{stroke-dasharray:100, 200;stroke-dashoffset:-125px}}@keyframes svelte-1lcn4pd-rotate{100%{transform:rotate(360deg)}}",
  map: null
};
const radius = 20;
const ProgressCircle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let indeterminate;
  let circumference;
  let strokeDashArray;
  let strokeDashOffset;
  let viewBoxSize;
  let strokeWidth;
  let { value = null } = $$props;
  let { rotate = 0 } = $$props;
  let { size = 40 } = $$props;
  let { width = 4 } = $$props;
  let { track = false } = $$props;
  const settingsClasses = getComponentClasses("ProgressCircle");
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0)
    $$bindings.rotate(rotate);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.track === void 0 && $$bindings.track && track !== void 0)
    $$bindings.track(track);
  $$result.css.add(css);
  indeterminate = value == null;
  circumference = 2 * Math.PI * radius;
  strokeDashArray = Math.round(circumference * 1e3) / 1e3;
  strokeDashOffset = (100 - (value ?? 0)) / 100 * circumference + "px";
  viewBoxSize = radius / (1 - width / size);
  strokeWidth = width / size * viewBoxSize * 2;
  return `<div${spread(
    [
      escape_object($$props),
      {
        class: escape_attribute_value(cls("ProgressCircular", "relative inline-flex justify-center items-center align-middle", settingsClasses.root, $$props.class))
      },
      {
        style: "height: " + escape(size, true) + "px; width: " + escape(size, true) + "px; " + escape($$props.style, true)
      }
    ],
    {
      classes: (indeterminate ? "indeterminate" : "") + " svelte-1lcn4pd"
    }
  )}><svg xmlns="http://www.w3.org/2000/svg" style="${"transform: rotate(" + escape(rotate - (indeterminate ? 0 : 90), true) + "deg)"}" viewBox="${escape(viewBoxSize, true) + "\n    " + escape(viewBoxSize, true) + "\n    " + escape(2 * viewBoxSize, true) + "\n    " + escape(2 * viewBoxSize, true)}" class="svelte-1lcn4pd">${track ? `<circle class="track svelte-1lcn4pd" fill="transparent"${add_attribute("cx", 2 * viewBoxSize, 0)}${add_attribute("cy", 2 * viewBoxSize, 0)}${add_attribute("r", radius, 0)}${add_attribute("stroke-width", strokeWidth, 0)}${add_attribute("stroke-dasharray", strokeDashArray, 0)}${add_attribute("stroke-dashoffset", 0, 0)}></circle>` : ``}<circle class="path svelte-1lcn4pd" fill="transparent"${add_attribute("cx", 2 * viewBoxSize, 0)}${add_attribute("cy", 2 * viewBoxSize, 0)}${add_attribute("r", radius, 0)}${add_attribute("stroke-width", strokeWidth, 0)}${add_attribute("stroke-dasharray", strokeDashArray, 0)}${add_attribute("stroke-dashoffset", strokeDashOffset, 0)}></circle></svg> <div class="info svelte-1lcn4pd">${slots.default ? slots.default({}) : ``}</div> </div>`;
});
const buttonGroupKey = Symbol();
function setButtonGroup(value) {
  setContext(buttonGroupKey, value);
}
function getButtonGroup() {
  return getContext(buttonGroupKey);
}
function asIconData(v) {
  return isIconComponentProps(v) ? v.data : v;
}
function isIconComponentProps(v) {
  return isLiteralObject(v) && typeof v["iconName"] === "undefined";
}
const Button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let _class;
  let $$restProps = compute_rest_props($$props, [
    "type",
    "href",
    "target",
    "fullWidth",
    "icon",
    "iconOnly",
    "actions",
    "loading",
    "disabled",
    "rounded",
    "variant",
    "size",
    "color",
    "classes"
  ]);
  let $$slots = compute_slots(slots);
  const { classes: settingsClasses, defaults } = getComponentSettings("Button");
  let { type = "button" } = $$props;
  let { href = void 0 } = $$props;
  let { target = void 0 } = $$props;
  let { fullWidth = false } = $$props;
  let { icon = void 0 } = $$props;
  let { iconOnly = icon !== void 0 && $$slots.default !== true } = $$props;
  let { actions = void 0 } = $$props;
  let { loading = false } = $$props;
  let { disabled = false } = $$props;
  let { rounded = void 0 } = $$props;
  let { variant = void 0 } = $$props;
  let { size = void 0 } = $$props;
  let { color = void 0 } = $$props;
  let { classes = {} } = $$props;
  const groupContext = getButtonGroup();
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.target === void 0 && $$bindings.target && target !== void 0)
    $$bindings.target(target);
  if ($$props.fullWidth === void 0 && $$bindings.fullWidth && fullWidth !== void 0)
    $$bindings.fullWidth(fullWidth);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.iconOnly === void 0 && $$bindings.iconOnly && iconOnly !== void 0)
    $$bindings.iconOnly(iconOnly);
  if ($$props.actions === void 0 && $$bindings.actions && actions !== void 0)
    $$bindings.actions(actions);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0)
    $$bindings.rounded(rounded);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  variant = variant ?? groupContext?.variant ?? defaults.variant ?? "default";
  size = size ?? groupContext?.size ?? defaults.size ?? "md";
  color = color ?? groupContext?.color ?? defaults.color ?? "default";
  rounded = rounded ?? groupContext?.rounded ?? defaults.rounded ?? (iconOnly ? "full" : true);
  _class = cls(
    "Button",
    "transition duration-200 ring-surface-content/60",
    "focus:outline-none focus-visible:ring-1",
    fullWidth ? "flex w-full" : "inline-flex",
    loading ? "gap-2" : "gap-1",
    variant === "none" || !rounded ? "" : rounded === "full" ? "rounded-full" : "rounded",
    variant !== "none" && [
      "items-center justify-center",
      "font-medium tracking-wider whitespace-nowrap",
      iconOnly ? {
        sm: "text-xs p-1",
        md: "text-sm p-2",
        lg: "text-base p-3"
      }[size] : {
        sm: "text-xs px-2 py-1",
        md: "text-sm px-4 py-2",
        lg: "text-base px-6 py-3"
      }[size]
    ],
    disabled && "opacity-50 pointer-events-none",
    // Variant specific styles
    `variant-${variant}`,
    {
      default: "",
      outline: "border focus-visible:ring-offset-1",
      fill: "focus-visible:ring-offset-1",
      "fill-outline": "border focus-visible:ring-offset-1",
      "fill-light": "",
      text: "p-0",
      none: ""
    }[variant ?? "none"],
    // Variant specific colors
    {
      default: {
        default: [
          "hover:[--bg-color:theme(colors.surface-content/10%)]",
          // '[--text-color:theme(colors.surface-content)]', // inherit
          "[--ring-color:theme(colors.surface-content/60%)]"
        ],
        primary: [
          "hover:[--bg-color:theme(colors.primary/10%)]",
          "[--text-color:theme(colors.primary)]",
          "[--ring-color:theme(colors.primary/60%)]"
        ],
        secondary: [
          "hover:[--bg-color:theme(colors.secondary/10%)]",
          "[--text-color:theme(colors.secondary)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        accent: [
          "hover:[--bg-color:theme(colors.accent/10%)]",
          "[--text-color:theme(colors.accent)]",
          "[--ring-color:theme(colors.accent/60%)]"
        ],
        neutral: [
          "hover:[--bg-color:theme(colors.neutral/10%)]",
          "[--text-color:theme(colors.neutral)]",
          "[--ring-color:theme(colors.neutral/60%)]"
        ],
        info: [
          "hover:[--bg-color:theme(colors.info/10%)]",
          "[--text-color:theme(colors.info)]",
          "[--ring-color:theme(colors.info/60%)]"
        ],
        success: [
          "hover:[--bg-color:theme(colors.success/10%)]",
          "[--text-color:theme(colors.success)]",
          "[--ring-color:theme(colors.success/60%)]"
        ],
        warning: [
          "hover:[--bg-color:theme(colors.warning/10%)]",
          "[--text-color:theme(colors.warning)]",
          "[--ring-color:theme(colors.warning/60%)]"
        ],
        danger: [
          "hover:[--bg-color:theme(colors.danger/10%)]",
          "[--text-color:theme(colors.danger)]",
          "[--ring-color:theme(colors.danger/60%)]"
        ]
      },
      outline: {
        default: [
          "hover:[--bg-color:theme(colors.surface-content/10%)]",
          "[--border-color:theme(colors.surface-content)]",
          "[--text-color:theme(colors.surface-content)]",
          "[--ring-color:theme(colors.surface-content/60%)]"
        ],
        primary: [
          "hover:[--bg-color:theme(colors.primary/10%)]",
          "[--border-color:theme(colors.primary)]",
          "[--text-color:theme(colors.primary)]",
          "[--ring-color:theme(colors.primary/60%)]"
        ],
        secondary: [
          "hover:[--bg-color:theme(colors.secondary/10%)]",
          "[--border-color:theme(colors.secondary)]",
          "[--text-color:theme(colors.secondary)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        accent: [
          "hover:[--bg-color:theme(colors.accent/10%)]",
          "[--border-color:theme(colors.accent)]",
          "[--text-color:theme(colors.accent)]",
          "[--ring-color:theme(colors.accent/60%)]"
        ],
        neutral: [
          "hover:[--bg-color:theme(colors.neutral/10%)]",
          "[--border-color:theme(colors.neutral)]",
          "[--text-color:theme(colors.neutral)]",
          "[--ring-color:theme(colors.neutral/60%)]"
        ],
        info: [
          "hover:[--bg-color:theme(colors.info/10%)]",
          "[--border-color:theme(colors.info)]",
          "[--text-color:theme(colors.info)]",
          "[--ring-color:theme(colors.info/60%)]"
        ],
        success: [
          "hover:[--bg-color:theme(colors.success/10%)]",
          "[--border-color:theme(colors.success)]",
          "[--text-color:theme(colors.success)]",
          "[--ring-color:theme(colors.success/60%)]"
        ],
        warning: [
          "hover:[--bg-color:theme(colors.warning/10%)]",
          "[--border-color:theme(colors.warning)]",
          "[--text-color:theme(colors.warning)]",
          "[--ring-color:theme(colors.warning/60%)]"
        ],
        danger: [
          "hover:[--bg-color:theme(colors.danger/10%)]",
          "[--border-color:theme(colors.danger)]",
          "[--text-color:theme(colors.danger)]",
          "[--ring-color:theme(colors.danger/60%)]"
        ]
      },
      fill: {
        default: [
          `[--bg-color:theme(colors.surface-content)]`,
          "hover:[--bg-color:theme(colors.surface-content/80%)]",
          "[--text-color:theme(colors.surface-200)]",
          "[--ring-color:theme(colors.surface-content/60%)]"
        ],
        primary: [
          `[--bg-color:theme(colors.primary)]`,
          "hover:[--bg-color:theme(colors.primary-600)]",
          "[--text-color:theme(colors.primary-content)]",
          "[--ring-color:theme(colors.primary/60%)]"
        ],
        secondary: [
          "[--bg-color:theme(colors.secondary)]",
          "hover:[--bg-color:theme(colors.secondary-600)]",
          "[--text-color:theme(colors.secondary-content)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        accent: [
          "[--bg-color:theme(colors.accent)]",
          "hover:[--bg-color:theme(colors.accent-600)]",
          "[--text-color:theme(colors.accent-content)]",
          "[--ring-color:theme(colors.accent/60%)]"
        ],
        neutral: [
          "[--bg-color:theme(colors.neutral)]",
          "hover:[--bg-color:theme(colors.neutral-600)]",
          "[--text-color:theme(colors.neutral-content)]",
          "[--ring-color:theme(colors.neutral/60%)]"
        ],
        info: [
          `[--bg-color:theme(colors.info)]`,
          "hover:[--bg-color:theme(colors.info-600)]",
          "[--text-color:theme(colors.info-content)]",
          "[--ring-color:theme(colors.info/60%)]"
        ],
        success: [
          `[--bg-color:theme(colors.success)]`,
          "hover:[--bg-color:theme(colors.success-600)]",
          "[--text-color:theme(colors.success-content)]",
          "[--ring-color:theme(colors.success/60%)]"
        ],
        warning: [
          `[--bg-color:theme(colors.warning)]`,
          "hover:[--bg-color:theme(colors.warning-600)]",
          "[--text-color:theme(colors.warning-content)]",
          "[--ring-color:theme(colors.warning/60%)]"
        ],
        danger: [
          `[--bg-color:theme(colors.danger)]`,
          "hover:[--bg-color:theme(colors.danger-600)]",
          "[--text-color:theme(colors.danger-content)]",
          "[--ring-color:theme(colors.danger/60%)]"
        ]
      },
      "fill-light": {
        default: [
          "[--bg-color:theme(colors.surface-content/10%)]",
          "hover:[--bg-color:theme(colors.surface-content/20%)]",
          "[--text-color:theme(colors.surface-content)]",
          "[--ring-color:theme(colors.surface-content/60%)]"
        ],
        primary: [
          "[--bg-color:theme(colors.primary/10%)]",
          "hover:[--bg-color:theme(colors.primary/20%)]",
          "[--text-color:theme(colors.primary)]",
          "[--ring-color:theme(colors.primary/60%)]"
        ],
        secondary: [
          "[--bg-color:theme(colors.secondary/10%)]",
          "hover:[--bg-color:theme(colors.secondary/20%)]",
          "[--text-color:theme(colors.secondary)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        accent: [
          "[--bg-color:theme(colors.accent/10%)]",
          "hover:[--bg-color:theme(colors.accent/20%)]",
          "[--text-color:theme(colors.accent)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        neutral: [
          "[--bg-color:theme(colors.neutral/10%)]",
          "hover:[--bg-color:theme(colors.neutral/20%)]",
          "[--text-color:theme(colors.neutral)]",
          "[--ring-color:theme(colors.neutral/60%)]"
        ],
        info: [
          "[--bg-color:theme(colors.info/10%)]",
          "hover:[--bg-color:theme(colors.info/20%)]",
          "[--text-color:theme(colors.info)]",
          "[--ring-color:theme(colors.info/60%)]"
        ],
        success: [
          "[--bg-color:theme(colors.success/10%)]",
          "hover:[--bg-color:theme(colors.success/20%)]",
          "[--text-color:theme(colors.success)]",
          "[--ring-color:theme(colors.success/60%)]"
        ],
        warning: [
          "[--bg-color:theme(colors.warning/10%)]",
          "hover:[--bg-color:theme(colors.warning/20%)]",
          "[--text-color:theme(colors.warning)]",
          "[--ring-color:theme(colors.warning/60%)]"
        ],
        danger: [
          "[--bg-color:theme(colors.danger/10%)]",
          "hover:[--bg-color:theme(colors.danger/20%)]",
          "[--text-color:theme(colors.danger)]",
          "[--ring-color:theme(colors.danger/60%)]"
        ]
      },
      "fill-outline": {
        default: [
          "[--bg-color:theme(colors.surface-content/10%)]",
          "hover:[--bg-color:theme(colors.surface-content/20%)]",
          "[--border-color:theme(colors.surface-content)]",
          "[--text-color:theme(colors.surface-content)]",
          "[--ring-color:theme(colors.surface-content/60%)]"
        ],
        primary: [
          "[--bg-color:theme(colors.primary/10%)]",
          "hover:[--bg-color:theme(colors.primary/20%)]",
          "[--border-color:theme(colors.primary)]",
          "[--text-color:theme(colors.primary)]",
          "[--ring-color:theme(colors.primary/60%)]"
        ],
        secondary: [
          "[--bg-color:theme(colors.secondary/10%)]",
          "hover:[--bg-color:theme(colors.secondary/20%)]",
          "[--border-color:theme(colors.secondary)]",
          "[--text-color:theme(colors.secondary)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        accent: [
          "[--bg-color:theme(colors.accent/10%)]",
          "hover:[--bg-color:theme(colors.accent/20%)]",
          "[--border-color:theme(colors.accent)]",
          "[--text-color:theme(colors.accent)]",
          "[--ring-color:theme(colors.accent/60%)]"
        ],
        neutral: [
          "[--bg-color:theme(colors.neutral/10%)]",
          "hover:[--bg-color:theme(colors.neutral/20%)]",
          "[--border-color:theme(colors.neutral)]",
          "[--text-color:theme(colors.neutral)]",
          "[--ring-color:theme(colors.neutral/60%)]"
        ],
        info: [
          "[--bg-color:theme(colors.info/10%)]",
          "hover:[--bg-color:theme(colors.info/20%)]",
          "[--border-color:theme(colors.info)]",
          "[--text-color:theme(colors.info)]",
          "[--ring-color:theme(colors.info/60%)]"
        ],
        success: [
          "[--bg-color:theme(colors.success/10%)]",
          "hover:[--bg-color:theme(colors.success/20%)]",
          "[--border-color:theme(colors.success)]",
          "[--text-color:theme(colors.success)]",
          "[--ring-color:theme(colors.success/60%)]"
        ],
        warning: [
          "[--bg-color:theme(colors.warning/10%)]",
          "hover:[--bg-color:theme(colors.warning/20%)]",
          "[--border-color:theme(colors.warning)]",
          "[--text-color:theme(colors.warning)]",
          "[--ring-color:theme(colors.warning/60%)]"
        ],
        danger: [
          "[--bg-color:theme(colors.danger/10%)]",
          "hover:[--bg-color:theme(colors.danger/20%)]",
          "[--border-color:theme(colors.danger)]",
          "[--text-color:theme(colors.danger)]",
          "[--ring-color:theme(colors.danger/60%)]"
        ]
      },
      text: {
        default: [
          "[--text-color:theme(colors.surface-content)]",
          "hover:[--text-color:theme(colors.surface-content/80%)]",
          "[--ring-color:theme(colors.surface-content/60%)]"
        ],
        primary: [
          "[--text-color:theme(colors.primary)]",
          "hover:[--text-color:theme(colors.primary-700)]",
          "[--ring-color:theme(colors.primary/60%)]"
        ],
        secondary: [
          "[--text-color:theme(colors.secondary)]",
          "hover:[--text-color:theme(colors.secondary-700)]",
          "[--ring-color:theme(colors.secondary/60%)]"
        ],
        accent: [
          "[--text-color:theme(colors.accent)]",
          "hover:[--text-color:theme(colors.accent-700)]",
          "[--ring-color:theme(colors.accent/60%)]"
        ],
        neutral: [
          "[--text-color:theme(colors.neutral)]",
          "hover:[--text-color:theme(colors.neutral-700)]",
          "[--ring-color:theme(colors.neutral/60%)]"
        ],
        info: [
          "[--text-color:theme(colors.info)]",
          "hover:[--text-color:theme(colors.info-700)]",
          "[--ring-color:theme(colors.info/60%)]"
        ],
        success: [
          "[--text-color:theme(colors.success)]",
          "hover:[--text-color:theme(colors.success-700)]",
          "[--ring-color:theme(colors.success/60%)]"
        ],
        warning: [
          "[--text-color:theme(colors.warning)]",
          "hover:[--text-color:theme(colors.warning-700)]",
          "[--ring-color:theme(colors.warning/60%)]"
        ],
        danger: [
          "[--text-color:theme(colors.danger)]",
          "hover:[--text-color:theme(colors.danger-700)]",
          "[--ring-color:theme(colors.danger/60%)]"
        ]
      },
      none: {
        default: "",
        primary: "",
        secondary: "",
        accent: "",
        neutral: "",
        info: "",
        success: "",
        warning: "",
        danger: ""
      }
    }[variant ?? "none"]?.[color ?? "default"],
    // text color
    ["default", "outline", "fill", "fill-outline", "fill-light", "text"].includes(variant ?? "none") && "text-[--text-color]",
    // background color
    ["default", "outline", "fill", "fill-outline", "fill-light"].includes(variant ?? "none") && "bg-[--bg-color] ",
    // border color
    ["outline", "fill-outline"].includes(variant ?? "none") && "border-[--border-color]",
    // ring color
    ["default", "outline", "fill", "fill-outline", "fill-light", "text"].includes(variant ?? "none") && "ring-[--ring-color]",
    settingsClasses.root,
    classes?.root,
    $$props.class
  );
  return ` ${((tag) => {
    return tag ? `<${href ? "a" : "button"}${spread(
      [
        { href: escape_attribute_value(href) },
        { target: escape_attribute_value(target) },
        { type: escape_attribute_value(type) },
        escape_object($$restProps),
        { class: escape_attribute_value(_class) },
        {
          style: escape_attribute_value($$props.style ?? "")
        },
        { disabled: disabled || null }
      ],
      {}
    )}>${is_void(tag) ? "" : `${loading ? `<span>${validate_component(ProgressCircle, "ProgressCircle").$$render(
      $$result,
      {
        size: 16,
        width: 2,
        class: cls(settingsClasses.loading, classes.loading)
      },
      {},
      {}
    )}</span>` : `${icon ? `<span>${typeof icon === "string" || "icon" in icon ? ` ${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        data: asIconData(icon),
        class: cls("pointer-events-none", settingsClasses.icon, classes.icon)
      },
      {},
      {}
    )}` : `${validate_component(Icon, "Icon").$$render(
      $$result,
      Object.assign(
        {},
        {
          class: cls("pointer-events-none", settingsClasses.icon, classes.icon)
        },
        icon
      ),
      {},
      {}
    )}`}</span>` : ``}`} ${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}` : "";
  })(href ? "a" : "button")}`;
});
export {
  Button as B,
  Icon as I,
  ProgressCircle as P,
  asIconData as a,
  isLiteralObject as i,
  omit as o,
  setButtonGroup as s,
  uniqueId as u
};
