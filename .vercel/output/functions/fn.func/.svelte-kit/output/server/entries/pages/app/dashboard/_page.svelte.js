import { c as create_ssr_component, e as escape, v as validate_component, j as is_promise, k as noop } from "../../../../chunks/ssr.js";
import { mdiViewDashboard } from "@mdi/js";
import "../../../../chunks/theme.js";
import { I as Icon } from "../../../../chunks/Button.js";
import { A as Avatar } from "../../../../chunks/Overlay.js";
import { C as Card, H as Header } from "../../../../chunks/Card.js";
import { a as MenuItem } from "../../../../chunks/MenuItem.js";
import { C as CWStatCard } from "../../../../chunks/CWStatCard.js";
import "../../../../chunks/ticks.js";
import { Component, createRef, h } from "gridjs";
import "moment";
import { C as CWTable } from "../../../../chunks/CWTable.js";
const backgroundImg = "/_app/immutable/assets/breadcrumb-bg.BiAUSTCv.jpg";
function isFn(val) {
  return typeof val === "function";
}
class SvelteWrapper extends Component {
  constructor() {
    super(...arguments);
    this.ref = createRef();
    this.instance = null;
  }
  componentDidMount() {
    const { component: Component2, parentElement: _parentElement, parentProps: _parentProps, plugin: _plugin, ...props } = this.props;
    this.instance = new Component2({ target: this.ref.current, props });
  }
  componentDidUpdate() {
    if (isFn(this.instance.set)) {
      this.instance.set(this.props);
    }
  }
  componentWillUnmount() {
    if (isFn(this.instance.destroy)) {
      this.instance.destroy();
    }
  }
  render() {
    return h(this.props.parentElement, { ...this.props.parentProps, ref: this.ref });
  }
}
SvelteWrapper.defaultProps = {
  parentElement: "div",
  parentProps: {}
};
const css = {
  code: "@import 'https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css';",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  console.log(data);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  $$result.css.add(css);
  return `<h1 class="flex items-center text-2xl font-bold border-b mb-4 w-full text-white relative" style="${"left:-8px; top:-8px; background-image:url(" + escape(backgroundImg, true) + "); width:100%; height: 120px;"}"><div class="flex items-center space-x-2 ml-2"> ${validate_component(Icon, "Icon").$$render($$result, { data: mdiViewDashboard }, {}, {})} <span data-svelte-h="svelte-xyitl2">Dashboard</span></div></h1> <div class="grid grid-cols-1 md:grid-cols-3 gap-5">${validate_component(Card, "Card").$$render($$result, {}, {}, {
    contents: () => {
      return `<h1 class="text-4xl md:text-2xl lg:text-4xl text-gray-700" slot="contents">${escape(data.online.length)} / ${escape(data.online.length + data.offline.length)} Online</h1>`;
    },
    header: () => {
      return `${validate_component(Header, "Header").$$render(
        $$result,
        {
          title: "Device Status",
          subheading: "Subheading",
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
                  return `A`;
                }
              }
            )}</div>`;
          }
        }
      )}`;
    }
  })} ${validate_component(CWStatCard, "CWStatCard").$$render(
    $$result,
    {
      title: "Gateways Online",
      value: 3,
      notation: " Online",
      counterStartTime: null
    },
    {},
    {
      headerMore: () => {
        return `<div slot="headerMore">${validate_component(MenuItem, "MenuItem").$$render($$result, {}, {}, {
          default: () => {
            return `Give Feedback`;
          }
        })}</div>`;
      }
    }
  )} ${validate_component(CWStatCard, "CWStatCard").$$render($$result, { counterStartTime: null }, {}, {
    headerMore: () => {
      return `<div slot="headerMore">${validate_component(MenuItem, "MenuItem").$$render($$result, {}, {}, {
        default: () => {
          return `Give Feedback`;
        }
      })}</div>`;
    }
  })}</div> <div class="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5" data-svelte-h="svelte-1vfhfon"></div> ${validate_component(Card, "Card").$$render($$result, { class: "mt-10" }, {}, {
    default: () => {
      return ` ${function(__value) {
        if (is_promise(__value)) {
          __value.then(null, noop);
          return ` <div data-svelte-h="svelte-194gxkm">Loading...</div> `;
        }
        return function(sensorData) {
          return ` ${validate_component(CWTable, "CwTable").$$render($$result, { data: sensorData }, {}, {})} `;
        }(__value);
      }(data.sensors)}`;
    }
  })}`;
});
export {
  Page as default
};
