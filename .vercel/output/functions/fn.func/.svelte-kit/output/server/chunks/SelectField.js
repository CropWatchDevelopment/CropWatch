import { c as create_ssr_component, f as add_attribute, e as escape, l as each, h as compute_rest_props, d as createEventDispatcher, v as validate_component } from "./ssr.js";
import { mdiChevronRight, mdiChevronLeft, mdiChevronDown, mdiClose } from "@mdi/js";
import { L as Logger } from "./logger.js";
import { T as TextField, a as autoFocus, s as selectOnFocus } from "./TextField.js";
import { g as getComponentClasses, c as cls, e as getComponentSettings } from "./theme.js";
import { P as ProgressCircle, B as Button } from "./Button.js";
import { M as Menu, a as MenuItem } from "./MenuItem.js";
const SelectListOptions = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { optionText } = $$props;
  let { optionValue } = $$props;
  let { selectIndex } = $$props;
  let { selectOption } = $$props;
  let { onKeyDown } = $$props;
  let { onKeyPress } = $$props;
  let { open } = $$props;
  let { loading } = $$props;
  let { filteredOptions } = $$props;
  let { value = void 0 } = $$props;
  let { selected = void 0 } = $$props;
  let { highlightIndex } = $$props;
  let { searchText } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("SelectField");
  let { menuOptionsEl } = $$props;
  if ($$props.optionText === void 0 && $$bindings.optionText && optionText !== void 0)
    $$bindings.optionText(optionText);
  if ($$props.optionValue === void 0 && $$bindings.optionValue && optionValue !== void 0)
    $$bindings.optionValue(optionValue);
  if ($$props.selectIndex === void 0 && $$bindings.selectIndex && selectIndex !== void 0)
    $$bindings.selectIndex(selectIndex);
  if ($$props.selectOption === void 0 && $$bindings.selectOption && selectOption !== void 0)
    $$bindings.selectOption(selectOption);
  if ($$props.onKeyDown === void 0 && $$bindings.onKeyDown && onKeyDown !== void 0)
    $$bindings.onKeyDown(onKeyDown);
  if ($$props.onKeyPress === void 0 && $$bindings.onKeyPress && onKeyPress !== void 0)
    $$bindings.onKeyPress(onKeyPress);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  if ($$props.filteredOptions === void 0 && $$bindings.filteredOptions && filteredOptions !== void 0)
    $$bindings.filteredOptions(filteredOptions);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  if ($$props.highlightIndex === void 0 && $$bindings.highlightIndex && highlightIndex !== void 0)
    $$bindings.highlightIndex(highlightIndex);
  if ($$props.searchText === void 0 && $$bindings.searchText && searchText !== void 0)
    $$bindings.searchText(searchText);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.menuOptionsEl === void 0 && $$bindings.menuOptionsEl && menuOptionsEl !== void 0)
    $$bindings.menuOptionsEl(menuOptionsEl);
  return `<div role="listbox" tabindex="-1"${add_attribute("aria-expanded", open ? "true" : "false", 0)} class="${[
    escape(cls("_SelectListOptions options group p-1 focus:outline-none", settingsClasses.options, classes.root), true),
    loading ? "opacity-50" : ""
  ].join(" ").trim()}"${add_attribute("this", menuOptionsEl, 0)}>${(filteredOptions ?? []).length ? each(filteredOptions ?? [], (option, index) => {
    let previousOption = filteredOptions[index - 1];
    return ` ${option.group && option.group !== previousOption?.group ? `<div${add_attribute("class", cls("group-header text-xs leading-8 tracking-widest text-surface-content/50 px-2", settingsClasses.group, classes.group), 0)}>${escape(option.group)} </div>` : ``} ${slots.option ? slots.option({ option, index }) : ``}`;
  }) : `${slots.empty ? slots.empty({ loading, searchText }) : ``}`}</div>`;
});
const SelectField = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filteredOptions;
  let $$restProps = compute_rest_props($$props, [
    "options",
    "optionText",
    "optionValue",
    "label",
    "placeholder",
    "labelPlacement",
    "loading",
    "disabled",
    "readonly",
    "icon",
    "inlineOptions",
    "toggleIcon",
    "closeIcon",
    "activeOptionIcon",
    "clearable",
    "base",
    "rounded",
    "dense",
    "clearSearchOnOpen",
    "tabindex",
    "autofocus",
    "fieldActions",
    "stepper",
    "scrollIntoView",
    "classes",
    "placement",
    "autoPlacement",
    "matchWidth",
    "resize",
    "disableTransition",
    "menuProps",
    "value",
    "selected",
    "search",
    "open"
  ]);
  const dispatch = createEventDispatcher();
  const { classes: settingsClasses, defaults } = getComponentSettings("SelectField");
  const logger = new Logger("SelectField");
  let { options = [] } = $$props;
  let { optionText = (option) => option?.label ?? "" } = $$props;
  let { optionValue = (option) => option?.value ?? null } = $$props;
  let { label = "" } = $$props;
  let { placeholder = "" } = $$props;
  let { labelPlacement = defaults.labelPlacement } = $$props;
  let { loading = false } = $$props;
  let { disabled = false } = $$props;
  let { readonly = false } = $$props;
  let { icon = void 0 } = $$props;
  let { inlineOptions = false } = $$props;
  let { toggleIcon = !inlineOptions ? mdiChevronDown : null } = $$props;
  let { closeIcon = mdiClose } = $$props;
  let { activeOptionIcon = false } = $$props;
  let { clearable = true } = $$props;
  let { base = false } = $$props;
  let { rounded = false } = $$props;
  let { dense = false } = $$props;
  let { clearSearchOnOpen = true } = $$props;
  let { tabindex = 0 } = $$props;
  let { autofocus = void 0 } = $$props;
  let { fieldActions = autofocus ? (node) => [
    autoFocus(node, typeof autofocus === "object" ? autofocus : void 0),
    selectOnFocus(node)
  ] : void 0 } = $$props;
  let { stepper = false } = $$props;
  let originalIcon = icon;
  let { scrollIntoView = {} } = $$props;
  let { classes = {} } = $$props;
  let fieldClasses;
  let { placement = "bottom-start" } = $$props;
  let { autoPlacement = true } = $$props;
  let { matchWidth = true } = $$props;
  let { resize = true } = $$props;
  let { disableTransition = false } = $$props;
  let { menuProps = void 0 } = $$props;
  let searchText = "";
  let { value = void 0 } = $$props;
  let prevValue = void 0;
  let { selected = void 0 } = $$props;
  let prevSelected = void 0;
  function updateSelected(selected2, value2, options2) {
    logger.debug("updateSelected", {
      value: value2,
      prevValue,
      selected: selected2,
      prevSelected,
      options: options2,
      loading
    });
    if (loading === true)
      ;
    else {
      if (selected2 !== void 0 && optionValue(selected2) !== optionValue(prevSelected)) {
        logger.info("selected changed", {
          value: value2,
          prevValue,
          selected: selected2,
          prevSelected,
          options: options2
        });
        prevValue = optionValue(selected2);
        prevSelected = selectOption(selected2);
      } else if (
        /*value !== undefined &&*/
        value2 !== prevValue
      ) {
        logger.info("value changed", {
          value: value2,
          prevValue,
          selected: selected2,
          prevSelected,
          options: options2
        });
        prevValue = value2;
        prevSelected = selectValue(value2);
      } else {
        logger.info("neither selected or value changed (options only)");
        if (!open && prevValue !== void 0) {
          selectValue(prevValue);
        }
      }
    }
  }
  let { search = async (text) => {
    logger.debug("search", { text, open });
    if (text === "") {
      filteredOptions = options;
    } else {
      const words = text?.toLowerCase().split(" ") ?? [];
      filteredOptions = options.filter((option) => {
        const _optionText = optionText(option).toLowerCase();
        return words.every((word) => _optionText.includes(word));
      });
    }
  } } = $$props;
  let inputEl = null;
  let menuOptionsEl;
  let selectFieldEl;
  let { open = false } = $$props;
  let highlightIndex = 0;
  function onKeyDown(e) {
    logger.debug("onKeyDown", { key: e.key });
    switch (e.key) {
      case "Tab":
        if (e.shiftKey)
          ;
        break;
      case "ArrowDown":
        show();
        if (highlightIndex < filteredOptions.length - 1) {
          highlightIndex++;
        } else {
          highlightIndex = 0;
        }
        break;
      case "ArrowUp":
        show();
        if (highlightIndex > 0) {
          highlightIndex--;
        } else {
          highlightIndex = filteredOptions.length - 1;
        }
        break;
      case "Escape":
        if (open) {
          inputEl?.focus();
          hide("escape");
        }
        break;
    }
  }
  function onKeyPress(e) {
    logger.debug("onKeyPress");
    if (e.key === "Enter") {
      e.preventDefault();
      selectHighlighted();
    }
  }
  function show() {
    logger.debug("show");
    if (!disabled && !readonly) {
      if (open === false && clearSearchOnOpen) {
        searchText = "";
      }
      open = true;
      inputEl?.focus();
    }
  }
  function hide(reason = "") {
    logger.debug("hide", { reason });
    open = false;
    highlightIndex = -1;
  }
  function selectHighlighted() {
    logger.debug("selectHighlighted");
    return selectIndex(highlightIndex);
  }
  function selectIndex(index) {
    logger.debug("selectIndex", { index });
    const option = filteredOptions[index];
    if (option) {
      return selectOption(option);
    }
  }
  function selectValue(value2) {
    logger.debug("selectValue", { value: value2, options, filteredOptions });
    const option = options?.find((option2) => optionValue(option2) === value2);
    return selectOption(option);
  }
  function selectOption(option) {
    logger.info("selectOption", { option });
    const previousValue = value;
    value = optionValue(option);
    selected = option;
    searchText = optionText(option);
    if (activeOptionIcon) {
      if (!selected?.icon) {
        icon = originalIcon;
      } else {
        icon = selected.icon;
      }
    }
    if (value != previousValue) {
      dispatch("change", { option, value });
    }
    hide("selectOption");
    return option;
  }
  if ($$props.options === void 0 && $$bindings.options && options !== void 0)
    $$bindings.options(options);
  if ($$props.optionText === void 0 && $$bindings.optionText && optionText !== void 0)
    $$bindings.optionText(optionText);
  if ($$props.optionValue === void 0 && $$bindings.optionValue && optionValue !== void 0)
    $$bindings.optionValue(optionValue);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0)
    $$bindings.placeholder(placeholder);
  if ($$props.labelPlacement === void 0 && $$bindings.labelPlacement && labelPlacement !== void 0)
    $$bindings.labelPlacement(labelPlacement);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.readonly === void 0 && $$bindings.readonly && readonly !== void 0)
    $$bindings.readonly(readonly);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.inlineOptions === void 0 && $$bindings.inlineOptions && inlineOptions !== void 0)
    $$bindings.inlineOptions(inlineOptions);
  if ($$props.toggleIcon === void 0 && $$bindings.toggleIcon && toggleIcon !== void 0)
    $$bindings.toggleIcon(toggleIcon);
  if ($$props.closeIcon === void 0 && $$bindings.closeIcon && closeIcon !== void 0)
    $$bindings.closeIcon(closeIcon);
  if ($$props.activeOptionIcon === void 0 && $$bindings.activeOptionIcon && activeOptionIcon !== void 0)
    $$bindings.activeOptionIcon(activeOptionIcon);
  if ($$props.clearable === void 0 && $$bindings.clearable && clearable !== void 0)
    $$bindings.clearable(clearable);
  if ($$props.base === void 0 && $$bindings.base && base !== void 0)
    $$bindings.base(base);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0)
    $$bindings.rounded(rounded);
  if ($$props.dense === void 0 && $$bindings.dense && dense !== void 0)
    $$bindings.dense(dense);
  if ($$props.clearSearchOnOpen === void 0 && $$bindings.clearSearchOnOpen && clearSearchOnOpen !== void 0)
    $$bindings.clearSearchOnOpen(clearSearchOnOpen);
  if ($$props.tabindex === void 0 && $$bindings.tabindex && tabindex !== void 0)
    $$bindings.tabindex(tabindex);
  if ($$props.autofocus === void 0 && $$bindings.autofocus && autofocus !== void 0)
    $$bindings.autofocus(autofocus);
  if ($$props.fieldActions === void 0 && $$bindings.fieldActions && fieldActions !== void 0)
    $$bindings.fieldActions(fieldActions);
  if ($$props.stepper === void 0 && $$bindings.stepper && stepper !== void 0)
    $$bindings.stepper(stepper);
  if ($$props.scrollIntoView === void 0 && $$bindings.scrollIntoView && scrollIntoView !== void 0)
    $$bindings.scrollIntoView(scrollIntoView);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.autoPlacement === void 0 && $$bindings.autoPlacement && autoPlacement !== void 0)
    $$bindings.autoPlacement(autoPlacement);
  if ($$props.matchWidth === void 0 && $$bindings.matchWidth && matchWidth !== void 0)
    $$bindings.matchWidth(matchWidth);
  if ($$props.resize === void 0 && $$bindings.resize && resize !== void 0)
    $$bindings.resize(resize);
  if ($$props.disableTransition === void 0 && $$bindings.disableTransition && disableTransition !== void 0)
    $$bindings.disableTransition(disableTransition);
  if ($$props.menuProps === void 0 && $$bindings.menuProps && menuProps !== void 0)
    $$bindings.menuProps(menuProps);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  if ($$props.search === void 0 && $$bindings.search && search !== void 0)
    $$bindings.search(search);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    fieldClasses = typeof classes.field === "string" ? { root: classes.field } : classes.field;
    filteredOptions = options ?? [];
    {
      if (open === false) {
        if (selected) {
          searchText = optionText(selected);
        }
      }
    }
    {
      logger.debug({ searchText });
    }
    {
      updateSelected(selected, value, options);
    }
    {
      if (open) {
        const prevHighlightedOption = filteredOptions[highlightIndex];
        search(searchText).then(() => {
          const selectedIndex = filteredOptions.findIndex((o) => optionValue(o) === value);
          if (highlightIndex === -1) {
            highlightIndex = selectedIndex === -1 ? 0 : selectedIndex;
          } else {
            const prevHighlightedOptionIndex = filteredOptions.findIndex((o) => o === prevHighlightedOption);
            if (prevHighlightedOptionIndex !== -1) {
              highlightIndex = prevHighlightedOptionIndex;
            } else {
              highlightIndex = 0;
            }
          }
        });
      }
    }
    $$rendered = ` <button type="button"${add_attribute("aria-haspopup", !inlineOptions ? "listbox" : void 0, 0)}${add_attribute("class", cls("SelectField block w-full cursor-default text-left", settingsClasses.root, classes.root, $$props.class), 0)}${add_attribute("this", selectFieldEl, 0)}>${validate_component(TextField, "TextField").$$render(
      $$result,
      Object.assign(
        {},
        { label },
        { labelPlacement },
        { placeholder },
        { base },
        { rounded },
        { icon },
        { dense },
        { disabled },
        { actions: fieldActions },
        {
          classes: {
            container: inlineOptions ? "border-none shadow-none hover:shadow-none group-focus-within:shadow-none" : void 0
          }
        },
        {
          class: cls("h-full", settingsClasses.field, fieldClasses)
        },
        { role: "combobox" },
        { "aria-expanded": open ? "true" : "false" },
        {
          "aria-autocomplete": !inlineOptions ? "list" : void 0
        },
        $$restProps,
        { inputEl },
        { value: searchText }
      ),
      {
        inputEl: ($$value) => {
          inputEl = $$value;
          $$settled = false;
        },
        value: ($$value) => {
          searchText = $$value;
          $$settled = false;
        }
      },
      {
        append: () => {
          return `<span slot="append" class="flex items-center">${slots.append ? slots.append({}) : ``} ${loading ? `<span class="inline-block w-[29px] h-[28px] text-center">${validate_component(ProgressCircle, "ProgressCircle").$$render(
            $$result,
            {
              size: 16,
              width: 2,
              class: "text-surface-content/50"
            },
            {},
            {}
          )}</span>` : `${readonly ? `` : `${value && clearable ? `${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: closeIcon,
              class: "text-surface-content/50 p-1"
            },
            {},
            {}
          )}` : `${toggleIcon ? `${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: toggleIcon,
              class: "text-surface-content/50 p-1 transform " + (open ? "rotate-180" : ""),
              tabindex: "-1"
            },
            {},
            {}
          )}` : ``}`}`}`} ${stepper ? `${validate_component(Button, "Button").$$render(
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
          return `<span slot="prepend" class="flex items-center">${stepper ? `${validate_component(Button, "Button").$$render(
            $$result,
            {
              icon: mdiChevronLeft,
              class: "mr-2",
              size: "sm"
            },
            {},
            {}
          )}` : ``} ${slots.prepend ? slots.prepend({}) : ``}</span>`;
        }
      }
    )}  ${options?.length > 0 || loading !== true ? `${!inlineOptions ? `${validate_component(Menu, "Menu").$$render(
      $$result,
      Object.assign({}, { placement }, { autoPlacement }, { matchWidth }, { resize }, { disableTransition }, { moveFocus: false }, menuProps, { open }),
      {
        open: ($$value) => {
          open = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return ` ${validate_component(SelectListOptions, "SelectListOptions").$$render(
            $$result,
            {
              open,
              loading,
              highlightIndex,
              searchText,
              filteredOptions,
              classes: {
                ...classes,
                root: cls(classes.options, inlineOptions ? "border-t mt-1 px-1" : "")
              },
              optionText,
              optionValue,
              selectIndex,
              selectOption,
              onKeyPress,
              onKeyDown,
              menuOptionsEl
            },
            {
              menuOptionsEl: ($$value) => {
                menuOptionsEl = $$value;
                $$settled = false;
              }
            },
            {
              empty: () => {
                return `${slots.empty ? slots.empty({ slot: "empty" }) : ` <div${add_attribute("class", cls("p-3 text-surface-content/5/50 italic text-sm", settingsClasses.empty, classes.empty), 0)}>${escape(loading ? "Loading..." : "No options found")}</div> `}`;
              },
              option: ({ option, index }) => {
                return `${slots.option ? slots.option({
                  option,
                  index,
                  selected,
                  value,
                  highlightIndex
                }) : ` ${validate_component(MenuItem, "MenuItem").$$render(
                  $$result,
                  {
                    class: cls(index === highlightIndex && "[:not(.group:hover)>&]:bg-surface-content/5", option === selected && (classes.selected || "font-semibold"), option.group ? "px-4" : "px-2", settingsClasses.option, classes.option),
                    scrollIntoView: {
                      condition: index === highlightIndex,
                      onlyIfNeeded: inlineOptions,
                      ...scrollIntoView
                    },
                    role: "option",
                    "aria-selected": option === selected ? "true" : "false",
                    "aria-disabled": option?.disabled ? "true" : "false"
                  },
                  {},
                  {
                    default: () => {
                      return `${escape(optionText(option))}`;
                    }
                  }
                )} `}`;
              }
            }
          )} ${slots.actions ? slots.actions({ hide }) : ``}`;
        }
      }
    )}` : `  ${validate_component(SelectListOptions, "SelectListOptions").$$render(
      $$result,
      {
        open,
        loading,
        highlightIndex,
        searchText,
        filteredOptions,
        classes: {
          ...classes,
          root: cls(classes.options, inlineOptions ? "border-t mt-1 px-1" : "")
        },
        optionText,
        optionValue,
        selectIndex,
        selectOption,
        onKeyPress,
        onKeyDown,
        menuOptionsEl
      },
      {
        menuOptionsEl: ($$value) => {
          menuOptionsEl = $$value;
          $$settled = false;
        }
      },
      {
        empty: () => {
          return `${slots.empty ? slots.empty({ slot: "empty" }) : ` <div${add_attribute("class", cls("p-3 text-surface-content/5/50 italic text-sm", settingsClasses.empty, classes.empty), 0)}>${escape(loading ? "Loading..." : "No options found")}</div> `}`;
        },
        option: ({ option, index }) => {
          return `${slots.option ? slots.option({
            option,
            index,
            selected,
            value,
            highlightIndex
          }) : ` ${validate_component(MenuItem, "MenuItem").$$render(
            $$result,
            {
              class: cls(index === highlightIndex && "[:not(.group:hover)>&]:bg-surface-content/5", option === selected && (classes.selected || "font-semibold"), option.group ? "px-4" : "px-2", settingsClasses.option, classes.option),
              scrollIntoView: {
                condition: index === highlightIndex,
                onlyIfNeeded: inlineOptions,
                ...scrollIntoView
              },
              role: "option",
              "aria-selected": option === selected ? "true" : "false",
              "aria-disabled": option?.disabled ? "true" : "false"
            },
            {},
            {
              default: () => {
                return `${escape(optionText(option))}`;
              }
            }
          )} `}`;
        }
      }
    )}`}` : ``}</button>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  SelectField as S
};
