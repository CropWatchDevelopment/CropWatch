import { c as create_ssr_component, f as add_attribute, v as validate_component, b as compute_slots, p as onDestroy, s as setContext } from "./ssr.js";
import { mdiMinus, mdiCheck } from "@mdi/js";
import { u as uniqueId, I as Icon } from "./Button.js";
import { g as getComponentClasses, c as cls } from "./theme.js";
import "leaflet";
const Checkbox = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$slots = compute_slots(slots);
  let { id = uniqueId("checkbox-") } = $$props;
  let { name = "" } = $$props;
  let { value = void 0 } = $$props;
  let { checked = false } = $$props;
  let { group = null } = $$props;
  let { indeterminate = false } = $$props;
  let { disabled = false } = $$props;
  let { circle = false } = $$props;
  let { size = "sm" } = $$props;
  let { classes = {} } = $$props;
  const settingsClasses = getComponentClasses("Checkbox");
  function groupCheck() {
    checked = group.includes(value);
  }
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.name === void 0 && $$bindings.name && name !== void 0)
    $$bindings.name(name);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0)
    $$bindings.checked(checked);
  if ($$props.group === void 0 && $$bindings.group && group !== void 0)
    $$bindings.group(group);
  if ($$props.indeterminate === void 0 && $$bindings.indeterminate && indeterminate !== void 0)
    $$bindings.indeterminate(indeterminate);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.circle === void 0 && $$bindings.circle && circle !== void 0)
    $$bindings.circle(circle);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  {
    if (group !== null) {
      groupCheck();
    }
  }
  return `<div${add_attribute("class", cls("Checkbox", "inline-flex items-center", settingsClasses.root, classes.root, $$props.class), 0)}><input${add_attribute("id", id, 0)}${add_attribute("name", name, 0)} type="checkbox"${add_attribute("value", value, 0)} class="peer appearance-none absolute" ${disabled ? "disabled" : ""}${add_attribute("checked", checked, 1)}> <label${add_attribute("for", id, 0)}${add_attribute(
    "class",
    cls(
      "inline-grid place-items-center border-2",
      circle ? "rounded-full" : "rounded",
      "peer-disabled:opacity-50 transition-shadow duration-300",
      !disabled && "peer-hover:border-primary peer-focus-visible:border-primary peer-focus-visible:ring-2 ring-primary/60 ring-offset-1",
      !checked && !disabled && "peer-hover:bg-primary/10",
      checked ? disabled ? "bg-gray-500 border-gray-500" : "bg-primary border-primary" : "border-gray-500",
      settingsClasses.checkbox,
      classes.checkbox
    ),
    0
  )}>${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      path: indeterminate ? mdiMinus : mdiCheck,
      class: cls("pointer-events-none text-primary-content transition-transform", checked ? "scale-100" : "scale-0", settingsClasses.icon, classes.icon),
      size: {
        xs: ".75rem",
        // 12px
        sm: ".875rem",
        // 14px
        md: "1rem",
        // 16px
        lg: "1.125rem"
        // 18px
      }[size]
    },
    {},
    {}
  )}</label> ${$$slots.default ? `<label${add_attribute("for", id, 0)}${add_attribute(
    "class",
    cls(
      "peer-disabled:opacity-50 pl-1",
      {
        xs: "text-xs",
        // 12px
        sm: "text-sm",
        // 14px
        md: "text-md",
        // 16px
        lg: "text-lg"
        // 18px
      }[size],
      settingsClasses.label,
      classes.label
    ),
    0
  )}>${slots.default ? slots.default({}) : ``}</label>` : ``}</div>`;
});
if (typeof module !== "undefined")
  module.exports = simpleheat;
