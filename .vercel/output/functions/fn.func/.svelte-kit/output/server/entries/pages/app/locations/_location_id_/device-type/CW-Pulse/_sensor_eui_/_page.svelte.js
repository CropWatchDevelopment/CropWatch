import { c as create_ssr_component, h as compute_rest_props, d as createEventDispatcher, a as subscribe, v as validate_component, f as add_attribute, e as escape } from "../../../../../../../../chunks/ssr.js";
import "../../../../../../../../chunks/client.js";
import { p as page } from "../../../../../../../../chunks/stores.js";
import { C as Checkbox, L as Leaflet } from "../../../../../../../../chunks/Leaflet.js";
import { mdiCalendar, mdiClose, mdiChevronRight, mdiChevronLeft, mdiCheck, mdiArrowDown, mdiExclamation, mdiEye, mdiExpandAll, mdiMagnify, mdiFilter, mdiDotsVertical, mdiFloppy, mdiPencil } from "@mdi/js";
import { scaleBand } from "d3-scale";
import "../../../../../../../../chunks/ticks.js";
import { C as Chart, S as Svg, A as Axis, B as Bars } from "../../../../../../../../chunks/Chart.js";
import { e as getComponentSettings, P as PeriodType, j as getSettings, l as DateToken, c as cls, h as formatDate } from "../../../../../../../../chunks/theme.js";
import { B as Button, I as Icon } from "../../../../../../../../chunks/Button.js";
import { L as ListItem } from "../../../../../../../../chunks/ListItem.js";
import { T as Tooltip } from "../../../../../../../../chunks/Tooltip.js";
import { C as Card, H as Header } from "../../../../../../../../chunks/Card.js";
import { F as Field, D as DateSelect } from "../../../../../../../../chunks/DateSelect.js";
import { I as Input, T as TextField } from "../../../../../../../../chunks/TextField.js";
import { D as Dialog } from "../../../../../../../../chunks/Dialog.js";
import { T as Toggle } from "../../../../../../../../chunks/Toggle.js";
import { S as Switch } from "../../../../../../../../chunks/Switch.js";
const DatePickerField = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let dictionary;
  let currentValue;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "periodType",
    "iconOnly",
    "stepper",
    "label",
    "labelPlacement",
    "error",
    "hint",
    "disabled",
    "clearable",
    "base",
    "rounded",
    "dense",
    "icon",
    "center"
  ]);
  let $format, $$unsubscribe_format;
  let $$unsubscribe_localeSettings;
  createEventDispatcher();
  const { classes: settingsClasses, defaults } = getComponentSettings("DatePickerField");
  let { value = null } = $$props;
  let { periodType = PeriodType.Day } = $$props;
  let { iconOnly = false } = $$props;
  let { stepper = false } = $$props;
  let { label = null } = $$props;
  let { labelPlacement = defaults.labelPlacement } = $$props;
  let { error = "" } = $$props;
  let { hint = "" } = $$props;
  let { disabled = false } = $$props;
  let { clearable = false } = $$props;
  let { base = false } = $$props;
  let { rounded = false } = $$props;
  let { dense = false } = $$props;
  let { icon = null } = $$props;
  let { center = false } = $$props;
  const { format, localeSettings } = getSettings();
  $$unsubscribe_format = subscribe(format, (value2) => $format = value2);
  $$unsubscribe_localeSettings = subscribe(localeSettings, (value2) => value2);
  let open = false;
  let primaryFormat = "";
  let secondaryFormat = "";
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.periodType === void 0 && $$bindings.periodType && periodType !== void 0)
    $$bindings.periodType(periodType);
  if ($$props.iconOnly === void 0 && $$bindings.iconOnly && iconOnly !== void 0)
    $$bindings.iconOnly(iconOnly);
  if ($$props.stepper === void 0 && $$bindings.stepper && stepper !== void 0)
    $$bindings.stepper(stepper);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.labelPlacement === void 0 && $$bindings.labelPlacement && labelPlacement !== void 0)
    $$bindings.labelPlacement(labelPlacement);
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
  if ($$props.center === void 0 && $$bindings.center && center !== void 0)
    $$bindings.center(center);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    dictionary = $format.settings.dictionary;
    {
      switch (periodType) {
        case PeriodType.Month:
          primaryFormat = DateToken.Month_long;
          secondaryFormat = DateToken.Year_numeric;
          break;
        case PeriodType.Day:
        default:
          primaryFormat = [
            DateToken.Month_long,
            DateToken.DayOfMonth_withOrdinal,
            DateToken.Year_numeric
          ];
          secondaryFormat = DateToken.DayOfWeek_long;
      }
    }
    currentValue = value;
    $$rendered = `${iconOnly ? `${validate_component(Button, "Button").$$render($$result, Object.assign({}, { icon: mdiCalendar }, $$restProps), {}, {})}` : `${validate_component(Field, "Field").$$render(
      $$result,
      {
        label: label ?? $format(value, PeriodType.Day, { custom: secondaryFormat }),
        labelPlacement,
        icon,
        error,
        hint,
        disabled,
        base,
        rounded,
        dense,
        center
      },
      {},
      {
        append: () => {
          return `<div slot="append">${clearable && value ? `${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: mdiClose,
              class: "text-surface-content/50 p-1"
            },
            {},
            {}
          )}` : ``} ${stepper ? `${validate_component(Button, "Button").$$render($$result, { icon: mdiChevronRight, class: "p-2" }, {}, {})}` : ``}</div>`;
        },
        prepend: () => {
          return `<span slot="prepend">${stepper ? `${validate_component(Button, "Button").$$render($$result, { icon: mdiChevronLeft, class: "p-2" }, {}, {})}` : ``}</span>`;
        },
        default: ({ id }) => {
          return `<button type="button" class="text-sm min-h-[1.25rem] whitespace-nowrap w-full focus:outline-none" style="text-align: inherit"${add_attribute("id", id, 0)}>${escape($format(value, PeriodType.Day, { custom: primaryFormat }))}</button>`;
        }
      }
    )}`} ${validate_component(Dialog, "Dialog").$$render(
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
          return `<div slot="actions" class="flex items-center gap-2">${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: mdiCheck,
              variant: "fill",
              color: "primary"
            },
            {},
            {
              default: () => {
                return `${escape(dictionary.Ok)}`;
              }
            }
          )} ${validate_component(Button, "Button").$$render($$result, {}, {}, {
            default: () => {
              return `${escape(dictionary.Cancel)}`;
            }
          })}</div>`;
        },
        default: () => {
          return `${currentValue ? `<div class="flex flex-col justify-center bg-primary text-primary-content px-6 h-24"><div class="text-sm opacity-50">${escape($format(currentValue, PeriodType.Day, { custom: secondaryFormat }))}</div> <div class="text-3xl">${escape($format(currentValue, PeriodType.Day, { custom: primaryFormat }))}</div></div>` : ``} <div class="p-2 w-96">${validate_component(DateSelect, "DateSelect").$$render(
            $$result,
            { periodType, selected: currentValue },
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
const DateField = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let actualFormat;
  let actualMask;
  let restProps;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "format",
    "mask",
    "replace",
    "picker",
    "classes",
    "label",
    "labelPlacement",
    "error",
    "hint",
    "disabled",
    "clearable",
    "base",
    "rounded",
    "dense",
    "icon"
  ]);
  let $format_ux, $$unsubscribe_format_ux;
  const { format: format_ux } = getSettings();
  $$unsubscribe_format_ux = subscribe(format_ux, (value2) => $format_ux = value2);
  const { classes: settingsClasses, defaults } = getComponentSettings("DateField");
  let { value = null } = $$props;
  let { format = void 0 } = $$props;
  let { mask = void 0 } = $$props;
  let { replace = "dmyh" } = $$props;
  let { picker = false } = $$props;
  let { classes = {} } = $$props;
  let { label = "" } = $$props;
  let { labelPlacement = defaults.labelPlacement } = $$props;
  let { error = "" } = $$props;
  let { hint = "" } = $$props;
  let { disabled = false } = $$props;
  let { clearable = false } = $$props;
  let { base = false } = $$props;
  let { rounded = false } = $$props;
  let { dense = false } = $$props;
  let { icon = null } = $$props;
  let inputValue = "";
  createEventDispatcher();
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.format === void 0 && $$bindings.format && format !== void 0)
    $$bindings.format(format);
  if ($$props.mask === void 0 && $$bindings.mask && mask !== void 0)
    $$bindings.mask(mask);
  if ($$props.replace === void 0 && $$bindings.replace && replace !== void 0)
    $$bindings.replace(replace);
  if ($$props.picker === void 0 && $$bindings.picker && picker !== void 0)
    $$bindings.picker(picker);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.labelPlacement === void 0 && $$bindings.labelPlacement && labelPlacement !== void 0)
    $$bindings.labelPlacement(labelPlacement);
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
  actualFormat = format ?? $format_ux.settings.formats.dates.baseParsing ?? "MM/dd/yyyy";
  actualMask = mask ?? actualFormat.toLowerCase();
  restProps = { ...defaults, ...$$restProps };
  $$unsubscribe_format_ux();
  return `${validate_component(Field, "Field").$$render(
    $$result,
    Object.assign({}, restProps, { label }, { value }, { icon }, { error }, { hint }, { disabled }, { base }, { rounded }, { dense }, { clearable }, { labelPlacement }, { classes: classes.field }, {
      class: cls("DateField", settingsClasses.root, classes.root, $$props.class)
    }),
    {},
    {
      append: () => {
        return `<span slot="append">${picker ? `${validate_component(DatePickerField, "DatePickerField").$$render(
          $$result,
          {
            iconOnly: true,
            value,
            class: "p-1 text-surface-content/50"
          },
          {},
          {}
        )}` : ``}</span>`;
      },
      default: ({ id }) => {
        return `${validate_component(Input, "Input").$$render(
          $$result,
          {
            value: value ? $format_ux(value, PeriodType.Day, { custom: actualFormat }) : inputValue,
            mask: actualMask,
            replace,
            id
          },
          {},
          {}
        )}`;
      }
    }
  )}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  const bounds = [35.692714959692054, 139.62132090488151];
  let data = [];
  let installDate = /* @__PURE__ */ new Date();
  for (let i = 0; i < 160; i++) {
    data.push({
      date: new Date(Date.now() + 24 * 60 * 60 * i),
      value: Math.floor(Math.random() * (80 - 3 + 1)) + 30,
      baseline: Math.floor(Math.random() * (5 - 5 + 1)) + 2
    });
  }
  data = data;
  $$unsubscribe_page();
  return `<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">${validate_component(Button, "Button").$$render(
    $$result,
    {
      variant: "outline",
      icon: mdiChevronLeft,
      size: "lg"
    },
    {},
    {}
  )} <p class="my-auto" data-svelte-h="svelte-1atzcvu">Water Sensor</p></h1> <div class="grid grid-flow-col grid-cols-5 py-4 gap-4">${validate_component(Card, "Card").$$render(
    $$result,
    {
      class: "py-3 text-center text-base text-black-500 font-extrabold cursor-pointer"
    },
    {},
    {
      default: () => {
        return `合計使用量`;
      }
    }
  )} ${validate_component(Card, "Card").$$render(
    $$result,
    {
      class: "py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
    },
    {},
    {
      default: () => {
        return `分析`;
      }
    }
  )} ${validate_component(Card, "Card").$$render(
    $$result,
    {
      class: "py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
    },
    {},
    {
      default: () => {
        return `デバイス`;
      }
    }
  )} ${validate_component(Card, "Card").$$render(
    $$result,
    {
      class: "py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
    },
    {},
    {
      default: () => {
        return `通知`;
      }
    }
  )} ${validate_component(Card, "Card").$$render(
    $$result,
    {
      class: "py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
    },
    {},
    {
      default: () => {
        return `設定`;
      }
    }
  )}</div> <div class="grid grid-flow-col grid-cols-4 gap-4">${validate_component(Card, "Card").$$render($$result, { class: "py-9 text-center" }, {}, {
    default: () => {
      return `<p class="text-xl" data-svelte-h="svelte-1ilzk60"><b>203.11 m³</b></p> <small data-svelte-h="svelte-1da61dw">週別使用量</small>`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { class: "py-9 text-center" }, {}, {
    default: () => {
      return `<p class="text-xl" data-svelte-h="svelte-jpat5y"><b>79713.91 m³</b></p> <small data-svelte-h="svelte-zavqqb">月別使用量</small>`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { class: "py-9 text-center" }, {}, {
    default: () => {
      return `<p class="text-xl" data-svelte-h="svelte-29xdca"><b>23.7 °C</b></p> <small data-svelte-h="svelte-51uztl">温度</small>`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { class: "py-9 text-center" }, {}, {
    default: () => {
      return `<p class="text-xl" data-svelte-h="svelte-xjlrc7"><b>96 %</b></p> <small data-svelte-h="svelte-lo1e7z">バッテリーレベル</small>`;
    }
  })}</div> <div class="grid grid-flow-col grid-cols-4 mt-4 gap-4">${validate_component(Card, "Card").$$render($$result, { class: "col-span-3" }, {}, {
    actions: () => {
      return `<div slot="actions" data-svelte-h="svelte-1bjvte4"><p>本日の使用量: xyz</p></div>`;
    },
    contents: () => {
      return `<div slot="contents"><div class="h-[300px] p-4 border rounded">${validate_component(Chart, "Chart").$$render(
        $$result,
        {
          data,
          x: "date",
          xScale: scaleBand().padding(0.4),
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
                    format: (d) => formatDate(d, PeriodType.Day, "short"),
                    rule: true
                  },
                  {},
                  {}
                )} ${validate_component(Bars, "Bars").$$render(
                  $$result,
                  {
                    radius: 4,
                    strokeWidth: 1,
                    class: "fill-accent-500"
                  },
                  {},
                  {}
                )}`;
              }
            })}`;
          }
        }
      )}</div></div>`;
    },
    header: () => {
      return `${validate_component(Header, "Header").$$render($$result, { title: "使用量チャート", slot: "header" }, {}, {})}`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { class: "col-span-1" }, {}, {
    contents: () => {
      return `<div slot="contents"><div class="border border-b w-full border-t-0 flex flex-row mb-4">${validate_component(Checkbox, "Checkbox").$$render($$result, {}, {}, {
        default: () => {
          return `作成された時間`;
        }
      })} ${validate_component(Icon, "Icon").$$render(
        $$result,
        {
          data: mdiArrowDown,
          size: 15,
          classes: { root: "ml-2" }
        },
        {},
        {}
      )}</div> <ol>${validate_component(ListItem, "ListItem").$$render(
        $$result,
        {
          title: "使用量が多すぎます",
          subheading: "2024-01-24 13:46",
          icon: mdiExclamation,
          avatar: { class: "bg-gray-400 text-red/90" },
          classes: { root: "bg-red-100 mb-2" }
        },
        {},
        {
          actions: () => {
            return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { icon: mdiEye }, {}, {})}</div>`;
          }
        }
      )} ${validate_component(ListItem, "ListItem").$$render(
        $$result,
        {
          title: "水が使用されていません",
          subheading: "2024-01-24 13:46",
          icon: mdiExclamation,
          avatar: { class: "bg-gray-400 text-red/90" },
          classes: { root: "bg-red-100 mb-2" }
        },
        {},
        {
          actions: () => {
            return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { icon: mdiEye }, {}, {})}</div>`;
          }
        }
      )} ${validate_component(ListItem, "ListItem").$$render(
        $$result,
        {
          title: "凍結注意",
          subheading: "2024-01-24 13:46",
          icon: mdiExclamation,
          avatar: { class: "bg-gray-400 text-red/90" },
          classes: { root: "bg-red-100 mb-2" }
        },
        {},
        {
          actions: () => {
            return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { icon: mdiEye }, {}, {})}</div>`;
          }
        }
      )}</ol></div>`;
    },
    header: () => {
      return `${validate_component(Header, "Header").$$render($$result, { title: "警報", slot: "header" }, {}, {
        actions: () => {
          return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { icon: mdiExpandAll, class: "w-12 h-12" }, {}, {})} ${validate_component(Button, "Button").$$render($$result, { icon: mdiMagnify, class: "w-12 h-12" }, {}, {})} ${validate_component(Button, "Button").$$render($$result, { icon: mdiFilter, class: "w-12 h-12" }, {}, {})} ${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: mdiDotsVertical,
              class: "w-12 h-12"
            },
            {},
            {}
          )}</div>`;
        }
      })}`;
    }
  })}</div> <div class="grid grid-flow-col grid-cols-9 mt-4 gap-4">${validate_component(Card, "Card").$$render($$result, { class: "col-span-3" }, {}, {
    contents: () => {
      return `<div slot="contents" class="flex flex-col gap-3 pb-3">${validate_component(Leaflet, "Leaflet").$$render($$result, { view: bounds, zoom: 20 }, {}, {})}</div>`;
    },
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "マップ",
          slot: "header",
          class: "border-b"
        },
        {},
        {}
      )}`;
    }
  })} ${validate_component(Toggle, "Toggle").$$render($$result, {}, {}, {
    default: ({ on: open, toggle }) => {
      return `${validate_component(Card, "Card").$$render($$result, { class: "col-span-2" }, {}, {
        contents: () => {
          return `<div slot="contents" class="flex flex-col gap-3 pb-3">${!open ? `<p data-svelte-h="svelte-102nzmn">住所:</p> <p data-svelte-h="svelte-adfmw4">所有者:</p> <p class="border-b" data-svelte-h="svelte-1sygz5o">所有者Email:</p> <p data-svelte-h="svelte-dvg654">使用者:</p> <p data-svelte-h="svelte-14oauow">使用者Email:</p>` : `${validate_component(TextField, "TextField").$$render($$result, { label: "住所" }, {}, {})} ${validate_component(TextField, "TextField").$$render($$result, { label: "所有者" }, {}, {})} ${validate_component(TextField, "TextField").$$render($$result, { label: "所有者Email" }, {}, {})} ${validate_component(TextField, "TextField").$$render($$result, { label: "使用者" }, {}, {})} ${validate_component(TextField, "TextField").$$render($$result, { label: "使用者Email" }, {}, {})}`}</div>`;
        },
        header: () => {
          return `${validate_component(Header, "Header").$$render(
            $$result,
            {
              title: "メーター設置場所",
              slot: "header",
              class: "border-b"
            },
            {},
            {
              actions: () => {
                return `<div slot="actions">${validate_component(Tooltip, "Tooltip").$$render($$result, { title: open ? `保存` : `編集` }, {}, {
                  default: () => {
                    return `${validate_component(Button, "Button").$$render(
                      $$result,
                      {
                        icon: open ? mdiFloppy : mdiPencil,
                        class: "w-12 h-12"
                      },
                      {},
                      {}
                    )}`;
                  }
                })}</div>`;
              }
            }
          )}`;
        }
      })}`;
    }
  })} ${validate_component(Toggle, "Toggle").$$render($$result, {}, {}, {
    default: ({ on: open, toggle }) => {
      return `${validate_component(Card, "Card").$$render($$result, { class: "col-span-2" }, {}, {
        contents: () => {
          return `<div slot="contents" class="flex flex-col gap-3 pb-3">${!open ? `<p data-svelte-h="svelte-70kljx">ラベル:</p> <p data-svelte-h="svelte-1cnd363">状態:</p> <p class="border-b" data-svelte-h="svelte-yny57o">名前:</p> <p data-svelte-h="svelte-he9ax8">設置日:</p>` : `${validate_component(TextField, "TextField").$$render($$result, { label: "ラベル" }, {}, {})} <label for="status" class="flex gap-2 items-center text-sm">状態
						${validate_component(Switch, "Switch").$$render(
            $$result,
            {
              name: "status",
              value: true,
              id: "status"
            },
            {},
            {}
          )}</label> ${validate_component(TextField, "TextField").$$render($$result, { label: "名前" }, {}, {})} ${validate_component(DateField, "DateField").$$render(
            $$result,
            {
              label: "設置日",
              value: installDate,
              picker: true,
              clearable: true
            },
            {},
            {}
          )}`}</div>`;
        },
        header: () => {
          return `${validate_component(Header, "Header").$$render(
            $$result,
            {
              title: "メーター詳細",
              slot: "header",
              class: "border-b"
            },
            {},
            {
              actions: () => {
                return `<div slot="actions">${validate_component(Tooltip, "Tooltip").$$render($$result, { title: open ? `保存` : `編集` }, {}, {
                  default: () => {
                    return `${validate_component(Button, "Button").$$render(
                      $$result,
                      {
                        icon: open ? mdiFloppy : mdiPencil,
                        class: "w-12 h-12"
                      },
                      {},
                      {}
                    )}`;
                  }
                })}</div>`;
              }
            }
          )}`;
        }
      })}`;
    }
  })} ${validate_component(Card, "Card").$$render($$result, { class: "col-span-2" }, {}, {
    contents: () => {
      return `<div slot="contents" class="flex flex-col gap-3 pb-3" data-svelte-h="svelte-kass4"><img alt="Pulse Meter" src="https://cdn11.bigcommerce.com/s-iaojjj3/images/stencil/1280x1280/products/209/1041/Neptune_T-10-angle__80463.1497552311.jpg?c=2"></div>`;
    },
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "写真",
          slot: "header",
          class: "border-b"
        },
        {},
        {
          actions: () => {
            return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { icon: mdiPencil, class: "w-12 h-12" }, {}, {})}</div>`;
          }
        }
      )}`;
    }
  })}</div>`;
});
export {
  Page as default
};
