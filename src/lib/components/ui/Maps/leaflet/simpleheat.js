// simpleheat.js
export class SimpleHeat {
    constructor(i) {
        this._canvas = typeof i === "string" ? document.getElementById(i) : i;
        this._ctx = this._canvas.getContext("2d");
        this._width = this._canvas.width;
        this._height = this._canvas.height;
        this._max = 1;
        this.clear();
    }

    defaultRadius = 25;
    defaultGradient = {
        0.4: "blue",
        0.6: "cyan",
        0.7: "lime",
        0.8: "yellow",
        1: "red",
    };

    data(t) {
        this._data = t;
        return this;
    }

    max(t) {
        this._max = t;
        return this;
    }

    add(t) {
        this._data.push(t);
        return this;
    }

    clear() {
        this._data = [];
        return this;
    }

    radius(t, i = 15) {
        const a = (this._circle = document.createElement("canvas"));
        const s = a.getContext("2d");
        const e = (this._r = t + i);

        a.width = a.height = 2 * e;
        s.shadowOffsetX = s.shadowOffsetY = 200;
        s.shadowBlur = i;
        s.shadowColor = "black";
        s.beginPath();
        s.arc(e - 200, e - 200, t, 0, 2 * Math.PI, true);
        s.closePath();
        s.fill();

        return this;
    }

    gradient(t) {
        const i = document.createElement("canvas");
        const a = i.getContext("2d");
        const s = a.createLinearGradient(0, 0, 0, 256);

        i.width = 1;
        i.height = 256;

        for (let e in t) {
            s.addColorStop(e, t[e]);
        }

        a.fillStyle = s;
        a.fillRect(0, 0, 1, 256);
        this._grad = a.getImageData(0, 0, 1, 256).data;

        return this;
    }

    draw(t) {
        if (!this._circle) this.radius(this.defaultRadius);
        if (!this._grad) this.gradient(this.defaultGradient);

        const i = this._ctx;
        i.clearRect(0, 0, this._width, this._height);

        for (let s = 0; s < this._data.length; s++) {
            const a = this._data[s];
            i.globalAlpha = Math.max(a[2] / this._max, t || 0.05);
            i.drawImage(this._circle, a[0] - this._r, a[1] - this._r);
        }

        const n = i.getImageData(0, 0, this._width, this._height);
        this._colorize(n.data, this._grad);
        i.putImageData(n, 0, 0);

        return this;
    }

    _colorize(t, i) {
        for (let s = 3, e = t.length; s < e; s += 4) {
            const a = 4 * t[s];
            if (a) {
                t[s - 3] = i[a];
                t[s - 2] = i[a + 1];
                t[s - 1] = i[a + 2];
            }
        }
    }
}