function simpleheat(canvas) {
  if (!(this instanceof simpleheat))
    return new simpleheat(canvas);
  this._canvas = canvas = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
  this._ctx = canvas.getContext("2d");
  this._width = canvas.width;
  this._height = canvas.height;
  this._max = 1;
  this._data = [];
}
simpleheat.prototype = {
  defaultRadius: 25,
  defaultGradient: {
    0.4: "blue",
    0.6: "cyan",
    0.7: "lime",
    0.8: "yellow",
    1: "red"
  },
  data: function(data) {
    this._data = data;
    return this;
  },
  max: function(max) {
    this._max = max;
    return this;
  },
  add: function(point) {
    this._data.push(point);
    return this;
  },
  clear: function() {
    this._data = [];
    return this;
  },
  radius: function(r, blur) {
    blur = blur === void 0 ? 15 : blur;
    var circle = this._circle = this._createCanvas(), ctx = circle.getContext("2d"), r2 = this._r = r + blur;
    circle.width = circle.height = r2 * 2;
    ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
    ctx.shadowBlur = blur;
    ctx.shadowColor = "black";
    ctx.beginPath();
    ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    return this;
  },
  resize: function() {
    this._width = this._canvas.width;
    this._height = this._canvas.height;
  },
  gradient: function(grad) {
    var canvas = this._createCanvas(), ctx = canvas.getContext("2d"), gradient = ctx.createLinearGradient(0, 0, 0, 256);
    canvas.width = 1;
    canvas.height = 256;
    for (var i in grad) {
      gradient.addColorStop(+i, grad[i]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);
    this._grad = ctx.getImageData(0, 0, 1, 256).data;
    return this;
  },
  draw: function(minOpacity) {
    if (!this._circle)
      this.radius(this.defaultRadius);
    if (!this._grad)
      this.gradient(this.defaultGradient);
    var ctx = this._ctx;
    ctx.clearRect(0, 0, this._width, this._height);
    for (var i = 0, len = this._data.length, p; i < len; i++) {
      p = this._data[i];
      ctx.globalAlpha = Math.min(Math.max(p[2] / this._max, minOpacity === void 0 ? 0.05 : minOpacity), 1);
      ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
    }
    var colored = ctx.getImageData(0, 0, this._width, this._height);
    this._colorize(colored.data, this._grad);
    ctx.putImageData(colored, 0, 0);
    return this;
  },
  _colorize: function(pixels, gradient) {
    for (var i = 0, len = pixels.length, j; i < len; i += 4) {
      j = pixels[i + 3] * 4;
      if (j) {
        pixels[i] = gradient[j];
        pixels[i + 1] = gradient[j + 1];
        pixels[i + 2] = gradient[j + 2];
      }
    }
  },
  _createCanvas: function() {
    if (typeof document !== "undefined") {
      return document.createElement("canvas");
    } else {
      return new this._canvas.constructor();
    }
  }
};
L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({
  // options: {
  //     minOpacity: 0.05,
  //     maxZoom: 18,
  //     radius: 25,
  //     blur: 15,
  //     max: 1.0
  // },
  initialize: function(latlngs, options) {
    this._latlngs = latlngs;
    L.setOptions(this, options);
  },
  setLatLngs: function(latlngs) {
    this._latlngs = latlngs;
    return this.redraw();
  },
  addLatLng: function(latlng) {
    this._latlngs.push(latlng);
    return this.redraw();
  },
  setOptions: function(options) {
    L.setOptions(this, options);
    if (this._heat) {
      this._updateOptions();
    }
    return this.redraw();
  },
  getBounds: function() {
    return L.latLngBounds(this._latlngs);
  },
  redraw: function() {
    if (this._heat && !this._frame && this._map && !this._map._animating) {
      this._frame = L.Util.requestAnimFrame(this._redraw, this);
    }
    return this;
  },
  onAdd: function(map) {
    this._map = map;
    if (!this._canvas) {
      this._initCanvas();
    }
    if (this.options.pane) {
      this.getPane().appendChild(this._canvas);
    } else {
      map._panes.overlayPane.appendChild(this._canvas);
    }
    map.on("moveend", this._reset, this);
    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.on("zoomanim", this._animateZoom, this);
    }
    this._reset();
  },
  onRemove: function(map) {
    if (this.options.pane) {
      this.getPane().removeChild(this._canvas);
    } else {
      map.getPanes().overlayPane.removeChild(this._canvas);
    }
    map.off("moveend", this._reset, this);
    if (map.options.zoomAnimation) {
      map.off("zoomanim", this._animateZoom, this);
    }
  },
  addTo: function(map) {
    map.addLayer(this);
    return this;
  },
  _initCanvas: function() {
    var canvas = this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer leaflet-layer");
    var originProp = L.DomUtil.testProp(["transformOrigin", "WebkitTransformOrigin", "msTransformOrigin"]);
    canvas.style[originProp] = "50% 50%";
    var size = this._map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    var animated = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(canvas, "leaflet-zoom-" + (animated ? "animated" : "hide"));
    this._heat = simpleheat(canvas);
    this._updateOptions();
  },
  _updateOptions: function() {
    this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);
    if (this.options.gradient) {
      this._heat.gradient(this.options.gradient);
    }
    if (this.options.max) {
      this._heat.max(this.options.max);
    }
  },
  _reset: function() {
    var topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    var size = this._map.getSize();
    if (this._heat._width !== size.x) {
      this._canvas.width = this._heat._width = size.x;
    }
    if (this._heat._height !== size.y) {
      this._canvas.height = this._heat._height = size.y;
    }
    this._redraw();
  },
  _redraw: function() {
    if (!this._map) {
      return;
    }
    var data = [], r = this._heat._r, size = this._map.getSize(), bounds = new L.Bounds(
      L.point([-r, -r]),
      size.add([r, r])
    ), max = this.options.max === void 0 ? 1 : this.options.max, maxZoom = this.options.maxZoom === void 0 ? this._map.getMaxZoom() : this.options.maxZoom, v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - this._map.getZoom(), 12))), cellSize = r / 2, grid = [], panePos = this._map._getMapPanePos(), offsetX = panePos.x % cellSize, offsetY = panePos.y % cellSize, i, len, p, cell, x, y, j, len2, k;
    for (i = 0, len = this._latlngs.length; i < len; i++) {
      p = this._map.latLngToContainerPoint(this._latlngs[i]);
      if (bounds.contains(p)) {
        x = Math.floor((p.x - offsetX) / cellSize) + 2;
        y = Math.floor((p.y - offsetY) / cellSize) + 2;
        var alt = this._latlngs[i].alt !== void 0 ? this._latlngs[i].alt : this._latlngs[i][2] !== void 0 ? +this._latlngs[i][2] : 1;
        k = alt * v;
        grid[y] = grid[y] || [];
        cell = grid[y][x];
        if (!cell) {
          grid[y][x] = [p.x, p.y, k];
        } else {
          cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k);
          cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k);
          cell[2] += k;
        }
      }
    }
    for (i = 0, len = grid.length; i < len; i++) {
      if (grid[i]) {
        for (j = 0, len2 = grid[i].length; j < len2; j++) {
          cell = grid[i][j];
          if (cell) {
            data.push([
              Math.round(cell[0]),
              Math.round(cell[1]),
              Math.min(cell[2], max)
            ]);
          }
        }
      }
    }
    this._heat.data(data).draw(this.options.minOpacity);
    this._frame = null;
  },
  _animateZoom: function(e) {
    var scale = this._map.getZoomScale(e.zoom), offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
    if (L.DomUtil.setTransform) {
      L.DomUtil.setTransform(this._canvas, offset, scale);
    } else {
      this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + " scale(" + scale + ")";
    }
  }
});
L.heatLayer = function(latlngs, options) {
  return new L.HeatLayer(latlngs, options);
};
const Leaflet = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { bounds = void 0 } = $$props;
  let { view = void 0 } = $$props;
  let { zoom = void 0 } = $$props;
  let { disableZoom = false } = $$props;
  let { width = 100 } = $$props;
  let { height = 100 } = $$props;
  let { heatMapLatLngs = [] } = $$props;
  let map;
  let mapElement;
  onDestroy(() => {
    map?.remove();
    map = void 0;
  });
  setContext("map", { getMap: () => map });
  if ($$props.bounds === void 0 && $$bindings.bounds && bounds !== void 0)
    $$bindings.bounds(bounds);
  if ($$props.view === void 0 && $$bindings.view && view !== void 0)
    $$bindings.view(view);
  if ($$props.zoom === void 0 && $$bindings.zoom && zoom !== void 0)
    $$bindings.zoom(zoom);
  if ($$props.disableZoom === void 0 && $$bindings.disableZoom && disableZoom !== void 0)
    $$bindings.disableZoom(disableZoom);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.heatMapLatLngs === void 0 && $$bindings.heatMapLatLngs && heatMapLatLngs !== void 0)
    $$bindings.heatMapLatLngs(heatMapLatLngs);
  {
    if (map) {
      if (bounds) {
        map.fitBounds(bounds);
      } else if (view && zoom) {
        if (view[0] && view[1])
          map.setView(view, zoom);
      }
    }
  }
  return `<div class="relative"${add_attribute("style", `width: ${width}px; height: ${height}px;`, 0)}${add_attribute("this", mapElement, 0)}>${map ? `${slots.default ? slots.default({}) : ``}` : ``}</div>`;
});
export {
  Checkbox as C,
  Leaflet as L
};
