import { c as create_ssr_component, h as compute_rest_props, d as createEventDispatcher, v as validate_component, l as each, f as add_attribute, e as escape, a as subscribe, s as setContext, i as set_store_value, x as spread, y as escape_attribute_value, z as escape_object, o as getContext, p as onDestroy, n as null_to_empty, t as get_store_value, b as compute_slots, k as noop, g as add_styles, m as missing_component } from "./ssr.js";
import { mdiChevronRight, mdiChevronLeft, mdiMenuDown, mdiClose, mdiCheck } from "@mdi/js";
import { I as Icon$1, B as Button, o as omit } from "./Button.js";
import { startOfDay, isSameDay } from "date-fns";
import { v as updatePeriodTypeWithWeekStartsOn, w as getDateFuncsByPeriodType, P as PeriodType, e as getComponentSettings, c as cls, g as getComponentClasses, m as mdScreen, j as getSettings, x as DayOfWeek, y as hasDayOfWeek, z as replaceDayOfWeek, A as missingDayOfWeek } from "./theme.js";
import { F as Field, D as DateSelect } from "./DateSelect.js";
import { M as Menu, a as MenuItem, s as scrollIntoView } from "./MenuItem.js";
import { w as writable, r as readable } from "./index2.js";
import { a as crossfade, f as fade } from "./index3.js";
import { L as Logger } from "./logger.js";
import { D as Dialog } from "./Dialog.js";
function formatMsg(settings, type, lastX) {
  return lastX === 0 ? settings.dictionary.Date[type].Current : lastX === 1 ? settings.dictionary.Date[type].Last : settings.dictionary.Date[type].LastX.replace("{0}", lastX.toString());
}
function getDateRangePresets(settings, periodType) {
  let now = /* @__PURE__ */ new Date();
  const today = startOfDay(now);
  if (settings) {
    periodType = updatePeriodTypeWithWeekStartsOn(settings.formats.dates.weekStartsOn, periodType) ?? periodType;
  }
  const { start, end, add } = getDateFuncsByPeriodType(settings, periodType);
  switch (periodType) {
    case PeriodType.Day: {
      const last = start(add(today, -1));
      return [0, 1, 3, 7, 14, 30].map((lastX) => {
        return {
          label: formatMsg(settings, "PeriodDay", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    case PeriodType.WeekSun:
    case PeriodType.WeekMon:
    case PeriodType.WeekTue:
    case PeriodType.WeekWed:
    case PeriodType.WeekThu:
    case PeriodType.WeekFri:
    case PeriodType.WeekSat: {
      const last = start(add(today, -1));
      return [0, 1, 2, 4, 6].map((lastX) => {
        return {
          label: formatMsg(settings, "PeriodWeek", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    case PeriodType.BiWeek1Sun:
    case PeriodType.BiWeek1Mon:
    case PeriodType.BiWeek1Tue:
    case PeriodType.BiWeek1Wed:
    case PeriodType.BiWeek1Thu:
    case PeriodType.BiWeek1Fri:
    case PeriodType.BiWeek1Sat:
    case PeriodType.BiWeek2Sun:
    case PeriodType.BiWeek2Mon:
    case PeriodType.BiWeek2Tue:
    case PeriodType.BiWeek2Wed:
    case PeriodType.BiWeek2Thu:
    case PeriodType.BiWeek2Fri:
    case PeriodType.BiWeek2Sat: {
      const last = start(add(today, -1));
      return [0, 1, 2, 4, 6].map((lastX) => {
        return {
          label: formatMsg(settings, "PeriodBiWeek", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    case PeriodType.Month: {
      const last = start(add(today, -1));
      return [0, 1, 2, 3, 6, 12].map((lastX) => {
        return {
          label: formatMsg(settings, "PeriodMonth", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    case PeriodType.Quarter: {
      const last = start(add(today, -1));
      return [0, 1, -1, 4, 12].map((lastX) => {
        if (lastX === -1) {
          return {
            label: settings.dictionary.Date.PeriodQuarterSameLastyear,
            value: {
              from: start(add(today, -4)),
              to: end(add(today, -4)),
              periodType
            }
          };
        }
        return {
          label: formatMsg(settings, "PeriodQuarter", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    case PeriodType.CalendarYear: {
      const last = start(add(today, -1));
      return [0, 1, 3, 5].map((lastX) => {
        return {
          label: formatMsg(settings, "PeriodYear", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    case PeriodType.FiscalYearOctober: {
      const last = start(add(today, -1));
      return [0, 1, 3, 5].map((lastX) => {
        return {
          label: formatMsg(settings, "PeriodFiscalYear", lastX),
          value: {
            from: add(last, -lastX + 1),
            to: lastX === 0 ? end(today) : end(last),
            periodType
          }
        };
      });
    }
    default: {
      return [];
    }
  }
}
const MenuField = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let restProps;
  let $$restProps = compute_rest_props($$props, ["options", "value", "menuProps", "menuIcon", "stepper", "classes", "selected"]);
  const { classes: settingsClasses, defaults } = getComponentSettings("MenuField");
  let { options = [] } = $$props;
  let { value = null } = $$props;
  let { menuProps = { autoPlacement: true, resize: true } } = $$props;
  let { menuIcon = mdiMenuDown } = $$props;
  let { stepper = false } = $$props;
  let { classes = {} } = $$props;
  let open = false;
  let { selected = void 0 } = $$props;
  const dispatch = createEventDispatcher();
  function setValue(val) {
    value = val;
  }
  if ($$props.options === void 0 && $$bindings.options && options !== void 0)
    $$bindings.options(options);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.menuProps === void 0 && $$bindings.menuProps && menuProps !== void 0)
    $$bindings.menuProps(menuProps);
  if ($$props.menuIcon === void 0 && $$bindings.menuIcon && menuIcon !== void 0)
    $$bindings.menuIcon(menuIcon);
  if ($$props.stepper === void 0 && $$bindings.stepper && stepper !== void 0)
    $$bindings.stepper(stepper);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  selected = options?.find((x) => x.value === value);
  {
    dispatch("change", { value });
  }
  restProps = { ...defaults, ...$$restProps };
  return `${validate_component(Field, "Field").$$render(
    $$result,
    Object.assign({}, { class: "cursor-pointer" }, restProps, {
      classes: {
        input: "overflow-hidden",
        ...$$props.classes
      }
    }),
    {},
    {
      root: () => {
        return `${validate_component(Menu, "Menu").$$render($$result, Object.assign({}, { slot: "root" }, { open }, { matchWidth: true }, menuProps), {}, {
          default: () => {
            return `${slots.default ? slots.default({
              options,
              selected,
              close: () => open = false,
              setValue
            }) : ` <menu class="group p-1">${each(options, (option, index) => {
              let previousOption = options[index - 1];
              return ` ${option.group && option.group !== previousOption?.group ? `<div${add_attribute("class", cls("group-header text-xs leading-8 tracking-widest text-surface-content/50 px-2", settingsClasses.group, classes.group), 0)}>${escape(option.group)} </div>` : ``} ${validate_component(MenuItem, "MenuItem").$$render(
                $$result,
                {
                  icon: option.icon,
                  selected: option.value === value,
                  class: cls(option.group ? "px-4" : "px-2", settingsClasses.option, classes.option),
                  classes: classes.menuItem
                },
                {},
                {
                  default: () => {
                    return `${escape(option.label)} `;
                  }
                }
              )}`;
            })}</menu> `}`;
          }
        })}`;
      },
      append: () => {
        return `<span slot="append" class="flex items-center">${slots.append ? slots.append({}) : ``} ${validate_component(Icon$1, "Icon").$$render(
          $$result,
          {
            path: menuIcon,
            class: cls("text-surface-content/50 mr-1 transform transition-all duration-300", { "-rotate-180": open }, settingsClasses.menuIcon, classes.menuIcon)
          },
          {},
          {}
        )} ${stepper ? `${validate_component(Button, "Button").$$render(
          $$result,
          {
            icon: mdiChevronRight,
            class: "mr-2",
            size: "sm"
          },
          {},
          {}
        )}` : ``}</span>`;
      },
      prepend: () => {
        return `<span slot="prepend">${stepper ? `${validate_component(Button, "Button").$$render(
          $$result,
          {
            icon: mdiChevronLeft,
            class: "mr-2",
            size: "sm"
          },
          {},
          {}
        )}` : ``} ${slots.prepend ? slots.prepend({}) : ``}</span>`;
      },
      default: () => {
        return `${slots.selection ? slots.selection({}) : ` <div class="truncate text-sm">${escape(selected?.label ?? "No selection")}</div> `}`;
      }
    }
  )}`;
});
const groupKey = Symbol();
const ToggleGroup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let variantClasses;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "autoscroll",
    "variant",
    "size",
    "rounded",
    "gap",
    "inset",
    "vertical",
    "classes"
  ]);
  let $selectedPanel, $$unsubscribe_selectedPanel;
  let $selectedOption, $$unsubscribe_selectedOption;
  let $classesStore, $$unsubscribe_classesStore;
  let { value = void 0 } = $$props;
  let { autoscroll = false } = $$props;
  let { variant = "default" } = $$props;
  let { size = "md" } = $$props;
  let { rounded = variant !== "underline" } = $$props;
  let { gap = false } = $$props;
  let { inset = false } = $$props;
  let { vertical = false } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("ToggleGroup");
  const classesStore = writable(classes);
  $$unsubscribe_classesStore = subscribe(classesStore, (value2) => $classesStore = value2);
  const logger = new Logger("ToggleGroup");
  const options = [];
  const optionsByValue = /* @__PURE__ */ new Map();
  const panels = [];
  const selectedOption = writable(void 0);
  $$unsubscribe_selectedOption = subscribe(selectedOption, (value2) => $selectedOption = value2);
  const selectedPanel = writable(void 0);
  $$unsubscribe_selectedPanel = subscribe(selectedPanel, (value2) => $selectedPanel = value2);
  const [send, receive] = crossfade({ fallback: fade });
  const dispatch = createEventDispatcher();
  function registerOption(option, optionValue) {
    options.push(option);
    optionsByValue.set(optionValue, option);
    if (optionValue === value) {
      selectOption(option, optionValue);
    }
  }
  function unregisterOption(option, optionValue) {
    const i = options.indexOf(option);
    options.splice(i, 1);
    selectedOption.update((current) => current === option ? options[i] || options[options.length - 1] : current);
    optionsByValue.delete(optionValue);
  }
  function registerPanel(panel) {
    panels.push(panel);
    selectedPanel.update((current) => current || panel);
  }
  function unregisterPanel(panel) {
    const i = panels.indexOf(panel);
    panels.splice(i, 1);
    selectedPanel.update((current) => current === panel ? panels[i] || panels[panels.length - 1] : current);
  }
  function selectOption(option, optionValue) {
    logger.debug("selectOption", { option, optionValue });
    if (value !== optionValue) {
      dispatch("change", { value: optionValue });
    }
    set_store_value(selectedOption, $selectedOption = option, $selectedOption);
    value = optionValue;
    const i = options.indexOf(option);
    set_store_value(selectedPanel, $selectedPanel = panels[i], $selectedPanel);
  }
  setContext(groupKey, {
    registerOption,
    unregisterOption,
    registerPanel,
    unregisterPanel,
    selectOption,
    selectedOption,
    selectedPanel,
    crossfade: [send, receive],
    classes: classesStore,
    autoscroll
  });
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.autoscroll === void 0 && $$bindings.autoscroll && autoscroll !== void 0)
    $$bindings.autoscroll(autoscroll);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0)
    $$bindings.rounded(rounded);
  if ($$props.gap === void 0 && $$bindings.gap && gap !== void 0)
    $$bindings.gap(gap);
  if ($$props.inset === void 0 && $$bindings.inset && inset !== void 0)
    $$bindings.inset(inset);
  if ($$props.vertical === void 0 && $$bindings.vertical && vertical !== void 0)
    $$bindings.vertical(vertical);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  variantClasses = {
    default: {
      options: "",
      label: "text-surface-content/60 hover:text-primary [&.selected]:text-primary",
      indicator: "h-full bg-primary/10"
    },
    outline: {
      options: "border",
      label: "text-surface-content/60 hover:text-primary [&.selected]:text-primary",
      indicator: "h-full w-full bg-primary/10"
    },
    fill: {
      options: cls(!gap && "bg-primary/10"),
      label: cls("text-primary hover:text-primary-700 hover:bg-primary/10 [&.selected]:text-primary-content", gap && "bg-primary/10"),
      indicator: "h-full bg-primary"
    },
    "fill-light": {
      options: cls(!gap && "bg-surface-content/10"),
      label: cls("text-surface-content/60 hover:text-surface-content/80 hover:bg-surface-content/10 [&.selected]:text-primary", gap && "bg-surface-content/10"),
      indicator: "h-full bg-primary/10"
    },
    "fill-surface": {
      options: cls(!gap && "bg-surface-content/10"),
      label: cls("text-surface-content/60 hover:text-surface-content/80 hover:bg-surface-content/10 [&.selected]:text-primary", gap && "bg-surface-content/10"),
      indicator: "h-full bg-surface-100 border"
    },
    underline: {
      options: vertical ? "border-r" : "border-b",
      label: "relative text-surface-content/50 font-bold hover:text-primary hover:bg-primary/10 [&.selected]:text-primary",
      indicator: cls("absolute border-primary", vertical ? "top-0 right-0 h-full border-l-4 rounded-l" : "bottom-0 left-0 w-full border-t-2 rounded-t")
    },
    none: {}
  };
  set_store_value(
    classesStore,
    $classesStore = {
      root: cls("", variantClasses[variant].root, classes.root),
      options: cls(
        "grid overflow-auto",
        vertical ? "grid-flow-row" : "grid-flow-col",
        rounded === "full" ? "rounded-full" : rounded && "rounded",
        gap === true ? "gap-1" : gap === "px" ? "gap-px" : "",
        inset ? "p-[2px]" : "",
        variantClasses[variant].options,
        settingsClasses.options,
        classes.options
      ),
      label: cls(
        "text-center cursor-pointer",
        {
          xs: "text-xs",
          sm: "text-xs",
          md: "text-sm",
          lg: "text-base"
        }[size],
        rounded === "full" ? "rounded-full" : rounded && "rounded",
        // If adding gap between options, round first and last outside edges for options and the indicator
        gap && (vertical ? [
          "[&:not(:first-child)]:rounded-t-none",
          "[&:not(:last-child)]:rounded-b-none",
          "[&:not(:first-child)_.indicator]:rounded-t-none",
          "[&:not(:last-child)_.indicator]:rounded-b-none"
        ] : [
          "[&:not(:first-child)]:rounded-l-none",
          "[&:not(:last-child)]:rounded-r-none",
          "[&:not(:first-child)_.indicator]:rounded-l-none",
          "[&:not(:last-child)_.indicator]:rounded-r-none"
        ]),
        variantClasses[variant].label,
        settingsClasses.label,
        classes.label
      ),
      option: cls(
        variant !== "none" && "px-4 font-medium",
        {
          xs: "",
          sm: "py-1",
          md: "py-1",
          lg: "py-1"
        }[size],
        variantClasses[variant].option,
        settingsClasses.option,
        classes.option
      ),
      indicator: cls(
        "z-0",
        rounded === "full" ? "rounded-full" : rounded && "rounded",
        variantClasses[variant].indicator,
        settingsClasses.indicator,
        classes.indicator
      )
    },
    $classesStore
  );
  {
    {
      const newSelectedOption = optionsByValue.get(value) || options[value];
      logger.debug("value changed", { value, newSelectedOption });
      selectOption(newSelectedOption, value);
    }
  }
  $$unsubscribe_selectedPanel();
  $$unsubscribe_selectedOption();
  $$unsubscribe_classesStore();
  return `<div${spread(
    [
      {
        class: escape_attribute_value(cls("ToggleGroup", `variant-${variant}`, $classesStore.root, $$props.class))
      },
      escape_object($$restProps)
    ],
    {}
  )}> <div${add_attribute("class", cls("options", $classesStore.options), 0)}>${slots.default ? slots.default({}) : ``}</div> ${slots.panes ? slots.panes({}) : ``}</div>`;
});
const css$3 = {
  code: "label.svelte-1r2h3zw>.svelte-1r2h3zw{grid-column:1;grid-row:1;z-index:1}",
  map: null
};
const ToggleOption = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let selected;
  let $$restProps = compute_rest_props($$props, ["value", "classes"]);
  let $selectedOption, $$unsubscribe_selectedOption;
  let $classesContext, $$unsubscribe_classesContext;
  let { value } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("ToggleOption");
  const { registerOption, unregisterOption, selectOption, selectedOption, crossfade: crossfade2, classes: classesContext, autoscroll } = getContext(groupKey);
  $$unsubscribe_selectedOption = subscribe(selectedOption, (value2) => $selectedOption = value2);
  $$unsubscribe_classesContext = subscribe(classesContext, (value2) => $classesContext = value2);
  let optionElement = null;
  onDestroy(() => {
    unregisterOption(optionElement, value);
  });
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  $$result.css.add(css$3);
  selected = $selectedOption === optionElement;
  {
    if (autoscroll && selected) {
      scrollIntoView(optionElement);
    }
  }
  $$unsubscribe_selectedOption();
  $$unsubscribe_classesContext();
  return `<label${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("ToggleOption", "label", "grid items-center", $classesContext.label, settingsClasses.root, classes.root, $$props.class))
      }
    ],
    {
      classes: (selected ? "selected" : "") + " svelte-1r2h3zw"
    }
  )}${add_attribute("this", optionElement, 0)}> ${selected ? `<div class="${escape(null_to_empty(cls("indicator", $classesContext.indicator, settingsClasses.indicator, classes.indicator)), true) + " svelte-1r2h3zw"}"></div>` : ``} <div class="${escape(null_to_empty(cls("option", $classesContext.option, settingsClasses.option, classes.option)), true) + " svelte-1r2h3zw"}">${slots.default ? slots.default({ selected }) : ``}</div> <input type="radio" class="appearance-none absolute svelte-1r2h3zw" ${selected ? "checked" : ""}${add_attribute("value", value, 0)}> </label>`;
});
const DateRange = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let periodTypeOptions;
  let presetOptions;
  let showPeriodTypes;
  let showPresets;
  let showSidebar;
  let $localeSettings, $$unsubscribe_localeSettings;
  let $format, $$unsubscribe_format;
  let $mdScreen, $$unsubscribe_mdScreen;
  $$unsubscribe_mdScreen = subscribe(mdScreen, (value) => $mdScreen = value);
  let { selected = { from: null, to: null, periodType: null } } = $$props;
  let { periodTypes = [
    PeriodType.Day,
    PeriodType.Week,
    PeriodType.BiWeek1,
    // PeriodType.BiWeek2Sun,
    PeriodType.Month,
    PeriodType.Quarter,
    PeriodType.CalendarYear,
    PeriodType.FiscalYearOctober
  ] } = $$props;
  let { getPeriodTypePresets = getDateRangePresets } = $$props;
  const settingsClasses = getComponentClasses("DateRange");
  const { format, localeSettings } = getSettings();
  $$unsubscribe_format = subscribe(format, (value) => $format = value);
  $$unsubscribe_localeSettings = subscribe(localeSettings, (value) => $localeSettings = value);
  let selectedPeriodType = selected?.periodType ?? periodTypes[0];
  let selectedPreset = null;
  let selectedDayOfWeek = $format.settings.formats.dates.weekStartsOn ?? DayOfWeek.Sunday;
  let activeDate = "from";
  function getDateRangeStr(range) {
    return JSON.stringify(omit(range, ["periodType"]));
  }
  function adjustPeriodType(periodType) {
    return missingDayOfWeek(periodType) ? replaceDayOfWeek(periodType, selectedDayOfWeek) || periodType : periodType;
  }
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  if ($$props.periodTypes === void 0 && $$bindings.periodTypes && periodTypes !== void 0)
    $$bindings.periodTypes(periodTypes);
  if ($$props.getPeriodTypePresets === void 0 && $$bindings.getPeriodTypePresets && getPeriodTypePresets !== void 0)
    $$bindings.getPeriodTypePresets(getPeriodTypePresets);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    periodTypeOptions = periodTypes.map((pt) => {
      const value = adjustPeriodType(pt);
      return {
        label: $format.getPeriodTypeName(value),
        value
      };
    });
    presetOptions = getPeriodTypePresets($localeSettings, selectedPeriodType).map((preset) => {
      return {
        label: preset.label,
        value: getDateRangeStr(preset.value),
        preset
      };
    });
    {
      {
        if (hasDayOfWeek(selectedPeriodType)) {
          const newPeriodType = replaceDayOfWeek(selectedPeriodType, selectedDayOfWeek);
          const newSelected = { ...selected, periodType: newPeriodType };
          if (selected?.from && selected?.to && selected.periodType) {
            const prevPeriodTypePreset = [...getPeriodTypePresets($localeSettings, selected.periodType)].find((x) => x.value.from && isSameDay(x.value.from, selected.from) && x.value.to && isSameDay(x.value.to, selected.to));
            if (prevPeriodTypePreset && newPeriodType) {
              const newPeriodTypePreset = [...getPeriodTypePresets($localeSettings, newPeriodType)].find((x) => x.label === prevPeriodTypePreset.label);
              if (newPeriodTypePreset) {
                newSelected.from = newPeriodTypePreset.value.from;
                newSelected.to = newPeriodTypePreset.value.to;
              }
            }
          }
          selected = newSelected;
        }
      }
    }
    showPeriodTypes = periodTypeOptions.length > 1;
    showPresets = presetOptions.length > 0;
    showSidebar = showPeriodTypes || showPresets;
    $$rendered = `<div${add_attribute("class", cls("DateRange grid gap-2", "w-[min(90vw,384px)]", showSidebar && "md:w-[640px] md:grid-cols-[2fr,3fr]", settingsClasses.root, $$props.class), 0)}><div${add_attribute("class", cls(showSidebar && "md:col-start-2"), 0)}>${validate_component(ToggleGroup, "ToggleGroup").$$render(
      $$result,
      {
        variant: "outline",
        inset: true,
        class: "bg-surface-100",
        value: activeDate
      },
      {
        value: ($$value) => {
          activeDate = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(ToggleOption, "ToggleOption").$$render($$result, { value: "from", class: "flex-1" }, {}, {
            default: () => {
              return `<div class="text-xs text-surface-content/50">${escape($localeSettings.dictionary.Date.Start)}</div> ${selected?.from ? `<div class="font-medium">${escape($format(selected.from, PeriodType.Day))}</div>` : `<div class="italic">${escape($localeSettings.dictionary.Date.Empty)}</div>`} `;
            }
          })} ${validate_component(ToggleOption, "ToggleOption").$$render($$result, { value: "to", class: "flex-1" }, {}, {
            default: () => {
              return `<div class="text-xs text-surface-content/50">${escape($localeSettings.dictionary.Date.End)}</div> ${selected?.to ? `<div class="font-medium">${escape($format(selected.to, PeriodType.Day))}</div>` : `<div class="italic">${escape($localeSettings.dictionary.Date.Empty)}</div>`} `;
            }
          })}`;
        }
      }
    )}</div> ${showSidebar ? `<div class="flex flex-col gap-2 md:gap-4 md:-mt-5">${showPeriodTypes ? `${$mdScreen ? `<div><div class="text-xs text-surface-content/50 uppercase mb-1" data-svelte-h="svelte-1bqca">Type</div> ${validate_component(ToggleGroup, "ToggleGroup").$$render(
      $$result,
      {
        variant: "outline",
        inset: true,
        vertical: true,
        value: selectedPeriodType
      },
      {
        value: ($$value) => {
          selectedPeriodType = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${each(periodTypeOptions, (option) => {
            return `${validate_component(ToggleOption, "ToggleOption").$$render($$result, { value: option.value }, {}, {
              default: () => {
                return `${escape(option.label)} `;
              }
            })}`;
          })}`;
        }
      }
    )}</div>` : `${validate_component(MenuField, "MenuField").$$render(
      $$result,
      {
        label: "Type",
        options: periodTypeOptions,
        value: selectedPeriodType
      },
      {
        value: ($$value) => {
          selectedPeriodType = $$value;
          $$settled = false;
        }
      },
      {}
    )}`}` : ``} ${showPresets ? `${$mdScreen ? `<div><div class="text-xs text-surface-content/50 uppercase mb-1" data-svelte-h="svelte-wq7x6k">Presets</div> ${validate_component(ToggleGroup, "ToggleGroup").$$render(
      $$result,
      {
        variant: "outline",
        inset: true,
        vertical: true,
        value: selectedPreset
      },
      {
        value: ($$value) => {
          selectedPreset = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${each(presetOptions, (option) => {
            return `${validate_component(ToggleOption, "ToggleOption").$$render($$result, { value: option.value }, {}, {
              default: () => {
                return `${escape(option.label)} `;
              }
            })}`;
          })}`;
        }
      }
    )}</div>` : `${validate_component(MenuField, "MenuField").$$render(
      $$result,
      {
        label: "Presets",
        options: presetOptions,
        value: selectedPreset
      },
      {
        value: ($$value) => {
          selectedPreset = $$value;
          $$settled = false;
        }
      },
      {}
    )}`}` : ``} ${hasDayOfWeek(selectedPeriodType) ? `<div><div class="text-xs text-surface-content/50 uppercase mb-1" data-svelte-h="svelte-1q3hcyb">Start day of week</div> ${validate_component(ToggleGroup, "ToggleGroup").$$render(
      $$result,
      {
        variant: "outline",
        inset: true,
        classes: { root: "bg-surface-100", option: "px-0" },
        value: selectedDayOfWeek
      },
      {
        value: ($$value) => {
          selectedDayOfWeek = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${each(
            [
              DayOfWeek.Sunday,
              DayOfWeek.Monday,
              DayOfWeek.Tuesday,
              DayOfWeek.Wednesday,
              DayOfWeek.Thursday,
              DayOfWeek.Friday,
              DayOfWeek.Saturday
            ],
            (day) => {
              return `${validate_component(ToggleOption, "ToggleOption").$$render($$result, { value: day }, {}, {
                default: () => {
                  return `${escape($format.getDayOfWeekName(day))}`;
                }
              })}`;
            }
          )}`;
        }
      }
    )}</div>` : ``}</div>` : ``} <div class="bg-surface-100 border rounded overflow-auto">${validate_component(DateSelect, "DateSelect").$$render(
      $$result,
      {
        selected,
        periodType: selectedPeriodType,
        activeDate
      },
      {},
      {}
    )}</div></div>`;
  } while (!$$settled);
  $$unsubscribe_localeSettings();
  $$unsubscribe_format();
  $$unsubscribe_mdScreen();
  return $$rendered;
});
const DateRangeDisplay = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $localeSettings, $$unsubscribe_localeSettings;
  let $format_ux, $$unsubscribe_format_ux;
  let { value } = $$props;
  const { format: format_ux, localeSettings } = getSettings();
  $$unsubscribe_format_ux = subscribe(format_ux, (value2) => $format_ux = value2);
  $$unsubscribe_localeSettings = subscribe(localeSettings, (value2) => $localeSettings = value2);
  let showToValue = false;
  const getPeriodType = (value2) => {
    let periodType = value2?.periodType ?? PeriodType.Day;
    switch (periodType) {
      case PeriodType.WeekSun:
      case PeriodType.WeekMon:
      case PeriodType.WeekTue:
      case PeriodType.WeekWed:
      case PeriodType.WeekThu:
      case PeriodType.WeekFri:
      case PeriodType.WeekSat:
      case PeriodType.Week:
      case PeriodType.BiWeek1Sun:
      case PeriodType.BiWeek1Mon:
      case PeriodType.BiWeek1Tue:
      case PeriodType.BiWeek1Wed:
      case PeriodType.BiWeek1Thu:
      case PeriodType.BiWeek1Fri:
      case PeriodType.BiWeek1Sat:
      case PeriodType.BiWeek1:
      case PeriodType.BiWeek2Sun:
      case PeriodType.BiWeek2Mon:
      case PeriodType.BiWeek2Tue:
      case PeriodType.BiWeek2Wed:
      case PeriodType.BiWeek2Thu:
      case PeriodType.BiWeek2Fri:
      case PeriodType.BiWeek2Sat:
      case PeriodType.BiWeek2:
        periodType = PeriodType.Day;
        break;
      case PeriodType.Quarter:
        periodType = PeriodType.Month;
        break;
    }
    return periodType;
  };
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  {
    if (value?.to) {
      if (value?.from && value?.periodType) {
        const { isSame } = getDateFuncsByPeriodType($localeSettings, value.periodType);
        switch (value.periodType) {
          case PeriodType.Day:
          case PeriodType.Month:
          case PeriodType.CalendarYear:
          case PeriodType.FiscalYearOctober:
            showToValue = !isSame(value.from, value.to);
            break;
          default:
            showToValue = true;
        }
      } else {
        showToValue = true;
      }
    }
  }
  $$unsubscribe_localeSettings();
  $$unsubscribe_format_ux();
  return `${value?.from ? `${escape($format_ux(value.from, getPeriodType(value), { variant: "long" }))}` : `<div data-svelte-h="svelte-rqev1i"> </div>`} ${value?.to && showToValue ? `<span data-svelte-h="svelte-1cktd2h">-</span> ${escape($format_ux(value.to, getPeriodType(value), { variant: "long" }))}` : ``}`;
});
const DateRangeField = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let restProps;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "stepper",
    "center",
    "periodTypes",
    "getPeriodTypePresets",
    "classes",
    "label",
    "error",
    "hint",
    "disabled",
    "clearable",
    "base",
    "rounded",
    "dense",
    "icon"
  ]);
  let $format, $$unsubscribe_format;
  let $localeSettings, $$unsubscribe_localeSettings;
  createEventDispatcher();
  const { format, localeSettings } = getSettings();
  $$unsubscribe_format = subscribe(format, (value2) => $format = value2);
  $$unsubscribe_localeSettings = subscribe(localeSettings, (value2) => $localeSettings = value2);
  const { classes: settingsClasses, defaults } = getComponentSettings("DateRangeField");
  const _defaultValue = { from: null, to: null, periodType: null };
  let { value = _defaultValue } = $$props;
  let { stepper = false } = $$props;
  let { center = false } = $$props;
  let { periodTypes = [
    PeriodType.Day,
    PeriodType.Week,
    PeriodType.BiWeek1,
    // PeriodType.BiWeek2,
    PeriodType.Month,
    PeriodType.Quarter,
    PeriodType.CalendarYear,
    PeriodType.FiscalYearOctober
  ] } = $$props;
  let { getPeriodTypePresets = getDateRangePresets } = $$props;
  let { classes = {} } = $$props;
  let { label = null } = $$props;
  let { error = "" } = $$props;
  let { hint = "" } = $$props;
  let { disabled = false } = $$props;
  let { clearable = false } = $$props;
  let { base = false } = $$props;
  let { rounded = false } = $$props;
  let { dense = false } = $$props;
  let { icon = null } = $$props;
  let open = false;
  let currentValue = value;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.stepper === void 0 && $$bindings.stepper && stepper !== void 0)
    $$bindings.stepper(stepper);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0)
    $$bindings.center(center);
  if ($$props.periodTypes === void 0 && $$bindings.periodTypes && periodTypes !== void 0)
    $$bindings.periodTypes(periodTypes);
  if ($$props.getPeriodTypePresets === void 0 && $$bindings.getPeriodTypePresets && getPeriodTypePresets !== void 0)
    $$bindings.getPeriodTypePresets(getPeriodTypePresets);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.error === void 0 && $$bindings.error && error !== void 0)
    $$bindings.error(error);
  if ($$props.hint === void 0 && $$bindings.hint && hint !== void 0)
    $$bindings.hint(hint);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.clearable === void 0 && $$bindings.clearable && clearable !== void 0)
    $$bindings.clearable(clearable);
  if ($$props.base === void 0 && $$bindings.base && base !== void 0)
    $$bindings.base(base);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0)
    $$bindings.rounded(rounded);
  if ($$props.dense === void 0 && $$bindings.dense && dense !== void 0)
    $$bindings.dense(dense);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    restProps = { ...defaults, ...$$restProps };
    $$rendered = `${validate_component(Field, "Field").$$render(
      $$result,
      Object.assign(
        {},
        {
          label: label ?? (value.periodType ? $format.getPeriodTypeName(value.periodType) : "")
        },
        { icon },
        { error },
        { hint },
        { disabled },
        { base },
        { rounded },
        { dense },
        { center },
        { classes: classes.field },
        restProps
      ),
      {},
      {
        append: () => {
          return `<div slot="append" class="flex items-center">${clearable && (value?.periodType || value?.from || value?.to) ? `${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: mdiClose,
              class: "text-surface-content/50 p-1"
            },
            {},
            {}
          )}` : ``} ${slots.append ? slots.append({}) : ``} ${stepper ? `${validate_component(Button, "Button").$$render($$result, { icon: mdiChevronRight, class: "p-2" }, {}, {})}` : ``}</div>`;
        },
        prepend: () => {
          return `<span slot="prepend" class="flex items-center">${slots.prepend ? slots.prepend({}) : ``} ${stepper ? `${validate_component(Button, "Button").$$render($$result, { icon: mdiChevronLeft, class: "p-2" }, {}, {})}` : ``}</span>`;
        },
        default: ({ id }) => {
          return `<button type="button"${add_attribute("class", cls("text-sm whitespace-nowrap w-full focus:outline-none", center ? "text-center" : "text-left"), 0)}${add_attribute("id", id, 0)}>${validate_component(DateRangeDisplay, "DateRangeDisplay").$$render($$result, { value }, {}, {})}</button>`;
        }
      }
    )} ${validate_component(Dialog, "Dialog").$$render(
      $$result,
      {
        classes: {
          ...classes.dialog,
          dialog: cls("max-h-[90vh] grid grid-rows-[auto,1fr,auto]", classes.dialog?.dialog)
        },
        open
      },
      {
        open: ($$value) => {
          open = $$value;
          $$settled = false;
        }
      },
      {
        actions: () => {
          return `<div slot="actions" class="flex items-center gap-2">${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: mdiCheck,
              color: "primary",
              variant: "fill"
            },
            {},
            {
              default: () => {
                return `${escape($localeSettings.dictionary.Ok)}`;
              }
            }
          )} ${validate_component(Button, "Button").$$render($$result, {}, {}, {
            default: () => {
              return `${escape($localeSettings.dictionary.Cancel)}`;
            }
          })}</div>`;
        },
        default: () => {
          return `<div class="flex flex-col justify-center bg-primary text-primary-content px-6 h-24"><div class="text-sm opacity-50">${escape(currentValue.periodType ? $format.getPeriodTypeName(currentValue.periodType) : "")} </div> <div class="text-xl sm:text-2xl">${validate_component(DateRangeDisplay, "DateRangeDisplay").$$render($$result, { value: currentValue }, {}, {})}</div></div> <div class="p-2 border-b overflow-auto">${validate_component(DateRange, "DateRange").$$render(
            $$result,
            {
              periodTypes,
              getPeriodTypePresets,
              class: "h-full",
              selected: currentValue
            },
            {
              selected: ($$value) => {
                currentValue = $$value;
                $$settled = false;
              }
            },
            {}
          )}</div>`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_format();
  $$unsubscribe_localeSettings();
  return $$rendered;
});
const Tab = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { selected = false } = $$props;
  let { placement = "top" } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Tab");
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<button type="button"${add_attribute(
    "class",
    cls(
      "Tab",
      "inline-flex items-center gap-1 whitespace-nowrap border px-3 py-2 text-xs",
      `placement-${placement}`,
      {
        top: selected && "border-b-surface-100",
        bottom: selected && "border-t-surface-100",
        left: selected && "border-r-surface-100",
        right: selected && "border-l-surface-100"
      }[placement],
      selected ? "bg-surface-100 text-surface-content" : "bg-surface-200 text-surface-content/50 hover:text-surface-content hover:bg-surface-100",
      settingsClasses.root,
      classes.root,
      $$props.class
    ),
    0
  )}>${slots.default ? slots.default({}) : ``}</button>`;
});
const Tabs = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let vertical;
  let { value = void 0 } = $$props;
  let { placement = "top" } = $$props;
  let { options = [] } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Tabs");
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.options === void 0 && $$bindings.options && options !== void 0)
    $$bindings.options(options);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  vertical = placement === "left" || placement === "right";
  return `<div${add_attribute(
    "class",
    cls(
      "Tabs",
      "overflow-auto flex",
      `placement-${placement}`,
      {
        top: "flex-col",
        bottom: "flex-col-reverse",
        left: "flex-row",
        right: "flex-row-reverse"
      }[placement],
      settingsClasses.root,
      classes.root,
      $$props.class
    ),
    0
  )}><div${add_attribute(
    "class",
    cls(
      "flex gap-1 overflow-auto z-[1]",
      vertical && "flex-col",
      {
        top: "-mb-px",
        bottom: "-mt-px",
        left: "-mr-px",
        right: "-ml-px"
      }[placement],
      settingsClasses.tabs,
      classes.tabs
    ),
    0
  )}>${slots.default ? slots.default({}) : ` ${each(options, (tab) => {
    return `${validate_component(Tab, "Tab").$$render(
      $$result,
      {
        placement,
        selected: value === tab.value,
        classes: { ...settingsClasses.tab, ...classes.tab }
      },
      {},
      {
        default: () => {
          return `${escape(tab.label)} `;
        }
      }
    )}`;
  })} `}</div> <div${add_attribute(
    "class",
    cls(
      vertical && "flex-1",
      {
        top: "border-t",
        bottom: "border-b",
        left: "border-l",
        right: "border-r"
      }[placement],
      settingsClasses.content,
      classes.content
    ),
    0
  )}>${slots.content ? slots.content({ value }) : ``}</div></div>`;
});
const CWBadge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { text = "" } = $$props;
  let { twBgColor = "bg-blue-400" } = $$props;
  let { twTextColor = "text-gray-800" } = $$props;
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  if ($$props.twBgColor === void 0 && $$bindings.twBgColor && twBgColor !== void 0)
    $$bindings.twBgColor(twBgColor);
  if ($$props.twTextColor === void 0 && $$bindings.twTextColor && twTextColor !== void 0)
    $$bindings.twTextColor(twTextColor);
  return `<div style="padding-top: 0.1em; padding-bottom: 0.1rem" class="${"text-xs px-3 " + escape(twBgColor, true) + " " + escape(twTextColor, true) + " rounded-full w-fit"}">${escape(text)}</div>`;
});
function getTouchDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
const touchDistance = writable(0);
const tracking = writable(false);
readable({ x: 0, y: 0 }, (set) => {
  const updateCursorPosition = (e) => {
    set({ x: e.clientX, y: e.clientY });
  };
  const updateTouchPosition = (e) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      touchDistance.set(distance);
      const touchPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      set(touchPoint);
    } else if (e.touches.length === 1) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const touchPoint = { x, y };
      set(touchPoint);
      tracking.set(true);
    }
  };
  const onTouchStart = (e) => {
    updateTouchPosition(e);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchmove", updateTouchPosition);
  };
  const onTouchEnd = () => {
    tracking.set(false);
    touchDistance.set(0);
    window.removeEventListener("touchmove", updateTouchPosition);
  };
  document.addEventListener("mousemove", updateCursorPosition);
  window.addEventListener("touchstart", onTouchStart, true);
  return () => {
    window.removeEventListener("mousemove", updateCursorPosition);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", updateTouchPosition);
    window.removeEventListener("touchend", onTouchEnd);
  };
});
function calculateTranslation(oldScale, newScale, currentTranslation, pointerPosition, dimensions) {
  const newTranslation = { x: 0, y: 0 };
  const pointerXRelativeToWrapper = pointerPosition.x - dimensions.left - dimensions.width / 2;
  const pointerYRelativeToWrapper = pointerPosition.y - dimensions.top - dimensions.height / 2;
  const pointerXRelativeToContent = (pointerXRelativeToWrapper - currentTranslation.x) / oldScale;
  const pointerYRelativeToContent = (pointerYRelativeToWrapper - currentTranslation.y) / oldScale;
  newTranslation.x = pointerXRelativeToWrapper - pointerXRelativeToContent * newScale;
  newTranslation.y = pointerYRelativeToWrapper - pointerYRelativeToContent * newScale;
  return newTranslation;
}
const MAX_ZOOM = 3;
const MIN_ZOOM = 0.1;
function calculateZoom(scale, delta, zoomIncrement) {
  const scaleAdjustment = delta * zoomIncrement;
  const newScale = scale - scaleAdjustment;
  return Number(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale)).toFixed(9));
}
function calculateFitView(dimensions, bounds) {
  const { width, height } = dimensions;
  const { top, left, right, bottom } = bounds;
  const boundsWidth = right - left;
  const boundsHeight = bottom - top;
  if (!boundsWidth || !boundsHeight)
    return { x: null, y: null, scale: null };
  const centerX = left + boundsWidth / 2;
  const centerY = top + boundsHeight / 2;
  const scale = Math.min(width / boundsWidth, height / boundsHeight) * 0.8;
  const viewportCenterX = width / 2;
  const viewportCenterY = height / 2;
  const translateX = viewportCenterX - centerX;
  const translateY = viewportCenterY - centerY;
  return {
    x: translateX * scale,
    y: translateY * scale,
    scale
  };
}
function zoomAndTranslate(direction = 1, dimensions, transforms, increment = 0.1) {
  const graphDimensions = get_store_value(dimensions);
  const { width, height, top, left } = graphDimensions;
  const scaleStore = transforms.scale;
  const graphTranslation = get_store_value(transforms.translation);
  const scale = get_store_value(scaleStore);
  const newScale = calculateZoom(scale, direction, increment);
  const newTranslation = calculateTranslation(scale, newScale, graphTranslation, { x: width / 2 + left, y: height / 2 + top }, graphDimensions);
  scaleStore.set(newScale);
  transforms.translation.set(newTranslation);
}
const Node = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let nodePosition;
  compute_slots(slots);
  let $$unsubscribe_nodePosition = noop, $$subscribe_nodePosition = () => ($$unsubscribe_nodePosition(), $$unsubscribe_nodePosition = subscribe(nodePosition, ($$value) => $$value), nodePosition);
  let $$unsubscribe_nodes;
  const graph = getContext("graph");
  getContext("group");
  let { position = { x: 0, y: 0 } } = $$props;
  let { drop = false } = $$props;
  let { dimensions = null } = $$props;
  let { id = 0 } = $$props;
  let { bgColor = null } = $$props;
  let { borderRadius = null } = $$props;
  let { borderColor = null } = $$props;
  let { borderWidth = null } = $$props;
  let { selectionColor = null } = $$props;
  let { textColor = null } = $$props;
  let { resizable = false } = $$props;
  let { label = "" } = $$props;
  let { inputs = 1 } = $$props;
  let { outputs = 1 } = $$props;
  let { width = null } = $$props;
  let { height = null } = $$props;
  let { TD = false } = $$props;
  let { LR = false } = $$props;
  let { zIndex = 1 } = $$props;
  let { editable = true } = $$props;
  let { locked = false } = $$props;
  let { rotation = 0 } = $$props;
  let { edge = null } = $$props;
  let { connections = [] } = $$props;
  let { useDefaults = false } = $$props;
  let { center = false } = $$props;
  let { dynamic = false } = $$props;
  let { title = "" } = $$props;
  const nodes = graph.nodes;
  $$unsubscribe_nodes = subscribe(nodes, (value) => value);
  setContext("dynamic", dynamic);
  let node;
  onDestroy(() => {
    graph.nodes.delete(node.id);
  });
  function connect(connections2) {
    return;
  }
  function disconnect(connections2) {
    return;
  }
  setContext("connect", connect);
  setContext("disconnect", disconnect);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0)
    $$bindings.position(position);
  if ($$props.drop === void 0 && $$bindings.drop && drop !== void 0)
    $$bindings.drop(drop);
  if ($$props.dimensions === void 0 && $$bindings.dimensions && dimensions !== void 0)
    $$bindings.dimensions(dimensions);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.bgColor === void 0 && $$bindings.bgColor && bgColor !== void 0)
    $$bindings.bgColor(bgColor);
  if ($$props.borderRadius === void 0 && $$bindings.borderRadius && borderRadius !== void 0)
    $$bindings.borderRadius(borderRadius);
  if ($$props.borderColor === void 0 && $$bindings.borderColor && borderColor !== void 0)
    $$bindings.borderColor(borderColor);
  if ($$props.borderWidth === void 0 && $$bindings.borderWidth && borderWidth !== void 0)
    $$bindings.borderWidth(borderWidth);
  if ($$props.selectionColor === void 0 && $$bindings.selectionColor && selectionColor !== void 0)
    $$bindings.selectionColor(selectionColor);
  if ($$props.textColor === void 0 && $$bindings.textColor && textColor !== void 0)
    $$bindings.textColor(textColor);
  if ($$props.resizable === void 0 && $$bindings.resizable && resizable !== void 0)
    $$bindings.resizable(resizable);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.inputs === void 0 && $$bindings.inputs && inputs !== void 0)
    $$bindings.inputs(inputs);
  if ($$props.outputs === void 0 && $$bindings.outputs && outputs !== void 0)
    $$bindings.outputs(outputs);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.TD === void 0 && $$bindings.TD && TD !== void 0)
    $$bindings.TD(TD);
  if ($$props.LR === void 0 && $$bindings.LR && LR !== void 0)
    $$bindings.LR(LR);
  if ($$props.zIndex === void 0 && $$bindings.zIndex && zIndex !== void 0)
    $$bindings.zIndex(zIndex);
  if ($$props.editable === void 0 && $$bindings.editable && editable !== void 0)
    $$bindings.editable(editable);
  if ($$props.locked === void 0 && $$bindings.locked && locked !== void 0)
    $$bindings.locked(locked);
  if ($$props.rotation === void 0 && $$bindings.rotation && rotation !== void 0)
    $$bindings.rotation(rotation);
  if ($$props.edge === void 0 && $$bindings.edge && edge !== void 0)
    $$bindings.edge(edge);
  if ($$props.connections === void 0 && $$bindings.connections && connections !== void 0)
    $$bindings.connections(connections);
  if ($$props.useDefaults === void 0 && $$bindings.useDefaults && useDefaults !== void 0)
    $$bindings.useDefaults(useDefaults);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0)
    $$bindings.center(center);
  if ($$props.dynamic === void 0 && $$bindings.dynamic && dynamic !== void 0)
    $$bindings.dynamic(dynamic);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  $$subscribe_nodePosition(nodePosition = node);
  $$unsubscribe_nodePosition();
  $$unsubscribe_nodes();
  return `${``}`;
});
const arrowTuple = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
new Set(arrowTuple);
const css$2 = {
  code: ".svelvet-temp.svelte-xw3n4e{background-color:transparent}:root{--default-node-border-width:1.5px;--default-node-width:200px;--default-node-height:100px;--default-node-border-radius:10px;--default-node-cursor:grab;--default-node-cursor-blocked:not-allowed;--default-background-cursor:move;--default-anchor-border-width:1px;--default-anchor-radius:50%;--default-anchor-size:12px;--default-edge-width:2px;--default-selection-box-border-width:1px;--shadow-color:0deg 0% 10%;--shadow-elevation-low:0.3px 0.5px 0.7px hsl(var(--shadow-color) / 0.4),\n			0.4px 0.8px 1px -1.2px hsl(var(--shadow-color) / 0.34),\n			1px 2px 2.5px -2.5px hsl(var(--shadow-color) / 0.34);--shadow-elevation-medium:0.3px 0.5px 0.7px hsl(var(--shadow-color) / 0.42),\n			0.8px 1.6px 2px -0.8px hsl(var(--shadow-color) / 0.1),\n			2.1px 4.1px 5.2px -1.7px hsl(var(--shadow-color) / 0.1),\n			5px 10px 12.6px -2.5px hsl(var(--shadow-color) / 0.1);--default-controls-shadow:var(--shadow-elevation-medium);--default-minimap-shadow:var(--shadow-elevation-medium);--default-theme-toggle-shadow:var(--shadow-elevation-medium);--default-node-color:hsl(0, 0%, 95%);--default-node-border-color:hsl(0, 0%, 87%);--default-node-selection-color:hsl(0, 0%, 13%);--default-text-color:hsl(0, 0%, 20%);--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:hsl(0, 0%, 100%);--default-dot-color:hsl(0, 0%, 53%);--default-accent-color:hsl(0, 0%, 100%);--default-primary-color:hsl(0, 0%, 83%);--default-selection-box-color:hsl(195, 53%, 79%);--default-edge-color:hsl(0, 0%, 40%);--default-target-edge-color:hsl(0, 0%, 0%);--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:hsl(0, 0%, 95%);--default-label-text-color:hsl(0, 0%, 20%);--plugin-border:hsl(0, 0%, 42%);--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:hsl(0, 0%, 67%);--default-anchor-border-color:hsl(0, 0%, 100%);--default-anchor-connected:hsl(0, 0%, 40%);--default-anchor-connected-border:hsl(0, 0%, 95%);--default-anchor-connecting:hsl(0, 0%, 40%);--default-anchor-connecting-border:hsl(0, 0%, 100%);--default-anchor-hovering:hsl(0, 0%, 46%);--default-anchor-hovering-border:hsl(0, 0%, 0%);--default-minimap-background-color:hsl(0, 0%, 100%);--default-minimap-node-color:hsl(0, 0%, 95%);--default-controls-background-color:hsl(0, 0%, 100%);--default-controls-text-color:hsl(0, 0%, 20%);--default-theme-toggle-text-color:hsl(0, 0%, 20%);--default-theme-toggle-color:hsl(0, 0%, 100%);--default-drawer-button-color:hsl(0, 2%, 89%);--default-drawer-button-text-color:hsl(0, 0%, 20%);--default-drawer-reset-button-color:hsl(0, 2%, 89%);--default-drawer-reset-button-text-color:hsl(0, 0%, 20%);--default-drawer-reset-button-hover-color:hsl(0, 0%, 30%);--default-drawer-reset-button-hover-text-color:hsl(0, 0%, 100%)}:root[svelvet-theme='dark']{--default-node-color:hsl(0, 0%, 20%);--default-node-border-color:hsl(0, 0%, 7%);--default-node-selection-color:hsl(0, 0%, 87%);--default-text-color:hsl(0, 0%, 100%);--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:hsl(0, 0%, 27%);--default-dot-color:hsl(0, 0%, 60%);--default-accent-color:hsl(0, 0%, 7%);--default-primary-color:hsl(0, 0%, 66%);--default-selection-box-color:hsl(195, 53%, 79%);--default-edge-color:hsl(0, 0%, 100%);--default-target-edge-color:hsl(0, 0%, 0%);--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:hsl(0, 0%, 20%);--default-label-text-color:hsl(0, 0%, 100%);--default-anchor-color:hsl(0, 0%, 67%);--default-anchor-border-color:hsl(0, 0%, 87%);--default-anchor-connected:hsl(0, 0%, 100%);--default-anchor-connected-border:hsl(0, 0%, 20%);--default-anchor-connecting:hsl(0, 0%, 40%);--default-anchor-connecting-border:hsl(0, 0%, 100%);--default-anchor-hovering:hsl(0, 0%, 46%);--default-anchor-hovering-border:hsl(0, 0%, 0%);--plugin-border:hsl(0, 0%, 42%);--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-minimap-background-color:hsl(0, 0%, 27%);--default-minimap-node-color:hsl(0, 0%, 20%);--default-controls-background-color:hsl(0, 0%, 27%);--default-controls-text-color:hsl(0, 0%, 100%);--default-theme-toggle-text-color:hsl(0, 0%, 100%);--default-theme-toggle-color:hsl(0, 0%, 27%);--default-drawer-button-color:hsl(0, 0%, 19%);--default-drawer-button-text-color:hsl(0, 0%, 100%);--default-drawer-reset-button-color:hsl(0, 0%, 19%);--default-drawer-reset-button-text-color:hsl(0, 0%, 89%);--default-drawer-reset-button-hover-color:hsl(0, 0%, 59%);--default-drawer-reset-button-hover-text-color:hsl(0, 0%, 100%)}:root[svelvet-theme='light']{--default-node-color:hsl(0, 0%, 95%);--default-node-border-color:hsl(0, 0%, 87%);--default-node-selection-color:hsl(0, 0%, 13%);--default-text-color:hsl(0, 0%, 20%);--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:hsl(0, 0%, 100%);--default-dot-color:hsl(0, 0%, 53%);--default-accent-color:hsl(0, 0%, 100%);--default-primary-color:hsl(0, 0%, 83%);--default-selection-box-color:hsl(195, 53%, 79%);--default-edge-color:hsl(0, 0%, 40%);--default-target-edge-color:hsl(0, 0%, 0%);--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:hsl(0, 0%, 95%);--default-label-text-color:hsl(0, 0%, 20%);--plugin-border:hsl(0, 0%, 42%);--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:hsl(0, 0%, 67%);--default-anchor-border-color:hsl(0, 0%, 100%);--default-anchor-connected:hsl(0, 0%, 40%);--default-anchor-connected-border:hsl(0, 0%, 95%);--default-anchor-connecting:hsl(0, 0%, 40%);--default-anchor-connecting-border:hsl(0, 0%, 100%);--default-anchor-hovering:hsl(0, 0%, 46%);--default-anchor-hovering-border:hsl(0, 0%, 0%);--default-minimap-background-color:hsl(0, 0%, 100%);--default-minimap-node-color:hsl(0, 0%, 95%);--default-controls-background-color:hsl(0, 0%, 100%);--default-controls-text-color:hsl(0, 0%, 20%);--default-theme-toggle-text-color:hsl(0, 0%, 20%);--default-theme-toggle-color:hsl(0, 0%, 100%);--default-drawer-button-color:hsl(0, 2%, 89%);--default-drawer-button-text-color:hsl(0, 0%, 20%);--default-drawer-reset-button-color:hsl(0, 2%, 89%);--default-drawer-reset-button-text-color:hsl(0, 0%, 20%);--default-drawer-reset-button-hover-color:hsl(0, 0%, 30%);--default-drawer-reset-button-hover-text-color:hsl(0, 0%, 100%)}:root[svelvet-theme='Black/White']{--default-node-color:#ffffff;--default-node-border-color:#ffffff;--default-node-selection-color:#000000;--default-text-color:#000000;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#000000;--default-dot-color:#ffffff;--default-accent-color:#000000;--default-primary-color:#ffffff;--default-selection-box-color:#ffffff;--default-edge-color:#ffffff;--default-target-edge-color:#000000;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#ffffff;--default-label-text-color:#000000;--plugin-border:#ffffff;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#ffffff;--default-anchor-border-color:#000000;--default-anchor-connected:#ffffff;--default-anchor-connected-border:#000000;--default-anchor-connecting:#ffffff;--default-anchor-connecting-border:#000000;--default-anchor-hovering:#ffffff;--default-anchor-hovering-border:#000000;--default-minimap-background-color:#000000;--default-minimap-node-color:#ffffff;--default-controls-background-color:#000000;--default-controls-text-color:#ffffff;--default-theme-toggle-text-color:#ffffff;--default-theme-toggle-color:#000000;--default-drawer-button-color:#ffffff;--default-drawer-button-text-color:#000000;--default-drawer-reset-button-color:#ffffff;--default-drawer-reset-button-text-color:#000000;--default-drawer-reset-button-hover-color:#e0e0e0;--default-drawer-reset-button-hover-text-color:#000000}:root[svelvet-theme='Yellow/Black']{--default-node-color:#ffff00;--default-node-border-color:#000000;--default-node-selection-color:#000000;--default-text-color:#000000;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#ffff00;--default-dot-color:#000000;--default-accent-color:#000000;--default-primary-color:#ffff00;--default-selection-box-color:#000000;--default-edge-color:#000000;--default-target-edge-color:#ffff00;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#000000;--default-label-text-color:#ffff00;--plugin-border:#000000;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#ffff00;--default-anchor-border-color:#000000;--default-anchor-connected:#ffff00;--default-anchor-connected-border:#000000;--default-anchor-connecting:#ffff00;--default-anchor-connecting-border:#000000;--default-anchor-hovering:#ffff00;--default-anchor-hovering-border:#000000;--default-minimap-background-color:#ffff00;--default-minimap-node-color:#000000;--default-controls-background-color:#ffff00;--default-controls-text-color:#000000;--default-theme-toggle-text-color:#000000;--default-theme-toggle-color:#ffff00;--default-drawer-button-color:#ffff00;--default-drawer-button-text-color:#000000;--default-drawer-reset-button-color:#ffff00;--default-drawer-reset-button-text-color:#000000;--default-drawer-reset-button-hover-color:#000000;--default-drawer-reset-button-hover-text-color:#ffff00}:root[svelvet-theme='Black/Yellow']{--default-node-color:#000000;--default-node-border-color:#ffff00;--default-node-selection-color:#ffff00;--default-text-color:#ffff00;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#000000;--default-dot-color:#ffff00;--default-accent-color:#ffff00;--default-primary-color:#000000;--default-selection-box-color:#ffff00;--default-edge-color:#ffff00;--default-target-edge-color:#000000;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#ffff00;--default-label-text-color:#000000;--plugin-border:#ffff00;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#ffff00;--default-anchor-border-color:#000000;--default-anchor-connected:#ffff00;--default-anchor-connected-border:#000000;--default-anchor-connecting:#ffff00;--default-anchor-connecting-border:#000000;--default-anchor-hovering:#ffff00;--default-anchor-hovering-border:#000000;--default-minimap-background-color:#000000;--default-minimap-node-color:#ffff00;--default-controls-background-color:#000000;--default-controls-text-color:#ffff00;--default-theme-toggle-text-color:#ffff00;--default-theme-toggle-color:#000000;--default-drawer-button-color:#000000;--default-drawer-button-text-color:#ffff00;--default-drawer-reset-button-color:#000000;--default-drawer-reset-button-text-color:#ffff00;--default-drawer-reset-button-hover-color:#ffff00;--default-drawer-reset-button-hover-text-color:#000000}:root[svelvet-theme='Black/Green']{--default-node-color:#000000;--default-node-border-color:#00ff00;--default-node-selection-color:#00ff00;--default-text-color:#00ff00;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#000000;--default-dot-color:#00ff00;--default-accent-color:#00ff00;--default-primary-color:#000000;--default-selection-box-color:#00ff00;--default-edge-color:#00ff00;--default-target-edge-color:#000000;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#00ff00;--default-label-text-color:#000000;--plugin-border:#00ff00;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#00ff00;--default-anchor-border-color:#000000;--default-anchor-connected:#00ff00;--default-anchor-connected-border:#000000;--default-anchor-connecting:#00ff00;--default-anchor-connecting-border:#000000;--default-anchor-hovering:#00ff00;--default-anchor-hovering-border:#000000;--default-minimap-background-color:#000000;--default-minimap-node-color:#00ff00;--default-controls-background-color:#000000;--default-controls-text-color:#00ff00;--default-theme-toggle-text-color:#00ff00;--default-theme-toggle-color:#000000;--default-drawer-button-color:#000000;--default-drawer-button-text-color:#00ff00;--default-drawer-reset-button-color:#000000;--default-drawer-reset-button-text-color:#00ff00;--default-drawer-reset-button-hover-color:#00ff00;--default-drawer-reset-button-hover-text-color:#000000}:root[svelvet-theme='Blue/Yellow']{--default-node-color:#0000ff;--default-node-border-color:#ffff00;--default-node-selection-color:#ffff00;--default-text-color:#ffff00;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#0000ff;--default-dot-color:#ffff00;--default-accent-color:#ffff00;--default-primary-color:#0000ff;--default-selection-box-color:#ffff00;--default-edge-color:#ffff00;--default-target-edge-color:#0000ff;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#ffff00;--default-label-text-color:#0000ff;--plugin-border:#ffff00;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#ffff00;--default-anchor-border-color:#0000ff;--default-anchor-connected:#ffff00;--default-anchor-connected-border:#0000ff;--default-anchor-connecting:#ffff00;--default-anchor-connecting-border:#0000ff;--default-anchor-hovering:#ffff00;--default-anchor-hovering-border:#0000ff;--default-minimap-background-color:#0000ff;--default-minimap-node-color:#ffff00;--default-controls-background-color:#0000ff;--default-controls-text-color:#ffff00;--default-theme-toggle-text-color:#ffff00;--default-theme-toggle-color:#0000ff;--default-drawer-button-color:#0000ff;--default-drawer-button-text-color:#ffff00;--default-drawer-reset-button-color:#0000ff;--default-drawer-reset-button-text-color:#ffff00;--default-drawer-reset-button-hover-color:#ffff00;--default-drawer-reset-button-hover-text-color:#0000ff}:root[svelvet-theme='Yellow/Blue']{--default-node-color:#ffff00;--default-node-border-color:#0000ff;--default-node-selection-color:#0000ff;--default-text-color:#0000ff;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#ffff00;--default-dot-color:#0000ff;--default-accent-color:#0000ff;--default-primary-color:#ffff00;--default-selection-box-color:#0000ff;--default-edge-color:#0000ff;--default-target-edge-color:#ffff00;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#0000ff;--default-label-text-color:#ffff00;--plugin-border:#0000ff;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#0000ff;--default-anchor-border-color:#ffff00;--default-anchor-connected:#0000ff;--default-anchor-connected-border:#ffff00;--default-anchor-connecting:#0000ff;--default-anchor-connecting-border:#ffff00;--default-anchor-hovering:#0000ff;--default-anchor-hovering-border:#ffff00;--default-minimap-background-color:#ffff00;--default-minimap-node-color:#0000ff;--default-controls-background-color:#ffff00;--default-controls-text-color:#0000ff;--default-theme-toggle-text-color:#0000ff;--default-theme-toggle-color:#ffff00;--default-drawer-button-color:#ffff00;--default-drawer-button-text-color:#0000ff;--default-drawer-reset-button-color:#ffff00;--default-drawer-reset-button-text-color:#0000ff;--default-drawer-reset-button-hover-color:#0000ff;--default-drawer-reset-button-hover-text-color:#ffff00}:root[svelvet-theme='Grayscale']{--default-node-color:#666666;--default-node-border-color:#f2f2f2;--default-node-selection-color:#333333;--default-text-color:#f2f2f2;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#333333;--default-dot-color:#999999;--default-accent-color:#333333;--default-primary-color:#999999;--default-selection-box-color:#f2f2f2;--default-edge-color:#999999;--default-target-edge-color:#666666;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#666666;--default-label-text-color:#f2f2f2;--plugin-border:#999999;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#999999;--default-anchor-border-color:#666666;--default-anchor-connected:#999999;--default-anchor-connected-border:#666666;--default-anchor-connecting:#999999;--default-anchor-connecting-border:#f2f2f2;--default-anchor-hovering:#999999;--default-anchor-hovering-border:#f2f2f2;--default-minimap-background-color:#333333;--default-minimap-node-color:#666666;--default-controls-background-color:#333333;--default-controls-text-color:#f2f2f2;--default-theme-toggle-text-color:#f2f2f2;--default-theme-toggle-color:#333333;--default-drawer-button-color:#999999;--default-drawer-button-text-color:#f2f2f2;--default-drawer-reset-button-color:#999999;--default-drawer-reset-button-text-color:#f2f2f2;--default-drawer-reset-button-hover-color:#f2f2f2;--default-drawer-reset-button-hover-text-color:#333333}:root[svelvet-theme='Black/Pink']{--default-node-color:#000000;--default-node-border-color:#ff69b4;--default-node-selection-color:#333333;--default-text-color:#ff69b4;--default-node-shadow:var(--shadow-elevation-medium);--default-background-color:#000000;--default-dot-color:#ff69b4;--default-accent-color:#333333;--default-primary-color:#ff69b4;--default-selection-box-color:#ff69b4;--default-edge-color:#ff69b4;--default-target-edge-color:#000000;--default-edge-shadow:var(--shadow-elevation-medium);--default-label-color:#000000;--default-label-text-color:#ff69b4;--plugin-border:#ff69b4;--default-controls-border:var(--plugin-border);--default-minimap-border:var(--plugin-border);--default-theme-toggle-border:var(--plugin-border);--default-anchor-color:#ff69b4;--default-anchor-border-color:#000000;--default-anchor-connected:#ff69b4;--default-anchor-connected-border:#000000;--default-anchor-connecting:#ff69b4;--default-anchor-connecting-border:#333333;--default-anchor-hovering:#ff69b4;--default-anchor-hovering-border:#333333;--default-minimap-background-color:#000000;--default-minimap-node-color:#333333;--default-controls-background-color:#000000;--default-controls-text-color:#ff69b4;--default-theme-toggle-text-color:#ff69b4;--default-theme-toggle-color:#000000;--default-drawer-button-color:#ff69b4;--default-drawer-button-text-color:#000000;--default-drawer-reset-button-color:#ff69b4;--default-drawer-reset-button-text-color:#000000;--default-drawer-reset-button-hover-color:#000000;--default-drawer-reset-button-hover-text-color:#ff69b4}",
  map: null
};
const Svelvet = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let edgeStore;
  compute_slots(slots);
  let { mermaid = "" } = $$props;
  let { theme = "light" } = $$props;
  let { id = 0 } = $$props;
  let { snapTo = 0 } = $$props;
  let { zoom = 1 } = $$props;
  let { TD = false } = $$props;
  let { editable = true } = $$props;
  let { locked = false } = $$props;
  let { width = 0 } = $$props;
  let { height = 0 } = $$props;
  let { minimap = false } = $$props;
  let { controls = false } = $$props;
  let { toggle = false } = $$props;
  let { drawer = false } = $$props;
  let { contrast = false } = $$props;
  let { fitView = false } = $$props;
  let { selectionColor = "lightblue" } = $$props;
  let { edgeStyle = "bezier" } = $$props;
  let { endStyles = [null, null] } = $$props;
  let { edge = null } = $$props;
  let { disableSelection = false } = $$props;
  let { mermaidConfig = {} } = $$props;
  let { translation = { x: 0, y: 0 } } = $$props;
  let { trackpadPan = false } = $$props;
  let { modifier = "meta" } = $$props;
  let { raiseEdgesOnSelect = false } = $$props;
  let { edgesAboveNode = false } = $$props;
  let { title = "" } = $$props;
  let { fixedZoom = false } = $$props;
  let { pannable = true } = $$props;
  const dispatch = createEventDispatcher();
  let graph = null;
  setContext("snapTo", snapTo);
  setContext("edgeStyle", edgeStyle);
  setContext("endStyles", endStyles);
  setContext("graphEdge", edge);
  setContext("raiseEdgesOnSelect", raiseEdgesOnSelect);
  setContext("edgesAboveNode", edgesAboveNode);
  setContext("graph", graph);
  function disconnect(source, target) {
    const sourceNodeKey = `N-${source[0]}`;
    const sourceNode = graph.nodes.get(sourceNodeKey);
    if (!sourceNode)
      return;
    const sourceAnchor = sourceNode.anchors.get(`A-${source[1]}/N-${source[0]}`);
    if (!sourceAnchor)
      return;
    const targetNodeKey = `N-${target[0]}`;
    const targetNode = graph.nodes.get(targetNodeKey);
    if (!targetNode)
      return;
    const targetAnchor = targetNode.anchors.get(`A-${target[1]}/N-${target[0]}`);
    if (!targetAnchor)
      return;
    const edgeKey = graph.edges.match(sourceAnchor, targetAnchor);
    if (!edgeKey)
      return;
    graph.edges.delete(edgeKey[0]);
  }
  if ($$props.mermaid === void 0 && $$bindings.mermaid && mermaid !== void 0)
    $$bindings.mermaid(mermaid);
  if ($$props.theme === void 0 && $$bindings.theme && theme !== void 0)
    $$bindings.theme(theme);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.snapTo === void 0 && $$bindings.snapTo && snapTo !== void 0)
    $$bindings.snapTo(snapTo);
  if ($$props.zoom === void 0 && $$bindings.zoom && zoom !== void 0)
    $$bindings.zoom(zoom);
  if ($$props.TD === void 0 && $$bindings.TD && TD !== void 0)
    $$bindings.TD(TD);
  if ($$props.editable === void 0 && $$bindings.editable && editable !== void 0)
    $$bindings.editable(editable);
  if ($$props.locked === void 0 && $$bindings.locked && locked !== void 0)
    $$bindings.locked(locked);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.minimap === void 0 && $$bindings.minimap && minimap !== void 0)
    $$bindings.minimap(minimap);
  if ($$props.controls === void 0 && $$bindings.controls && controls !== void 0)
    $$bindings.controls(controls);
  if ($$props.toggle === void 0 && $$bindings.toggle && toggle !== void 0)
    $$bindings.toggle(toggle);
  if ($$props.drawer === void 0 && $$bindings.drawer && drawer !== void 0)
    $$bindings.drawer(drawer);
  if ($$props.contrast === void 0 && $$bindings.contrast && contrast !== void 0)
    $$bindings.contrast(contrast);
  if ($$props.fitView === void 0 && $$bindings.fitView && fitView !== void 0)
    $$bindings.fitView(fitView);
  if ($$props.selectionColor === void 0 && $$bindings.selectionColor && selectionColor !== void 0)
    $$bindings.selectionColor(selectionColor);
  if ($$props.edgeStyle === void 0 && $$bindings.edgeStyle && edgeStyle !== void 0)
    $$bindings.edgeStyle(edgeStyle);
  if ($$props.endStyles === void 0 && $$bindings.endStyles && endStyles !== void 0)
    $$bindings.endStyles(endStyles);
  if ($$props.edge === void 0 && $$bindings.edge && edge !== void 0)
    $$bindings.edge(edge);
  if ($$props.disableSelection === void 0 && $$bindings.disableSelection && disableSelection !== void 0)
    $$bindings.disableSelection(disableSelection);
  if ($$props.mermaidConfig === void 0 && $$bindings.mermaidConfig && mermaidConfig !== void 0)
    $$bindings.mermaidConfig(mermaidConfig);
  if ($$props.translation === void 0 && $$bindings.translation && translation !== void 0)
    $$bindings.translation(translation);
  if ($$props.trackpadPan === void 0 && $$bindings.trackpadPan && trackpadPan !== void 0)
    $$bindings.trackpadPan(trackpadPan);
  if ($$props.modifier === void 0 && $$bindings.modifier && modifier !== void 0)
    $$bindings.modifier(modifier);
  if ($$props.raiseEdgesOnSelect === void 0 && $$bindings.raiseEdgesOnSelect && raiseEdgesOnSelect !== void 0)
    $$bindings.raiseEdgesOnSelect(raiseEdgesOnSelect);
  if ($$props.edgesAboveNode === void 0 && $$bindings.edgesAboveNode && edgesAboveNode !== void 0)
    $$bindings.edgesAboveNode(edgesAboveNode);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.fixedZoom === void 0 && $$bindings.fixedZoom && fixedZoom !== void 0)
    $$bindings.fixedZoom(fixedZoom);
  if ($$props.pannable === void 0 && $$bindings.pannable && pannable !== void 0)
    $$bindings.pannable(pannable);
  if ($$props.disconnect === void 0 && $$bindings.disconnect && disconnect !== void 0)
    $$bindings.disconnect(disconnect);
  $$result.css.add(css$2);
  edgeStore = graph;
  {
    if (edgeStore) {
      edgeStore.onEdgeChange((edge2, type) => {
        dispatch(type, {
          sourceAnchor: edge2.source,
          targetAnchor: edge2.target,
          sourceNode: edge2.source.node,
          targetNode: edge2.target.node
        });
      });
    }
  }
  return `${`<div class="svelvet-temp svelte-xw3n4e"${add_styles({
    "width": width ? width + "px" : "100%",
    "height": height ? height + "px" : "100%"
  })}></div>`}`;
});
const Visibility_off = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="m629-419-44-44q26-71-27-118t-115-24l-44-44q17-11 38-16t43-5q71 0 120.5 49.5T650-500q0 22-5.5 43.5T629-419Zm129 129-40-40q49-36 85.5-80.5T857-500q-50-111-150-175.5T490-740q-42 0-86 8t-69 19l-46-47q35-16 89.5-28T485-800q143 0 261.5 81.5T920-500q-26 64-67 117t-95 93Zm58 226L648-229q-35 14-79 21.5t-89 7.5q-146 0-265-81.5T40-500q20-52 55.5-101.5T182-696L56-822l42-43 757 757-39 44ZM223-654q-37 27-71.5 71T102-500q51 111 153.5 175.5T488-260q33 0 65-4t48-12l-64-64q-11 5-27 7.5t-30 2.5q-70 0-120-49t-50-121q0-15 2.5-30t7.5-27l-97-97Zm305 142Zm-116 58Z"></path>`;
});
const Zoom_out = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M796-121 533-384q-30 26-69.959 40.5T378-329q-108.162 0-183.081-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l264 262-44 44ZM377-389q81.25 0 138.125-57.5T572-585q0-81-56.875-138.5T377-781q-82.083 0-139.542 57.5Q180-666 180-585t57.458 138.5Q294.917-389 377-389ZM275-556v-60h201v60H275Z"></path>`;
});
const Zoom_in = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M796-121 533-384q-30 26-69.959 40.5T378-329q-108.162 0-183.081-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l264 262-44 44ZM377-389q81.25 0 138.125-57.5T572-585q0-81-56.875-138.5T377-781q-82.083 0-139.542 57.5Q180-666 180-585t57.458 138.5Q294.917-389 377-389Zm-31-85v-82h-82v-60h82v-81h60v81h81v60h-81v82h-60Z"></path>`;
});
const South_east = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M364-200v-60h294L160-758l42-42 498 498v-294h60v396H364Z"></path>`;
});
const North_west = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M758-160 260-658v294h-60v-396h396v60H302l498 498-42 42Z"></path>`;
});
const Lock_open = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M220-634h390v-96q0-54.167-37.882-92.083-37.883-37.917-92-37.917Q426-860 388-822.083 350-784.167 350-730h-60q0-79 55.606-134.5t134.5-55.5Q559-920 614.5-864.425T670-730v96h70q24.75 0 42.375 17.625T800-574v434q0 24.75-17.625 42.375T740-80H220q-24.75 0-42.375-17.625T160-140v-434q0-24.75 17.625-42.375T220-634Zm0 494h520v-434H220v434Zm260.168-140Q512-280 534.5-302.031T557-355q0-30-22.668-54.5t-54.5-24.5Q448-434 425.5-409.5t-22.5 55q0 30.5 22.668 52.5t54.5 22ZM220-140v-434 434Z"></path>`;
});
const Lock = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M220-80q-24.75 0-42.375-17.625T160-140v-434q0-24.75 17.625-42.375T220-634h70v-96q0-78.85 55.606-134.425Q401.212-920 480.106-920T614.5-864.425Q670-808.85 670-730v96h70q24.75 0 42.375 17.625T800-574v434q0 24.75-17.625 42.375T740-80H220Zm0-60h520v-434H220v434Zm260.168-140Q512-280 534.5-302.031T557-355q0-30-22.668-54.5t-54.5-24.5Q448-434 425.5-409.5t-22.5 55q0 30.5 22.668 52.5t54.5 22ZM350-634h260v-96q0-54.167-37.882-92.083-37.883-37.917-92-37.917Q426-860 388-822.083 350-784.167 350-730v96ZM220-140v-434 434Z"></path>`;
});
const Filter_center_focus = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M480-376q-45 0-74.5-29.5T376-480q0-45 29.5-74.5T480-584q45 0 74.5 29.5T584-480q0 45-29.5 74.5T480-376Zm0-60q18 0 31-13t13-31q0-18-13-31t-31-13q-18 0-31 13t-13 31q0 18 13 31t31 13ZM180-120q-24 0-42-18t-18-42v-172h60v172h172v60H180Zm428 0v-60h172v-172h60v172q0 24-18 42t-42 18H608ZM120-608v-172q0-24 18-42t42-18h172v60H180v172h-60Zm660 0v-172H608v-60h172q24 0 42 18t18 42v172h-60Z"></path>`;
});
const Light_mode = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M479.765-340Q538-340 579-380.765q41-40.764 41-99Q620-538 579.235-579q-40.764-41-99-41Q422-620 381-579.235q-41 40.764-41 99Q340-422 380.765-381q40.764 41 99 41Zm.235 60q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM70-450q-12.75 0-21.375-8.675Q40-467.351 40-480.175 40-493 48.625-501.5T70-510h100q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T170-450H70Zm720 0q-12.75 0-21.375-8.675-8.625-8.676-8.625-21.5 0-12.825 8.625-21.325T790-510h100q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T890-450H790ZM479.825-760Q467-760 458.5-768.625T450-790v-100q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T510-890v100q0 12.75-8.675 21.375-8.676 8.625-21.5 8.625Zm0 720Q467-40 458.5-48.625T450-70v-100q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T510-170v100q0 12.75-8.675 21.375Q492.649-40 479.825-40ZM240-678l-57-56q-9-9-8.629-21.603.37-12.604 8.526-21.5 8.896-8.897 21.5-8.897Q217-786 226-777l56 57q8 9 8 21t-8 20.5q-8 8.5-20.5 8.5t-21.5-8Zm494 495-56-57q-8-9-8-21.375T678.5-282q8.5-9 20.5-9t21 9l57 56q9 9 8.629 21.603-.37 12.604-8.526 21.5-8.896 8.897-21.5 8.897Q743-174 734-183Zm-56-495q-9-9-9-21t9-21l56-57q9-9 21.603-8.629 12.604.37 21.5 8.526 8.897 8.896 8.897 21.5Q786-743 777-734l-57 56q-8 8-20.364 8-12.363 0-21.636-8ZM182.897-182.897q-8.897-8.896-8.897-21.5Q174-217 183-226l57-56q8.8-9 20.9-9 12.1 0 20.709 9Q291-273 291-261t-9 21l-56 57q-9 9-21.603 8.629-12.604-.37-21.5-8.526ZM480-480Z"></path>`;
});
const Dark_mode = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q8 0 17 .5t23 1.5q-36 32-56 79t-20 99q0 90 63 153t153 63q52 0 99-18.5t79-51.5q1 12 1.5 19.5t.5 14.5q0 150-105 255T480-120Zm0-60q109 0 190-67.5T771-406q-25 11-53.667 16.5Q688.667-384 660-384q-114.689 0-195.345-80.655Q384-545.311 384-660q0-24 5-51.5t18-62.5q-98 27-162.5 109.5T180-480q0 125 87.5 212.5T480-180Zm-4-297Z"></path>`;
});
const Arrow_right = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M400-280v-400l200 200-200 200Z"></path>`;
});
const Arrow_left = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<path d="M560-280 360-480l200-200v400Z"></path>`;
});
const css$1 = {
  code: "svg.svelte-1kvv4m1{fill:currentColor}",
  map: null
};
const Icon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { width = 16 } = $$props;
  let { icon } = $$props;
  const icons = {
    arrow_left: Arrow_left,
    arrow_right: Arrow_right,
    dark_mode: Dark_mode,
    light_mode: Light_mode,
    filter_center_focus: Filter_center_focus,
    lock: Lock,
    lock_open: Lock_open,
    north_west: North_west,
    south_east: South_east,
    zoom_in: Zoom_in,
    zoom_out: Zoom_out,
    visibility_off: Visibility_off
  };
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  $$result.css.add(css$1);
  return `<svg xmlns="http://www.w3.org/2000/svg"${add_attribute("height", width, 0)} viewBox="0 -960 960 960"${add_attribute("width", width, 0)} class="svelte-1kvv4m1">${validate_component(icons[icon] || missing_component, "svelte:component").$$render($$result, {}, {}, {})}</svg>`;
});
const css = {
  code: ".svelte-zrughg.svelte-zrughg{box-sizing:border-box}.graph-controls.svelte-zrughg.svelte-zrughg{position:absolute}.NW.svelte-zrughg.svelte-zrughg{left:10px;top:10px}.NE.svelte-zrughg.svelte-zrughg{right:10px;top:10px}.SE.svelte-zrughg.svelte-zrughg{right:10px;bottom:10px}.SW.svelte-zrughg.svelte-zrughg{left:10px;bottom:10px}.controls-wrapper.svelte-zrughg.svelte-zrughg{left:10px;bottom:10px;display:flex;width:1.8rem;flex-direction:column;border-radius:6px;overflow:hidden;box-shadow:var(--controls-shadow, var(--default-controls-shadow));border:solid 1px var(--controls-border, var(--default-controls-border));padding:4px;color:var(\n			--prop-controls-text-color,\n			var(--controls-text-color, var(--default-controls-text-color))\n		);background-color:var(\n			--prop-controls-background-color,\n			var(--controls-background-color, var(--default-controls-background-color))\n		)}button.svelte-zrughg.svelte-zrughg{margin:0;padding:0;border:none;background:none;display:flex;align-items:center;justify-content:center;padding:0.2rem 0;border-bottom:solid 1px rgb(190, 188, 188);color:inherit}.horizontal.svelte-zrughg>button.svelte-zrughg{border-bottom:none}button.svelte-zrughg.svelte-zrughg:last-child{border-bottom:none}button.svelte-zrughg.svelte-zrughg:hover{cursor:pointer}.horizontal.svelte-zrughg.svelte-zrughg{flex-direction:row-reverse !important;height:1.5rem;gap:6px;width:-moz-fit-content;width:fit-content}",
  map: null
};
const Controls = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $locked, $$unsubscribe_locked;
  let $nodeBounds, $$unsubscribe_nodeBounds;
  let $dimensions, $$unsubscribe_dimensions;
  let $groups, $$unsubscribe_groups;
  let $hidden, $$unsubscribe_hidden;
  let { increment = 0.1 } = $$props;
  let { horizontal = false } = $$props;
  let { bgColor = null } = $$props;
  let { iconColor = null } = $$props;
  let { corner = "SW" } = $$props;
  const transforms = getContext("transforms");
  const dimensions = getContext("dimensions");
  $$unsubscribe_dimensions = subscribe(dimensions, (value) => $dimensions = value);
  const locked = getContext("locked");
  $$unsubscribe_locked = subscribe(locked, (value) => $locked = value);
  const groups = getContext("groups");
  $$unsubscribe_groups = subscribe(groups, (value) => $groups = value);
  const bounds = getContext("bounds");
  const { translation } = transforms;
  const hidden = $groups.hidden.nodes;
  $$unsubscribe_hidden = subscribe(hidden, (value) => $hidden = value);
  const nodeBounds = bounds.nodeBounds;
  $$unsubscribe_nodeBounds = subscribe(nodeBounds, (value) => $nodeBounds = value);
  function unhideAll() {
    hidden.set(/* @__PURE__ */ new Set());
  }
  function zoomIn() {
    zoomAndTranslate(-1, dimensions, transforms, increment);
  }
  function zoomOut() {
    zoomAndTranslate(1, dimensions, transforms, increment);
  }
  function fitView() {
    tracking.set(true);
    const { x, y, scale } = calculateFitView($dimensions, $nodeBounds);
    translation.set({ x: x || 0, y: y || 0 });
    transforms.scale.set(scale || 1);
    tracking.set(false);
  }
  function lock() {
    set_store_value(locked, $locked = !$locked, $locked);
  }
  if ($$props.increment === void 0 && $$bindings.increment && increment !== void 0)
    $$bindings.increment(increment);
  if ($$props.horizontal === void 0 && $$bindings.horizontal && horizontal !== void 0)
    $$bindings.horizontal(horizontal);
  if ($$props.bgColor === void 0 && $$bindings.bgColor && bgColor !== void 0)
    $$bindings.bgColor(bgColor);
  if ($$props.iconColor === void 0 && $$bindings.iconColor && iconColor !== void 0)
    $$bindings.iconColor(iconColor);
  if ($$props.corner === void 0 && $$bindings.corner && corner !== void 0)
    $$bindings.corner(corner);
  $$result.css.add(css);
  $$unsubscribe_locked();
  $$unsubscribe_nodeBounds();
  $$unsubscribe_dimensions();
  $$unsubscribe_groups();
  $$unsubscribe_hidden();
  return `<nav class="${[
    "graph-controls svelte-zrughg",
    (corner === "SW" ? "SW" : "") + " " + (corner === "NE" ? "NE" : "") + " " + (corner === "SE" ? "SE" : "") + " " + (corner === "NW" ? "NW" : "")
  ].join(" ").trim()}" aria-label="navigation">${slots.default ? slots.default({
    zoomIn,
    zoomOut,
    fitView,
    lock,
    unhideAll
  }) : ` <div class="${["controls-wrapper svelte-zrughg", horizontal ? "horizontal" : ""].join(" ").trim()}"${add_styles({
    "--prop-controls-background-color": bgColor,
    "--prop-controls-text-color": iconColor
  })}>${$hidden.size > 0 ? `<button class="unhide svelte-zrughg">${validate_component(Icon, "Icon").$$render($$result, { icon: "visibility_off" }, {}, {})}</button>` : ``} <button class="zoom-in svelte-zrughg">${validate_component(Icon, "Icon").$$render($$result, { icon: "zoom_in" }, {}, {})}</button> <button class="zoom-out svelte-zrughg">${validate_component(Icon, "Icon").$$render($$result, { icon: "zoom_out" }, {}, {})}</button> <button class="reset svelte-zrughg">${validate_component(Icon, "Icon").$$render($$result, { icon: "filter_center_focus" }, {}, {})}</button> <button class="lock svelte-zrughg">${validate_component(Icon, "Icon").$$render($$result, { icon: $locked ? "lock_open" : "lock" }, {}, {})}</button></div> `} </nav>`;
});
export {
  Controls as C,
  DateRangeField as D,
  Node as N,
  Svelvet as S,
  Tabs as T,
  CWBadge as a
};
