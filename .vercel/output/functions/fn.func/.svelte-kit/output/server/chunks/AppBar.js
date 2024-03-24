import { c as create_ssr_component, a as subscribe, e as escape, n as null_to_empty, g as add_styles, v as validate_component, h as compute_rest_props, f as add_attribute, b as compute_slots, i as set_store_value } from "./ssr.js";
import { mdiMenu } from "@mdi/js";
import { m as mdScreen, g as getComponentClasses, c as cls, b as browser, d as breakpoints } from "./theme.js";
import { w as writable } from "./index2.js";
import { B as Backdrop } from "./Backdrop.js";
import { B as Breadcrumb } from "./Breadcrumb.js";
import { B as Button } from "./Button.js";
const css = {
  code: ".AppLayout.svelte-4jdyeh.svelte-4jdyeh{grid-template-areas:var(--areas)}.AppLayout.svelte-4jdyeh aside.svelte-4jdyeh{grid-area:aside}.AppLayout.svelte-4jdyeh > header{grid-area:header}.AppLayout.svelte-4jdyeh > main{grid-area:main;overflow:auto}.AppLayout.overlapHeader.svelte-4jdyeh > main{margin-top:calc(var(--headerHeight) * -1);padding-top:var(--headerHeight)}",
  map: null
};
const showDrawer = writable(browser ? window.innerWidth >= breakpoints.md : true);
const AppLayout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let areas;
  let temporaryDrawer;
  let $mdScreen, $$unsubscribe_mdScreen;
  let $showDrawer, $$unsubscribe_showDrawer;
  $$unsubscribe_mdScreen = subscribe(mdScreen, (value) => $mdScreen = value);
  $$unsubscribe_showDrawer = subscribe(showDrawer, (value) => $showDrawer = value);
  let { navWidth = 240 } = $$props;
  let { headerHeight = 64 } = $$props;
  let { headerPosition = "full" } = $$props;
  let { overlapHeader = false } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("AppLayout");
  if ($$props.navWidth === void 0 && $$bindings.navWidth && navWidth !== void 0)
    $$bindings.navWidth(navWidth);
  if ($$props.headerHeight === void 0 && $$bindings.headerHeight && headerHeight !== void 0)
    $$bindings.headerHeight(headerHeight);
  if ($$props.headerPosition === void 0 && $$bindings.headerPosition && headerPosition !== void 0)
    $$bindings.headerPosition(headerPosition);
  if ($$props.overlapHeader === void 0 && $$bindings.overlapHeader && overlapHeader !== void 0)
    $$bindings.overlapHeader(overlapHeader);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  $$result.css.add(css);
  areas = headerPosition === "full" ? "'header header' 'aside main'" : "'aside header' 'aside main'";
  temporaryDrawer = browser ? !$mdScreen : false;
  $$unsubscribe_mdScreen();
  $$unsubscribe_showDrawer();
  return `<div class="${[
    escape(null_to_empty(cls("AppLayout", "grid grid-cols-[auto,1fr] grid-rows-[var(--headerHeight),1fr] h-screen", settingsClasses.root, classes.root, $$props.class)), true) + " svelte-4jdyeh",
    overlapHeader ? "overlapHeader" : ""
  ].join(" ").trim()}"${add_styles({
    "--headerHeight": `${headerHeight}px`,
    "--drawerWidth": `${$showDrawer ? navWidth : 0}px`,
    "--navWidth": `${navWidth}px`,
    "--areas": areas
  })}>${slots.default ? slots.default({}) : ``}  ${$showDrawer && temporaryDrawer ? `${validate_component(Backdrop, "Backdrop").$$render($$result, { class: "z-50" }, {}, {})}` : ``} <aside class="${escape(null_to_empty(cls("w-[var(--drawerWidth)] transition-all duration-500 overflow-hidden", temporaryDrawer && "fixed h-full z-50 elevation-10", settingsClasses.aside, classes.aside)), true) + " svelte-4jdyeh"}"><nav class="${escape(null_to_empty(cls("nav h-full overflow-auto w-[var(--navWidth)]", settingsClasses.nav, classes.nav)), true) + " svelte-4jdyeh"}">${slots.nav ? slots.nav({}) : ``}</nav></aside> </div>`;
});
const AppBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let titleString;
  let $$restProps = compute_rest_props($$props, ["title", "menuIcon", "head"]);
  let $$slots = compute_slots(slots);
  let $showDrawer, $$unsubscribe_showDrawer;
  $$unsubscribe_showDrawer = subscribe(showDrawer, (value) => $showDrawer = value);
  let { title = "" } = $$props;
  let { menuIcon = mdiMenu } = $$props;
  let { head = true } = $$props;
  const settingsClasses = getComponentClasses("AppBar");
  function toggleMenu() {
    set_store_value(showDrawer, $showDrawer = !$showDrawer, $showDrawer);
  }
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.menuIcon === void 0 && $$bindings.menuIcon && menuIcon !== void 0)
    $$bindings.menuIcon(menuIcon);
  if ($$props.head === void 0 && $$bindings.head && head !== void 0)
    $$bindings.head(head);
  titleString = Array.isArray(title) ? title.filter((x) => x).join(" › ") : title.toString();
  {
    if (browser && head) {
      document.title = titleString;
    }
  }
  $$unsubscribe_showDrawer();
  return `<header${add_attribute("class", cls("AppBar", "px-4 flex items-center relative z-50", settingsClasses.root, $$restProps.class), 0)}>${menuIcon ? `${slots.menuIcon ? slots.menuIcon({ toggleMenu, isMenuOpen: $showDrawer }) : ` ${validate_component(Button, "Button").$$render($$result, { icon: menuIcon, class: "p-3" }, {}, {})} `}` : ``} ${$$slots.title ? `${slots.title ? slots.title({}) : ``}` : `<div class="ml-2 text-lg font-medium">${typeof title === "string" || typeof title === "number" ? `${escape(title)}` : `${validate_component(Breadcrumb, "Breadcrumb").$$render($$result, { items: title, class: "gap-2" }, {}, {})}`}</div>`} ${slots.default ? slots.default({}) : ``} <div class="flex-1 grid justify-end">${slots.actions ? slots.actions({}) : ``}</div></header> ${$$result.head += `<!-- HEAD_svelte-1lwgfgo_START -->${head ? `${$$result.title = `<title>${escape(titleString)}</title>`, ""}` : ``}<!-- HEAD_svelte-1lwgfgo_END -->`, ""}`;
});
export {
  AppBar as A,
  AppLayout as a,
  showDrawer as s
};
