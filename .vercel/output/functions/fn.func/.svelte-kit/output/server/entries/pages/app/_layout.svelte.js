import { c as create_ssr_component, b as compute_slots, d as createEventDispatcher, v as validate_component, f as add_attribute, a as subscribe, e as escape } from "../../../chunks/ssr.js";
import { g as getComponentClasses, c as cls, m as mdScreen, a as matchMediaWidth } from "../../../chunks/theme.js";
import { mdiBell, mdiBellAlert, mdiCheckCircle, mdiAccount, mdiCog, mdiLock, mdiDotsVertical, mdiHome, mdiViewDashboard, mdiMap, mdiDevices, mdiFunction, mdiShieldLock } from "@mdi/js";
import { P as ProgressCircle, I as Icon, B as Button } from "../../../chunks/Button.js";
import { s as showDrawer, A as AppBar, a as AppLayout } from "../../../chunks/AppBar.js";
import { D as Dialog } from "../../../chunks/Dialog.js";
import { T as TextField } from "../../../chunks/TextField.js";
import { O as Overlay, A as Avatar } from "../../../chunks/Overlay.js";
import { T as Tooltip } from "../../../chunks/Tooltip.js";
import { M as Menu, a as MenuItem } from "../../../chunks/MenuItem.js";
import { T as Toggle } from "../../../chunks/Toggle.js";
import { B as Backdrop } from "../../../chunks/Backdrop.js";
import "../../../chunks/client.js";
import { w as writable } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
function url(currentUrl, path) {
  if (path == null) {
    return path;
  } else if (path.match(/^\.\.?\//)) {
    let [, breadcrumbs, relativePath] = path.match(/^([\.\/]+)(.*)/);
    let dir = currentUrl.pathname.replace(/\/$/, "");
    const traverse = breadcrumbs.match(/\.\.\//g) || [];
    traverse.forEach(() => dir = dir.replace(/\/[^\/]+\/?$/, ""));
    path = `${dir}/${relativePath}`.replace(/\/$/, "");
    path = path || "/";
  } else if (path.match(/^\//)) {
    return path;
  } else {
    return path;
  }
  return path;
}
function isActive(currentUrl, path) {
  if (path === "/") {
    return currentUrl.pathname === path;
  } else {
    return currentUrl.pathname.match(path + "($|\\/)") != null;
  }
}
const Drawer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$slots = compute_slots(slots);
  const dispatch = createEventDispatcher();
  let { open = true } = $$props;
  let { portal = true } = $$props;
  let { persistent = false } = $$props;
  let { loading = null } = $$props;
  let { placement = "right" } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Drawer");
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.portal === void 0 && $$bindings.portal && portal !== void 0)
    $$bindings.portal(portal);
  if ($$props.persistent === void 0 && $$bindings.persistent && persistent !== void 0)
    $$bindings.persistent(persistent);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0)
    $$bindings.loading(loading);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  {
    dispatch("change", { open });
  }
  {
    if (open === false) {
      dispatch("close", { open });
    }
  }
  return `${open ? `${validate_component(Backdrop, "Backdrop").$$render(
    $$result,
    {
      class: cls("z-50", settingsClasses.backdrop, classes.backdrop),
      portal
    },
    {},
    {}
  )} <div${add_attribute(
    "class",
    cls(
      "Drawer",
      "bg-surface-100 fixed overflow-auto transform z-50 outline-none",
      {
        "h-full": ["left", "right"].includes(placement),
        "w-full": ["top", "bottom"].includes(placement),
        "top-0": ["top", "left", "right"].includes(placement),
        "bottom-0": placement === "bottom",
        "left-0": ["top", "top", "bottom"].includes(placement),
        "right-0": placement === "right"
      },
      settingsClasses.root,
      classes.root,
      $$props.class
    ),
    0
  )}${add_attribute("style", $$props.style, 0)}>${loading ? `${validate_component(Overlay, "Overlay").$$render($$result, { center: true, class: "rounded" }, {}, {
    default: () => {
      return `${validate_component(ProgressCircle, "ProgressCircle").$$render($$result, {}, {}, {})}`;
    }
  })}` : ``} ${slots.default ? slots.default({ open }) : ``} ${$$slots.actions ? `<div${add_attribute("class", cls("actions fixed bottom-0 w-full flex justify-center bg-surface-content/5 p-1 border-t", settingsClasses.actions, classes.actions), 0)}>${slots.actions ? slots.actions({}) : ``}</div>` : ``}</div>` : ``}`;
});
const NavItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let isPathActive;
  let $$slots = compute_slots(slots);
  let $$unsubscribe_mdScreen;
  let $$unsubscribe_showDrawer;
  $$unsubscribe_mdScreen = subscribe(mdScreen, (value) => value);
  $$unsubscribe_showDrawer = subscribe(showDrawer, (value) => value);
  let { currentUrl } = $$props;
  let { path } = $$props;
  let { text = "" } = $$props;
  let { icon = null } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("NavItem");
  if ($$props.currentUrl === void 0 && $$bindings.currentUrl && currentUrl !== void 0)
    $$bindings.currentUrl(currentUrl);
  if ($$props.path === void 0 && $$bindings.path && path !== void 0)
    $$bindings.path(path);
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  isPathActive = path ? isActive(currentUrl, path) : false;
  $$unsubscribe_mdScreen();
  $$unsubscribe_showDrawer();
  return `<a${add_attribute("href", url(currentUrl, path), 0)}${add_attribute("class", cls("NavItem", "flex items-center", settingsClasses.root, isPathActive && ["is-active", settingsClasses.active, classes.active], classes.root, $$props.class), 0)}>${$$slots.avatar ? `${slots.avatar ? slots.avatar({}) : ``}` : ``} ${icon ? `${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      path: icon,
      class: cls("mr-3 flex-shrink-0", settingsClasses.icon, classes.icon)
    },
    {},
    {}
  )}` : ``} ${escape(text)} ${slots.default ? slots.default({}) : ``}</a>`;
});
const ResponsiveMenu = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $isLargeScreen, $$unsubscribe_isLargeScreen;
  let { open = true } = $$props;
  let { screenWidth = 768 } = $$props;
  let { menuProps = void 0 } = $$props;
  let { drawerProps = void 0 } = $$props;
  const isLargeScreen = matchMediaWidth(screenWidth);
  $$unsubscribe_isLargeScreen = subscribe(isLargeScreen, (value) => $isLargeScreen = value);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.screenWidth === void 0 && $$bindings.screenWidth && screenWidth !== void 0)
    $$bindings.screenWidth(screenWidth);
  if ($$props.menuProps === void 0 && $$bindings.menuProps && menuProps !== void 0)
    $$bindings.menuProps(menuProps);
  if ($$props.drawerProps === void 0 && $$bindings.drawerProps && drawerProps !== void 0)
    $$bindings.drawerProps(drawerProps);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${$isLargeScreen ? ` ${validate_component(Menu, "Menu").$$render(
      $$result,
      Object.assign(
        {},
        { explicitClose: true },
        menuProps,
        {
          class: cls("ResponsiveMenu", $$props.class, menuProps?.class)
        },
        { open }
      ),
      {
        open: ($$value) => {
          open = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${slots.default ? slots.default({ open }) : ``}`;
        }
      }
    )}` : `${validate_component(Drawer, "Drawer").$$render(
      $$result,
      Object.assign(
        {},
        { placement: "bottom" },
        drawerProps,
        {
          class: cls("ResponsiveMenu", $$props.class, drawerProps?.class)
        },
        { open }
      ),
      {
        open: ($$value) => {
          open = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${slots.default ? slots.default({ open }) : ``}`;
        }
      }
    )}`}`;
  } while (!$$settled);
  $$unsubscribe_isLargeScreen();
  return $$rendered;
});
const authState = writable();
const alertState = writable([]);
const cropWatchSVG = "/_app/immutable/assets/cropwatch.sj1ilCDV.svg";
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_authState;
  let $alertState, $$unsubscribe_alertState;
  $$unsubscribe_authState = subscribe(authState, (value) => value);
  $$unsubscribe_alertState = subscribe(alertState, (value) => $alertState = value);
  $$unsubscribe_authState();
  $$unsubscribe_alertState();
  return `${validate_component(AppBar, "AppBar").$$render(
    $$result,
    {
      class: "bg-emerald-700 text-white elevation-10"
    },
    {},
    {
      actions: () => {
        return `<div slot="actions" class="flex gap-1 md:gap-3">${validate_component(Tooltip, "Tooltip").$$render(
          $$result,
          {
            title: "Alerts",
            placement: "left",
            offset: 2
          },
          {},
          {
            default: () => {
              return `${validate_component(Toggle, "Toggle").$$render($$result, {}, {}, {
                default: ({ on: open, toggle }) => {
                  return `${validate_component(Button, "Button").$$render(
                    $$result,
                    {
                      icon: {
                        data: $alertState.length === 0 ? mdiBell : mdiBellAlert,
                        size: "1.5rem",
                        style: $alertState.length === 0 ? "color:white" : "color:#ecff06"
                      }
                    },
                    {},
                    {
                      default: () => {
                        return `${validate_component(Menu, "Menu").$$render($$result, { open }, {}, {
                          default: () => {
                            return `${$alertState.length === 0 ? `${validate_component(MenuItem, "MenuItem").$$render($$result, {}, {}, {
                              default: () => {
                                return `${validate_component(Icon, "Icon").$$render(
                                  $$result,
                                  {
                                    data: mdiCheckCircle,
                                    style: "color:green;"
                                  },
                                  {},
                                  {}
                                )} No new Alerts`;
                              }
                            })}` : ``}`;
                          }
                        })}`;
                      }
                    }
                  )}`;
                }
              })}`;
            }
          }
        )} ${validate_component(Tooltip, "Tooltip").$$render(
          $$result,
          {
            title: "User Management",
            placement: "left",
            offset: 2
          },
          {},
          {
            default: () => {
              return `${validate_component(Toggle, "Toggle").$$render($$result, {}, {}, {
                default: ({ on: open, toggle, toggleOff }) => {
                  return `${validate_component(Button, "Button").$$render($$result, {}, {}, {
                    default: () => {
                      return `${validate_component(Avatar, "Avatar").$$render(
                        $$result,
                        {
                          class: "bg-slate-100 text-emerald-700 font-bold"
                        },
                        {},
                        {
                          default: () => {
                            return `${validate_component(Icon, "Icon").$$render($$result, { data: mdiAccount, size: "35" }, {}, {})}`;
                          }
                        }
                      )} ${validate_component(ResponsiveMenu, "ResponsiveMenu").$$render($$result, { open }, {}, {
                        default: () => {
                          return `${validate_component(MenuItem, "MenuItem").$$render($$result, { icon: mdiCog, classes: { root: "p-4" } }, {}, {
                            default: () => {
                              return `Settings`;
                            }
                          })} ${validate_component(MenuItem, "MenuItem").$$render($$result, { icon: mdiLock, classes: { root: "p-4" } }, {}, {
                            default: () => {
                              return `Logout`;
                            }
                          })}`;
                        }
                      })} <div class="grid grid-col grid-rows-2 mx-3" data-svelte-h="svelte-1xeqtaa"><small>Kevin Cantrell</small> <small>Administrator</small></div> ${validate_component(Icon, "Icon").$$render($$result, { data: mdiDotsVertical }, {}, {})}`;
                    }
                  })}`;
                }
              })}`;
            }
          }
        )}</div>`;
      },
      title: () => {
        return `<div slot="title" class="flex" data-svelte-h="svelte-1cor8vz"><img${add_attribute("src", cropWatchSVG, 0)} class="mr-3 h-6 sm:h-9" alt="CropWatch Company Icon"> <span class="hidden md:inline-block translate-y-1/4">CropWatch </span> <span class="translate-y-1/4 hidden md:inline-block">Farming</span></div>`;
      }
    }
  )}`;
});
const feedbackOpenState = writable(false);
const css = {
  code: "#primary_nav.svelte-66gcfe{display:flex;flex-direction:column}",
  map: null
};
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let feedbackDialogOpen;
  let $feedbackOpenState, $$unsubscribe_feedbackOpenState;
  let $page, $$unsubscribe_page;
  $$unsubscribe_feedbackOpenState = subscribe(feedbackOpenState, (value) => $feedbackOpenState = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$result.css.add(css);
  feedbackDialogOpen = $feedbackOpenState;
  $$unsubscribe_feedbackOpenState();
  $$unsubscribe_page();
  return `${validate_component(AppLayout, "AppLayout").$$render($$result, { areas: "'header header' 'aside main'" }, {}, {
    nav: () => {
      return `<nav id="primary_nav" slot="nav" class="nav svelte-66gcfe">${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/",
          text: "Home",
          icon: mdiHome,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )} ${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/app/dashboard",
          text: "Dashboard",
          icon: mdiViewDashboard,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )} ${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/app/locations",
          text: "My Locations",
          icon: mdiMap,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )} ${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/app/devices",
          text: "My Devices",
          icon: mdiDevices,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )} ${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/",
          text: "Data Rules",
          icon: mdiFunction,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )} ${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/",
          text: "Permissions",
          icon: mdiShieldLock,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )} ${validate_component(NavItem, "NavItem").$$render(
        $$result,
        {
          path: "/app/settings",
          text: "Settings",
          icon: mdiCog,
          currentUrl: $page.url,
          class: "mt-2"
        },
        {},
        {}
      )}</nav>`;
    },
    default: () => {
      return `${validate_component(Header, "Header").$$render($$result, {}, {}, {})} <main class="scroll-smooth isolate"> <div class="p-2">${slots.default ? slots.default({}) : ``}</div></main>`;
    }
  })} ${validate_component(Dialog, "Dialog").$$render(
    $$result,
    {
      open: feedbackDialogOpen,
      persistent: true
    },
    {},
    {
      actions: () => {
        return `<div slot="actions">${validate_component(Button, "Button").$$render($$result, { variant: "fill", color: "primary" }, {}, {
          default: () => {
            return `Close`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "fill", color: "primary" }, {}, {
          default: () => {
            return `Submit Feedback`;
          }
        })}</div>`;
      },
      title: () => {
        return `<div slot="title" data-svelte-h="svelte-dzixs3">Have Feedback about this page?</div>`;
      },
      default: () => {
        return `<div class="flex flex-row gap-2 mb-2 p-4">${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `😭`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `😢`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `😞`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `🫤`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `😊`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `😀`;
          }
        })} ${validate_component(Button, "Button").$$render($$result, { variant: "outline" }, {}, {
          default: () => {
            return `😁`;
          }
        })}</div> ${validate_component(TextField, "TextField").$$render(
          $$result,
          {
            label: "Comment",
            multiline: true,
            classes: { root: "p-4" }
          },
          {},
          {}
        )}`;
      }
    }
  )}`;
});
export {
  Layout as default
};
