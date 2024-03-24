import { c as create_ssr_component, h as compute_rest_props, d as createEventDispatcher, x as spread, y as escape_attribute_value, z as escape_object, f as add_attribute, e as escape, n as null_to_empty, v as validate_component, l as each, b as compute_slots } from "./ssr.js";
import { mdiCurrencyUsd, mdiPercent, mdiClose, mdiEye, mdiInformationOutline } from "@mdi/js";
import { g as getComponentClasses, c as cls, e as getComponentSettings } from "./theme.js";
import { i as isLiteralObject, I as Icon, a as asIconData, B as Button } from "./Button.js";
import { D as DEFAULT_LABEL_PLACEMENT, u as uniqueId } from "./index4.js";
function autoFocus(node, options) {
  if (options?.disabled !== true) {
    setTimeout(() => {
      node.focus();
    }, options?.delay ?? 0);
  }
}
const selectOnFocus = (node) => {
  const handleFocus = (event) => {
    node.select();
  };
  node.addEventListener("focus", handleFocus);
  return {
    destroy() {
      node.removeEventListener("focus", handleFocus);
    }
  };
};
const css$1 = {
  code: "input[type='number'].svelte-1p03v5h{-webkit-appearance:textfield;appearance:textfield;-moz-appearance:textfield}input[type='number'].svelte-1p03v5h::-webkit-inner-spin-button,input[type='number'].svelte-1p03v5h::-webkit-outer-spin-button{-webkit-appearance:none}",
  map: null
};
const Input = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let placeholder;
  let replaceSet;
  let prev;
  let firstPlaceholderPos;
  let acceptRegEx;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "type",
    "inputmode",
    "id",
    "actions",
    "inputEl",
    "autocapitalize",
    "mask",
    "replace",
    "accept",
    "placeholder",
    "disabled"
  ]);
  let { value = "" } = $$props;
  let { type = "text" } = $$props;
  let { inputmode = void 0 } = $$props;
  let { id = void 0 } = $$props;
  let { actions = void 0 } = $$props;
  let { inputEl = null } = $$props;
  let { autocapitalize = void 0 } = $$props;
  let { mask = "" } = $$props;
  let { replace = "_" } = $$props;
  let { accept = "\\d" } = $$props;
  let { placeholder: placeholderProp = void 0 } = $$props;
  let { disabled = false } = $$props;
  const settingsClasses = getComponentClasses("Input");
  let isFocused = false;
  createEventDispatcher();
  let backspace = false;
  function clean(inputValue) {
    const inputMatch = inputValue?.match(acceptRegEx) || [];
    if (inputMatch.length === 0) {
      return [];
    }
    return Array.from(mask, (maskChar) => {
      if (inputMatch[0] === maskChar || replaceSet.has(maskChar)) {
        return inputMatch.shift() ?? maskChar;
      } else {
        return maskChar;
      }
    });
  }
  function applyMask(el, mask2) {
    if (mask2) {
      const [i, j] = [el.selectionStart, el.selectionEnd].map((i2) => {
        i2 = clean(el.value.slice(0, i2 ?? void 0)).findIndex((c) => replaceSet.has(c));
        return i2 < 0 ? prev[prev.length - 1] : backspace ? prev[i2 - 1] || firstPlaceholderPos : i2;
      });
      value = clean(el.value).join("");
      el.value = value;
      el.setSelectionRange(i, j);
      backspace = false;
    } else {
      value = el.value;
    }
  }
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.inputmode === void 0 && $$bindings.inputmode && inputmode !== void 0)
    $$bindings.inputmode(inputmode);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.actions === void 0 && $$bindings.actions && actions !== void 0)
    $$bindings.actions(actions);
  if ($$props.inputEl === void 0 && $$bindings.inputEl && inputEl !== void 0)
    $$bindings.inputEl(inputEl);
  if ($$props.autocapitalize === void 0 && $$bindings.autocapitalize && autocapitalize !== void 0)
    $$bindings.autocapitalize(autocapitalize);
  if ($$props.mask === void 0 && $$bindings.mask && mask !== void 0)
    $$bindings.mask(mask);
  if ($$props.replace === void 0 && $$bindings.replace && replace !== void 0)
    $$bindings.replace(replace);
  if ($$props.accept === void 0 && $$bindings.accept && accept !== void 0)
    $$bindings.accept(accept);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholderProp !== void 0)
    $$bindings.placeholder(placeholderProp);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  $$result.css.add(css$1);
  placeholder = placeholderProp ?? mask;
  replaceSet = new Set(replace);
  prev = ((j) => Array.from(mask ?? "", (c, i) => replaceSet.has(c) ? j = i + 1 : j))(0);
  firstPlaceholderPos = [...mask ?? ""].findIndex((c) => replaceSet.has(c));
  acceptRegEx = accept instanceof RegExp ? accept : new RegExp(accept, "g");
  {
    if (inputEl)
      applyMask(inputEl, mask);
  }
  return `<input${spread(
    [
      { id: escape_attribute_value(id) },
      { value: escape_attribute_value(value) },
      { type: escape_attribute_value(type) },
      {
        inputmode: escape_attribute_value(inputmode)
      },
      {
        placeholder: escape_attribute_value(placeholder)
      },
      { disabled: disabled || null },
      {
        autocapitalize: escape_attribute_value(autocapitalize)
      },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("Input", "text-sm w-full outline-none bg-transparent placeholder-surface/50 selection:bg-surface-content/10", mask && (mask == placeholder || isFocused || value) && "font-mono", settingsClasses.root, $$props.class))
      }
    ],
    { classes: "svelte-1p03v5h" }
  )}${add_attribute("this", inputEl, 0)}>`;
});
const css = {
  code: "div.TextField.svelte-pne5t:focus-within label.placement-float.svelte-pne5t,label.shrink.svelte-pne5t.svelte-pne5t{transform:scale(0.75);width:133%;height:32px}input::-moz-placeholder,textarea.svelte-pne5t.svelte-pne5t::-moz-placeholder{-moz-transition:color 200ms;transition:color 200ms}input::placeholder,textarea.svelte-pne5t.svelte-pne5t::placeholder{transition:color 200ms}",
  map: null
};
const TextField = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let potentialInputValue;
  let operator;
  let hasInputValue;
  let hasInsetLabel;
  let hasPrepend;
  let hasAppend;
  let hasPrefix;
  let hasSuffix;
  let $$slots = compute_slots(slots);
  createEventDispatcher();
  const { classes: settingsClasses, defaults } = getComponentSettings("TextField");
  const { defaults: fieldDefaults } = getComponentSettings("Field");
  let { name = void 0 } = $$props;
  let { label = "" } = $$props;
  let { labelPlacement = defaults.labelPlacement ?? fieldDefaults.labelPlacement ?? DEFAULT_LABEL_PLACEMENT } = $$props;
  let { value = "" } = $$props;
  let { type = "text" } = $$props;
  let { placeholder = void 0 } = $$props;
  let { error = "" } = $$props;
  let { hint = "" } = $$props;
  let { autocomplete = "off" } = $$props;
  let { multiline = false } = $$props;
  let { disabled = false } = $$props;
  let { clearable = false } = $$props;
  let { base = false } = $$props;
  let { rounded = false } = $$props;
  let { dense = false } = $$props;
  let { icon = null } = $$props;
  let { iconRight = null } = $$props;
  let { align = "left" } = $$props;
  let { autofocus = false } = $$props;
  let { actions = autofocus ? (node) => [autoFocus(node, typeof autofocus === "object" ? autofocus : void 0)] : void 0 } = $$props;
  let { operators = void 0 } = $$props;
  let { inputEl = null } = $$props;
  let { debounceChange = false } = $$props;
  let { classes = {} } = $$props;
  let { mask = void 0 } = $$props;
  let { replace = void 0 } = $$props;
  let { accept = void 0 } = $$props;
  let { autocapitalize = void 0 } = $$props;
  let { role = void 0 } = $$props;
  let inputType = "text";
  let inputMode = void 0;
  let inputValue = "";
  const id = uniqueId("textfield-");
  let labelEl = null;
  if ($$props.name === void 0 && $$bindings.name && name !== void 0)
    $$bindings.name(name);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.labelPlacement === void 0 && $$bindings.labelPlacement && labelPlacement !== void 0)
    $$bindings.labelPlacement(labelPlacement);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0)
    $$bindings.placeholder(placeholder);
  if ($$props.error === void 0 && $$bindings.error && error !== void 0)
    $$bindings.error(error);
  if ($$props.hint === void 0 && $$bindings.hint && hint !== void 0)
    $$bindings.hint(hint);
  if ($$props.autocomplete === void 0 && $$bindings.autocomplete && autocomplete !== void 0)
    $$bindings.autocomplete(autocomplete);
  if ($$props.multiline === void 0 && $$bindings.multiline && multiline !== void 0)
    $$bindings.multiline(multiline);
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
  if ($$props.iconRight === void 0 && $$bindings.iconRight && iconRight !== void 0)
    $$bindings.iconRight(iconRight);
  if ($$props.align === void 0 && $$bindings.align && align !== void 0)
    $$bindings.align(align);
  if ($$props.autofocus === void 0 && $$bindings.autofocus && autofocus !== void 0)
    $$bindings.autofocus(autofocus);
  if ($$props.actions === void 0 && $$bindings.actions && actions !== void 0)
    $$bindings.actions(actions);
  if ($$props.operators === void 0 && $$bindings.operators && operators !== void 0)
    $$bindings.operators(operators);
  if ($$props.inputEl === void 0 && $$bindings.inputEl && inputEl !== void 0)
    $$bindings.inputEl(inputEl);
  if ($$props.debounceChange === void 0 && $$bindings.debounceChange && debounceChange !== void 0)
    $$bindings.debounceChange(debounceChange);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.mask === void 0 && $$bindings.mask && mask !== void 0)
    $$bindings.mask(mask);
  if ($$props.replace === void 0 && $$bindings.replace && replace !== void 0)
    $$bindings.replace(replace);
  if ($$props.accept === void 0 && $$bindings.accept && accept !== void 0)
    $$bindings.accept(accept);
  if ($$props.autocapitalize === void 0 && $$bindings.autocapitalize && autocapitalize !== void 0)
    $$bindings.autocapitalize(autocapitalize);
  if ($$props.role === void 0 && $$bindings.role && role !== void 0)
    $$bindings.role(role);
  $$result.css.add(css);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      switch (type) {
        case "integer":
        case "decimal":
        case "currency":
        case "percent":
          inputType = "number";
          break;
        case "password":
          inputType = "password";
          break;
        case "email":
          inputType = "email";
          break;
        case "search":
          inputType = "search";
          break;
        case "text":
        default:
          inputType = "text";
      }
    }
    {
      switch (type) {
        case "integer":
          inputMode = "numeric";
          break;
        case "decimal":
        case "currency":
        case "percent":
          inputMode = "decimal";
          break;
        case "email":
          inputMode = "email";
          break;
        case "search":
          inputMode = "search";
          break;
        case "text":
        case "password":
        default:
          inputMode = "text";
      }
    }
    potentialInputValue = isLiteralObject(value) ? Object.values(value)[0] : value ?? null;
    {
      if (inputType !== "number" || inputValue != potentialInputValue) {
        inputValue = potentialInputValue;
      }
    }
    operator = isLiteralObject(value) ? Object.keys(value)[0] : operators?.[0].value;
    hasInputValue = inputValue != null && inputValue !== "";
    hasInsetLabel = ["inset", "float"].includes(labelPlacement) && label !== "";
    hasPrepend = $$slots.prepend || !!icon;
    hasAppend = $$slots.append || iconRight != null || clearable || error || operators || type === "password";
    hasPrefix = $$slots.prefix || type === "currency";
    hasSuffix = $$slots.suffix || type === "percent";
    $$rendered = `<div role="group" class="${escape(
      null_to_empty(cls(
        "TextField",
        "group flex gap-1",
        labelPlacement !== "left" ? "flex-col" : "items-center",
        error ? "[--color:theme(colors.danger)]" : "[--color:theme(colors.primary)]",
        disabled && "opacity-50 pointer-events-none",
        !base && (rounded ? "rounded-full" : "rounded"),
        settingsClasses.root,
        classes.root,
        $$props.class
      )),
      true
    ) + " svelte-pne5t"}">${label && ["top", "left"].includes(labelPlacement) ? `<label class="${escape(null_to_empty(cls("block text-sm font-medium", "truncate group-hover:text-surface-content/70 group-focus-within:text-[var(--color)] group-hover:group-focus-within:text-[var(--color)] cursor-pointer", error ? "text-danger/80" : "text-surface-content/50", `placement-${labelPlacement}`, settingsClasses.label, classes.label)), true) + " svelte-pne5t"}"${add_attribute("for", id, 0)}${add_attribute("this", labelEl, 0)}>${escape(label)}</label>` : ``} <div class="flex-1"><div class="${escape(
      null_to_empty(cls(
        "border py-0 transition-shadow",
        disabled ? "" : "hover:shadow",
        disabled ? "" : error ? "hover:border-danger" : "hover:border-surface-content",
        {
          "px-2": !rounded,
          "px-6": rounded && !hasPrepend
          // TODO: `hasPrepend` always true for SelectField, etc.  See: https://github.com/sveltejs/svelte/issues/6059
        },
        !base && ["bg-surface-100", rounded ? "rounded-full" : "rounded"],
        error && "border-danger",
        "group-focus-within:shadow-md group-focus-within:border-[var(--color)]",
        settingsClasses.container,
        classes.container
      )),
      true
    ) + " svelte-pne5t"}"><div class="flex items-center">${hasPrepend ? `<div${add_attribute("class", cls("prepend flex items-center whitespace-nowrap", rounded && "pl-3", settingsClasses.prepend, classes.prepend), 0)}>${slots.prepend ? slots.prepend({}) : ``} ${icon ? `<span class="mr-3">${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        data: asIconData(icon),
        class: "text-surface-content/50"
      },
      {},
      {}
    )}</span>` : ``}</div>` : ``}  <div${add_attribute("role", role === "combobox" ? role : void 0, 0)} class="flex-grow inline-grid">${label && ["inset", "float"].includes(labelPlacement) ? `<label class="${escape(null_to_empty(cls("col-span-full row-span-full z-[1] flex items-center h-full truncate origin-top-left transition-all duration-200 group-hover:text-surface-content/70 group-focus-within:text-[var(--color)] group-hover:group-focus-within:text-[var(--color)] cursor-pointer", error ? "text-danger/80" : "text-surface-content/50", `placement-${labelPlacement}`, (labelPlacement === "inset" || hasInputValue) && "shrink", settingsClasses.label, classes.label)), true) + " svelte-pne5t"}"${add_attribute("for", id, 0)}${add_attribute("this", labelEl, 0)}>${escape(label)}</label>` : ``} <div${add_attribute("class", cls("input col-span-full row-span-full flex items-center", hasInsetLabel && "pt-4", dense ? "my-1" : "my-2", (hasPrefix || hasSuffix) && label && labelPlacement === "float" && !hasInputValue && "opacity-0 transition-opacity", "group-focus-within:opacity-100"), 0)}>${slots.prefix ? slots.prefix({}) : ``} ${type === "currency" ? `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        path: mdiCurrencyUsd,
        size: "1.1em",
        class: "text-surface-content/50 -mt-1"
      },
      {},
      {}
    )}` : ``} ${multiline ? `<textarea${add_attribute("id", id, 0)}${add_attribute("name", name, 0)}${add_attribute("placeholder", placeholder, 0)}${add_attribute("autocomplete", autocomplete, 0)} ${disabled ? "disabled" : ""}${add_attribute("autocapitalize", autocapitalize, 0)} class="${escape(
      null_to_empty(cls(
        "text-sm border-none w-full bg-transparent outline-none resize-none",
        "placeholder-surface-content placeholder-opacity-0 group-focus-within:placeholder-opacity-50",
        error && "placeholder-danger",
        (labelPlacement !== "float" || !hasInsetLabel) && "placeholder-opacity-50",
        {
          "text-left": align === "left",
          "text-center": align === "center",
          "text-right": align === "right"
        },
        settingsClasses.input,
        classes.input
      )),
      true
    ) + " svelte-pne5t"}">${escape(inputValue, false)}</textarea>` : `${validate_component(Input, "Input").$$render(
      $$result,
      {
        id,
        name,
        placeholder,
        disabled,
        autocomplete,
        type: inputType,
        inputmode: inputMode,
        value: inputValue,
        mask,
        replace,
        accept,
        autocapitalize,
        actions,
        class: cls(
          "text-sm border-none w-full bg-transparent outline-none truncate",
          "selection:bg-surface-content/30",
          "placeholder-surface-content placeholder-opacity-0 group-focus-within:placeholder-opacity-50",
          error && "placeholder-danger",
          (labelPlacement !== "float" || !hasInsetLabel) && "placeholder-opacity-50",
          {
            "text-left": align === "left",
            "text-center": align === "center",
            "text-right": align === "right"
          },
          settingsClasses.input,
          classes.input
        ),
        inputEl
      },
      {
        inputEl: ($$value) => {
          inputEl = $$value;
          $$settled = false;
        }
      },
      {}
    )}`} ${type === "percent" ? `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        path: mdiPercent,
        size: "1.1em",
        class: "text-surface-content/50 -mt-1 ml-1"
      },
      {},
      {}
    )}` : ``} ${slots.suffix ? slots.suffix({}) : ``}</div></div> ${hasAppend ? `<div${add_attribute("class", cls("append flex items-center whitespace-nowrap", settingsClasses.append, classes.append), 0)}>${clearable && hasInputValue ? `${validate_component(Button, "Button").$$render(
      $$result,
      {
        icon: mdiClose,
        disabled,
        class: "text-surface-content/50 p-1"
      },
      {},
      {}
    )}` : ``} ${operators ? `<select ${disabled ? "disabled" : ""}${add_attribute("value", operator, 0)} class="appearance-none bg-surface-content/5 border rounded-full mr-2 px-2 text-sm outline-none focus:border-opacity-50 focus:shadow-md" style="text-align-last: center;">${each(operators ?? [], ({ label: label2, value: value2 }) => {
      return `<option${add_attribute("value", value2, 0)}>${escape(label2)}</option>`;
    })}</select>` : ``} ${type === "password" ? `${validate_component(Button, "Button").$$render(
      $$result,
      {
        icon: mdiEye,
        disabled,
        class: "text-surface-content/50 p-2"
      },
      {},
      {}
    )}` : ``} ${slots.append ? slots.append({}) : ``} ${error ? `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        path: mdiInformationOutline,
        class: "text-danger"
      },
      {},
      {}
    )}` : `${iconRight ? `${validate_component(Icon, "Icon").$$render(
      $$result,
      {
        data: asIconData(iconRight),
        class: "text-surface-content/50"
      },
      {},
      {}
    )}` : ``}`}</div>` : ``}</div></div> <div${add_attribute(
      "class",
      cls(
        error ? "error" : "hint",
        "text-xs ml-2 transition-transform ease-out overflow-hidden origin-top transform group-focus-within:scale-y-100",
        error ? "text-danger" : "text-surface-content/50 scale-y-0",
        settingsClasses.error,
        classes.error
      ),
      0
    )}>${escape(error && error != true ? error : hint)}</div></div> </div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Input as I,
  TextField as T,
  autoFocus as a,
  selectOnFocus as s
};
