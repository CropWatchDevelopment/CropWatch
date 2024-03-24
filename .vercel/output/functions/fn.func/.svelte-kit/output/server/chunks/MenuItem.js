import { c as create_ssr_component, d as createEventDispatcher, v as validate_component, f as add_attribute, h as compute_rest_props } from "./ssr.js";
import { s as slide } from "./index3.js";
import { g as getComponentClasses, c as cls, s as settings, j as getSettings } from "./theme.js";
import { P as Popover } from "./Popover.js";
import { s as setButtonGroup, B as Button } from "./Button.js";
function getScrollParent(node) {
  const isElement = node instanceof HTMLElement;
  const overflowX = isElement ? window?.getComputedStyle(node).overflowX ?? "visible" : "unknown";
  const overflowY = isElement ? window?.getComputedStyle(node).overflowY ?? "visible" : "unknown";
  const isHorizontalScrollable = !["visible", "hidden"].includes(overflowX) && node.scrollWidth > node.clientWidth;
  const isVerticalScrollable = !["visible", "hidden"].includes(overflowY) && node.scrollHeight > node.clientHeight;
  if (isHorizontalScrollable || isVerticalScrollable) {
    return node;
  } else if (node.parentElement) {
    return getScrollParent(node.parentElement);
  } else {
    return document.body;
  }
}
function scrollIntoView$1(node) {
  const scrollParent = getScrollParent(node);
  const removeScrollParentOffset = scrollParent != node.offsetParent;
  const nodeOffset = {
    top: node.offsetTop - (removeScrollParentOffset ? scrollParent?.offsetTop ?? 0 : 0),
    left: node.offsetLeft - (removeScrollParentOffset ? scrollParent?.offsetLeft ?? 0 : 0)
  };
  const optionCenter = {
    left: node.clientWidth / 2,
    top: node.clientHeight / 2
  };
  const containerCenter = {
    left: scrollParent.clientWidth / 2,
    top: scrollParent.clientHeight / 2
  };
  scrollParent.scroll({
    top: nodeOffset.top + optionCenter.top - containerCenter.top,
    left: nodeOffset.left + optionCenter.left - containerCenter.left,
    behavior: "smooth"
  });
}
function isVisibleInScrollParent(node) {
  const nodeRect = node.getBoundingClientRect();
  const scrollParent = getScrollParent(node);
  const parentRect = scrollParent.getBoundingClientRect();
  const isVisible = nodeRect.top > parentRect.top && nodeRect.bottom < parentRect.bottom;
  return isVisible;
}
const scrollIntoView = (node, options) => {
  function update(options2) {
    const condition = typeof options2?.condition === "boolean" ? options2.condition : options2?.condition(node);
    const needed = options2?.onlyIfNeeded ? !isVisibleInScrollParent(node) : true;
    if (condition && needed) {
      setTimeout(() => {
        scrollIntoView$1(node);
      }, options2?.delay ?? 0);
    }
  }
  if (options?.initial !== false) {
    update(options);
  }
  return { update };
};
const Menu = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  createEventDispatcher();
  let { open = false } = $$props;
  let { offset = 4 } = $$props;
  let { matchWidth = false } = $$props;
  let { placement = matchWidth ? "bottom-start" : "bottom" } = $$props;
  let { autoPlacement = false } = $$props;
  let { resize = false } = $$props;
  let { disableTransition = false } = $$props;
  let { transition = disableTransition ? (node, params) => ({}) : slide } = $$props;
  let { transitionParams = {} } = $$props;
  let { explicitClose = false } = $$props;
  let { moveFocus = true } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Menu");
  let { menuItemsEl = void 0 } = $$props;
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.offset === void 0 && $$bindings.offset && offset !== void 0)
    $$bindings.offset(offset);
  if ($$props.matchWidth === void 0 && $$bindings.matchWidth && matchWidth !== void 0)
    $$bindings.matchWidth(matchWidth);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.autoPlacement === void 0 && $$bindings.autoPlacement && autoPlacement !== void 0)
    $$bindings.autoPlacement(autoPlacement);
  if ($$props.resize === void 0 && $$bindings.resize && resize !== void 0)
    $$bindings.resize(resize);
  if ($$props.disableTransition === void 0 && $$bindings.disableTransition && disableTransition !== void 0)
    $$bindings.disableTransition(disableTransition);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.transitionParams === void 0 && $$bindings.transitionParams && transitionParams !== void 0)
    $$bindings.transitionParams(transitionParams);
  if ($$props.explicitClose === void 0 && $$bindings.explicitClose && explicitClose !== void 0)
    $$bindings.explicitClose(explicitClose);
  if ($$props.moveFocus === void 0 && $$bindings.moveFocus && moveFocus !== void 0)
    $$bindings.moveFocus(moveFocus);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  if ($$props.menuItemsEl === void 0 && $$bindings.menuItemsEl && menuItemsEl !== void 0)
    $$bindings.menuItemsEl(menuItemsEl);
  return `${validate_component(Popover, "Popover").$$render(
    $$result,
    {
      placement,
      autoPlacement,
      offset,
      matchWidth,
      resize,
      open,
      class: cls("Menu", "bg-surface-100 rounded shadow border overflow-auto", settingsClasses.root, classes.root, $$props.class),
      style: $$props.style
    },
    {},
    {
      default: ({ close }) => {
        return ` <menu${add_attribute("class", cls("menu-items outline-none max-h-screen", settingsClasses.menu, classes.menu), 0)}${add_attribute("this", menuItemsEl, 0)}>${slots.default ? slots.default({ close }) : ``}</menu>`;
      }
    }
  )}`;
});
const MenuItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["icon", "scrollIntoView", "disabled", "selected", "classes"]);
  let { icon = void 0 } = $$props;
  let { scrollIntoView: scrollIntoView$12 = false } = $$props;
  let { disabled = false } = $$props;
  let { selected = false } = $$props;
  let { classes = {
    root: "text-sm gap-3",
    icon: "text-surface-content/50",
    selected: "font-semibold [:not(.group:hover)>&]:bg-surface-content/5"
  } } = $$props;
  const settingsClasses = getComponentClasses("MenuItem");
  let scrollOptions;
  setButtonGroup(void 0);
  settings({ ...getSettings(), components: {} });
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.scrollIntoView === void 0 && $$bindings.scrollIntoView && scrollIntoView$12 !== void 0)
    $$bindings.scrollIntoView(scrollIntoView$12);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  scrollOptions = typeof scrollIntoView$12 === "boolean" ? { condition: scrollIntoView$12 } : scrollIntoView$12;
  return `${validate_component(Button, "Button").$$render(
    $$result,
    Object.assign(
      {},
      { variant: "none" },
      { icon },
      { classes },
      { fullWidth: true },
      {
        actions: (node) => [scrollIntoView(node, scrollOptions)]
      },
      { disabled },
      $$restProps,
      {
        class: cls("MenuItem", "text-left items-center p-2 hover:bg-surface-content/5 rounded duration-75", selected && classes?.selected, settingsClasses.root, classes?.root, $$props.class)
      }
    ),
    {},
    {
      default: () => {
        return `${slots.default ? slots.default({}) : ``}`;
      }
    }
  )}`;
});
export {
  Menu as M,
  MenuItem as a,
  scrollIntoView$1 as s
};
