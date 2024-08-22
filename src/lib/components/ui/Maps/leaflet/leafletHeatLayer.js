// leafletHeatLayer.js
import { SimpleHeat } from './simpleheat.js';

export class HeatLayer extends (L.Layer ? L.Layer : L.Class) {
    constructor(t, i) {
        super();
        this._latlngs = t;
        L.setOptions(this, i);
    }

    setLatLngs(t) {
        this._latlngs = t;
        return this.redraw();
    }

    addLatLng(t) {
        this._latlngs.push(t);
        return this.redraw();
    }

    setOptions(t) {
        L.setOptions(this, t);
        if (this._heat) {
            this._updateOptions();
        }
        return this.redraw();
    }

    redraw() {
        if (!this._heat || this._frame || this._map._animating) {
            return this;
        }

        this._frame = L.Util.requestAnimFrame(this._redraw, this);
        return this;
    }

    onAdd(t) {
        this._map = t;
        if (!this._canvas) this._initCanvas();

        t._panes.overlayPane.appendChild(this._canvas);
        t.on("moveend", this._reset, this);

        if (t.options.zoomAnimation && L.Browser.any3d) {
            t.on("zoomanim", this._animateZoom, this);
        }

        this._reset();
    }

    onRemove(t) {
        t.getPanes().overlayPane.removeChild(this._canvas);
        t.off("moveend", this._reset, this);

        if (t.options.zoomAnimation) {
            t.off("zoomanim", this._animateZoom, this);
        }
    }

    addTo(t) {
        t.addLayer(this);
        return this;
    }

    _initCanvas() {
        const t = (this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer leaflet-layer"));
        const i = L.DomUtil.testProp(["transformOrigin", "WebkitTransformOrigin", "msTransformOrigin"]);

        t.style[i] = "50% 50%";

        const a = this._map.getSize();
        t.width = a.x;
        t.height = a.y;

        const s = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(t, "leaflet-zoom-" + (s ? "animated" : "hide"));

        this._heat = new SimpleHeat(t);
        this._updateOptions();
    }

    _updateOptions() {
        this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);
        if (this.options.gradient) {
            this._heat.gradient(this.options.gradient);
        }
        if (this.options.max) {
            this._heat.max(this.options.max);
        }
    }

    _reset() {
        const t = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, t);

        const i = this._map.getSize();
        if (this._heat._width !== i.x) this._canvas.width = this._heat._width = i.x;
        if (this._heat._height !== i.y) this._canvas.height = this._heat._height = i.y;

        this._redraw();
    }

    _redraw() {
        const d = [];
        const _ = this._heat._r;
        const l = this._map.getSize();
        const m = new L.Bounds(L.point([-_, -_]), l.add([_, _]));
        const c = this.options.max ?? 1;
        const u = this.options.maxZoom ?? this._map.getMaxZoom();
        const f = 1 / Math.pow(2, Math.max(0, Math.min(u - this._map.getZoom(), 12)));
        const g = _ / 2;
        const p = [];
        const v = this._map._getMapPanePos();
        const w = v.x % g;
        const y = v.y % g;

        for (let t = 0, i = this._latlngs.length; t < i; t++) {
            const a = this._map.latLngToContainerPoint(this._latlngs[t]);
            if (!m.contains(a)) continue;

            const e = Math.floor((a.x - w) / g) + 2;
            const n = Math.floor((a.y - y) / g) + 2;
            const x = this._latlngs[t].alt ?? (this._latlngs[t][2] ? +this._latlngs[t][2] : 1);
            const r = x * f;

            p[n] = p[n] || [];
            const s = p[n][e];
            if (s) {
                s[0] = (s[0] * s[2] + a.x * r) / (s[2] + r);
                s[1] = (s[1] * s[2] + a.y * r) / (s[2] + r);
                s[2] += r;
            } else {
                p[n][e] = [a.x, a.y, r];
            }
        }

        for (let t = 0, i = p.length; t < i; t++) {
            if (!p[t]) continue;
            for (let h = 0, o = p[t].length; h < o; h++) {
                const s = p[t][h];
                if (s) {
                    d.push([Math.round(s[0]), Math.round(s[1]), Math.min(s[2], c)]);
                }
            }
        }

        this._heat.data(d).draw(this.options.minOpacity);
        this._frame = null;
    }

    _animateZoom(t) {
        const i = this._map.getZoomScale(t.zoom);
        const a = this._map._getCenterOffset(t.center)._multiplyBy(-i).subtract(this._map._getMapPanePos());

        L.DomUtil.setTransform ? L.DomUtil.setTransform(this._canvas, a, i) : this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(a) + " scale(" + i + ")";
    }
}

export function heatLayer(t, i) {
    return new HeatLayer(t, i);
}
