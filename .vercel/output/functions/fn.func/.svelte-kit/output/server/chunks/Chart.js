import { k as noop$1, A as assign, u as identity$2, c as create_ssr_component, a as subscribe, i as set_store_value, s as setContext, g as add_styles, f as add_attribute, o as getContext, e as escape, h as compute_rest_props, x as spread, y as escape_attribute_value, z as escape_object, l as each, v as validate_component, b as compute_slots, d as createEventDispatcher } from "./ssr.js";
import { m as memoize, g as getStringWidth, c as cls, f as format } from "./ticks.js";
import { pointRadial } from "d3-shape";
import { w as writable, d as derived } from "./index2.js";
import { scaleLinear, scaleSqrt, scaleBand } from "d3-scale";
import { n as isArray } from "./theme.js";
import { i as isSymbol, t as toString } from "./index4.js";
import { t as tick } from "./scheduler.js";
const is_client = typeof window !== "undefined";
let now = is_client ? () => window.performance.now() : () => Date.now();
let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop$1;
const tasks = /* @__PURE__ */ new Set();
function run_tasks(now2) {
  tasks.forEach((task) => {
    if (!task.c(now2)) {
      tasks.delete(task);
      task.f();
    }
  });
  if (tasks.size !== 0)
    raf(run_tasks);
}
function loop(callback) {
  let task;
  if (tasks.size === 0)
    raf(run_tasks);
  return {
    promise: new Promise((fulfill) => {
      tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      tasks.delete(task);
    }
  };
}
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function tick_spring(ctx, last_value, current_value, target_value) {
  if (typeof current_value === "number" || is_date(current_value)) {
    const delta = target_value - current_value;
    const velocity = (current_value - last_value) / (ctx.dt || 1 / 60);
    const spring2 = ctx.opts.stiffness * delta;
    const damper = ctx.opts.damping * velocity;
    const acceleration = (spring2 - damper) * ctx.inv_mass;
    const d = (velocity + acceleration) * ctx.dt;
    if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
      return target_value;
    } else {
      ctx.settled = false;
      return is_date(current_value) ? new Date(current_value.getTime() + d) : current_value + d;
    }
  } else if (Array.isArray(current_value)) {
    return current_value.map(
      (_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i])
    );
  } else if (typeof current_value === "object") {
    const next_value = {};
    for (const k in current_value) {
      next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
    }
    return next_value;
  } else {
    throw new Error(`Cannot spring ${typeof current_value} values`);
  }
}
function spring(value, opts = {}) {
  const store = writable(value);
  const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
  let last_time;
  let task;
  let current_token;
  let last_value = value;
  let target_value = value;
  let inv_mass = 1;
  let inv_mass_recovery_rate = 0;
  let cancel_task = false;
  function set(new_value, opts2 = {}) {
    target_value = new_value;
    const token = current_token = {};
    if (value == null || opts2.hard || spring2.stiffness >= 1 && spring2.damping >= 1) {
      cancel_task = true;
      last_time = now();
      last_value = new_value;
      store.set(value = target_value);
      return Promise.resolve();
    } else if (opts2.soft) {
      const rate = opts2.soft === true ? 0.5 : +opts2.soft;
      inv_mass_recovery_rate = 1 / (rate * 60);
      inv_mass = 0;
    }
    if (!task) {
      last_time = now();
      cancel_task = false;
      task = loop((now2) => {
        if (cancel_task) {
          cancel_task = false;
          task = null;
          return false;
        }
        inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
        const ctx = {
          inv_mass,
          opts: spring2,
          settled: true,
          dt: (now2 - last_time) * 60 / 1e3
        };
        const next_value = tick_spring(ctx, last_value, value, target_value);
        last_time = now2;
        last_value = value;
        store.set(value = next_value);
        if (ctx.settled) {
          task = null;
        }
        return !ctx.settled;
      });
    }
    return new Promise((fulfil) => {
      task.promise.then(() => {
        if (token === current_token)
          fulfil();
      });
    });
  }
  const spring2 = {
    set,
    update: (fn, opts2) => set(fn(target_value, value), opts2),
    subscribe: store.subscribe,
    stiffness,
    damping,
    precision
  };
  return spring2;
}
function get_interpolator(a, b) {
  if (a === b || a !== a)
    return () => a;
  const type = typeof a;
  if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    throw new Error("Cannot interpolate values of different type");
  }
  if (Array.isArray(a)) {
    const arr = b.map((bi, i) => {
      return get_interpolator(a[i], bi);
    });
    return (t) => arr.map((fn) => fn(t));
  }
  if (type === "object") {
    if (!a || !b)
      throw new Error("Object cannot be null");
    if (is_date(a) && is_date(b)) {
      a = a.getTime();
      b = b.getTime();
      const delta = b - a;
      return (t) => new Date(a + t * delta);
    }
    const keys = Object.keys(b);
    const interpolators = {};
    keys.forEach((key) => {
      interpolators[key] = get_interpolator(a[key], b[key]);
    });
    return (t) => {
      const result = {};
      keys.forEach((key) => {
        result[key] = interpolators[key](t);
      });
      return result;
    };
  }
  if (type === "number") {
    const delta = b - a;
    return (t) => a + t * delta;
  }
  throw new Error(`Cannot interpolate ${type} values`);
}
function tweened(value, defaults = {}) {
  const store = writable(value);
  let task;
  let target_value = value;
  function set(new_value, opts) {
    if (value == null) {
      store.set(value = new_value);
      return Promise.resolve();
    }
    target_value = new_value;
    let previous_task = task;
    let started = false;
    let {
      delay = 0,
      duration = 400,
      easing = identity$2,
      interpolate = get_interpolator
    } = assign(assign({}, defaults), opts);
    if (duration === 0) {
      if (previous_task) {
        previous_task.abort();
        previous_task = null;
      }
      store.set(value = target_value);
      return Promise.resolve();
    }
    const start = now() + delay;
    let fn;
    task = loop((now2) => {
      if (now2 < start)
        return true;
      if (!started) {
        fn = interpolate(value, new_value);
        if (typeof duration === "function")
          duration = duration(value, new_value);
        started = true;
      }
      if (previous_task) {
        previous_task.abort();
        previous_task = null;
      }
      const elapsed = now2 - start;
      if (elapsed > /** @type {number} */
      duration) {
        store.set(value = new_value);
        return false;
      }
      store.set(value = fn(easing(elapsed / duration)));
      return true;
    });
    return task.promise;
  }
  return {
    set,
    update: (fn, opts) => set(fn(target_value, value), opts),
    subscribe: store.subscribe
  };
}
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
}
var MAX_MEMOIZE_SIZE = 500;
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });
  var cache = result.cache;
  return result;
}
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
var reEscapeChar = /\\(\\)?/g;
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46) {
    result.push("");
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
  });
  return result;
});
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}
var INFINITY = 1 / 0;
function toKey(value) {
  if (typeof value == "string" || isSymbol(value)) {
    return value;
  }
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
function baseGet(object, path) {
  path = castPath(path, object);
  var index = 0, length = path.length;
  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return index && index == length ? object : void 0;
}
function get(object, path, defaultValue) {
  var result = object == null ? void 0 : baseGet(object, path);
  return result === void 0 ? defaultValue : result;
}
function ascending(a, b) {
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
function descending(a, b) {
  return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}
function bisector(f2) {
  let compare1, compare2, delta;
  if (f2.length !== 2) {
    compare1 = ascending;
    compare2 = (d, x) => ascending(f2(d), x);
    delta = (d, x) => f2(d) - x;
  } else {
    compare1 = f2 === ascending || f2 === descending ? f2 : zero;
    compare2 = f2;
    delta = f2;
  }
  function left(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0)
        return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) < 0)
          lo = mid + 1;
        else
          hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function right(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0)
        return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) <= 0)
          lo = mid + 1;
        else
          hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function center(a, x, lo = 0, hi = a.length) {
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }
  return { left, center, right };
}
function zero() {
  return 0;
}
function extent(values, valueof) {
  let min2;
  let max2;
  if (valueof === void 0) {
    for (const value of values) {
      if (value != null) {
        if (min2 === void 0) {
          if (value >= value)
            min2 = max2 = value;
        } else {
          if (min2 > value)
            min2 = value;
          if (max2 < value)
            max2 = value;
        }
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null) {
        if (min2 === void 0) {
          if (value >= value)
            min2 = max2 = value;
        } else {
          if (min2 > value)
            min2 = value;
          if (max2 < value)
            max2 = value;
        }
      }
    }
  }
  return [min2, max2];
}
class Adder {
  constructor() {
    this._partials = new Float64Array(32);
    this._n = 0;
  }
  add(x) {
    const p = this._partials;
    let i = 0;
    for (let j = 0; j < this._n && j < 32; j++) {
      const y = p[j], hi = x + y, lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
      if (lo)
        p[i++] = lo;
      x = hi;
    }
    p[i] = x;
    this._n = i + 1;
    return this;
  }
  valueOf() {
    const p = this._partials;
    let n = this._n, x, y, lo, hi = 0;
    if (n > 0) {
      hi = p[--n];
      while (n > 0) {
        x = hi;
        y = p[--n];
        hi = x + y;
        lo = y - (hi - x);
        if (lo)
          break;
      }
      if (n > 0 && (lo < 0 && p[n - 1] < 0 || lo > 0 && p[n - 1] > 0)) {
        y = lo * 2;
        x = hi + y;
        if (y == x - hi)
          hi = x;
      }
    }
    return hi;
  }
}
class InternSet extends Set {
  constructor(values, key = keyof) {
    super();
    Object.defineProperties(this, { _intern: { value: /* @__PURE__ */ new Map() }, _key: { value: key } });
    if (values != null)
      for (const value of values)
        this.add(value);
  }
  has(value) {
    return super.has(intern_get(this, value));
  }
  add(value) {
    return super.add(intern_set(this, value));
  }
  delete(value) {
    return super.delete(intern_delete(this, value));
  }
}
function intern_get({ _intern, _key }, value) {
  const key = _key(value);
  return _intern.has(key) ? _intern.get(key) : value;
}
function intern_set({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key))
    return _intern.get(key);
  _intern.set(key, value);
  return value;
}
function intern_delete({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key)) {
    value = _intern.get(key);
    _intern.delete(key);
  }
  return value;
}
function keyof(value) {
  return value !== null && typeof value === "object" ? value.valueOf() : value;
}
function max(values, valueof) {
  let max2;
  if (valueof === void 0) {
    for (const value of values) {
      if (value != null && (max2 < value || max2 === void 0 && value >= value)) {
        max2 = value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null && (max2 < value || max2 === void 0 && value >= value)) {
        max2 = value;
      }
    }
  }
  return max2;
}
function min(values, valueof) {
  let min2;
  if (valueof === void 0) {
    for (const value of values) {
      if (value != null && (min2 > value || min2 === void 0 && value >= value)) {
        min2 = value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null && (min2 > value || min2 === void 0 && value >= value)) {
        min2 = value;
      }
    }
  }
  return min2;
}
function greatest(values, compare = ascending) {
  let max2;
  let defined = false;
  if (compare.length === 1) {
    let maxValue;
    for (const element of values) {
      const value = compare(element);
      if (defined ? ascending(value, maxValue) > 0 : ascending(value, value) === 0) {
        max2 = element;
        maxValue = value;
        defined = true;
      }
    }
  } else {
    for (const value of values) {
      if (defined ? compare(value, max2) > 0 : compare(value, value) === 0) {
        max2 = value;
        defined = true;
      }
    }
  }
  return max2;
}
function* flatten(arrays) {
  for (const array of arrays) {
    yield* array;
  }
}
function merge(arrays) {
  return Array.from(flatten(arrays));
}
function canBeZero(val) {
  if (val === 0) {
    return true;
  }
  return val;
}
function makeAccessor(acc) {
  if (!canBeZero(acc))
    return null;
  if (Array.isArray(acc)) {
    return (d) => acc.map((k) => {
      return typeof k !== "function" ? d[k] : k(d);
    });
  } else if (typeof acc !== "function") {
    return (d) => d[acc];
  }
  return acc;
}
function fromEntries(iter) {
  const obj = {};
  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError("iterable for fromEntries should yield objects");
    }
    const { "0": key, "1": val } = pair;
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: val
    });
  }
  return obj;
}
function filterObject(obj, comparisonObj = {}) {
  return fromEntries(Object.entries(obj).filter(([key, value]) => {
    return value !== void 0 && comparisonObj[key] === void 0;
  }));
}
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
function calcUniques(data, fields, { sort = false } = {}) {
  if (!Array.isArray(data)) {
    throw new TypeError(`The first argument of calcUniques() must be an array. You passed in a ${typeof data}. If you got this error using the <LayerCake> component, consider passing a flat array to the \`flatData\` prop. More info: https://layercake.graphics/guide/#flatdata`);
  }
  if (Array.isArray(fields) || fields === void 0 || fields === null) {
    throw new TypeError("The second argument of calcUniques() must be an object with field names as keys as accessor functions as values.");
  }
  const uniques = {};
  const keys = Object.keys(fields);
  const kl = keys.length;
  let i;
  let j;
  let k;
  let s;
  let acc;
  let val;
  let set;
  const dl = data.length;
  for (i = 0; i < kl; i += 1) {
    set = new InternSet();
    s = keys[i];
    acc = fields[s];
    for (j = 0; j < dl; j += 1) {
      val = acc(data[j]);
      if (Array.isArray(val)) {
        const vl = val.length;
        for (k = 0; k < vl; k += 1) {
          set.add(val[k]);
        }
      } else {
        set.add(val);
      }
    }
    const results = Array.from(set);
    if (sort === true) {
      results.sort(ascending);
    }
    uniques[s] = results;
  }
  return uniques;
}
function calcExtents(data, fields) {
  if (!Array.isArray(data)) {
    throw new TypeError(`The first argument of calcExtents() must be an array. You passed in a ${typeof data}. If you got this error using the <LayerCake> component, consider passing a flat array to the \`flatData\` prop. More info: https://layercake.graphics/guide/#flatdata`);
  }
  if (Array.isArray(fields) || fields === void 0 || fields === null) {
    throw new TypeError("The second argument of calcExtents() must be an object with field names as keys as accessor functions as values.");
  }
  const extents = {};
  const keys = Object.keys(fields);
  const kl = keys.length;
  let i;
  let j;
  let k;
  let s;
  let min2;
  let max2;
  let acc;
  let val;
  const dl = data.length;
  for (i = 0; i < kl; i += 1) {
    s = keys[i];
    acc = fields[s];
    min2 = null;
    max2 = null;
    for (j = 0; j < dl; j += 1) {
      val = acc(data[j]);
      if (Array.isArray(val)) {
        const vl = val.length;
        for (k = 0; k < vl; k += 1) {
          if (val[k] !== false && val[k] !== void 0 && val[k] !== null && Number.isNaN(val[k]) === false) {
            if (min2 === null || val[k] < min2) {
              min2 = val[k];
            }
            if (max2 === null || val[k] > max2) {
              max2 = val[k];
            }
          }
        }
      } else if (val !== false && val !== void 0 && val !== null && Number.isNaN(val) === false) {
        if (min2 === null || val < min2) {
          min2 = val;
        }
        if (max2 === null || val > max2) {
          max2 = val;
        }
      }
    }
    extents[s] = [min2, max2];
  }
  return extents;
}
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length)
    return false;
  return arr1.every((k) => {
    return arr2.includes(k);
  });
}
function isOrdinalDomain(scale) {
  if (typeof scale.bandwidth === "function") {
    return true;
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "unknown", "copy"])) {
    return true;
  }
  return false;
}
function calcScaleExtents(flatData, getters, activeScales) {
  const scaleGroups = Object.keys(activeScales).reduce((groups, k) => {
    const domainType = isOrdinalDomain(activeScales[k]) === true ? "ordinal" : "other";
    if (!groups[domainType])
      groups[domainType] = {};
    groups[domainType][k] = getters[k];
    return groups;
  }, { ordinal: false, other: false });
  let extents = {};
  if (scaleGroups.ordinal) {
    extents = calcUniques(flatData, scaleGroups.ordinal, { sort: true });
  }
  if (scaleGroups.other) {
    extents = { ...extents, ...calcExtents(flatData, scaleGroups.other) };
  }
  return extents;
}
function partialDomain(domain = [], directive) {
  if (Array.isArray(directive) === true) {
    return directive.map((d, i) => {
      if (d === null) {
        return domain[i];
      }
      return d;
    });
  }
  return domain;
}
function calcDomain(s) {
  return function domainCalc([$extents, $domain]) {
    if (typeof $domain === "function") {
      $domain = $domain($extents[s]);
    }
    return $extents ? partialDomain($extents[s], $domain) : $domain;
  };
}
const defaultScales = {
  x: scaleLinear,
  y: scaleLinear,
  z: scaleLinear,
  r: scaleSqrt
};
function findScaleType(scale) {
  if (scale.constant) {
    return "symlog";
  }
  if (scale.base) {
    return "log";
  }
  if (scale.exponent) {
    if (scale.exponent() === 0.5) {
      return "sqrt";
    }
    return "pow";
  }
  return "other";
}
function identity$1(d) {
  return d;
}
function log$1(sign2) {
  return (x) => Math.log(sign2 * x);
}
function exp$1(sign2) {
  return (x) => sign2 * Math.exp(x);
}
function symlog(c) {
  return (x) => Math.sign(x) * Math.log1p(Math.abs(x / c));
}
function symexp(c) {
  return (x) => Math.sign(x) * Math.expm1(Math.abs(x)) * c;
}
function pow$1(exponent) {
  return function powFn(x) {
    return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
  };
}
function getPadFunctions(scale) {
  const scaleType = findScaleType(scale);
  if (scaleType === "log") {
    const sign2 = Math.sign(scale.domain()[0]);
    return { lift: log$1(sign2), ground: exp$1(sign2), scaleType };
  }
  if (scaleType === "pow") {
    const exponent = 1;
    return { lift: pow$1(exponent), ground: pow$1(1 / exponent), scaleType };
  }
  if (scaleType === "sqrt") {
    const exponent = 0.5;
    return { lift: pow$1(exponent), ground: pow$1(1 / exponent), scaleType };
  }
  if (scaleType === "symlog") {
    const constant = 1;
    return { lift: symlog(constant), ground: symexp(constant), scaleType };
  }
  return { lift: identity$1, ground: identity$1, scaleType };
}
function toTitleCase(str) {
  return str.replace(/^\w/, (d) => d.toUpperCase());
}
function f(name, modifier = "") {
  return `scale${toTitleCase(modifier)}${toTitleCase(name)}`;
}
function findScaleName(scale) {
  if (typeof scale.bandwidth === "function") {
    if (typeof scale.paddingInner === "function") {
      return f("band");
    }
    return f("point");
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "unknown", "copy"])) {
    return f("ordinal");
  }
  let modifier = "";
  if (scale.interpolator) {
    if (scale.domain().length === 3) {
      modifier = "diverging";
    } else {
      modifier = "sequential";
    }
  }
  if (scale.quantiles) {
    return f("quantile", modifier);
  }
  if (scale.thresholds) {
    return f("quantize", modifier);
  }
  if (scale.constant) {
    return f("symlog", modifier);
  }
  if (scale.base) {
    return f("log", modifier);
  }
  if (scale.exponent) {
    if (scale.exponent() === 0.5) {
      return f("sqrt", modifier);
    }
    return f("pow", modifier);
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "invertExtent", "unknown", "copy"])) {
    return f("threshold");
  }
  if (arraysEqual(Object.keys(scale), ["invert", "range", "domain", "unknown", "copy", "ticks", "tickFormat", "nice"])) {
    return f("identity");
  }
  if (arraysEqual(Object.keys(scale), [
    "invert",
    "domain",
    "range",
    "rangeRound",
    "round",
    "clamp",
    "unknown",
    "copy",
    "ticks",
    "tickFormat",
    "nice"
  ])) {
    return f("radial");
  }
  if (modifier) {
    return f(modifier);
  }
  if (scale.domain()[0] instanceof Date) {
    const d = /* @__PURE__ */ new Date();
    let s;
    d.getDay = () => s = "time";
    d.getUTCDay = () => s = "utc";
    scale.tickFormat(0, "%a")(d);
    return f(s);
  }
  return f("linear");
}
const unpaddable = ["scaleThreshold", "scaleQuantile", "scaleQuantize", "scaleSequentialQuantile"];
function padScale(scale, padding) {
  if (typeof scale.range !== "function") {
    console.log(scale);
    throw new Error("Scale method `range` must be a function");
  }
  if (typeof scale.domain !== "function") {
    throw new Error("Scale method `domain` must be a function");
  }
  if (!Array.isArray(padding) || unpaddable.includes(findScaleName(scale))) {
    return scale.domain();
  }
  if (isOrdinalDomain(scale) === true) {
    return scale.domain();
  }
  const { lift, ground } = getPadFunctions(scale);
  const d0 = scale.domain()[0];
  const isTime = Object.prototype.toString.call(d0) === "[object Date]";
  const [d1, d2] = scale.domain().map((d) => {
    return isTime ? lift(d.getTime()) : lift(d);
  });
  const [r1, r2] = scale.range();
  const paddingLeft = padding[0] || 0;
  const paddingRight = padding[1] || 0;
  const step = (d2 - d1) / (Math.abs(r2 - r1) - paddingLeft - paddingRight);
  return [d1 - paddingLeft * step, paddingRight * step + d2].map((d) => {
    return isTime ? ground(new Date(d)) : ground(d);
  });
}
function calcBaseRange(s, width, height, reverse, percentRange) {
  let min2;
  let max2;
  if (percentRange === true) {
    min2 = 0;
    max2 = 100;
  } else {
    min2 = s === "r" ? 1 : 0;
    max2 = s === "y" ? height : s === "r" ? 25 : width;
  }
  return reverse === true ? [max2, min2] : [min2, max2];
}
function getDefaultRange(s, width, height, reverse, range, percentRange) {
  return !range ? calcBaseRange(s, width, height, reverse, percentRange) : typeof range === "function" ? range({ width, height }) : range;
}
function createScale(s) {
  return function scaleCreator([$scale, $extents, $domain, $padding, $nice, $reverse, $width, $height, $range, $percentScale]) {
    if ($extents === null) {
      return null;
    }
    const defaultRange = getDefaultRange(s, $width, $height, $reverse, $range, $percentScale);
    const scale = $scale === defaultScales[s] ? $scale() : $scale.copy();
    scale.domain($domain);
    if (!scale.interpolator || typeof scale.interpolator === "function" && scale.interpolator().name.startsWith("identity")) {
      scale.range(defaultRange);
    }
    if ($padding) {
      scale.domain(padScale(scale, $padding));
    }
    if ($nice === true || typeof $nice === "number") {
      if (typeof scale.nice === "function") {
        scale.nice(typeof $nice === "number" ? $nice : void 0);
      } else {
        console.error(`[Layer Cake] You set \`${s}Nice: true\` but the ${s}Scale does not have a \`.nice\` method. Ignoring...`);
      }
    }
    return scale;
  };
}
function createGetter([$acc, $scale]) {
  return (d) => {
    const val = $acc(d);
    if (Array.isArray(val)) {
      return val.map((v) => $scale(v));
    }
    return $scale(val);
  };
}
function getRange([$scale]) {
  if (typeof $scale === "function") {
    if (typeof $scale.range === "function") {
      return $scale.range();
    }
    console.error("[LayerCake] Your scale doesn't have a `.range` method?");
  }
  return null;
}
function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition)
    prototype[key] = definition[key];
  return prototype;
}
function Color() {
}
var darker = 0.7;
var brighter = 1 / darker;
var reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
var named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format2) {
  var m, l;
  format2 = (format2 + "").trim().toLowerCase();
  return (m = reHex.exec(format2)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format2)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format2)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format2)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format2)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format2) ? rgbn(named[format2]) : format2 === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a) {
  if (a <= 0)
    r = g = b = NaN;
  return new Rgb(r, g, b, a);
}
function rgbConvert(o) {
  if (!(o instanceof Color))
    o = color(o);
  if (!o)
    return new Rgb();
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}
function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}
function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}
define(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h, s, l, a) {
  if (a <= 0)
    h = s = l = NaN;
  else if (l <= 0 || l >= 1)
    h = s = NaN;
  else if (s <= 0)
    h = NaN;
  return new Hsl(h, s, l, a);
}
function hslConvert(o) {
  if (o instanceof Hsl)
    return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color))
    o = color(o);
  if (!o)
    return new Hsl();
  if (o instanceof Hsl)
    return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min2 = Math.min(r, g, b), max2 = Math.max(r, g, b), h = NaN, s = max2 - min2, l = (max2 + min2) / 2;
  if (s) {
    if (r === max2)
      h = (g - b) / s + (g < b) * 6;
    else if (g === max2)
      h = (b - r) / s + 2;
    else
      h = (r - g) / s + 4;
    s /= l < 0.5 ? max2 + min2 : 2 - max2 - min2;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}
function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}
function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}
define(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));
function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
}
const indent = "    ";
function getRgb(clr) {
  const { r, g, b, opacity: o } = rgb(clr);
  if (![r, g, b].every((c) => c >= 0 && c <= 255)) {
    return false;
  }
  return { r, g, b, o };
}
function contrast({ r, g, b }) {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "black" : "white";
}
function printDebug(obj) {
  console.log("/********* LayerCake Debug ************/");
  console.log("Bounding box:");
  printObject(obj.boundingBox);
  console.log("Scales:\n");
  Object.keys(obj.activeGetters).forEach((g) => {
    printScale(g, obj[`${g}Scale`], obj[g]);
  });
  console.log("/************ End LayerCake Debug ***************/\n");
}
function printObject(obj) {
  Object.entries(obj).forEach(([key, value]) => {
    console.log(`${indent}${key}:`, value);
  });
}
function printScale(s, scale, acc) {
  const scaleName = findScaleName(scale);
  console.log(`${indent}${s}:`);
  console.log(`${indent}${indent}Accessor: "${acc.toString()}"`);
  console.log(`${indent}${indent}Type: ${scaleName}`);
  printValues(scale, "domain");
  printValues(scale, "range", " ");
}
function printValues(scale, method, extraSpace = "") {
  const values = scale[method]();
  const colorValues = colorizeArray(values);
  if (colorValues) {
    printColorArray(colorValues, method, values);
  } else {
    console.log(`${indent}${indent}${toTitleCase(method)}:${extraSpace}`, values);
  }
}
function printColorArray(colorValues, method, values) {
  console.log(
    `${indent}${indent}${toTitleCase(method)}:    %cArray%c(${values.length}) ` + colorValues[0] + "%c ]",
    "color: #1377e4",
    "color: #737373",
    "color: #1478e4",
    ...colorValues[1],
    "color: #1478e4"
  );
}
function colorizeArray(arr) {
  const colors = [];
  const a = arr.map((d, i) => {
    const rgbo = getRgb(d);
    if (rgbo !== false) {
      colors.push(rgbo);
      const space = i === arr.length - 1 ? " " : "";
      return `%c ${d}${space}`;
    }
    return d;
  });
  if (colors.length) {
    return [
      `%c[ ${a.join(", ")}`,
      colors.map(
        (d) => `background-color: rgba(${d.r}, ${d.g}, ${d.b}, ${d.o}); color:${contrast(d)};`
      )
    ];
  }
  return null;
}
const css$2 = {
  code: ".layercake-container.svelte-vhzpsp,.layercake-container.svelte-vhzpsp *{box-sizing:border-box}.layercake-container.svelte-vhzpsp{width:100%;height:100%}",
  map: null
};
const LayerCake = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let yReverseValue;
  let context;
  let $rScale_d, $$unsubscribe_rScale_d;
  let $zScale_d, $$unsubscribe_zScale_d;
  let $yScale_d, $$unsubscribe_yScale_d;
  let $xScale_d, $$unsubscribe_xScale_d;
  let $activeGetters_d, $$unsubscribe_activeGetters_d;
  let $box_d, $$unsubscribe_box_d;
  let $_config, $$unsubscribe__config;
  let $_custom, $$unsubscribe__custom;
  let $_rScale, $$unsubscribe__rScale;
  let $_zScale, $$unsubscribe__zScale;
  let $_yScale, $$unsubscribe__yScale;
  let $_xScale, $$unsubscribe__xScale;
  let $_rRange, $$unsubscribe__rRange;
  let $_zRange, $$unsubscribe__zRange;
  let $_yRange, $$unsubscribe__yRange;
  let $_xRange, $$unsubscribe__xRange;
  let $_rPadding, $$unsubscribe__rPadding;
  let $_zPadding, $$unsubscribe__zPadding;
  let $_yPadding, $$unsubscribe__yPadding;
  let $_xPadding, $$unsubscribe__xPadding;
  let $_rReverse, $$unsubscribe__rReverse;
  let $_zReverse, $$unsubscribe__zReverse;
  let $_yReverse, $$unsubscribe__yReverse;
  let $_xReverse, $$unsubscribe__xReverse;
  let $_rNice, $$unsubscribe__rNice;
  let $_zNice, $$unsubscribe__zNice;
  let $_yNice, $$unsubscribe__yNice;
  let $_xNice, $$unsubscribe__xNice;
  let $_rDomain, $$unsubscribe__rDomain;
  let $_zDomain, $$unsubscribe__zDomain;
  let $_yDomain, $$unsubscribe__yDomain;
  let $_xDomain, $$unsubscribe__xDomain;
  let $_r, $$unsubscribe__r;
  let $_z, $$unsubscribe__z;
  let $_y, $$unsubscribe__y;
  let $_x, $$unsubscribe__x;
  let $_padding, $$unsubscribe__padding;
  let $_flatData, $$unsubscribe__flatData;
  let $_data, $$unsubscribe__data;
  let $_extents, $$unsubscribe__extents;
  let $_containerHeight, $$unsubscribe__containerHeight;
  let $_containerWidth, $$unsubscribe__containerWidth;
  let $_percentRange, $$unsubscribe__percentRange;
  let $width_d, $$unsubscribe_width_d;
  let $height_d, $$unsubscribe_height_d;
  let $aspectRatio_d, $$unsubscribe_aspectRatio_d;
  let $padding_d, $$unsubscribe_padding_d;
  let $extents_d, $$unsubscribe_extents_d;
  let $xDomain_d, $$unsubscribe_xDomain_d;
  let $yDomain_d, $$unsubscribe_yDomain_d;
  let $zDomain_d, $$unsubscribe_zDomain_d;
  let $rDomain_d, $$unsubscribe_rDomain_d;
  let $xRange_d, $$unsubscribe_xRange_d;
  let $yRange_d, $$unsubscribe_yRange_d;
  let $zRange_d, $$unsubscribe_zRange_d;
  let $rRange_d, $$unsubscribe_rRange_d;
  let $xGet_d, $$unsubscribe_xGet_d;
  let $yGet_d, $$unsubscribe_yGet_d;
  let $zGet_d, $$unsubscribe_zGet_d;
  let $rGet_d, $$unsubscribe_rGet_d;
  const printDebug_debounced = debounce(printDebug, 200);
  let { ssr = false } = $$props;
  let { pointerEvents = true } = $$props;
  let { position = "relative" } = $$props;
  let { percentRange = false } = $$props;
  let { width = void 0 } = $$props;
  let { height = void 0 } = $$props;
  let { containerWidth = width || 100 } = $$props;
  let { containerHeight = height || 100 } = $$props;
  let { element = void 0 } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { z = void 0 } = $$props;
  let { r = void 0 } = $$props;
  let { data = [] } = $$props;
  let { xDomain = void 0 } = $$props;
  let { yDomain = void 0 } = $$props;
  let { zDomain = void 0 } = $$props;
  let { rDomain = void 0 } = $$props;
  let { xNice = false } = $$props;
  let { yNice = false } = $$props;
  let { zNice = false } = $$props;
  let { rNice = false } = $$props;
  let { xPadding = void 0 } = $$props;
  let { yPadding = void 0 } = $$props;
  let { zPadding = void 0 } = $$props;
  let { rPadding = void 0 } = $$props;
  let { xScale = defaultScales.x } = $$props;
  let { yScale = defaultScales.y } = $$props;
  let { zScale = defaultScales.z } = $$props;
  let { rScale = defaultScales.r } = $$props;
  let { xRange = void 0 } = $$props;
  let { yRange = void 0 } = $$props;
  let { zRange = void 0 } = $$props;
  let { rRange = void 0 } = $$props;
  let { xReverse = false } = $$props;
  let { yReverse = void 0 } = $$props;
  let { zReverse = false } = $$props;
  let { rReverse = false } = $$props;
  let { padding = {} } = $$props;
  let { extents = {} } = $$props;
  let { flatData = void 0 } = $$props;
  let { custom = {} } = $$props;
  let { debug = false } = $$props;
  let isMounted = false;
  const config = {};
  const _percentRange = writable(percentRange);
  $$unsubscribe__percentRange = subscribe(_percentRange, (value) => $_percentRange = value);
  const _containerWidth = writable(containerWidth);
  $$unsubscribe__containerWidth = subscribe(_containerWidth, (value) => $_containerWidth = value);
  const _containerHeight = writable(containerHeight);
  $$unsubscribe__containerHeight = subscribe(_containerHeight, (value) => $_containerHeight = value);
  const _extents = writable(filterObject(extents));
  $$unsubscribe__extents = subscribe(_extents, (value) => $_extents = value);
  const _data = writable(data);
  $$unsubscribe__data = subscribe(_data, (value) => $_data = value);
  const _flatData = writable(flatData || data);
  $$unsubscribe__flatData = subscribe(_flatData, (value) => $_flatData = value);
  const _padding = writable(padding);
  $$unsubscribe__padding = subscribe(_padding, (value) => $_padding = value);
  const _x = writable(makeAccessor(x));
  $$unsubscribe__x = subscribe(_x, (value) => $_x = value);
  const _y = writable(makeAccessor(y));
  $$unsubscribe__y = subscribe(_y, (value) => $_y = value);
  const _z = writable(makeAccessor(z));
  $$unsubscribe__z = subscribe(_z, (value) => $_z = value);
  const _r = writable(makeAccessor(r));
  $$unsubscribe__r = subscribe(_r, (value) => $_r = value);
  const _xDomain = writable(xDomain);
  $$unsubscribe__xDomain = subscribe(_xDomain, (value) => $_xDomain = value);
  const _yDomain = writable(yDomain);
  $$unsubscribe__yDomain = subscribe(_yDomain, (value) => $_yDomain = value);
  const _zDomain = writable(zDomain);
  $$unsubscribe__zDomain = subscribe(_zDomain, (value) => $_zDomain = value);
  const _rDomain = writable(rDomain);
  $$unsubscribe__rDomain = subscribe(_rDomain, (value) => $_rDomain = value);
  const _xNice = writable(xNice);
  $$unsubscribe__xNice = subscribe(_xNice, (value) => $_xNice = value);
  const _yNice = writable(yNice);
  $$unsubscribe__yNice = subscribe(_yNice, (value) => $_yNice = value);
  const _zNice = writable(zNice);
  $$unsubscribe__zNice = subscribe(_zNice, (value) => $_zNice = value);
  const _rNice = writable(rNice);
  $$unsubscribe__rNice = subscribe(_rNice, (value) => $_rNice = value);
  const _xReverse = writable(xReverse);
  $$unsubscribe__xReverse = subscribe(_xReverse, (value) => $_xReverse = value);
  const _yReverse = writable(yReverseValue);
  $$unsubscribe__yReverse = subscribe(_yReverse, (value) => $_yReverse = value);
  const _zReverse = writable(zReverse);
  $$unsubscribe__zReverse = subscribe(_zReverse, (value) => $_zReverse = value);
  const _rReverse = writable(rReverse);
  $$unsubscribe__rReverse = subscribe(_rReverse, (value) => $_rReverse = value);
  const _xPadding = writable(xPadding);
  $$unsubscribe__xPadding = subscribe(_xPadding, (value) => $_xPadding = value);
  const _yPadding = writable(yPadding);
  $$unsubscribe__yPadding = subscribe(_yPadding, (value) => $_yPadding = value);
  const _zPadding = writable(zPadding);
  $$unsubscribe__zPadding = subscribe(_zPadding, (value) => $_zPadding = value);
  const _rPadding = writable(rPadding);
  $$unsubscribe__rPadding = subscribe(_rPadding, (value) => $_rPadding = value);
  const _xRange = writable(xRange);
  $$unsubscribe__xRange = subscribe(_xRange, (value) => $_xRange = value);
  const _yRange = writable(yRange);
  $$unsubscribe__yRange = subscribe(_yRange, (value) => $_yRange = value);
  const _zRange = writable(zRange);
  $$unsubscribe__zRange = subscribe(_zRange, (value) => $_zRange = value);
  const _rRange = writable(rRange);
  $$unsubscribe__rRange = subscribe(_rRange, (value) => $_rRange = value);
  const _xScale = writable(xScale);
  $$unsubscribe__xScale = subscribe(_xScale, (value) => $_xScale = value);
  const _yScale = writable(yScale);
  $$unsubscribe__yScale = subscribe(_yScale, (value) => $_yScale = value);
  const _zScale = writable(zScale);
  $$unsubscribe__zScale = subscribe(_zScale, (value) => $_zScale = value);
  const _rScale = writable(rScale);
  $$unsubscribe__rScale = subscribe(_rScale, (value) => $_rScale = value);
  const _config = writable(config);
  $$unsubscribe__config = subscribe(_config, (value) => $_config = value);
  const _custom = writable(custom);
  $$unsubscribe__custom = subscribe(_custom, (value) => $_custom = value);
  const activeGetters_d = derived([_x, _y, _z, _r], ([$x, $y, $z, $r]) => {
    const obj = {};
    if ($x) {
      obj.x = $x;
    }
    if ($y) {
      obj.y = $y;
    }
    if ($z) {
      obj.z = $z;
    }
    if ($r) {
      obj.r = $r;
    }
    return obj;
  });
  $$unsubscribe_activeGetters_d = subscribe(activeGetters_d, (value) => $activeGetters_d = value);
  const padding_d = derived([_padding, _containerWidth, _containerHeight], ([$padding]) => {
    const defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };
    return Object.assign(defaultPadding, $padding);
  });
  $$unsubscribe_padding_d = subscribe(padding_d, (value) => $padding_d = value);
  const box_d = derived([_containerWidth, _containerHeight, padding_d], ([$containerWidth, $containerHeight, $padding]) => {
    const b = {};
    b.top = $padding.top;
    b.right = $containerWidth - $padding.right;
    b.bottom = $containerHeight - $padding.bottom;
    b.left = $padding.left;
    b.width = b.right - b.left;
    b.height = b.bottom - b.top;
    if (b.width <= 0 && isMounted === true) {
      console.warn("[LayerCake] Target div has zero or negative width. Did you forget to set an explicit width in CSS on the container?");
    }
    if (b.height <= 0 && isMounted === true) {
      console.warn("[LayerCake] Target div has zero or negative height. Did you forget to set an explicit height in CSS on the container?");
    }
    return b;
  });
  $$unsubscribe_box_d = subscribe(box_d, (value) => $box_d = value);
  const width_d = derived([box_d], ([$box]) => {
    return $box.width;
  });
  $$unsubscribe_width_d = subscribe(width_d, (value) => $width_d = value);
  const height_d = derived([box_d], ([$box]) => {
    return $box.height;
  });
  $$unsubscribe_height_d = subscribe(height_d, (value) => $height_d = value);
  const extents_d = derived([_flatData, activeGetters_d, _extents, _xScale, _yScale, _rScale, _zScale], ([$flatData, $activeGetters, $extents, $_xScale2, $_yScale2, $_rScale2, $_zScale2]) => {
    const scaleLookup = {
      x: $_xScale2,
      y: $_yScale2,
      r: $_rScale2,
      z: $_zScale2
    };
    const getters = filterObject($activeGetters, $extents);
    const activeScales = Object.fromEntries(Object.keys(getters).map((k) => [k, scaleLookup[k]]));
    if (Object.keys(getters).length > 0) {
      const calculatedExtents = calcScaleExtents($flatData, getters, activeScales);
      return { ...calculatedExtents, ...$extents };
    } else {
      return {};
    }
  });
  $$unsubscribe_extents_d = subscribe(extents_d, (value) => $extents_d = value);
  const xDomain_d = derived([extents_d, _xDomain], calcDomain("x"));
  $$unsubscribe_xDomain_d = subscribe(xDomain_d, (value) => $xDomain_d = value);
  const yDomain_d = derived([extents_d, _yDomain], calcDomain("y"));
  $$unsubscribe_yDomain_d = subscribe(yDomain_d, (value) => $yDomain_d = value);
  const zDomain_d = derived([extents_d, _zDomain], calcDomain("z"));
  $$unsubscribe_zDomain_d = subscribe(zDomain_d, (value) => $zDomain_d = value);
  const rDomain_d = derived([extents_d, _rDomain], calcDomain("r"));
  $$unsubscribe_rDomain_d = subscribe(rDomain_d, (value) => $rDomain_d = value);
  const xScale_d = derived(
    [
      _xScale,
      extents_d,
      xDomain_d,
      _xPadding,
      _xNice,
      _xReverse,
      width_d,
      height_d,
      _xRange,
      _percentRange
    ],
    createScale("x")
  );
  $$unsubscribe_xScale_d = subscribe(xScale_d, (value) => $xScale_d = value);
  const xGet_d = derived([_x, xScale_d], createGetter);
  $$unsubscribe_xGet_d = subscribe(xGet_d, (value) => $xGet_d = value);
  const yScale_d = derived(
    [
      _yScale,
      extents_d,
      yDomain_d,
      _yPadding,
      _yNice,
      _yReverse,
      width_d,
      height_d,
      _yRange,
      _percentRange
    ],
    createScale("y")
  );
  $$unsubscribe_yScale_d = subscribe(yScale_d, (value) => $yScale_d = value);
  const yGet_d = derived([_y, yScale_d], createGetter);
  $$unsubscribe_yGet_d = subscribe(yGet_d, (value) => $yGet_d = value);
  const zScale_d = derived(
    [
      _zScale,
      extents_d,
      zDomain_d,
      _zPadding,
      _zNice,
      _zReverse,
      width_d,
      height_d,
      _zRange,
      _percentRange
    ],
    createScale("z")
  );
  $$unsubscribe_zScale_d = subscribe(zScale_d, (value) => $zScale_d = value);
  const zGet_d = derived([_z, zScale_d], createGetter);
  $$unsubscribe_zGet_d = subscribe(zGet_d, (value) => $zGet_d = value);
  const rScale_d = derived(
    [
      _rScale,
      extents_d,
      rDomain_d,
      _rPadding,
      _rNice,
      _rReverse,
      width_d,
      height_d,
      _rRange,
      _percentRange
    ],
    createScale("r")
  );
  $$unsubscribe_rScale_d = subscribe(rScale_d, (value) => $rScale_d = value);
  const rGet_d = derived([_r, rScale_d], createGetter);
  $$unsubscribe_rGet_d = subscribe(rGet_d, (value) => $rGet_d = value);
  const xRange_d = derived([xScale_d], getRange);
  $$unsubscribe_xRange_d = subscribe(xRange_d, (value) => $xRange_d = value);
  const yRange_d = derived([yScale_d], getRange);
  $$unsubscribe_yRange_d = subscribe(yRange_d, (value) => $yRange_d = value);
  const zRange_d = derived([zScale_d], getRange);
  $$unsubscribe_zRange_d = subscribe(zRange_d, (value) => $zRange_d = value);
  const rRange_d = derived([rScale_d], getRange);
  $$unsubscribe_rRange_d = subscribe(rRange_d, (value) => $rRange_d = value);
  const aspectRatio_d = derived([width_d, height_d], ([$width, $height]) => {
    return $width / $height;
  });
  $$unsubscribe_aspectRatio_d = subscribe(aspectRatio_d, (value) => $aspectRatio_d = value);
  if ($$props.ssr === void 0 && $$bindings.ssr && ssr !== void 0)
    $$bindings.ssr(ssr);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0)
    $$bindings.pointerEvents(pointerEvents);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0)
    $$bindings.position(position);
  if ($$props.percentRange === void 0 && $$bindings.percentRange && percentRange !== void 0)
    $$bindings.percentRange(percentRange);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.containerWidth === void 0 && $$bindings.containerWidth && containerWidth !== void 0)
    $$bindings.containerWidth(containerWidth);
  if ($$props.containerHeight === void 0 && $$bindings.containerHeight && containerHeight !== void 0)
    $$bindings.containerHeight(containerHeight);
  if ($$props.element === void 0 && $$bindings.element && element !== void 0)
    $$bindings.element(element);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.z === void 0 && $$bindings.z && z !== void 0)
    $$bindings.z(z);
  if ($$props.r === void 0 && $$bindings.r && r !== void 0)
    $$bindings.r(r);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.xDomain === void 0 && $$bindings.xDomain && xDomain !== void 0)
    $$bindings.xDomain(xDomain);
  if ($$props.yDomain === void 0 && $$bindings.yDomain && yDomain !== void 0)
    $$bindings.yDomain(yDomain);
  if ($$props.zDomain === void 0 && $$bindings.zDomain && zDomain !== void 0)
    $$bindings.zDomain(zDomain);
  if ($$props.rDomain === void 0 && $$bindings.rDomain && rDomain !== void 0)
    $$bindings.rDomain(rDomain);
  if ($$props.xNice === void 0 && $$bindings.xNice && xNice !== void 0)
    $$bindings.xNice(xNice);
  if ($$props.yNice === void 0 && $$bindings.yNice && yNice !== void 0)
    $$bindings.yNice(yNice);
  if ($$props.zNice === void 0 && $$bindings.zNice && zNice !== void 0)
    $$bindings.zNice(zNice);
  if ($$props.rNice === void 0 && $$bindings.rNice && rNice !== void 0)
    $$bindings.rNice(rNice);
  if ($$props.xPadding === void 0 && $$bindings.xPadding && xPadding !== void 0)
    $$bindings.xPadding(xPadding);
  if ($$props.yPadding === void 0 && $$bindings.yPadding && yPadding !== void 0)
    $$bindings.yPadding(yPadding);
  if ($$props.zPadding === void 0 && $$bindings.zPadding && zPadding !== void 0)
    $$bindings.zPadding(zPadding);
  if ($$props.rPadding === void 0 && $$bindings.rPadding && rPadding !== void 0)
    $$bindings.rPadding(rPadding);
  if ($$props.xScale === void 0 && $$bindings.xScale && xScale !== void 0)
    $$bindings.xScale(xScale);
  if ($$props.yScale === void 0 && $$bindings.yScale && yScale !== void 0)
    $$bindings.yScale(yScale);
  if ($$props.zScale === void 0 && $$bindings.zScale && zScale !== void 0)
    $$bindings.zScale(zScale);
  if ($$props.rScale === void 0 && $$bindings.rScale && rScale !== void 0)
    $$bindings.rScale(rScale);
  if ($$props.xRange === void 0 && $$bindings.xRange && xRange !== void 0)
    $$bindings.xRange(xRange);
  if ($$props.yRange === void 0 && $$bindings.yRange && yRange !== void 0)
    $$bindings.yRange(yRange);
  if ($$props.zRange === void 0 && $$bindings.zRange && zRange !== void 0)
    $$bindings.zRange(zRange);
  if ($$props.rRange === void 0 && $$bindings.rRange && rRange !== void 0)
    $$bindings.rRange(rRange);
  if ($$props.xReverse === void 0 && $$bindings.xReverse && xReverse !== void 0)
    $$bindings.xReverse(xReverse);
  if ($$props.yReverse === void 0 && $$bindings.yReverse && yReverse !== void 0)
    $$bindings.yReverse(yReverse);
  if ($$props.zReverse === void 0 && $$bindings.zReverse && zReverse !== void 0)
    $$bindings.zReverse(zReverse);
  if ($$props.rReverse === void 0 && $$bindings.rReverse && rReverse !== void 0)
    $$bindings.rReverse(rReverse);
  if ($$props.padding === void 0 && $$bindings.padding && padding !== void 0)
    $$bindings.padding(padding);
  if ($$props.extents === void 0 && $$bindings.extents && extents !== void 0)
    $$bindings.extents(extents);
  if ($$props.flatData === void 0 && $$bindings.flatData && flatData !== void 0)
    $$bindings.flatData(flatData);
  if ($$props.custom === void 0 && $$bindings.custom && custom !== void 0)
    $$bindings.custom(custom);
  if ($$props.debug === void 0 && $$bindings.debug && debug !== void 0)
    $$bindings.debug(debug);
  $$result.css.add(css$2);
  yReverseValue = typeof yReverse === "undefined" ? typeof yScale.bandwidth === "function" ? false : true : yReverse;
  {
    if (x)
      config.x = x;
  }
  {
    if (y)
      config.y = y;
  }
  {
    if (z)
      config.z = z;
  }
  {
    if (r)
      config.r = r;
  }
  {
    if (xDomain)
      config.xDomain = xDomain;
  }
  {
    if (yDomain)
      config.yDomain = yDomain;
  }
  {
    if (zDomain)
      config.zDomain = zDomain;
  }
  {
    if (rDomain)
      config.rDomain = rDomain;
  }
  {
    if (xRange)
      config.xRange = xRange;
  }
  {
    if (yRange)
      config.yRange = yRange;
  }
  {
    if (zRange)
      config.zRange = zRange;
  }
  {
    if (rRange)
      config.rRange = rRange;
  }
  set_store_value(_percentRange, $_percentRange = percentRange, $_percentRange);
  set_store_value(_containerWidth, $_containerWidth = containerWidth, $_containerWidth);
  set_store_value(_containerHeight, $_containerHeight = containerHeight, $_containerHeight);
  set_store_value(_extents, $_extents = filterObject(extents), $_extents);
  set_store_value(_data, $_data = data, $_data);
  set_store_value(_flatData, $_flatData = flatData || data, $_flatData);
  set_store_value(_padding, $_padding = padding, $_padding);
  set_store_value(_x, $_x = makeAccessor(x), $_x);
  set_store_value(_y, $_y = makeAccessor(y), $_y);
  set_store_value(_z, $_z = makeAccessor(z), $_z);
  set_store_value(_r, $_r = makeAccessor(r), $_r);
  set_store_value(_xDomain, $_xDomain = xDomain, $_xDomain);
  set_store_value(_yDomain, $_yDomain = yDomain, $_yDomain);
  set_store_value(_zDomain, $_zDomain = zDomain, $_zDomain);
  set_store_value(_rDomain, $_rDomain = rDomain, $_rDomain);
  set_store_value(_xNice, $_xNice = xNice, $_xNice);
  set_store_value(_yNice, $_yNice = yNice, $_yNice);
  set_store_value(_zNice, $_zNice = zNice, $_zNice);
  set_store_value(_rNice, $_rNice = rNice, $_rNice);
  set_store_value(_xReverse, $_xReverse = xReverse, $_xReverse);
  set_store_value(_yReverse, $_yReverse = yReverseValue, $_yReverse);
  set_store_value(_zReverse, $_zReverse = zReverse, $_zReverse);
  set_store_value(_rReverse, $_rReverse = rReverse, $_rReverse);
  set_store_value(_xPadding, $_xPadding = xPadding, $_xPadding);
  set_store_value(_yPadding, $_yPadding = yPadding, $_yPadding);
  set_store_value(_zPadding, $_zPadding = zPadding, $_zPadding);
  set_store_value(_rPadding, $_rPadding = rPadding, $_rPadding);
  set_store_value(_xRange, $_xRange = xRange, $_xRange);
  set_store_value(_yRange, $_yRange = yRange, $_yRange);
  set_store_value(_zRange, $_zRange = zRange, $_zRange);
  set_store_value(_rRange, $_rRange = rRange, $_rRange);
  set_store_value(_xScale, $_xScale = xScale, $_xScale);
  set_store_value(_yScale, $_yScale = yScale, $_yScale);
  set_store_value(_zScale, $_zScale = zScale, $_zScale);
  set_store_value(_rScale, $_rScale = rScale, $_rScale);
  set_store_value(_custom, $_custom = custom, $_custom);
  set_store_value(_config, $_config = config, $_config);
  context = {
    activeGetters: activeGetters_d,
    width: width_d,
    height: height_d,
    percentRange: _percentRange,
    aspectRatio: aspectRatio_d,
    containerWidth: _containerWidth,
    containerHeight: _containerHeight,
    x: _x,
    y: _y,
    z: _z,
    r: _r,
    custom: _custom,
    data: _data,
    xNice: _xNice,
    yNice: _yNice,
    zNice: _zNice,
    rNice: _rNice,
    xReverse: _xReverse,
    yReverse: _yReverse,
    zReverse: _zReverse,
    rReverse: _rReverse,
    xPadding: _xPadding,
    yPadding: _yPadding,
    zPadding: _zPadding,
    rPadding: _rPadding,
    padding: padding_d,
    flatData: _flatData,
    extents: extents_d,
    xDomain: xDomain_d,
    yDomain: yDomain_d,
    zDomain: zDomain_d,
    rDomain: rDomain_d,
    xRange: xRange_d,
    yRange: yRange_d,
    zRange: zRange_d,
    rRange: rRange_d,
    config: _config,
    xScale: xScale_d,
    xGet: xGet_d,
    yScale: yScale_d,
    yGet: yGet_d,
    zScale: zScale_d,
    zGet: zGet_d,
    rScale: rScale_d,
    rGet: rGet_d
  };
  {
    setContext("LayerCake", context);
  }
  {
    if ($box_d && debug === true && (ssr === true || typeof window !== "undefined")) {
      printDebug_debounced({
        boundingBox: $box_d,
        activeGetters: $activeGetters_d,
        x: config.x,
        y: config.y,
        z: config.z,
        r: config.r,
        xScale: $xScale_d,
        yScale: $yScale_d,
        zScale: $zScale_d,
        rScale: $rScale_d
      });
    }
  }
  $$unsubscribe_rScale_d();
  $$unsubscribe_zScale_d();
  $$unsubscribe_yScale_d();
  $$unsubscribe_xScale_d();
  $$unsubscribe_activeGetters_d();
  $$unsubscribe_box_d();
  $$unsubscribe__config();
  $$unsubscribe__custom();
  $$unsubscribe__rScale();
  $$unsubscribe__zScale();
  $$unsubscribe__yScale();
  $$unsubscribe__xScale();
  $$unsubscribe__rRange();
  $$unsubscribe__zRange();
  $$unsubscribe__yRange();
  $$unsubscribe__xRange();
  $$unsubscribe__rPadding();
  $$unsubscribe__zPadding();
  $$unsubscribe__yPadding();
  $$unsubscribe__xPadding();
  $$unsubscribe__rReverse();
  $$unsubscribe__zReverse();
  $$unsubscribe__yReverse();
  $$unsubscribe__xReverse();
  $$unsubscribe__rNice();
  $$unsubscribe__zNice();
  $$unsubscribe__yNice();
  $$unsubscribe__xNice();
  $$unsubscribe__rDomain();
  $$unsubscribe__zDomain();
  $$unsubscribe__yDomain();
  $$unsubscribe__xDomain();
  $$unsubscribe__r();
  $$unsubscribe__z();
  $$unsubscribe__y();
  $$unsubscribe__x();
  $$unsubscribe__padding();
  $$unsubscribe__flatData();
  $$unsubscribe__data();
  $$unsubscribe__extents();
  $$unsubscribe__containerHeight();
  $$unsubscribe__containerWidth();
  $$unsubscribe__percentRange();
  $$unsubscribe_width_d();
  $$unsubscribe_height_d();
  $$unsubscribe_aspectRatio_d();
  $$unsubscribe_padding_d();
  $$unsubscribe_extents_d();
  $$unsubscribe_xDomain_d();
  $$unsubscribe_yDomain_d();
  $$unsubscribe_zDomain_d();
  $$unsubscribe_rDomain_d();
  $$unsubscribe_xRange_d();
  $$unsubscribe_yRange_d();
  $$unsubscribe_zRange_d();
  $$unsubscribe_rRange_d();
  $$unsubscribe_xGet_d();
  $$unsubscribe_yGet_d();
  $$unsubscribe_zGet_d();
  $$unsubscribe_rGet_d();
  return `  ${ssr === true || typeof window !== "undefined" ? `<div class="layercake-container svelte-vhzpsp"${add_styles({
    position,
    "top": position === "absolute" ? "0" : null,
    "right": position === "absolute" ? "0" : null,
    "bottom": position === "absolute" ? "0" : null,
    "left": position === "absolute" ? "0" : null,
    "pointer-events": pointerEvents === false ? "none" : null
  })}${add_attribute("this", element, 0)}>${slots.default ? slots.default({
    element,
    width: $width_d,
    height: $height_d,
    aspectRatio: $aspectRatio_d,
    containerWidth: $_containerWidth,
    containerHeight: $_containerHeight,
    activeGetters: $activeGetters_d,
    percentRange: $_percentRange,
    x: $_x,
    y: $_y,
    z: $_z,
    r: $_r,
    custom: $_custom,
    data: $_data,
    xNice: $_xNice,
    yNice: $_yNice,
    zNice: $_zNice,
    rNice: $_rNice,
    xReverse: $_xReverse,
    yReverse: $_yReverse,
    zReverse: $_zReverse,
    rReverse: $_rReverse,
    xPadding: $_xPadding,
    yPadding: $_yPadding,
    zPadding: $_zPadding,
    rPadding: $_rPadding,
    padding: $padding_d,
    flatData: $_flatData,
    extents: $extents_d,
    xDomain: $xDomain_d,
    yDomain: $yDomain_d,
    zDomain: $zDomain_d,
    rDomain: $rDomain_d,
    xRange: $xRange_d,
    yRange: $yRange_d,
    zRange: $zRange_d,
    rRange: $rRange_d,
    config: $_config,
    xScale: $xScale_d,
    xGet: $xGet_d,
    yScale: $yScale_d,
    yGet: $yGet_d,
    zScale: $zScale_d,
    zGet: $zGet_d,
    rScale: $rScale_d,
    rGet: $rGet_d
  }) : ``}</div>` : ``}`;
});
const css$1 = {
  code: "div.svelte-1bu60uu,slot.svelte-1bu60uu{position:absolute;top:0;left:0}",
  map: null
};
const Html$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let roleVal;
  let $padding, $$unsubscribe_padding;
  const { padding } = getContext("LayerCake");
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  let { element = void 0 } = $$props;
  let { zIndex = void 0 } = $$props;
  let { pointerEvents = void 0 } = $$props;
  let { role = void 0 } = $$props;
  let { label = void 0 } = $$props;
  let { labelledBy = void 0 } = $$props;
  let { describedBy = void 0 } = $$props;
  if ($$props.element === void 0 && $$bindings.element && element !== void 0)
    $$bindings.element(element);
  if ($$props.zIndex === void 0 && $$bindings.zIndex && zIndex !== void 0)
    $$bindings.zIndex(zIndex);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0)
    $$bindings.pointerEvents(pointerEvents);
  if ($$props.role === void 0 && $$bindings.role && role !== void 0)
    $$bindings.role(role);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.labelledBy === void 0 && $$bindings.labelledBy && labelledBy !== void 0)
    $$bindings.labelledBy(labelledBy);
  if ($$props.describedBy === void 0 && $$bindings.describedBy && describedBy !== void 0)
    $$bindings.describedBy(describedBy);
  $$result.css.add(css$1);
  roleVal = role || (label || labelledBy || describedBy ? "figure" : void 0);
  $$unsubscribe_padding();
  return `  <div class="layercake-layout-html svelte-1bu60uu"${add_attribute("role", roleVal, 0)}${add_attribute("aria-label", label, 0)}${add_attribute("aria-labelledby", labelledBy, 0)}${add_attribute("aria-describedby", describedBy, 0)}${add_styles({
    "z-index": zIndex,
    "pointer-events": pointerEvents === false ? "none" : null,
    "top": $padding.top + "px",
    "right": $padding.right + "px",
    "bottom": $padding.bottom + "px",
    "left": $padding.left + "px"
  })}${add_attribute("this", element, 0)}>${slots.default ? slots.default({ element }) : ``} </div>`;
});
const css = {
  code: "svg.svelte-u84d8d{position:absolute;top:0;left:0;overflow:visible}",
  map: null
};
const Svg$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $containerWidth, $$unsubscribe_containerWidth;
  let $containerHeight, $$unsubscribe_containerHeight;
  let $padding, $$unsubscribe_padding;
  let { element = void 0 } = $$props;
  let { innerElement = void 0 } = $$props;
  let { zIndex = void 0 } = $$props;
  let { pointerEvents = void 0 } = $$props;
  let { viewBox = void 0 } = $$props;
  let { label = void 0 } = $$props;
  let { labelledBy = void 0 } = $$props;
  let { describedBy = void 0 } = $$props;
  let { title = void 0 } = $$props;
  const { containerWidth, containerHeight, padding } = getContext("LayerCake");
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => $containerWidth = value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => $containerHeight = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  if ($$props.element === void 0 && $$bindings.element && element !== void 0)
    $$bindings.element(element);
  if ($$props.innerElement === void 0 && $$bindings.innerElement && innerElement !== void 0)
    $$bindings.innerElement(innerElement);
  if ($$props.zIndex === void 0 && $$bindings.zIndex && zIndex !== void 0)
    $$bindings.zIndex(zIndex);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0)
    $$bindings.pointerEvents(pointerEvents);
  if ($$props.viewBox === void 0 && $$bindings.viewBox && viewBox !== void 0)
    $$bindings.viewBox(viewBox);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.labelledBy === void 0 && $$bindings.labelledBy && labelledBy !== void 0)
    $$bindings.labelledBy(labelledBy);
  if ($$props.describedBy === void 0 && $$bindings.describedBy && describedBy !== void 0)
    $$bindings.describedBy(describedBy);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  $$result.css.add(css);
  $$unsubscribe_containerWidth();
  $$unsubscribe_containerHeight();
  $$unsubscribe_padding();
  return `  <svg class="layercake-layout-svg svelte-u84d8d"${add_attribute("viewBox", viewBox, 0)}${add_attribute("width", $containerWidth, 0)}${add_attribute("height", $containerHeight, 0)}${add_attribute("aria-label", label, 0)}${add_attribute("aria-labelledby", labelledBy, 0)}${add_attribute("aria-describedby", describedBy, 0)}${add_styles({
    "z-index": zIndex,
    "pointer-events": pointerEvents === false ? "none" : null
  })}${add_attribute("this", element, 0)}>${slots.title ? slots.title({}) : `${title ? `<title>${escape(title)}</title>` : ``}`}<defs>${slots.defs ? slots.defs({}) : ``}</defs><g class="layercake-layout-svg_g" transform="${"translate(" + escape($padding.left, true) + ", " + escape($padding.top, true) + ")"}"${add_attribute("this", innerElement, 0)}>${slots.default ? slots.default({ element }) : ``}</g></svg>`;
});
function raise(el) {
  if (el.nextSibling)
    el.parentNode.appendChild(el);
}
function motionStore(value, options) {
  if (options.spring) {
    return spring(value, options.spring === true ? void 0 : options.spring);
  } else if (options.tweened) {
    return tweened(value, options.tweened === true ? void 0 : options.tweened);
  } else {
    return writable(value);
  }
}
function resolveOptions(prop, options) {
  return {
    spring: typeof options.spring === "boolean" || options.spring == null ? options.spring : prop in options.spring ? options.spring[prop] : Object.keys(options.spring).some((key) => ["precision", "damping", "stiffness"].includes(key)) ? options.tweened : false,
    tweened: typeof options.tweened === "boolean" || options.tweened == null ? options.tweened : prop in options.tweened ? options.tweened[prop] : Object.keys(options.tweened).some((key) => ["delay", "duration", "easing"].includes(key)) ? options.tweened : false
  };
}
function isSVGElement(elem) {
  return !!elem && (elem instanceof SVGElement || "ownerSVGElement" in elem);
}
function isSVGSVGElement(elem) {
  return !!elem && "createSVGPoint" in elem;
}
function isSVGGraphicsElement(elem) {
  return !!elem && "getScreenCTM" in elem;
}
function isTouchEvent(event) {
  return !!event && "changedTouches" in event;
}
function propAccessor(prop) {
  return typeof prop === "function" ? prop : typeof prop === "string" ? (d) => get(d, prop) : (x) => x;
}
function unique(values) {
  return Array.from(new Set(values));
}
function greatestAbs(array) {
  return greatest(array, (a, b) => Math.abs(a) - Math.abs(b));
}
const idMap = /* @__PURE__ */ new Map();
function uniqueId(prefix = "") {
  let id = (idMap.get(prefix) ?? 0) + 1;
  idMap.set(prefix, id);
  return prefix + id;
}
function sortFunc(value, direction = "asc") {
  const sortDirection = direction === "asc" ? 1 : -1;
  return (a, b) => {
    const valueFn = propAccessor(value);
    const aValue = valueFn(a);
    const bValue = valueFn(b);
    if (aValue == null || bValue == null) {
      if (aValue == null && bValue != null) {
        return -sortDirection;
      } else if (aValue != null && bValue == null) {
        return sortDirection;
      } else {
        return 0;
      }
    }
    return aValue < bValue ? -sortDirection : aValue > bValue ? sortDirection : 0;
  };
}
function getPixelValue(cssValue) {
  const [match, value, units] = cssValue.match(/([\d.]+)(\D+)/);
  const number = Number(value);
  switch (units) {
    case "px":
      return number;
    case "em":
    case "rem":
      return number * 16;
    default:
      return 0;
  }
}
function isValidXOrY(xOrY) {
  return (
    // number that is not NaN or Infinity
    typeof xOrY === "number" && Number.isFinite(xOrY) || // for percentage
    typeof xOrY === "string"
  );
}
const Text = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let words;
  let lines;
  let rotateTransform;
  let transform;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "width",
    "x",
    "y",
    "dx",
    "dy",
    "lineHeight",
    "capHeight",
    "scaleToFit",
    "textAnchor",
    "verticalAnchor",
    "rotate"
  ]);
  let { value = 0 } = $$props;
  let { width = void 0 } = $$props;
  let { x = 0 } = $$props;
  let { y = 0 } = $$props;
  let { dx = 0 } = $$props;
  let { dy = 0 } = $$props;
  let { lineHeight = "1em" } = $$props;
  let { capHeight = "0.71em" } = $$props;
  let { scaleToFit = false } = $$props;
  let { textAnchor = "start" } = $$props;
  let { verticalAnchor = "end" } = $$props;
  let { rotate = void 0 } = $$props;
  let wordsByLines = [];
  let wordsWithWidth = [];
  let spaceWidth = 0;
  let style = void 0;
  let startDy = 0;
  let scaleTransform = "";
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.dx === void 0 && $$bindings.dx && dx !== void 0)
    $$bindings.dx(dx);
  if ($$props.dy === void 0 && $$bindings.dy && dy !== void 0)
    $$bindings.dy(dy);
  if ($$props.lineHeight === void 0 && $$bindings.lineHeight && lineHeight !== void 0)
    $$bindings.lineHeight(lineHeight);
  if ($$props.capHeight === void 0 && $$bindings.capHeight && capHeight !== void 0)
    $$bindings.capHeight(capHeight);
  if ($$props.scaleToFit === void 0 && $$bindings.scaleToFit && scaleToFit !== void 0)
    $$bindings.scaleToFit(scaleToFit);
  if ($$props.textAnchor === void 0 && $$bindings.textAnchor && textAnchor !== void 0)
    $$bindings.textAnchor(textAnchor);
  if ($$props.verticalAnchor === void 0 && $$bindings.verticalAnchor && verticalAnchor !== void 0)
    $$bindings.verticalAnchor(verticalAnchor);
  if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0)
    $$bindings.rotate(rotate);
  words = value != null ? value.toString().split(/(?:(?!\u00A0+)\s+)/) : [];
  wordsWithWidth = words.map((word) => ({
    word,
    width: getStringWidth(word, style) || 0
  }));
  spaceWidth = getStringWidth(" ", style) || 0;
  wordsByLines = wordsWithWidth.reduce(
    (result, item) => {
      const currentLine = result[result.length - 1];
      if (currentLine && (width == null || scaleToFit || (currentLine.width || 0) + item.width + spaceWidth < width)) {
        currentLine.words.push(item.word);
        currentLine.width = currentLine.width || 0;
        currentLine.width += item.width + spaceWidth;
      } else {
        const newLine = { words: [item.word], width: item.width };
        result.push(newLine);
      }
      return result;
    },
    []
  );
  lines = wordsByLines.length;
  {
    if (verticalAnchor === "start") {
      startDy = getPixelValue(capHeight);
    } else if (verticalAnchor === "middle") {
      startDy = (lines - 1) / 2 * -getPixelValue(lineHeight) + getPixelValue(capHeight) / 2;
    } else {
      startDy = (lines - 1) * -getPixelValue(lineHeight);
    }
  }
  {
    if (scaleToFit && lines > 0 && typeof x == "number" && typeof y == "number" && typeof width == "number") {
      const lineWidth = wordsByLines[0].width || 1;
      const sx = width / lineWidth;
      const sy = sx;
      const originX = x - sx * x;
      const originY = y - sy * y;
      scaleTransform = `matrix(${sx}, 0, 0, ${sy}, ${originX}, ${originY})`;
    } else {
      scaleTransform = "";
    }
  }
  rotateTransform = rotate ? `rotate(${rotate}, ${x}, ${y})` : "";
  transform = `${scaleTransform} ${rotateTransform}`;
  return `  <svg${add_attribute("x", dx, 0)}${add_attribute("y", dy, 0)} class="overflow-visible [paint-order:stroke]">${isValidXOrY(x) && isValidXOrY(y) ? `<text${spread(
    [
      { x: escape_attribute_value(x) },
      { y: escape_attribute_value(y) },
      {
        transform: escape_attribute_value(transform)
      },
      {
        "text-anchor": escape_attribute_value(textAnchor)
      },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls($$props.fill === void 0 && "fill-surface-content", $$props.class))
      }
    ],
    {}
  )}>${each(wordsByLines, (line, index) => {
    return `<tspan${add_attribute("x", x, 0)}${add_attribute("dy", index === 0 ? startDy : lineHeight, 0)}>${escape(line.words.join(" "))}</tspan>`;
  })}</text>` : ``}</svg>`;
});
function scaleBandInvert(scale) {
  const domain = scale.domain();
  const eachBand = scale.step();
  const paddingOuter = eachBand * (scale.paddingOuter?.() ?? scale.padding());
  return function(value) {
    const index = Math.floor((value - paddingOuter) / eachBand);
    return domain[Math.max(0, Math.min(index, domain.length - 1))];
  };
}
function isScaleBand(scale) {
  return typeof scale.bandwidth === "function";
}
function scaleInvert(scale, value) {
  if (isScaleBand(scale)) {
    return scaleBandInvert(scale)(value);
  } else {
    return scale.invert(value);
  }
}
function groupScaleBand(scale, flatData, groupBy, padding) {
  const groupKeys = unique(flatData.map((d) => d[groupBy]));
  let newScale = scaleBand().domain(groupKeys).range([0, scale.bandwidth()]);
  if (padding) {
    if (padding.inner) {
      newScale = newScale.paddingInner(padding.inner);
    }
    if (padding.outer) {
      newScale = newScale.paddingOuter(padding.outer);
    }
  }
  return newScale;
}
const Axis = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let orientation;
  let scale;
  let xRangeMin;
  let xRangeMax;
  let yRangeMin;
  let yRangeMax;
  let tickVals;
  let $xScale, $$unsubscribe_xScale;
  let $yScale, $$unsubscribe_yScale;
  let $yRange, $$unsubscribe_yRange;
  let $xRange, $$unsubscribe_xRange;
  let $width, $$unsubscribe_width;
  const { xScale, yScale, xRange, yRange, width } = getContext("LayerCake");
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_xRange = subscribe(xRange, (value) => $xRange = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  let { placement } = $$props;
  let { rule = false } = $$props;
  let { grid = false } = $$props;
  let { ticks = placement === "left" || placement === "right" ? 4 : void 0 } = $$props;
  let { tickSize = 4 } = $$props;
  let { format: format$1 = void 0 } = $$props;
  let { labelProps = void 0 } = $$props;
  function getCoords(tick2) {
    switch (placement) {
      case "top":
        return {
          x: $xScale(tick2) + (isScaleBand($xScale) ? $xScale.bandwidth() / 2 : 0),
          y: xRangeMin
        };
      case "bottom":
        return {
          x: $xScale(tick2) + (isScaleBand($xScale) ? $xScale.bandwidth() / 2 : 0),
          y: yRangeMax
        };
      case "left":
        return {
          x: xRangeMin,
          y: $yScale(tick2) + (isScaleBand($yScale) ? $yScale.bandwidth() / 2 : 0)
        };
      case "right":
        return {
          x: xRangeMax,
          y: $yScale(tick2) + (isScaleBand($yScale) ? $yScale.bandwidth() / 2 : 0)
        };
      case "angle":
        return { x: $xScale(tick2), y: yRangeMax };
      case "radius":
        return { x: xRangeMin, y: $yScale(tick2) };
    }
  }
  function getDefaultLabelProps(tick2) {
    switch (placement) {
      case "top":
        return {
          textAnchor: "middle",
          verticalAnchor: "end",
          dy: -6
          // manually adjusted until Text supports custom styles
        };
      case "bottom":
        return {
          textAnchor: "middle",
          verticalAnchor: "start",
          dy: 4
          // manually adjusted until Text supports custom styles
        };
      case "left":
        return {
          textAnchor: "end",
          verticalAnchor: "middle",
          dx: -4,
          dy: -2
          // manually adjusted until Text supports custom styles
        };
      case "right":
        return {
          textAnchor: "start",
          verticalAnchor: "middle",
          dx: 4,
          dy: -2
          // manually adjusted until Text supports custom styles
        };
      case "angle":
        const xValue = $xScale(tick2);
        return {
          textAnchor: xValue === 0 || xValue === Math.PI ? "middle" : xValue > Math.PI ? "end" : "start",
          verticalAnchor: "middle",
          dx: 0,
          dy: -2
          // manually adjusted until Text supports custom styles
        };
      case "radius":
        return {
          textAnchor: "middle",
          verticalAnchor: "middle",
          dx: 2,
          dy: -2
          // manually adjusted until Text supports custom styles
        };
    }
  }
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.rule === void 0 && $$bindings.rule && rule !== void 0)
    $$bindings.rule(rule);
  if ($$props.grid === void 0 && $$bindings.grid && grid !== void 0)
    $$bindings.grid(grid);
  if ($$props.ticks === void 0 && $$bindings.ticks && ticks !== void 0)
    $$bindings.ticks(ticks);
  if ($$props.tickSize === void 0 && $$bindings.tickSize && tickSize !== void 0)
    $$bindings.tickSize(tickSize);
  if ($$props.format === void 0 && $$bindings.format && format$1 !== void 0)
    $$bindings.format(format$1);
  if ($$props.labelProps === void 0 && $$bindings.labelProps && labelProps !== void 0)
    $$bindings.labelProps(labelProps);
  orientation = placement === "angle" ? "angle" : placement === "radius" ? "radius" : ["top", "bottom"].includes(placement) ? "horizontal" : "vertical";
  scale = ["horizontal", "angle"].includes(orientation) ? $xScale : $yScale;
  [xRangeMin, xRangeMax] = extent($xRange);
  [yRangeMin, yRangeMax] = extent($yRange);
  tickVals = Array.isArray(ticks) ? ticks : isScaleBand(scale) ? scale.domain() : scale.ticks(typeof ticks === "function" ? ticks(scale) : ticks);
  $$unsubscribe_xScale();
  $$unsubscribe_yScale();
  $$unsubscribe_yRange();
  $$unsubscribe_xRange();
  $$unsubscribe_width();
  return `<g class="${"Axis placement-" + escape(placement, true)}">${rule !== false ? (() => {
    let lineProps = typeof rule === "object" ? rule : null;
    return ` ${orientation === "vertical" ? `<line${spread(
      [
        {
          x1: escape_attribute_value(placement === "right" ? xRangeMax : xRangeMin)
        },
        {
          x2: escape_attribute_value(placement === "right" ? xRangeMax : xRangeMin)
        },
        {
          y1: escape_attribute_value($yRange[0] || 0)
        },
        {
          y2: escape_attribute_value($yRange[1] || 0)
        },
        escape_object(lineProps),
        {
          class: escape_attribute_value(cls("rule stroke-surface-content/50", lineProps?.class))
        }
      ],
      {}
    )}></line>` : ``} ${orientation === "horizontal" ? `<line${spread(
      [
        {
          x1: escape_attribute_value($xRange[0] || 0)
        },
        {
          x2: escape_attribute_value($xRange[1] || 0)
        },
        {
          y1: escape_attribute_value(placement === "top" ? yRangeMin : yRangeMax)
        },
        {
          y2: escape_attribute_value(placement === "top" ? yRangeMin : yRangeMax)
        },
        escape_object(lineProps),
        {
          class: escape_attribute_value(cls("rule stroke-surface-content/50", lineProps?.class))
        }
      ],
      {}
    )}></line>` : ``}  ${orientation === "radius" ? `<circle${spread(
      [
        {
          r: escape_attribute_value($yRange[0] || 0)
        },
        escape_object(lineProps),
        {
          class: escape_attribute_value(cls("rule stroke-surface-content/20 fill-none", lineProps?.class))
        }
      ],
      {}
    )}></circle>` : ``}`;
  })() : ``}${each(tickVals, (tick2, i) => {
    let tickCoords = getCoords(tick2), radialTickCoords = pointRadial(tickCoords.x, tickCoords.y);
    return `  <g>${grid !== false ? (() => {
      let lineProps = typeof grid === "object" ? grid : null;
      return ` ${orientation === "horizontal" ? `<line${spread(
        [
          { x1: escape_attribute_value(tickCoords.x) },
          { y1: escape_attribute_value(yRangeMin) },
          { x2: escape_attribute_value(tickCoords.x) },
          { y2: escape_attribute_value(yRangeMax) },
          escape_object(lineProps),
          {
            class: escape_attribute_value(cls("grid stroke-surface-content/10", lineProps?.class))
          }
        ],
        {}
      )}></line>` : `${orientation === "vertical" ? `<line${spread(
        [
          { x1: escape_attribute_value(0) },
          { y1: escape_attribute_value(tickCoords.y) },
          { x2: escape_attribute_value($width) },
          { y2: escape_attribute_value(tickCoords.y) },
          escape_object(lineProps),
          {
            class: escape_attribute_value(cls("grid stroke-surface-content/10", lineProps?.class))
          }
        ],
        {}
      )}></line>` : `${orientation === "angle" ? (() => {
        let [x12, y12] = pointRadial(tickCoords.x, yRangeMin), [x2, y2] = pointRadial(tickCoords.x, yRangeMax);
        return `  <line${spread(
          [
            { x1: escape_attribute_value(x12) },
            { y1: escape_attribute_value(y12) },
            { x2: escape_attribute_value(x2) },
            { y2: escape_attribute_value(y2) },
            escape_object(lineProps),
            {
              class: escape_attribute_value(cls("test grid stroke-surface-content/10", lineProps?.class))
            }
          ],
          {}
        )}></line>`;
      })() : `${orientation === "radius" ? `<circle${spread(
        [
          { r: escape_attribute_value(tickCoords.y) },
          escape_object(lineProps),
          {
            class: escape_attribute_value(cls("grid stroke-surface-content/10 fill-none", lineProps?.class))
          }
        ],
        {}
      )}></circle>` : ``}`}`}`}`;
    })() : ``}${orientation === "horizontal" ? `<line${add_attribute("x1", tickCoords.x, 0)}${add_attribute("y1", tickCoords.y, 0)}${add_attribute("x2", tickCoords.x, 0)}${add_attribute("y2", tickCoords.y + (placement === "top" ? -tickSize : tickSize), 0)} class="tick stroke-surface-content/50"></line>` : `${orientation === "vertical" ? `<line${add_attribute("x1", tickCoords.x, 0)}${add_attribute("y1", tickCoords.y, 0)}${add_attribute("x2", tickCoords.x + (placement === "left" ? -tickSize : tickSize), 0)}${add_attribute("y2", tickCoords.y, 0)} class="tick stroke-surface-content/50"></line>` : ``}`}${validate_component(Text, "Text").$$render(
      $$result,
      Object.assign(
        {},
        {
          x: orientation === "angle" ? radialTickCoords[0] : tickCoords.x
        },
        {
          y: orientation === "angle" ? radialTickCoords[1] : tickCoords.y
        },
        {
          value: format(tick2, format$1 ?? scale.tickFormat?.() ?? ((v) => v))
        },
        getDefaultLabelProps(tick2),
        labelProps,
        {
          class: cls("label text-[10px] stroke-surface-100 [stroke-width:2px] font-light", labelProps?.class)
        }
      ),
      {},
      {}
    )}</g>`;
  })}</g>`;
});
function createDimensionGetter(context, options) {
  const { flatData, xGet, yGet, xRange, yRange, xScale, yScale, x: xAccessor, y: yAccessor } = context;
  const groupBy = options?.groupBy;
  const inset = options?.inset ?? 0;
  return derived([flatData, xGet, yGet, xRange, yRange, xScale, yScale, xAccessor, yAccessor], ([$flatData, $xGet, $yGet, $xRange, $yRange, $xScale, $yScale, $xAccessor, $yAccessor]) => {
    return function getter(item) {
      if (isScaleBand($yScale)) {
        const y1Scale = groupBy ? groupScaleBand($yScale, $flatData, groupBy, options?.groupPadding) : null;
        const y = firstValue($yGet(item)) + (y1Scale ? y1Scale(item[groupBy]) : 0) + inset / 2;
        const height = Math.max(0, $yScale.bandwidth ? (y1Scale ? y1Scale.bandwidth() : $yScale.bandwidth()) - inset : 0);
        const _x = options?.x ? typeof options.x === "string" ? (d) => d[options.x] : options?.x : $xAccessor;
        const xValue = _x(item);
        let left = 0;
        let right = 0;
        if (Array.isArray(xValue)) {
          left = min(xValue);
          right = max(xValue);
        } else if (xValue == null) {
          left = 0;
          right = 0;
        } else if (xValue > 0) {
          left = min($xRange);
          right = xValue;
        } else {
          left = xValue;
          right = min($xRange);
        }
        return {
          x: $xScale(left),
          y,
          width: $xScale(right) - $xScale(left),
          height
        };
      } else {
        const x1Scale = groupBy ? groupScaleBand($xScale, $flatData, groupBy, options?.groupPadding) : null;
        const x = firstValue($xGet(item)) + (x1Scale ? x1Scale(item[groupBy]) : 0) + inset / 2;
        const width = Math.max(0, $xScale.bandwidth ? (x1Scale ? x1Scale.bandwidth() : $xScale.bandwidth()) - inset : 0);
        const _y = options?.y ? typeof options.y === "string" ? (d) => d[options.y] : options?.y : $yAccessor;
        const yValue = _y(item);
        let top = 0;
        let bottom = 0;
        if (Array.isArray(yValue)) {
          top = max(yValue);
          bottom = min(yValue);
        } else if (yValue == null) {
          top = 0;
          bottom = 0;
        } else if (yValue > 0) {
          top = yValue;
          bottom = min($yRange);
        } else {
          top = min($yRange);
          bottom = yValue;
        }
        return {
          x,
          y: $yScale(top),
          width,
          height: $yScale(bottom) - $yScale(top)
        };
      }
    };
  });
}
function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
const Rect = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "x",
    "initialX",
    "y",
    "initialY",
    "width",
    "initialWidth",
    "height",
    "initialHeight",
    "spring",
    "tweened"
  ]);
  let $tweened_x, $$unsubscribe_tweened_x;
  let $tweened_y, $$unsubscribe_tweened_y;
  let $tweened_width, $$unsubscribe_tweened_width;
  let $tweened_height, $$unsubscribe_tweened_height;
  let { x = 0 } = $$props;
  let { initialX = x } = $$props;
  let { y = 0 } = $$props;
  let { initialY = y } = $$props;
  let { width } = $$props;
  let { initialWidth = width } = $$props;
  let { height } = $$props;
  let { initialHeight = height } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let tweened_x = motionStore(initialX, resolveOptions("x", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_x = subscribe(tweened_x, (value) => $tweened_x = value);
  let tweened_y = motionStore(initialY, resolveOptions("y", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_y = subscribe(tweened_y, (value) => $tweened_y = value);
  let tweened_width = motionStore(initialWidth, resolveOptions("width", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_width = subscribe(tweened_width, (value) => $tweened_width = value);
  let tweened_height = motionStore(initialHeight, resolveOptions("height", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_height = subscribe(tweened_height, (value) => $tweened_height = value);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.initialX === void 0 && $$bindings.initialX && initialX !== void 0)
    $$bindings.initialX(initialX);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.initialY === void 0 && $$bindings.initialY && initialY !== void 0)
    $$bindings.initialY(initialY);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.initialWidth === void 0 && $$bindings.initialWidth && initialWidth !== void 0)
    $$bindings.initialWidth(initialWidth);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.initialHeight === void 0 && $$bindings.initialHeight && initialHeight !== void 0)
    $$bindings.initialHeight(initialHeight);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0)
    $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0)
    $$bindings.tweened(tweened2);
  {
    tick().then(() => {
      tweened_x.set(x);
      tweened_y.set(y);
      tweened_width.set(width);
      tweened_height.set(height);
    });
  }
  $$unsubscribe_tweened_x();
  $$unsubscribe_tweened_y();
  $$unsubscribe_tweened_width();
  $$unsubscribe_tweened_height();
  return ` <rect${spread(
    [
      { x: escape_attribute_value($tweened_x) },
      { y: escape_attribute_value($tweened_y) },
      {
        width: escape_attribute_value($tweened_width)
      },
      {
        height: escape_attribute_value($tweened_height)
      },
      {
        class: escape_attribute_value(cls($$props.fill == null && "fill-surface-content"))
      },
      escape_object($$restProps)
    ],
    {}
  )}></rect>`;
});
const Bar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let getDimensions;
  let $$restProps = compute_rest_props($$props, [
    "bar",
    "x",
    "y",
    "fill",
    "stroke",
    "strokeWidth",
    "radius",
    "inset",
    "groupBy",
    "groupPaddingInner",
    "groupPaddingOuter",
    "spring",
    "tweened"
  ]);
  let $yContext, $$unsubscribe_yContext;
  let $xContext, $$unsubscribe_xContext;
  let $getDimensions, $$unsubscribe_getDimensions = noop$1, $$subscribe_getDimensions = () => ($$unsubscribe_getDimensions(), $$unsubscribe_getDimensions = subscribe(getDimensions, ($$value) => $getDimensions = $$value), getDimensions);
  const { x: xContext, y: yContext, rGet, config } = getContext("LayerCake");
  $$unsubscribe_xContext = subscribe(xContext, (value) => $xContext = value);
  $$unsubscribe_yContext = subscribe(yContext, (value) => $yContext = value);
  let { bar } = $$props;
  let { x = $xContext } = $$props;
  let { y = $yContext } = $$props;
  let { fill = void 0 } = $$props;
  let { stroke = "black" } = $$props;
  let { strokeWidth = 0 } = $$props;
  let { radius = 0 } = $$props;
  let { inset = 0 } = $$props;
  let { groupBy = void 0 } = $$props;
  let { groupPaddingInner = 0.2 } = $$props;
  let { groupPaddingOuter = 0 } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  if ($$props.bar === void 0 && $$bindings.bar && bar !== void 0)
    $$bindings.bar(bar);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0)
    $$bindings.fill(fill);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0)
    $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0)
    $$bindings.strokeWidth(strokeWidth);
  if ($$props.radius === void 0 && $$bindings.radius && radius !== void 0)
    $$bindings.radius(radius);
  if ($$props.inset === void 0 && $$bindings.inset && inset !== void 0)
    $$bindings.inset(inset);
  if ($$props.groupBy === void 0 && $$bindings.groupBy && groupBy !== void 0)
    $$bindings.groupBy(groupBy);
  if ($$props.groupPaddingInner === void 0 && $$bindings.groupPaddingInner && groupPaddingInner !== void 0)
    $$bindings.groupPaddingInner(groupPaddingInner);
  if ($$props.groupPaddingOuter === void 0 && $$bindings.groupPaddingOuter && groupPaddingOuter !== void 0)
    $$bindings.groupPaddingOuter(groupPaddingOuter);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0)
    $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0)
    $$bindings.tweened(tweened2);
  {
    if (stroke === null || stroke === void 0)
      stroke = "black";
  }
  $$subscribe_getDimensions(getDimensions = createDimensionGetter(getContext("LayerCake"), {
    x,
    y,
    groupBy,
    inset,
    groupPadding: {
      inner: groupPaddingInner,
      outer: groupPaddingOuter
    }
  }));
  $$unsubscribe_yContext();
  $$unsubscribe_xContext();
  $$unsubscribe_getDimensions();
  return `${validate_component(Rect, "Rect").$$render($$result, Object.assign({}, { fill }, { spring: spring2 }, { tweened: tweened2 }, { stroke }, { "stroke-width": strokeWidth }, { rx: radius }, $getDimensions(bar), $$restProps), {}, {})}`;
});
const Bars = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "x",
    "y",
    "stroke",
    "strokeWidth",
    "radius",
    "inset",
    "spring",
    "tweened",
    "groupBy",
    "groupPaddingInner",
    "groupPaddingOuter"
  ]);
  let $data, $$unsubscribe_data;
  let $config, $$unsubscribe_config;
  let $rGet, $$unsubscribe_rGet;
  const { data, rGet, config } = getContext("LayerCake");
  $$unsubscribe_data = subscribe(data, (value) => $data = value);
  $$unsubscribe_rGet = subscribe(rGet, (value) => $rGet = value);
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { stroke = "black" } = $$props;
  let { strokeWidth = 0 } = $$props;
  let { radius = 0 } = $$props;
  let { inset = 0 } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { groupBy = void 0 } = $$props;
  let { groupPaddingInner = 0.2 } = $$props;
  let { groupPaddingOuter = 0 } = $$props;
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0)
    $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0)
    $$bindings.strokeWidth(strokeWidth);
  if ($$props.radius === void 0 && $$bindings.radius && radius !== void 0)
    $$bindings.radius(radius);
  if ($$props.inset === void 0 && $$bindings.inset && inset !== void 0)
    $$bindings.inset(inset);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0)
    $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0)
    $$bindings.tweened(tweened2);
  if ($$props.groupBy === void 0 && $$bindings.groupBy && groupBy !== void 0)
    $$bindings.groupBy(groupBy);
  if ($$props.groupPaddingInner === void 0 && $$bindings.groupPaddingInner && groupPaddingInner !== void 0)
    $$bindings.groupPaddingInner(groupPaddingInner);
  if ($$props.groupPaddingOuter === void 0 && $$bindings.groupPaddingOuter && groupPaddingOuter !== void 0)
    $$bindings.groupPaddingOuter(groupPaddingOuter);
  $$unsubscribe_data();
  $$unsubscribe_config();
  $$unsubscribe_rGet();
  return `<g class="Bars">${slots.default ? slots.default({}) : ` ${each($data, (item) => {
    return `${validate_component(Bar, "Bar").$$render($$result, Object.assign({}, { bar: item }, { x }, { y }, { fill: $config.r ? $rGet(item) : null }, { stroke }, { strokeWidth }, { radius }, { spring: spring2 }, { tweened: tweened2 }, { groupBy }, { inset }, { groupPaddingInner }, { groupPaddingOuter }, $$restProps), {}, {})}`;
  })} `}</g>`;
});
function tree_add(d) {
  const x = +this._x.call(null, d), y = +this._y.call(null, d);
  return add(this.cover(x, y), x, y, d);
}
function add(tree, x, y, d) {
  if (isNaN(x) || isNaN(y))
    return tree;
  var parent, node = tree._root, leaf = { data: d }, x02 = tree._x0, y02 = tree._y0, x12 = tree._x1, y12 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
  if (!node)
    return tree._root = leaf, tree;
  while (node.length) {
    if (right = x >= (xm = (x02 + x12) / 2))
      x02 = xm;
    else
      x12 = xm;
    if (bottom = y >= (ym = (y02 + y12) / 2))
      y02 = ym;
    else
      y12 = ym;
    if (parent = node, !(node = node[i = bottom << 1 | right]))
      return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x === xp && y === yp)
    return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
    if (right = x >= (xm = (x02 + x12) / 2))
      x02 = xm;
    else
      x12 = xm;
    if (bottom = y >= (ym = (y02 + y12) / 2))
      y02 = ym;
    else
      y12 = ym;
  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll(data) {
  var d, i, n = data.length, x, y, xz = new Array(n), yz = new Array(n), x02 = Infinity, y02 = Infinity, x12 = -Infinity, y12 = -Infinity;
  for (i = 0; i < n; ++i) {
    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d)))
      continue;
    xz[i] = x;
    yz[i] = y;
    if (x < x02)
      x02 = x;
    if (x > x12)
      x12 = x;
    if (y < y02)
      y02 = y;
    if (y > y12)
      y12 = y;
  }
  if (x02 > x12 || y02 > y12)
    return this;
  this.cover(x02, y02).cover(x12, y12);
  for (i = 0; i < n; ++i) {
    add(this, xz[i], yz[i], data[i]);
  }
  return this;
}
function tree_cover(x, y) {
  if (isNaN(x = +x) || isNaN(y = +y))
    return this;
  var x02 = this._x0, y02 = this._y0, x12 = this._x1, y12 = this._y1;
  if (isNaN(x02)) {
    x12 = (x02 = Math.floor(x)) + 1;
    y12 = (y02 = Math.floor(y)) + 1;
  } else {
    var z = x12 - x02 || 1, node = this._root, parent, i;
    while (x02 > x || x >= x12 || y02 > y || y >= y12) {
      i = (y < y02) << 1 | x < x02;
      parent = new Array(4), parent[i] = node, node = parent, z *= 2;
      switch (i) {
        case 0:
          x12 = x02 + z, y12 = y02 + z;
          break;
        case 1:
          x02 = x12 - z, y12 = y02 + z;
          break;
        case 2:
          x12 = x02 + z, y02 = y12 - z;
          break;
        case 3:
          x02 = x12 - z, y02 = y12 - z;
          break;
      }
    }
    if (this._root && this._root.length)
      this._root = node;
  }
  this._x0 = x02;
  this._y0 = y02;
  this._x1 = x12;
  this._y1 = y12;
  return this;
}
function tree_data() {
  var data = [];
  this.visit(function(node) {
    if (!node.length)
      do
        data.push(node.data);
      while (node = node.next);
  });
  return data;
}
function tree_extent(_) {
  return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
}
function Quad(node, x02, y02, x12, y12) {
  this.node = node;
  this.x0 = x02;
  this.y0 = y02;
  this.x1 = x12;
  this.y1 = y12;
}
function tree_find(x, y, radius) {
  var data, x02 = this._x0, y02 = this._y0, x12, y12, x2, y2, x3 = this._x1, y3 = this._y1, quads = [], node = this._root, q, i;
  if (node)
    quads.push(new Quad(node, x02, y02, x3, y3));
  if (radius == null)
    radius = Infinity;
  else {
    x02 = x - radius, y02 = y - radius;
    x3 = x + radius, y3 = y + radius;
    radius *= radius;
  }
  while (q = quads.pop()) {
    if (!(node = q.node) || (x12 = q.x0) > x3 || (y12 = q.y0) > y3 || (x2 = q.x1) < x02 || (y2 = q.y1) < y02)
      continue;
    if (node.length) {
      var xm = (x12 + x2) / 2, ym = (y12 + y2) / 2;
      quads.push(
        new Quad(node[3], xm, ym, x2, y2),
        new Quad(node[2], x12, ym, xm, y2),
        new Quad(node[1], xm, y12, x2, ym),
        new Quad(node[0], x12, y12, xm, ym)
      );
      if (i = (y >= ym) << 1 | x >= xm) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    } else {
      var dx = x - +this._x.call(null, node.data), dy = y - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x02 = x - d, y02 = y - d;
        x3 = x + d, y3 = y + d;
        data = node.data;
      }
    }
  }
  return data;
}
function tree_remove(d) {
  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d)))
    return this;
  var parent, node = this._root, retainer, previous, next, x02 = this._x0, y02 = this._y0, x12 = this._x1, y12 = this._y1, x, y, xm, ym, right, bottom, i, j;
  if (!node)
    return this;
  if (node.length)
    while (true) {
      if (right = x >= (xm = (x02 + x12) / 2))
        x02 = xm;
      else
        x12 = xm;
      if (bottom = y >= (ym = (y02 + y12) / 2))
        y02 = ym;
      else
        y12 = ym;
      if (!(parent = node, node = node[i = bottom << 1 | right]))
        return this;
      if (!node.length)
        break;
      if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3])
        retainer = parent, j = i;
    }
  while (node.data !== d)
    if (!(previous = node, node = node.next))
      return this;
  if (next = node.next)
    delete node.next;
  if (previous)
    return next ? previous.next = next : delete previous.next, this;
  if (!parent)
    return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) {
    if (retainer)
      retainer[j] = node;
    else
      this._root = node;
  }
  return this;
}
function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i)
    this.remove(data[i]);
  return this;
}
function tree_root() {
  return this._root;
}
function tree_size() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length)
      do
        ++size;
      while (node = node.next);
  });
  return size;
}
function tree_visit(callback) {
  var quads = [], q, node = this._root, child, x02, y02, x12, y12;
  if (node)
    quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    if (!callback(node = q.node, x02 = q.x0, y02 = q.y0, x12 = q.x1, y12 = q.y1) && node.length) {
      var xm = (x02 + x12) / 2, ym = (y02 + y12) / 2;
      if (child = node[3])
        quads.push(new Quad(child, xm, ym, x12, y12));
      if (child = node[2])
        quads.push(new Quad(child, x02, ym, xm, y12));
      if (child = node[1])
        quads.push(new Quad(child, xm, y02, x12, ym));
      if (child = node[0])
        quads.push(new Quad(child, x02, y02, xm, ym));
    }
  }
  return this;
}
function tree_visitAfter(callback) {
  var quads = [], next = [], q;
  if (this._root)
    quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x02 = q.x0, y02 = q.y0, x12 = q.x1, y12 = q.y1, xm = (x02 + x12) / 2, ym = (y02 + y12) / 2;
      if (child = node[0])
        quads.push(new Quad(child, x02, y02, xm, ym));
      if (child = node[1])
        quads.push(new Quad(child, xm, y02, x12, ym));
      if (child = node[2])
        quads.push(new Quad(child, x02, ym, xm, y12));
      if (child = node[3])
        quads.push(new Quad(child, xm, ym, x12, y12));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
}
function defaultX(d) {
  return d[0];
}
function tree_x(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}
function defaultY(d) {
  return d[1];
}
function tree_y(_) {
  return arguments.length ? (this._y = _, this) : this._y;
}
function quadtree(nodes, x, y) {
  var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Quadtree(x, y, x02, y02, x12, y12) {
  this._x = x;
  this._y = y;
  this._x0 = x02;
  this._y0 = y02;
  this._x1 = x12;
  this._y1 = y12;
  this._root = void 0;
}
function leaf_copy(leaf) {
  var copy = { data: leaf.data }, next = copy;
  while (leaf = leaf.next)
    next = next.next = { data: leaf.data };
  return copy;
}
var treeProto = quadtree.prototype = Quadtree.prototype;
treeProto.copy = function() {
  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
  if (!node)
    return copy;
  if (!node.length)
    return copy._root = leaf_copy(node), copy;
  nodes = [{ source: node, target: copy._root = new Array(4) }];
  while (node = nodes.pop()) {
    for (var i = 0; i < 4; ++i) {
      if (child = node.source[i]) {
        if (child.length)
          nodes.push({ source: child, target: node.target[i] = new Array(4) });
        else
          node.target[i] = leaf_copy(child);
      }
    }
  }
  return copy;
};
treeProto.add = tree_add;
treeProto.addAll = addAll;
treeProto.cover = tree_cover;
treeProto.data = tree_data;
treeProto.extent = tree_extent;
treeProto.find = tree_find;
treeProto.remove = tree_remove;
treeProto.removeAll = removeAll;
treeProto.root = tree_root;
treeProto.size = tree_size;
treeProto.visit = tree_visit;
treeProto.visitAfter = tree_visitAfter;
treeProto.x = tree_x;
treeProto.y = tree_y;
const ClipPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["id", "useId", "disabled"]);
  let $$slots = compute_slots(slots);
  let { id = uniqueId("clipPath-") } = $$props;
  let { useId = void 0 } = $$props;
  let { disabled = false } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.useId === void 0 && $$bindings.useId && useId !== void 0)
    $$bindings.useId(useId);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  return `<defs><clipPath${spread([{ id: escape_attribute_value(id) }, escape_object($$restProps)], {})}>${slots.clip ? slots.clip({ id }) : ``}${useId ? `<use href="${"#" + escape(useId, true)}"></use>` : ``}</clipPath></defs> ${$$slots.default ? `${disabled ? `${slots.default ? slots.default({}) : ``}` : `<g${add_styles({ "clip-path": `url(#${id})` })}>${slots.default ? slots.default({ id, url: "url(#" + id + ")", useId }) : ``}</g>`}` : ``}`;
});
const RectClipPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["id", "x", "y", "width", "height", "spring", "tweened"]);
  let { id = uniqueId("clipPath-") } = $$props;
  let { x = 0 } = $$props;
  let { y = 0 } = $$props;
  let { width } = $$props;
  let { height } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0)
    $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0)
    $$bindings.tweened(tweened2);
  return `${validate_component(ClipPath, "ClipPath").$$render($$result, { id }, {}, {
    clip: () => {
      return `${validate_component(Rect, "Rect").$$render($$result, Object.assign({}, { slot: "clip" }, { x }, { y }, { width }, { height }, { spring: spring2 }, { tweened: tweened2 }, $$restProps), {}, {})}`;
    },
    default: ({ url }) => {
      return `${slots.default ? slots.default({ id, url }) : ``}`;
    }
  })}`;
});
const ChartClipPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, []);
  let $padding, $$unsubscribe_padding;
  let $width, $$unsubscribe_width;
  let $height, $$unsubscribe_height;
  const { width, height, padding } = getContext("LayerCake");
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  $$unsubscribe_padding();
  $$unsubscribe_width();
  $$unsubscribe_height();
  return `${validate_component(RectClipPath, "RectClipPath").$$render(
    $$result,
    Object.assign(
      {},
      { x: -$padding.left },
      { y: -$padding.top },
      {
        width: $width + $padding.left + $padding.right
      },
      {
        height: $height + $padding.top + $padding.bottom
      },
      $$restProps
    ),
    {},
    {
      default: () => {
        return `${slots.default ? slots.default({}) : ``}`;
      }
    }
  )}`;
});
const epsilon$2 = 11102230246251565e-32;
const splitter = 134217729;
const resulterrbound = (3 + 8 * epsilon$2) * epsilon$2;
function sum(elen, e, flen, f2, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f2[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f2[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f2[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f2[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f2[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++)
    Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}
const ccwerrboundA = (3 + 16 * epsilon$2) * epsilon$2;
const ccwerrboundB = (2 + 12 * epsilon$2) * epsilon$2;
const ccwerrboundC = (9 + 64 * epsilon$2) * epsilon$2 * epsilon$2;
const B = vec(4);
const C1 = vec(8);
const C2 = vec(12);
const D = vec(16);
const u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u3;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  B[2] = _j - (u3 - bvirt) + (_i - bvirt);
  B[3] = u3;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound)
    return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  u[2] = _j - (u3 - bvirt) + (_i - bvirt);
  u[3] = u3;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  u[2] = _j - (u3 - bvirt) + (_i - bvirt);
  u[3] = u3;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u3 = _j + _i;
  bvirt = u3 - _j;
  u[2] = _j - (u3 - bvirt) + (_i - bvirt);
  u[3] = u3;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum)
    return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}
const EPSILON = Math.pow(2, -52);
const EDGE_STACK = new Uint32Array(512);
class Delaunator {
  static from(points, getX = defaultGetX, getY = defaultGetY) {
    const n = points.length;
    const coords = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      coords[2 * i] = getX(p);
      coords[2 * i + 1] = getY(p);
    }
    return new Delaunator(coords);
  }
  constructor(coords) {
    const n = coords.length >> 1;
    if (n > 0 && typeof coords[0] !== "number")
      throw new Error("Expected coords to contain numbers.");
    this.coords = coords;
    const maxTriangles = Math.max(2 * n - 5, 0);
    this._triangles = new Uint32Array(maxTriangles * 3);
    this._halfedges = new Int32Array(maxTriangles * 3);
    this._hashSize = Math.ceil(Math.sqrt(n));
    this._hullPrev = new Uint32Array(n);
    this._hullNext = new Uint32Array(n);
    this._hullTri = new Uint32Array(n);
    this._hullHash = new Int32Array(this._hashSize);
    this._ids = new Uint32Array(n);
    this._dists = new Float64Array(n);
    this.update();
  }
  update() {
    const { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this;
    const n = coords.length >> 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (x < minX)
        minX = x;
      if (y < minY)
        minY = y;
      if (x > maxX)
        maxX = x;
      if (y > maxY)
        maxY = y;
      this._ids[i] = i;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let i0, i1, i2;
    for (let i = 0, minDist = Infinity; i < n; i++) {
      const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist) {
        i0 = i;
        minDist = d;
      }
    }
    const i0x = coords[2 * i0];
    const i0y = coords[2 * i0 + 1];
    for (let i = 0, minDist = Infinity; i < n; i++) {
      if (i === i0)
        continue;
      const d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist && d > 0) {
        i1 = i;
        minDist = d;
      }
    }
    let i1x = coords[2 * i1];
    let i1y = coords[2 * i1 + 1];
    let minRadius = Infinity;
    for (let i = 0; i < n; i++) {
      if (i === i0 || i === i1)
        continue;
      const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
      if (r < minRadius) {
        i2 = i;
        minRadius = r;
      }
    }
    let i2x = coords[2 * i2];
    let i2y = coords[2 * i2 + 1];
    if (minRadius === Infinity) {
      for (let i = 0; i < n; i++) {
        this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
      }
      quicksort(this._ids, this._dists, 0, n - 1);
      const hull = new Uint32Array(n);
      let j = 0;
      for (let i = 0, d0 = -Infinity; i < n; i++) {
        const id = this._ids[i];
        const d = this._dists[id];
        if (d > d0) {
          hull[j++] = id;
          d0 = d;
        }
      }
      this.hull = hull.subarray(0, j);
      this.triangles = new Uint32Array(0);
      this.halfedges = new Uint32Array(0);
      return;
    }
    if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
      const i = i1;
      const x = i1x;
      const y = i1y;
      i1 = i2;
      i1x = i2x;
      i1y = i2y;
      i2 = i;
      i2x = x;
      i2y = y;
    }
    const center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
    this._cx = center.x;
    this._cy = center.y;
    for (let i = 0; i < n; i++) {
      this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
    }
    quicksort(this._ids, this._dists, 0, n - 1);
    this._hullStart = i0;
    let hullSize = 3;
    hullNext[i0] = hullPrev[i2] = i1;
    hullNext[i1] = hullPrev[i0] = i2;
    hullNext[i2] = hullPrev[i1] = i0;
    hullTri[i0] = 0;
    hullTri[i1] = 1;
    hullTri[i2] = 2;
    hullHash.fill(-1);
    hullHash[this._hashKey(i0x, i0y)] = i0;
    hullHash[this._hashKey(i1x, i1y)] = i1;
    hullHash[this._hashKey(i2x, i2y)] = i2;
    this.trianglesLen = 0;
    this._addTriangle(i0, i1, i2, -1, -1, -1);
    for (let k = 0, xp, yp; k < this._ids.length; k++) {
      const i = this._ids[k];
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON)
        continue;
      xp = x;
      yp = y;
      if (i === i0 || i === i1 || i === i2)
        continue;
      let start = 0;
      for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
        start = hullHash[(key + j) % this._hashSize];
        if (start !== -1 && start !== hullNext[start])
          break;
      }
      start = hullPrev[start];
      let e = start, q;
      while (q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
        e = q;
        if (e === start) {
          e = -1;
          break;
        }
      }
      if (e === -1)
        continue;
      let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
      hullTri[i] = this._legalize(t + 2);
      hullTri[e] = t;
      hullSize++;
      let n2 = hullNext[e];
      while (q = hullNext[n2], orient2d(x, y, coords[2 * n2], coords[2 * n2 + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
        t = this._addTriangle(n2, i, q, hullTri[i], -1, hullTri[n2]);
        hullTri[i] = this._legalize(t + 2);
        hullNext[n2] = n2;
        hullSize--;
        n2 = q;
      }
      if (e === start) {
        while (q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
          t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
          this._legalize(t + 2);
          hullTri[q] = t;
          hullNext[e] = e;
          hullSize--;
          e = q;
        }
      }
      this._hullStart = hullPrev[i] = e;
      hullNext[e] = hullPrev[n2] = i;
      hullNext[i] = n2;
      hullHash[this._hashKey(x, y)] = i;
      hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
    }
    this.hull = new Uint32Array(hullSize);
    for (let i = 0, e = this._hullStart; i < hullSize; i++) {
      this.hull[i] = e;
      e = hullNext[e];
    }
    this.triangles = this._triangles.subarray(0, this.trianglesLen);
    this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
  }
  _hashKey(x, y) {
    return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
  }
  _legalize(a) {
    const { _triangles: triangles, _halfedges: halfedges, coords } = this;
    let i = 0;
    let ar = 0;
    while (true) {
      const b = halfedges[a];
      const a0 = a - a % 3;
      ar = a0 + (a + 2) % 3;
      if (b === -1) {
        if (i === 0)
          break;
        a = EDGE_STACK[--i];
        continue;
      }
      const b0 = b - b % 3;
      const al = a0 + (a + 1) % 3;
      const bl = b0 + (b + 2) % 3;
      const p0 = triangles[ar];
      const pr = triangles[a];
      const pl = triangles[al];
      const p1 = triangles[bl];
      const illegal = inCircle(
        coords[2 * p0],
        coords[2 * p0 + 1],
        coords[2 * pr],
        coords[2 * pr + 1],
        coords[2 * pl],
        coords[2 * pl + 1],
        coords[2 * p1],
        coords[2 * p1 + 1]
      );
      if (illegal) {
        triangles[a] = p1;
        triangles[b] = p0;
        const hbl = halfedges[bl];
        if (hbl === -1) {
          let e = this._hullStart;
          do {
            if (this._hullTri[e] === bl) {
              this._hullTri[e] = a;
              break;
            }
            e = this._hullPrev[e];
          } while (e !== this._hullStart);
        }
        this._link(a, hbl);
        this._link(b, halfedges[ar]);
        this._link(ar, bl);
        const br = b0 + (b + 1) % 3;
        if (i < EDGE_STACK.length) {
          EDGE_STACK[i++] = br;
        }
      } else {
        if (i === 0)
          break;
        a = EDGE_STACK[--i];
      }
    }
    return ar;
  }
  _link(a, b) {
    this._halfedges[a] = b;
    if (b !== -1)
      this._halfedges[b] = a;
  }
  // add a new triangle given vertex indices and adjacent half-edge ids
  _addTriangle(i0, i1, i2, a, b, c) {
    const t = this.trianglesLen;
    this._triangles[t] = i0;
    this._triangles[t + 1] = i1;
    this._triangles[t + 2] = i2;
    this._link(t, a);
    this._link(t + 1, b);
    this._link(t + 2, c);
    this.trianglesLen += 3;
    return t;
  }
}
function pseudoAngle(dx, dy) {
  const p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy > 0 ? 3 - p : 1 + p) / 4;
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  const dx = ax - px;
  const dy = ay - py;
  const ex = bx - px;
  const ey = by - py;
  const fx = cx - px;
  const fy = cy - py;
  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
function circumradius(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = (ey * bl - dy * cl) * d;
  const y = (dx * cl - ex * bl) * d;
  return x * x + y * y;
}
function circumcenter(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = ax + (ey * bl - dy * cl) * d;
  const y = ay + (dx * cl - ex * bl) * d;
  return { x, y };
}
function quicksort(ids, dists, left, right) {
  if (right - left <= 20) {
    for (let i = left + 1; i <= right; i++) {
      const temp = ids[i];
      const tempDist = dists[temp];
      let j = i - 1;
      while (j >= left && dists[ids[j]] > tempDist)
        ids[j + 1] = ids[j--];
      ids[j + 1] = temp;
    }
  } else {
    const median = left + right >> 1;
    let i = left + 1;
    let j = right;
    swap(ids, median, i);
    if (dists[ids[left]] > dists[ids[right]])
      swap(ids, left, right);
    if (dists[ids[i]] > dists[ids[right]])
      swap(ids, i, right);
    if (dists[ids[left]] > dists[ids[i]])
      swap(ids, left, i);
    const temp = ids[i];
    const tempDist = dists[temp];
    while (true) {
      do
        i++;
      while (dists[ids[i]] < tempDist);
      do
        j--;
      while (dists[ids[j]] > tempDist);
      if (j < i)
        break;
      swap(ids, i, j);
    }
    ids[left + 1] = ids[j];
    ids[j] = temp;
    if (right - i + 1 >= j - left) {
      quicksort(ids, dists, i, right);
      quicksort(ids, dists, left, j - 1);
    } else {
      quicksort(ids, dists, left, j - 1);
      quicksort(ids, dists, i, right);
    }
  }
}
function swap(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultGetX(p) {
  return p[0];
}
function defaultGetY(p) {
  return p[1];
}
const epsilon$1 = 1e-6;
class Path {
  constructor() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null;
    this._ = "";
  }
  moveTo(x, y) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  }
  lineTo(x, y) {
    this._ += `L${this._x1 = +x},${this._y1 = +y}`;
  }
  arc(x, y, r) {
    x = +x, y = +y, r = +r;
    const x02 = x + r;
    const y02 = y;
    if (r < 0)
      throw new Error("negative radius");
    if (this._x1 === null)
      this._ += `M${x02},${y02}`;
    else if (Math.abs(this._x1 - x02) > epsilon$1 || Math.abs(this._y1 - y02) > epsilon$1)
      this._ += "L" + x02 + "," + y02;
    if (!r)
      return;
    this._ += `A${r},${r},0,1,1,${x - r},${y}A${r},${r},0,1,1,${this._x1 = x02},${this._y1 = y02}`;
  }
  rect(x, y, w, h) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${+w}v${+h}h${-w}Z`;
  }
  value() {
    return this._ || null;
  }
}
class Polygon {
  constructor() {
    this._ = [];
  }
  moveTo(x, y) {
    this._.push([x, y]);
  }
  closePath() {
    this._.push(this._[0].slice());
  }
  lineTo(x, y) {
    this._.push([x, y]);
  }
  value() {
    return this._.length ? this._ : null;
  }
}
let Voronoi$1 = class Voronoi {
  constructor(delaunay, [xmin, ymin, xmax, ymax] = [0, 0, 960, 500]) {
    if (!((xmax = +xmax) >= (xmin = +xmin)) || !((ymax = +ymax) >= (ymin = +ymin)))
      throw new Error("invalid bounds");
    this.delaunay = delaunay;
    this._circumcenters = new Float64Array(delaunay.points.length * 2);
    this.vectors = new Float64Array(delaunay.points.length * 2);
    this.xmax = xmax, this.xmin = xmin;
    this.ymax = ymax, this.ymin = ymin;
    this._init();
  }
  update() {
    this.delaunay.update();
    this._init();
    return this;
  }
  _init() {
    const { delaunay: { points, hull, triangles }, vectors } = this;
    let bx, by;
    const circumcenters = this.circumcenters = this._circumcenters.subarray(0, triangles.length / 3 * 2);
    for (let i = 0, j = 0, n = triangles.length, x, y; i < n; i += 3, j += 2) {
      const t1 = triangles[i] * 2;
      const t2 = triangles[i + 1] * 2;
      const t3 = triangles[i + 2] * 2;
      const x13 = points[t1];
      const y13 = points[t1 + 1];
      const x2 = points[t2];
      const y2 = points[t2 + 1];
      const x3 = points[t3];
      const y3 = points[t3 + 1];
      const dx = x2 - x13;
      const dy = y2 - y13;
      const ex = x3 - x13;
      const ey = y3 - y13;
      const ab = (dx * ey - dy * ex) * 2;
      if (Math.abs(ab) < 1e-9) {
        if (bx === void 0) {
          bx = by = 0;
          for (const i2 of hull)
            bx += points[i2 * 2], by += points[i2 * 2 + 1];
          bx /= hull.length, by /= hull.length;
        }
        const a = 1e9 * Math.sign((bx - x13) * ey - (by - y13) * ex);
        x = (x13 + x3) / 2 - a * ey;
        y = (y13 + y3) / 2 + a * ex;
      } else {
        const d = 1 / ab;
        const bl = dx * dx + dy * dy;
        const cl = ex * ex + ey * ey;
        x = x13 + (ey * bl - dy * cl) * d;
        y = y13 + (dx * cl - ex * bl) * d;
      }
      circumcenters[j] = x;
      circumcenters[j + 1] = y;
    }
    let h = hull[hull.length - 1];
    let p0, p1 = h * 4;
    let x02, x12 = points[2 * h];
    let y02, y12 = points[2 * h + 1];
    vectors.fill(0);
    for (let i = 0; i < hull.length; ++i) {
      h = hull[i];
      p0 = p1, x02 = x12, y02 = y12;
      p1 = h * 4, x12 = points[2 * h], y12 = points[2 * h + 1];
      vectors[p0 + 2] = vectors[p1] = y02 - y12;
      vectors[p0 + 3] = vectors[p1 + 1] = x12 - x02;
    }
  }
  render(context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { delaunay: { halfedges, inedges, hull }, circumcenters, vectors } = this;
    if (hull.length <= 1)
      return null;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < i)
        continue;
      const ti = Math.floor(i / 3) * 2;
      const tj = Math.floor(j / 3) * 2;
      const xi = circumcenters[ti];
      const yi = circumcenters[ti + 1];
      const xj = circumcenters[tj];
      const yj = circumcenters[tj + 1];
      this._renderSegment(xi, yi, xj, yj, context);
    }
    let h0, h1 = hull[hull.length - 1];
    for (let i = 0; i < hull.length; ++i) {
      h0 = h1, h1 = hull[i];
      const t = Math.floor(inedges[h1] / 3) * 2;
      const x = circumcenters[t];
      const y = circumcenters[t + 1];
      const v = h0 * 4;
      const p = this._project(x, y, vectors[v + 2], vectors[v + 3]);
      if (p)
        this._renderSegment(x, y, p[0], p[1], context);
    }
    return buffer && buffer.value();
  }
  renderBounds(context) {
    const buffer = context == null ? context = new Path() : void 0;
    context.rect(this.xmin, this.ymin, this.xmax - this.xmin, this.ymax - this.ymin);
    return buffer && buffer.value();
  }
  renderCell(i, context) {
    const buffer = context == null ? context = new Path() : void 0;
    const points = this._clip(i);
    if (points === null || !points.length)
      return;
    context.moveTo(points[0], points[1]);
    let n = points.length;
    while (points[0] === points[n - 2] && points[1] === points[n - 1] && n > 1)
      n -= 2;
    for (let i2 = 2; i2 < n; i2 += 2) {
      if (points[i2] !== points[i2 - 2] || points[i2 + 1] !== points[i2 - 1])
        context.lineTo(points[i2], points[i2 + 1]);
    }
    context.closePath();
    return buffer && buffer.value();
  }
  *cellPolygons() {
    const { delaunay: { points } } = this;
    for (let i = 0, n = points.length / 2; i < n; ++i) {
      const cell = this.cellPolygon(i);
      if (cell)
        cell.index = i, yield cell;
    }
  }
  cellPolygon(i) {
    const polygon = new Polygon();
    this.renderCell(i, polygon);
    return polygon.value();
  }
  _renderSegment(x02, y02, x12, y12, context) {
    let S;
    const c0 = this._regioncode(x02, y02);
    const c1 = this._regioncode(x12, y12);
    if (c0 === 0 && c1 === 0) {
      context.moveTo(x02, y02);
      context.lineTo(x12, y12);
    } else if (S = this._clipSegment(x02, y02, x12, y12, c0, c1)) {
      context.moveTo(S[0], S[1]);
      context.lineTo(S[2], S[3]);
    }
  }
  contains(i, x, y) {
    if ((x = +x, x !== x) || (y = +y, y !== y))
      return false;
    return this.delaunay._step(i, x, y) === i;
  }
  *neighbors(i) {
    const ci = this._clip(i);
    if (ci)
      for (const j of this.delaunay.neighbors(i)) {
        const cj = this._clip(j);
        if (cj)
          loop:
            for (let ai = 0, li = ci.length; ai < li; ai += 2) {
              for (let aj = 0, lj = cj.length; aj < lj; aj += 2) {
                if (ci[ai] === cj[aj] && ci[ai + 1] === cj[aj + 1] && ci[(ai + 2) % li] === cj[(aj + lj - 2) % lj] && ci[(ai + 3) % li] === cj[(aj + lj - 1) % lj]) {
                  yield j;
                  break loop;
                }
              }
            }
      }
  }
  _cell(i) {
    const { circumcenters, delaunay: { inedges, halfedges, triangles } } = this;
    const e0 = inedges[i];
    if (e0 === -1)
      return null;
    const points = [];
    let e = e0;
    do {
      const t = Math.floor(e / 3);
      points.push(circumcenters[t * 2], circumcenters[t * 2 + 1]);
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i)
        break;
      e = halfedges[e];
    } while (e !== e0 && e !== -1);
    return points;
  }
  _clip(i) {
    if (i === 0 && this.delaunay.hull.length === 1) {
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    }
    const points = this._cell(i);
    if (points === null)
      return null;
    const { vectors: V } = this;
    const v = i * 4;
    return this._simplify(V[v] || V[v + 1] ? this._clipInfinite(i, points, V[v], V[v + 1], V[v + 2], V[v + 3]) : this._clipFinite(i, points));
  }
  _clipFinite(i, points) {
    const n = points.length;
    let P = null;
    let x02, y02, x12 = points[n - 2], y12 = points[n - 1];
    let c0, c1 = this._regioncode(x12, y12);
    let e0, e1 = 0;
    for (let j = 0; j < n; j += 2) {
      x02 = x12, y02 = y12, x12 = points[j], y12 = points[j + 1];
      c0 = c1, c1 = this._regioncode(x12, y12);
      if (c0 === 0 && c1 === 0) {
        e0 = e1, e1 = 0;
        if (P)
          P.push(x12, y12);
        else
          P = [x12, y12];
      } else {
        let S, sx0, sy0, sx1, sy1;
        if (c0 === 0) {
          if ((S = this._clipSegment(x02, y02, x12, y12, c0, c1)) === null)
            continue;
          [sx0, sy0, sx1, sy1] = S;
        } else {
          if ((S = this._clipSegment(x12, y12, x02, y02, c1, c0)) === null)
            continue;
          [sx1, sy1, sx0, sy0] = S;
          e0 = e1, e1 = this._edgecode(sx0, sy0);
          if (e0 && e1)
            this._edge(i, e0, e1, P, P.length);
          if (P)
            P.push(sx0, sy0);
          else
            P = [sx0, sy0];
        }
        e0 = e1, e1 = this._edgecode(sx1, sy1);
        if (e0 && e1)
          this._edge(i, e0, e1, P, P.length);
        if (P)
          P.push(sx1, sy1);
        else
          P = [sx1, sy1];
      }
    }
    if (P) {
      e0 = e1, e1 = this._edgecode(P[0], P[1]);
      if (e0 && e1)
        this._edge(i, e0, e1, P, P.length);
    } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    }
    return P;
  }
  _clipSegment(x02, y02, x12, y12, c0, c1) {
    const flip = c0 < c1;
    if (flip)
      [x02, y02, x12, y12, c0, c1] = [x12, y12, x02, y02, c1, c0];
    while (true) {
      if (c0 === 0 && c1 === 0)
        return flip ? [x12, y12, x02, y02] : [x02, y02, x12, y12];
      if (c0 & c1)
        return null;
      let x, y, c = c0 || c1;
      if (c & 8)
        x = x02 + (x12 - x02) * (this.ymax - y02) / (y12 - y02), y = this.ymax;
      else if (c & 4)
        x = x02 + (x12 - x02) * (this.ymin - y02) / (y12 - y02), y = this.ymin;
      else if (c & 2)
        y = y02 + (y12 - y02) * (this.xmax - x02) / (x12 - x02), x = this.xmax;
      else
        y = y02 + (y12 - y02) * (this.xmin - x02) / (x12 - x02), x = this.xmin;
      if (c0)
        x02 = x, y02 = y, c0 = this._regioncode(x02, y02);
      else
        x12 = x, y12 = y, c1 = this._regioncode(x12, y12);
    }
  }
  _clipInfinite(i, points, vx0, vy0, vxn, vyn) {
    let P = Array.from(points), p;
    if (p = this._project(P[0], P[1], vx0, vy0))
      P.unshift(p[0], p[1]);
    if (p = this._project(P[P.length - 2], P[P.length - 1], vxn, vyn))
      P.push(p[0], p[1]);
    if (P = this._clipFinite(i, P)) {
      for (let j = 0, n = P.length, c0, c1 = this._edgecode(P[n - 2], P[n - 1]); j < n; j += 2) {
        c0 = c1, c1 = this._edgecode(P[j], P[j + 1]);
        if (c0 && c1)
          j = this._edge(i, c0, c1, P, j), n = P.length;
      }
    } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
      P = [this.xmin, this.ymin, this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax];
    }
    return P;
  }
  _edge(i, e0, e1, P, j) {
    while (e0 !== e1) {
      let x, y;
      switch (e0) {
        case 5:
          e0 = 4;
          continue;
        case 4:
          e0 = 6, x = this.xmax, y = this.ymin;
          break;
        case 6:
          e0 = 2;
          continue;
        case 2:
          e0 = 10, x = this.xmax, y = this.ymax;
          break;
        case 10:
          e0 = 8;
          continue;
        case 8:
          e0 = 9, x = this.xmin, y = this.ymax;
          break;
        case 9:
          e0 = 1;
          continue;
        case 1:
          e0 = 5, x = this.xmin, y = this.ymin;
          break;
      }
      if ((P[j] !== x || P[j + 1] !== y) && this.contains(i, x, y)) {
        P.splice(j, 0, x, y), j += 2;
      }
    }
    return j;
  }
  _project(x02, y02, vx, vy) {
    let t = Infinity, c, x, y;
    if (vy < 0) {
      if (y02 <= this.ymin)
        return null;
      if ((c = (this.ymin - y02) / vy) < t)
        y = this.ymin, x = x02 + (t = c) * vx;
    } else if (vy > 0) {
      if (y02 >= this.ymax)
        return null;
      if ((c = (this.ymax - y02) / vy) < t)
        y = this.ymax, x = x02 + (t = c) * vx;
    }
    if (vx > 0) {
      if (x02 >= this.xmax)
        return null;
      if ((c = (this.xmax - x02) / vx) < t)
        x = this.xmax, y = y02 + (t = c) * vy;
    } else if (vx < 0) {
      if (x02 <= this.xmin)
        return null;
      if ((c = (this.xmin - x02) / vx) < t)
        x = this.xmin, y = y02 + (t = c) * vy;
    }
    return [x, y];
  }
  _edgecode(x, y) {
    return (x === this.xmin ? 1 : x === this.xmax ? 2 : 0) | (y === this.ymin ? 4 : y === this.ymax ? 8 : 0);
  }
  _regioncode(x, y) {
    return (x < this.xmin ? 1 : x > this.xmax ? 2 : 0) | (y < this.ymin ? 4 : y > this.ymax ? 8 : 0);
  }
  _simplify(P) {
    if (P && P.length > 4) {
      for (let i = 0; i < P.length; i += 2) {
        const j = (i + 2) % P.length, k = (i + 4) % P.length;
        if (P[i] === P[j] && P[j] === P[k] || P[i + 1] === P[j + 1] && P[j + 1] === P[k + 1]) {
          P.splice(j, 2), i -= 2;
        }
      }
      if (!P.length)
        P = null;
    }
    return P;
  }
};
const tau$1 = 2 * Math.PI, pow = Math.pow;
function pointX(p) {
  return p[0];
}
function pointY(p) {
  return p[1];
}
function collinear(d) {
  const { triangles, coords } = d;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = 2 * triangles[i], b = 2 * triangles[i + 1], c = 2 * triangles[i + 2], cross = (coords[c] - coords[a]) * (coords[b + 1] - coords[a + 1]) - (coords[b] - coords[a]) * (coords[c + 1] - coords[a + 1]);
    if (cross > 1e-10)
      return false;
  }
  return true;
}
function jitter(x, y, r) {
  return [x + Math.sin(x + y) * r, y + Math.cos(x - y) * r];
}
class Delaunay {
  static from(points, fx = pointX, fy = pointY, that) {
    return new Delaunay("length" in points ? flatArray(points, fx, fy, that) : Float64Array.from(flatIterable(points, fx, fy, that)));
  }
  constructor(points) {
    this._delaunator = new Delaunator(points);
    this.inedges = new Int32Array(points.length / 2);
    this._hullIndex = new Int32Array(points.length / 2);
    this.points = this._delaunator.coords;
    this._init();
  }
  update() {
    this._delaunator.update();
    this._init();
    return this;
  }
  _init() {
    const d = this._delaunator, points = this.points;
    if (d.hull && d.hull.length > 2 && collinear(d)) {
      this.collinear = Int32Array.from({ length: points.length / 2 }, (_, i) => i).sort((i, j) => points[2 * i] - points[2 * j] || points[2 * i + 1] - points[2 * j + 1]);
      const e = this.collinear[0], f2 = this.collinear[this.collinear.length - 1], bounds = [points[2 * e], points[2 * e + 1], points[2 * f2], points[2 * f2 + 1]], r = 1e-8 * Math.hypot(bounds[3] - bounds[1], bounds[2] - bounds[0]);
      for (let i = 0, n = points.length / 2; i < n; ++i) {
        const p = jitter(points[2 * i], points[2 * i + 1], r);
        points[2 * i] = p[0];
        points[2 * i + 1] = p[1];
      }
      this._delaunator = new Delaunator(points);
    } else {
      delete this.collinear;
    }
    const halfedges = this.halfedges = this._delaunator.halfedges;
    const hull = this.hull = this._delaunator.hull;
    const triangles = this.triangles = this._delaunator.triangles;
    const inedges = this.inedges.fill(-1);
    const hullIndex = this._hullIndex.fill(-1);
    for (let e = 0, n = halfedges.length; e < n; ++e) {
      const p = triangles[e % 3 === 2 ? e - 2 : e + 1];
      if (halfedges[e] === -1 || inedges[p] === -1)
        inedges[p] = e;
    }
    for (let i = 0, n = hull.length; i < n; ++i) {
      hullIndex[hull[i]] = i;
    }
    if (hull.length <= 2 && hull.length > 0) {
      this.triangles = new Int32Array(3).fill(-1);
      this.halfedges = new Int32Array(3).fill(-1);
      this.triangles[0] = hull[0];
      inedges[hull[0]] = 1;
      if (hull.length === 2) {
        inedges[hull[1]] = 0;
        this.triangles[1] = hull[1];
        this.triangles[2] = hull[1];
      }
    }
  }
  voronoi(bounds) {
    return new Voronoi$1(this, bounds);
  }
  *neighbors(i) {
    const { inedges, hull, _hullIndex, halfedges, triangles, collinear: collinear2 } = this;
    if (collinear2) {
      const l = collinear2.indexOf(i);
      if (l > 0)
        yield collinear2[l - 1];
      if (l < collinear2.length - 1)
        yield collinear2[l + 1];
      return;
    }
    const e0 = inedges[i];
    if (e0 === -1)
      return;
    let e = e0, p0 = -1;
    do {
      yield p0 = triangles[e];
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i)
        return;
      e = halfedges[e];
      if (e === -1) {
        const p = hull[(_hullIndex[i] + 1) % hull.length];
        if (p !== p0)
          yield p;
        return;
      }
    } while (e !== e0);
  }
  find(x, y, i = 0) {
    if ((x = +x, x !== x) || (y = +y, y !== y))
      return -1;
    const i0 = i;
    let c;
    while ((c = this._step(i, x, y)) >= 0 && c !== i && c !== i0)
      i = c;
    return c;
  }
  _step(i, x, y) {
    const { inedges, hull, _hullIndex, halfedges, triangles, points } = this;
    if (inedges[i] === -1 || !points.length)
      return (i + 1) % (points.length >> 1);
    let c = i;
    let dc = pow(x - points[i * 2], 2) + pow(y - points[i * 2 + 1], 2);
    const e0 = inedges[i];
    let e = e0;
    do {
      let t = triangles[e];
      const dt = pow(x - points[t * 2], 2) + pow(y - points[t * 2 + 1], 2);
      if (dt < dc)
        dc = dt, c = t;
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i)
        break;
      e = halfedges[e];
      if (e === -1) {
        e = hull[(_hullIndex[i] + 1) % hull.length];
        if (e !== t) {
          if (pow(x - points[e * 2], 2) + pow(y - points[e * 2 + 1], 2) < dc)
            return e;
        }
        break;
      }
    } while (e !== e0);
    return c;
  }
  render(context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { points, halfedges, triangles } = this;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < i)
        continue;
      const ti = triangles[i] * 2;
      const tj = triangles[j] * 2;
      context.moveTo(points[ti], points[ti + 1]);
      context.lineTo(points[tj], points[tj + 1]);
    }
    this.renderHull(context);
    return buffer && buffer.value();
  }
  renderPoints(context, r) {
    if (r === void 0 && (!context || typeof context.moveTo !== "function"))
      r = context, context = null;
    r = r == void 0 ? 2 : +r;
    const buffer = context == null ? context = new Path() : void 0;
    const { points } = this;
    for (let i = 0, n = points.length; i < n; i += 2) {
      const x = points[i], y = points[i + 1];
      context.moveTo(x + r, y);
      context.arc(x, y, r, 0, tau$1);
    }
    return buffer && buffer.value();
  }
  renderHull(context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { hull, points } = this;
    const h = hull[0] * 2, n = hull.length;
    context.moveTo(points[h], points[h + 1]);
    for (let i = 1; i < n; ++i) {
      const h2 = 2 * hull[i];
      context.lineTo(points[h2], points[h2 + 1]);
    }
    context.closePath();
    return buffer && buffer.value();
  }
  hullPolygon() {
    const polygon = new Polygon();
    this.renderHull(polygon);
    return polygon.value();
  }
  renderTriangle(i, context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { points, triangles } = this;
    const t0 = triangles[i *= 3] * 2;
    const t1 = triangles[i + 1] * 2;
    const t2 = triangles[i + 2] * 2;
    context.moveTo(points[t0], points[t0 + 1]);
    context.lineTo(points[t1], points[t1 + 1]);
    context.lineTo(points[t2], points[t2 + 1]);
    context.closePath();
    return buffer && buffer.value();
  }
  *trianglePolygons() {
    const { triangles } = this;
    for (let i = 0, n = triangles.length / 3; i < n; ++i) {
      yield this.trianglePolygon(i);
    }
  }
  trianglePolygon(i) {
    const polygon = new Polygon();
    this.renderTriangle(i, polygon);
    return polygon.value();
  }
}
function flatArray(points, fx, fy, that) {
  const n = points.length;
  const array = new Float64Array(n * 2);
  for (let i = 0; i < n; ++i) {
    const p = points[i];
    array[i * 2] = fx.call(that, p, i, points);
    array[i * 2 + 1] = fy.call(that, p, i, points);
  }
  return array;
}
function* flatIterable(points, fx, fy, that) {
  let i = 0;
  for (const p of points) {
    yield fx.call(that, p, i, points);
    yield fy.call(that, p, i, points);
    ++i;
  }
}
const Voronoi2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let points;
  let voronoi;
  let $$restProps = compute_rest_props($$props, ["data", "classes"]);
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $yGet, $$unsubscribe_yGet;
  let $xGet, $$unsubscribe_xGet;
  let $flatData, $$unsubscribe_flatData;
  const { flatData, xGet, yGet, width, height } = getContext("LayerCake");
  $$unsubscribe_flatData = subscribe(flatData, (value) => $flatData = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  let { data = void 0 } = $$props;
  let { classes = {} } = $$props;
  createEventDispatcher();
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  points = (data ?? $flatData).map((d) => {
    const xValue = $xGet(d);
    const yValue = $yGet(d);
    const x = Array.isArray(xValue) ? min(xValue) : xValue;
    const y = Array.isArray(yValue) ? min(yValue) : yValue;
    const point = [x, y];
    point.data = d;
    return point;
  });
  voronoi = Delaunay.from(points).voronoi([0, 0, Math.max($width, 0), Math.max($height, 0)]);
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_yGet();
  $$unsubscribe_xGet();
  $$unsubscribe_flatData();
  return `<g${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls(classes.root, $$props.class))
      }
    ],
    {}
  )}>${each(points, (point, i) => {
    return `<path${add_attribute("d", voronoi.renderCell(i), 0)}${add_attribute("class", cls("fill-transparent", classes.path), 0)}></path>`;
  })}</g>`;
});
function localPoint(node, event) {
  if (!node || !event)
    return null;
  const coords = getPointFromEvent(event);
  const svg = isSVGElement(node) ? node.ownerSVGElement : node;
  const screenCTM = isSVGGraphicsElement(svg) ? svg.getScreenCTM() : null;
  if (isSVGSVGElement(svg) && screenCTM) {
    let point = svg.createSVGPoint();
    point.x = coords.x;
    point.y = coords.y;
    point = point.matrixTransform(screenCTM.inverse());
    return {
      x: point.x,
      y: point.y
    };
  }
  const rect = node.getBoundingClientRect();
  return {
    x: coords.x - rect.left - node.clientLeft,
    y: coords.y - rect.top - node.clientTop
  };
}
function getPointFromEvent(event) {
  if (!event)
    return { x: 0, y: 0 };
  if (isTouchEvent(event)) {
    return event.changedTouches.length > 0 ? {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    } : { x: 0, y: 0 };
  }
  return {
    x: event.clientX,
    y: event.clientY
  };
}
function quadtreeRects(quadtree2, showLeaves = true) {
  const rects = [];
  quadtree2.visit((node, x02, y02, x12, y12) => {
    if (showLeaves || Array.isArray(node)) {
      rects.push({ x: x02, y: y02, width: x12 - x02, height: y12 - y02 });
    }
  });
  return rects;
}
const tooltipContextKey = Symbol();
function setTooltipContext(tooltip) {
  setContext(tooltipContextKey, tooltip);
}
const TooltipContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let bisectX;
  let bisectY;
  let $yRange, $$unsubscribe_yRange;
  let $yScale, $$unsubscribe_yScale;
  let $xRange, $$unsubscribe_xRange;
  let $xScale, $$unsubscribe_xScale;
  let $yGet, $$unsubscribe_yGet;
  let $xGet, $$unsubscribe_xGet;
  let $flatData, $$unsubscribe_flatData;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $tooltip, $$unsubscribe_tooltip;
  let $y, $$unsubscribe_y;
  let $padding, $$unsubscribe_padding;
  let $x, $$unsubscribe_x;
  const { flatData, x, xScale, xGet, xRange, y, yScale, yGet, yRange, width, height, padding } = getContext("LayerCake");
  $$unsubscribe_flatData = subscribe(flatData, (value) => $flatData = value);
  $$unsubscribe_x = subscribe(x, (value) => $x = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_xRange = subscribe(xRange, (value) => $xRange = value);
  $$unsubscribe_y = subscribe(y, (value) => $y = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  let { mode = "bisect-x" } = $$props;
  let { findTooltipData = "closest" } = $$props;
  let { raiseTarget = false } = $$props;
  let { radius = Infinity } = $$props;
  let { debug = false } = $$props;
  let { onClick = () => {
  } } = $$props;
  const tooltip = writable({
    y: 0,
    x: 0,
    data: null,
    show: showTooltip,
    hide: hideTooltip
  });
  $$unsubscribe_tooltip = subscribe(tooltip, (value) => $tooltip = value);
  setTooltipContext(tooltip);
  let hideTimeoutId;
  function findData(previousValue, currentValue, valueAtPoint, accessor) {
    switch (findTooltipData) {
      case "closest":
        if (currentValue === void 0) {
          return previousValue;
        } else if (previousValue === void 0) {
          return currentValue;
        } else {
          return Number(valueAtPoint) - Number(accessor(previousValue)) > Number(accessor(currentValue)) - Number(valueAtPoint) ? currentValue : previousValue;
        }
      case "left":
        return previousValue;
      case "right":
      default:
        return currentValue;
    }
  }
  function showTooltip(event, tooltipData) {
    clearTimeout(hideTimeoutId);
    const referenceNode = event.target.closest(".layercake-container");
    const point = localPoint(referenceNode, event);
    const localX = point?.x ?? 0;
    const localY = point?.y ?? 0;
    if (tooltipData == null) {
      switch (mode) {
        case "quadtree": {
          tooltipData = quadtree$1.find(localX, localY, radius);
          break;
        }
        case "bisect-band": {
          const xValueAtPoint = scaleInvert($xScale, localX);
          const yValueAtPoint = scaleInvert($yScale, localY);
          if (isScaleBand($xScale)) {
            const bandData = $flatData.filter((d) => $x(d) === xValueAtPoint).sort(sortFunc($y));
            const index = bisectY(bandData, yValueAtPoint, 1);
            const previousValue = bandData[index - 1];
            const currentValue = bandData[index];
            tooltipData = findData(previousValue, currentValue, yValueAtPoint, $y);
          } else if (isScaleBand($yScale)) {
            const bandData = $flatData.filter((d) => $y(d) === yValueAtPoint).sort(sortFunc($x));
            const index = bisectX(bandData, xValueAtPoint, 1);
            const previousValue = bandData[index - 1];
            const currentValue = bandData[index];
            tooltipData = findData(previousValue, currentValue, xValueAtPoint, $x);
          } else
            ;
          break;
        }
        case "bisect-x": {
          const xValueAtPoint = scaleInvert($xScale, localX - $padding.left);
          const index = bisectX($flatData, xValueAtPoint, 1);
          const previousValue = $flatData[index - 1];
          const currentValue = $flatData[index];
          tooltipData = findData(previousValue, currentValue, xValueAtPoint, $x);
          break;
        }
        case "bisect-y": {
          const yValueAtPoint = scaleInvert($yScale, localY - $padding.top);
          const index = bisectY($flatData, yValueAtPoint, 1);
          const previousValue = $flatData[index - 1];
          const currentValue = $flatData[index];
          tooltipData = findData(previousValue, currentValue, yValueAtPoint, $y);
          break;
        }
      }
    }
    if (tooltipData) {
      if (raiseTarget) {
        raise(event.target);
      }
      set_store_value(
        tooltip,
        $tooltip = {
          ...$tooltip,
          x: localX,
          y: localY,
          data: tooltipData
        },
        $tooltip
      );
    } else {
      hideTooltip();
    }
  }
  function hideTooltip() {
    hideTimeoutId = setTimeout(() => {
      set_store_value(tooltip, $tooltip = { ...$tooltip, data: null }, $tooltip);
    });
  }
  let quadtree$1;
  let rects = [];
  if ($$props.mode === void 0 && $$bindings.mode && mode !== void 0)
    $$bindings.mode(mode);
  if ($$props.findTooltipData === void 0 && $$bindings.findTooltipData && findTooltipData !== void 0)
    $$bindings.findTooltipData(findTooltipData);
  if ($$props.raiseTarget === void 0 && $$bindings.raiseTarget && raiseTarget !== void 0)
    $$bindings.raiseTarget(raiseTarget);
  if ($$props.radius === void 0 && $$bindings.radius && radius !== void 0)
    $$bindings.radius(radius);
  if ($$props.debug === void 0 && $$bindings.debug && debug !== void 0)
    $$bindings.debug(debug);
  if ($$props.onClick === void 0 && $$bindings.onClick && onClick !== void 0)
    $$bindings.onClick(onClick);
  bisectX = bisector((d) => {
    const value = $x(d);
    if (Array.isArray(value)) {
      return value[0];
    } else {
      return value;
    }
  }).left;
  bisectY = bisector((d) => {
    const value = $y(d);
    if (Array.isArray(value)) {
      return value[0];
    } else {
      return value;
    }
  }).left;
  {
    if (mode === "quadtree") {
      quadtree$1 = quadtree().extent([[0, 0], [$width, $height]]).x((d) => {
        const value = $xGet(d);
        if (Array.isArray(value)) {
          return min(value);
        } else {
          return value;
        }
      }).y((d) => {
        const value = $yGet(d);
        if (Array.isArray(value)) {
          return min(value);
        } else {
          return value;
        }
      }).addAll($flatData);
    }
  }
  {
    if (mode === "bounds" || mode === "band") {
      rects = $flatData.map((d) => {
        const xValue = $xGet(d);
        const yValue = $yGet(d);
        const x2 = Array.isArray(xValue) ? xValue[0] : xValue;
        const y2 = Array.isArray(yValue) ? yValue[0] : yValue;
        const xOffset = isScaleBand($xScale) ? $xScale.padding() * $xScale.step() / 2 : 0;
        const yOffset = isScaleBand($yScale) ? $yScale.padding() * $yScale.step() / 2 : 0;
        const fullWidth = max($xRange) - min($xRange);
        const fullHeight = max($yRange) - min($yRange);
        if (mode === "band") {
          return {
            x: isScaleBand($xScale) ? x2 - xOffset : min($xRange),
            y: isScaleBand($yScale) ? y2 - yOffset : min($yRange),
            width: isScaleBand($xScale) ? $xScale.step() : fullWidth,
            height: isScaleBand($yScale) ? $yScale.step() : fullHeight,
            data: d
          };
        } else if (mode === "bounds") {
          return {
            x: isScaleBand($xScale) || Array.isArray(xValue) ? x2 - xOffset : min($xRange),
            // y: isScaleBand($yScale) || Array.isArray(yValue) ? y - yOffset : min($yRange),
            y: y2 - yOffset,
            width: Array.isArray(xValue) ? xValue[1] - xValue[0] : isScaleBand($xScale) ? $xScale.step() : min($xRange) + x2,
            height: Array.isArray(yValue) ? yValue[1] - yValue[0] : isScaleBand($yScale) ? $yScale.step() : max($yRange) - y2,
            data: d
          };
        }
      }).sort(sortFunc("x"));
    }
  }
  $$unsubscribe_yRange();
  $$unsubscribe_yScale();
  $$unsubscribe_xRange();
  $$unsubscribe_xScale();
  $$unsubscribe_yGet();
  $$unsubscribe_xGet();
  $$unsubscribe_flatData();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_tooltip();
  $$unsubscribe_y();
  $$unsubscribe_padding();
  $$unsubscribe_x();
  return `${slots.default ? slots.default({ tooltip: $tooltip }) : ``} ${["bisect-x", "bisect-y", "bisect-band", "quadtree"].includes(mode) ? `${validate_component(Html, "Html").$$render($$result, {}, {}, {
    default: () => {
      return `<div${add_attribute("class", cls("tooltip-trigger absolute", debug && "bg-danger/10 outline outline-danger"), 0)}${add_styles({
        "width": `${$width}px`,
        "height": `${$height}px`
      })}></div>`;
    }
  })}` : `${mode === "voronoi" ? `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Voronoi2, "Voronoi").$$render(
        $$result,
        {
          classes: {
            path: cls(debug && "fill-danger/10 stroke-danger")
          }
        },
        {},
        {}
      )}`;
    }
  })}` : `${mode === "bounds" || mode === "band" ? `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
    default: () => {
      return `<g class="tooltip-rects">${each(rects, (rect) => {
        return `<rect${add_attribute("x", rect.x, 0)}${add_attribute("y", rect.y, 0)}${add_attribute("width", rect.width, 0)}${add_attribute("height", rect.height, 0)}${add_attribute(
          "class",
          cls(debug ? "fill-danger/10 stroke-danger" : "fill-transparent"),
          0
        )}></rect>`;
      })}</g>`;
    }
  })}` : ``}`}`} ${mode === "quadtree" && debug ? `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(ChartClipPath, "ChartClipPath").$$render($$result, {}, {}, {
        default: () => {
          return `<g class="tooltip-quadtree">${each(quadtreeRects(quadtree$1, false), (rect) => {
            return `<rect${add_attribute("x", rect.x, 0)}${add_attribute("y", rect.y, 0)}${add_attribute("width", rect.width, 0)}${add_attribute("height", rect.height, 0)}${add_attribute(
              "class",
              cls(debug ? "fill-danger/10 stroke-danger" : "fill-transparent"),
              0
            )}></rect>`;
          })}</g>`;
        }
      })}`;
    }
  })}` : ``}`;
});
var epsilon = 1e-6;
var epsilon2 = 1e-12;
var pi = Math.PI;
var halfPi = pi / 2;
var quarterPi = pi / 4;
var tau = pi * 2;
var degrees = 180 / pi;
var radians = pi / 180;
var abs = Math.abs;
var atan = Math.atan;
var atan2 = Math.atan2;
var cos = Math.cos;
var exp = Math.exp;
var log = Math.log;
var sin = Math.sin;
var sign = Math.sign || function(x) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
};
var sqrt = Math.sqrt;
var tan = Math.tan;
function acos(x) {
  return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
}
function asin(x) {
  return x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);
}
function noop() {
}
function streamGeometry(geometry, stream) {
  if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
    streamGeometryType[geometry.type](geometry, stream);
  }
}
var streamObjectType = {
  Feature: function(object, stream) {
    streamGeometry(object.geometry, stream);
  },
  FeatureCollection: function(object, stream) {
    var features = object.features, i = -1, n = features.length;
    while (++i < n)
      streamGeometry(features[i].geometry, stream);
  }
};
var streamGeometryType = {
  Sphere: function(object, stream) {
    stream.sphere();
  },
  Point: function(object, stream) {
    object = object.coordinates;
    stream.point(object[0], object[1], object[2]);
  },
  MultiPoint: function(object, stream) {
    var coordinates = object.coordinates, i = -1, n = coordinates.length;
    while (++i < n)
      object = coordinates[i], stream.point(object[0], object[1], object[2]);
  },
  LineString: function(object, stream) {
    streamLine(object.coordinates, stream, 0);
  },
  MultiLineString: function(object, stream) {
    var coordinates = object.coordinates, i = -1, n = coordinates.length;
    while (++i < n)
      streamLine(coordinates[i], stream, 0);
  },
  Polygon: function(object, stream) {
    streamPolygon(object.coordinates, stream);
  },
  MultiPolygon: function(object, stream) {
    var coordinates = object.coordinates, i = -1, n = coordinates.length;
    while (++i < n)
      streamPolygon(coordinates[i], stream);
  },
  GeometryCollection: function(object, stream) {
    var geometries = object.geometries, i = -1, n = geometries.length;
    while (++i < n)
      streamGeometry(geometries[i], stream);
  }
};
function streamLine(coordinates, stream, closed) {
  var i = -1, n = coordinates.length - closed, coordinate;
  stream.lineStart();
  while (++i < n)
    coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
  stream.lineEnd();
}
function streamPolygon(coordinates, stream) {
  var i = -1, n = coordinates.length;
  stream.polygonStart();
  while (++i < n)
    streamLine(coordinates[i], stream, 1);
  stream.polygonEnd();
}
function geoStream(object, stream) {
  if (object && streamObjectType.hasOwnProperty(object.type)) {
    streamObjectType[object.type](object, stream);
  } else {
    streamGeometry(object, stream);
  }
}
function spherical(cartesian2) {
  return [atan2(cartesian2[1], cartesian2[0]), asin(cartesian2[2])];
}
function cartesian(spherical2) {
  var lambda = spherical2[0], phi = spherical2[1], cosPhi = cos(phi);
  return [cosPhi * cos(lambda), cosPhi * sin(lambda), sin(phi)];
}
function cartesianDot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cartesianCross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function cartesianAddInPlace(a, b) {
  a[0] += b[0], a[1] += b[1], a[2] += b[2];
}
function cartesianScale(vector, k) {
  return [vector[0] * k, vector[1] * k, vector[2] * k];
}
function cartesianNormalizeInPlace(d) {
  var l = sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
  d[0] /= l, d[1] /= l, d[2] /= l;
}
function compose(a, b) {
  function compose2(x, y) {
    return x = a(x, y), b(x[0], x[1]);
  }
  if (a.invert && b.invert)
    compose2.invert = function(x, y) {
      return x = b.invert(x, y), x && a.invert(x[0], x[1]);
    };
  return compose2;
}
function rotationIdentity(lambda, phi) {
  if (abs(lambda) > pi)
    lambda -= Math.round(lambda / tau) * tau;
  return [lambda, phi];
}
rotationIdentity.invert = rotationIdentity;
function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
  return (deltaLambda %= tau) ? deltaPhi || deltaGamma ? compose(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma)) : rotationLambda(deltaLambda) : deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma) : rotationIdentity;
}
function forwardRotationLambda(deltaLambda) {
  return function(lambda, phi) {
    lambda += deltaLambda;
    if (abs(lambda) > pi)
      lambda -= Math.round(lambda / tau) * tau;
    return [lambda, phi];
  };
}
function rotationLambda(deltaLambda) {
  var rotation2 = forwardRotationLambda(deltaLambda);
  rotation2.invert = forwardRotationLambda(-deltaLambda);
  return rotation2;
}
function rotationPhiGamma(deltaPhi, deltaGamma) {
  var cosDeltaPhi = cos(deltaPhi), sinDeltaPhi = sin(deltaPhi), cosDeltaGamma = cos(deltaGamma), sinDeltaGamma = sin(deltaGamma);
  function rotation2(lambda, phi) {
    var cosPhi = cos(phi), x = cos(lambda) * cosPhi, y = sin(lambda) * cosPhi, z = sin(phi), k = z * cosDeltaPhi + x * sinDeltaPhi;
    return [
      atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
      asin(k * cosDeltaGamma + y * sinDeltaGamma)
    ];
  }
  rotation2.invert = function(lambda, phi) {
    var cosPhi = cos(phi), x = cos(lambda) * cosPhi, y = sin(lambda) * cosPhi, z = sin(phi), k = z * cosDeltaGamma - y * sinDeltaGamma;
    return [
      atan2(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
      asin(k * cosDeltaPhi - x * sinDeltaPhi)
    ];
  };
  return rotation2;
}
function rotation(rotate) {
  rotate = rotateRadians(rotate[0] * radians, rotate[1] * radians, rotate.length > 2 ? rotate[2] * radians : 0);
  function forward(coordinates) {
    coordinates = rotate(coordinates[0] * radians, coordinates[1] * radians);
    return coordinates[0] *= degrees, coordinates[1] *= degrees, coordinates;
  }
  forward.invert = function(coordinates) {
    coordinates = rotate.invert(coordinates[0] * radians, coordinates[1] * radians);
    return coordinates[0] *= degrees, coordinates[1] *= degrees, coordinates;
  };
  return forward;
}
function circleStream(stream, radius, delta, direction, t0, t1) {
  if (!delta)
    return;
  var cosRadius = cos(radius), sinRadius = sin(radius), step = direction * delta;
  if (t0 == null) {
    t0 = radius + direction * tau;
    t1 = radius - step / 2;
  } else {
    t0 = circleRadius(cosRadius, t0);
    t1 = circleRadius(cosRadius, t1);
    if (direction > 0 ? t0 < t1 : t0 > t1)
      t0 += direction * tau;
  }
  for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
    point = spherical([cosRadius, -sinRadius * cos(t), -sinRadius * sin(t)]);
    stream.point(point[0], point[1]);
  }
}
function circleRadius(cosRadius, point) {
  point = cartesian(point), point[0] -= cosRadius;
  cartesianNormalizeInPlace(point);
  var radius = acos(-point[1]);
  return ((-point[2] < 0 ? -radius : radius) + tau - epsilon) % tau;
}
function clipBuffer() {
  var lines = [], line;
  return {
    point: function(x, y, m) {
      line.push([x, y, m]);
    },
    lineStart: function() {
      lines.push(line = []);
    },
    lineEnd: noop,
    rejoin: function() {
      if (lines.length > 1)
        lines.push(lines.pop().concat(lines.shift()));
    },
    result: function() {
      var result = lines;
      lines = [];
      line = null;
      return result;
    }
  };
}
function pointEqual(a, b) {
  return abs(a[0] - b[0]) < epsilon && abs(a[1] - b[1]) < epsilon;
}
function Intersection(point, points, other, entry) {
  this.x = point;
  this.z = points;
  this.o = other;
  this.e = entry;
  this.v = false;
  this.n = this.p = null;
}
function clipRejoin(segments, compareIntersection2, startInside, interpolate, stream) {
  var subject = [], clip2 = [], i, n;
  segments.forEach(function(segment) {
    if ((n2 = segment.length - 1) <= 0)
      return;
    var n2, p0 = segment[0], p1 = segment[n2], x;
    if (pointEqual(p0, p1)) {
      if (!p0[2] && !p1[2]) {
        stream.lineStart();
        for (i = 0; i < n2; ++i)
          stream.point((p0 = segment[i])[0], p0[1]);
        stream.lineEnd();
        return;
      }
      p1[0] += 2 * epsilon;
    }
    subject.push(x = new Intersection(p0, segment, null, true));
    clip2.push(x.o = new Intersection(p0, null, x, false));
    subject.push(x = new Intersection(p1, segment, null, false));
    clip2.push(x.o = new Intersection(p1, null, x, true));
  });
  if (!subject.length)
    return;
  clip2.sort(compareIntersection2);
  link(subject);
  link(clip2);
  for (i = 0, n = clip2.length; i < n; ++i) {
    clip2[i].e = startInside = !startInside;
  }
  var start = subject[0], points, point;
  while (1) {
    var current = start, isSubject = true;
    while (current.v)
      if ((current = current.n) === start)
        return;
    points = current.z;
    stream.lineStart();
    do {
      current.v = current.o.v = true;
      if (current.e) {
        if (isSubject) {
          for (i = 0, n = points.length; i < n; ++i)
            stream.point((point = points[i])[0], point[1]);
        } else {
          interpolate(current.x, current.n.x, 1, stream);
        }
        current = current.n;
      } else {
        if (isSubject) {
          points = current.p.z;
          for (i = points.length - 1; i >= 0; --i)
            stream.point((point = points[i])[0], point[1]);
        } else {
          interpolate(current.x, current.p.x, -1, stream);
        }
        current = current.p;
      }
      current = current.o;
      points = current.z;
      isSubject = !isSubject;
    } while (!current.v);
    stream.lineEnd();
  }
}
function link(array) {
  if (!(n = array.length))
    return;
  var n, i = 0, a = array[0], b;
  while (++i < n) {
    a.n = b = array[i];
    b.p = a;
    a = b;
  }
  a.n = b = array[0];
  b.p = a;
}
function longitude(point) {
  return abs(point[0]) <= pi ? point[0] : sign(point[0]) * ((abs(point[0]) + pi) % tau - pi);
}
function polygonContains(polygon, point) {
  var lambda = longitude(point), phi = point[1], sinPhi = sin(phi), normal = [sin(lambda), -cos(lambda), 0], angle = 0, winding = 0;
  var sum2 = new Adder();
  if (sinPhi === 1)
    phi = halfPi + epsilon;
  else if (sinPhi === -1)
    phi = -halfPi - epsilon;
  for (var i = 0, n = polygon.length; i < n; ++i) {
    if (!(m = (ring = polygon[i]).length))
      continue;
    var ring, m, point0 = ring[m - 1], lambda0 = longitude(point0), phi0 = point0[1] / 2 + quarterPi, sinPhi0 = sin(phi0), cosPhi0 = cos(phi0);
    for (var j = 0; j < m; ++j, lambda0 = lambda1, sinPhi0 = sinPhi1, cosPhi0 = cosPhi1, point0 = point1) {
      var point1 = ring[j], lambda1 = longitude(point1), phi1 = point1[1] / 2 + quarterPi, sinPhi1 = sin(phi1), cosPhi1 = cos(phi1), delta = lambda1 - lambda0, sign2 = delta >= 0 ? 1 : -1, absDelta = sign2 * delta, antimeridian = absDelta > pi, k = sinPhi0 * sinPhi1;
      sum2.add(atan2(k * sign2 * sin(absDelta), cosPhi0 * cosPhi1 + k * cos(absDelta)));
      angle += antimeridian ? delta + sign2 * tau : delta;
      if (antimeridian ^ lambda0 >= lambda ^ lambda1 >= lambda) {
        var arc = cartesianCross(cartesian(point0), cartesian(point1));
        cartesianNormalizeInPlace(arc);
        var intersection = cartesianCross(normal, arc);
        cartesianNormalizeInPlace(intersection);
        var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin(intersection[2]);
        if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
          winding += antimeridian ^ delta >= 0 ? 1 : -1;
        }
      }
    }
  }
  return (angle < -epsilon || angle < epsilon && sum2 < -epsilon2) ^ winding & 1;
}
function clip(pointVisible, clipLine2, interpolate, start) {
  return function(sink) {
    var line = clipLine2(sink), ringBuffer = clipBuffer(), ringSink = clipLine2(ringBuffer), polygonStarted = false, polygon, segments, ring;
    var clip2 = {
      point,
      lineStart,
      lineEnd,
      polygonStart: function() {
        clip2.point = pointRing;
        clip2.lineStart = ringStart;
        clip2.lineEnd = ringEnd;
        segments = [];
        polygon = [];
      },
      polygonEnd: function() {
        clip2.point = point;
        clip2.lineStart = lineStart;
        clip2.lineEnd = lineEnd;
        segments = merge(segments);
        var startInside = polygonContains(polygon, start);
        if (segments.length) {
          if (!polygonStarted)
            sink.polygonStart(), polygonStarted = true;
          clipRejoin(segments, compareIntersection, startInside, interpolate, sink);
        } else if (startInside) {
          if (!polygonStarted)
            sink.polygonStart(), polygonStarted = true;
          sink.lineStart();
          interpolate(null, null, 1, sink);
          sink.lineEnd();
        }
        if (polygonStarted)
          sink.polygonEnd(), polygonStarted = false;
        segments = polygon = null;
      },
      sphere: function() {
        sink.polygonStart();
        sink.lineStart();
        interpolate(null, null, 1, sink);
        sink.lineEnd();
        sink.polygonEnd();
      }
    };
    function point(lambda, phi) {
      if (pointVisible(lambda, phi))
        sink.point(lambda, phi);
    }
    function pointLine(lambda, phi) {
      line.point(lambda, phi);
    }
    function lineStart() {
      clip2.point = pointLine;
      line.lineStart();
    }
    function lineEnd() {
      clip2.point = point;
      line.lineEnd();
    }
    function pointRing(lambda, phi) {
      ring.push([lambda, phi]);
      ringSink.point(lambda, phi);
    }
    function ringStart() {
      ringSink.lineStart();
      ring = [];
    }
    function ringEnd() {
      pointRing(ring[0][0], ring[0][1]);
      ringSink.lineEnd();
      var clean = ringSink.clean(), ringSegments = ringBuffer.result(), i, n = ringSegments.length, m, segment, point2;
      ring.pop();
      polygon.push(ring);
      ring = null;
      if (!n)
        return;
      if (clean & 1) {
        segment = ringSegments[0];
        if ((m = segment.length - 1) > 0) {
          if (!polygonStarted)
            sink.polygonStart(), polygonStarted = true;
          sink.lineStart();
          for (i = 0; i < m; ++i)
            sink.point((point2 = segment[i])[0], point2[1]);
          sink.lineEnd();
        }
        return;
      }
      if (n > 1 && clean & 2)
        ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
      segments.push(ringSegments.filter(validSegment));
    }
    return clip2;
  };
}
function validSegment(segment) {
  return segment.length > 1;
}
function compareIntersection(a, b) {
  return ((a = a.x)[0] < 0 ? a[1] - halfPi - epsilon : halfPi - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfPi - epsilon : halfPi - b[1]);
}
const clipAntimeridian = clip(
  function() {
    return true;
  },
  clipAntimeridianLine,
  clipAntimeridianInterpolate,
  [-pi, -halfPi]
);
function clipAntimeridianLine(stream) {
  var lambda0 = NaN, phi0 = NaN, sign0 = NaN, clean;
  return {
    lineStart: function() {
      stream.lineStart();
      clean = 1;
    },
    point: function(lambda1, phi1) {
      var sign1 = lambda1 > 0 ? pi : -pi, delta = abs(lambda1 - lambda0);
      if (abs(delta - pi) < epsilon) {
        stream.point(lambda0, phi0 = (phi0 + phi1) / 2 > 0 ? halfPi : -halfPi);
        stream.point(sign0, phi0);
        stream.lineEnd();
        stream.lineStart();
        stream.point(sign1, phi0);
        stream.point(lambda1, phi0);
        clean = 0;
      } else if (sign0 !== sign1 && delta >= pi) {
        if (abs(lambda0 - sign0) < epsilon)
          lambda0 -= sign0 * epsilon;
        if (abs(lambda1 - sign1) < epsilon)
          lambda1 -= sign1 * epsilon;
        phi0 = clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1);
        stream.point(sign0, phi0);
        stream.lineEnd();
        stream.lineStart();
        stream.point(sign1, phi0);
        clean = 0;
      }
      stream.point(lambda0 = lambda1, phi0 = phi1);
      sign0 = sign1;
    },
    lineEnd: function() {
      stream.lineEnd();
      lambda0 = phi0 = NaN;
    },
    clean: function() {
      return 2 - clean;
    }
  };
}
function clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1) {
  var cosPhi0, cosPhi1, sinLambda0Lambda1 = sin(lambda0 - lambda1);
  return abs(sinLambda0Lambda1) > epsilon ? atan((sin(phi0) * (cosPhi1 = cos(phi1)) * sin(lambda1) - sin(phi1) * (cosPhi0 = cos(phi0)) * sin(lambda0)) / (cosPhi0 * cosPhi1 * sinLambda0Lambda1)) : (phi0 + phi1) / 2;
}
function clipAntimeridianInterpolate(from, to, direction, stream) {
  var phi;
  if (from == null) {
    phi = direction * halfPi;
    stream.point(-pi, phi);
    stream.point(0, phi);
    stream.point(pi, phi);
    stream.point(pi, 0);
    stream.point(pi, -phi);
    stream.point(0, -phi);
    stream.point(-pi, -phi);
    stream.point(-pi, 0);
    stream.point(-pi, phi);
  } else if (abs(from[0] - to[0]) > epsilon) {
    var lambda = from[0] < to[0] ? pi : -pi;
    phi = direction * lambda / 2;
    stream.point(-lambda, phi);
    stream.point(0, phi);
    stream.point(lambda, phi);
  } else {
    stream.point(to[0], to[1]);
  }
}
function clipCircle(radius) {
  var cr = cos(radius), delta = 6 * radians, smallRadius = cr > 0, notHemisphere = abs(cr) > epsilon;
  function interpolate(from, to, direction, stream) {
    circleStream(stream, radius, delta, direction, from, to);
  }
  function visible(lambda, phi) {
    return cos(lambda) * cos(phi) > cr;
  }
  function clipLine2(stream) {
    var point0, c0, v0, v00, clean;
    return {
      lineStart: function() {
        v00 = v0 = false;
        clean = 1;
      },
      point: function(lambda, phi) {
        var point1 = [lambda, phi], point2, v = visible(lambda, phi), c = smallRadius ? v ? 0 : code(lambda, phi) : v ? code(lambda + (lambda < 0 ? pi : -pi), phi) : 0;
        if (!point0 && (v00 = v0 = v))
          stream.lineStart();
        if (v !== v0) {
          point2 = intersect(point0, point1);
          if (!point2 || pointEqual(point0, point2) || pointEqual(point1, point2))
            point1[2] = 1;
        }
        if (v !== v0) {
          clean = 0;
          if (v) {
            stream.lineStart();
            point2 = intersect(point1, point0);
            stream.point(point2[0], point2[1]);
          } else {
            point2 = intersect(point0, point1);
            stream.point(point2[0], point2[1], 2);
            stream.lineEnd();
          }
          point0 = point2;
        } else if (notHemisphere && point0 && smallRadius ^ v) {
          var t;
          if (!(c & c0) && (t = intersect(point1, point0, true))) {
            clean = 0;
            if (smallRadius) {
              stream.lineStart();
              stream.point(t[0][0], t[0][1]);
              stream.point(t[1][0], t[1][1]);
              stream.lineEnd();
            } else {
              stream.point(t[1][0], t[1][1]);
              stream.lineEnd();
              stream.lineStart();
              stream.point(t[0][0], t[0][1], 3);
            }
          }
        }
        if (v && (!point0 || !pointEqual(point0, point1))) {
          stream.point(point1[0], point1[1]);
        }
        point0 = point1, v0 = v, c0 = c;
      },
      lineEnd: function() {
        if (v0)
          stream.lineEnd();
        point0 = null;
      },
      // Rejoin first and last segments if there were intersections and the first
      // and last points were visible.
      clean: function() {
        return clean | (v00 && v0) << 1;
      }
    };
  }
  function intersect(a, b, two) {
    var pa = cartesian(a), pb = cartesian(b);
    var n1 = [1, 0, 0], n2 = cartesianCross(pa, pb), n2n2 = cartesianDot(n2, n2), n1n2 = n2[0], determinant = n2n2 - n1n2 * n1n2;
    if (!determinant)
      return !two && a;
    var c1 = cr * n2n2 / determinant, c2 = -cr * n1n2 / determinant, n1xn2 = cartesianCross(n1, n2), A = cartesianScale(n1, c1), B2 = cartesianScale(n2, c2);
    cartesianAddInPlace(A, B2);
    var u2 = n1xn2, w = cartesianDot(A, u2), uu = cartesianDot(u2, u2), t2 = w * w - uu * (cartesianDot(A, A) - 1);
    if (t2 < 0)
      return;
    var t = sqrt(t2), q = cartesianScale(u2, (-w - t) / uu);
    cartesianAddInPlace(q, A);
    q = spherical(q);
    if (!two)
      return q;
    var lambda0 = a[0], lambda1 = b[0], phi0 = a[1], phi1 = b[1], z;
    if (lambda1 < lambda0)
      z = lambda0, lambda0 = lambda1, lambda1 = z;
    var delta2 = lambda1 - lambda0, polar = abs(delta2 - pi) < epsilon, meridian = polar || delta2 < epsilon;
    if (!polar && phi1 < phi0)
      z = phi0, phi0 = phi1, phi1 = z;
    if (meridian ? polar ? phi0 + phi1 > 0 ^ q[1] < (abs(q[0] - lambda0) < epsilon ? phi0 : phi1) : phi0 <= q[1] && q[1] <= phi1 : delta2 > pi ^ (lambda0 <= q[0] && q[0] <= lambda1)) {
      var q1 = cartesianScale(u2, (-w + t) / uu);
      cartesianAddInPlace(q1, A);
      return [q, spherical(q1)];
    }
  }
  function code(lambda, phi) {
    var r = smallRadius ? radius : pi - radius, code2 = 0;
    if (lambda < -r)
      code2 |= 1;
    else if (lambda > r)
      code2 |= 2;
    if (phi < -r)
      code2 |= 4;
    else if (phi > r)
      code2 |= 8;
    return code2;
  }
  return clip(visible, clipLine2, interpolate, smallRadius ? [0, -radius] : [-pi, radius - pi]);
}
function clipLine(a, b, x02, y02, x12, y12) {
  var ax = a[0], ay = a[1], bx = b[0], by = b[1], t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, r;
  r = x02 - ax;
  if (!dx && r > 0)
    return;
  r /= dx;
  if (dx < 0) {
    if (r < t0)
      return;
    if (r < t1)
      t1 = r;
  } else if (dx > 0) {
    if (r > t1)
      return;
    if (r > t0)
      t0 = r;
  }
  r = x12 - ax;
  if (!dx && r < 0)
    return;
  r /= dx;
  if (dx < 0) {
    if (r > t1)
      return;
    if (r > t0)
      t0 = r;
  } else if (dx > 0) {
    if (r < t0)
      return;
    if (r < t1)
      t1 = r;
  }
  r = y02 - ay;
  if (!dy && r > 0)
    return;
  r /= dy;
  if (dy < 0) {
    if (r < t0)
      return;
    if (r < t1)
      t1 = r;
  } else if (dy > 0) {
    if (r > t1)
      return;
    if (r > t0)
      t0 = r;
  }
  r = y12 - ay;
  if (!dy && r < 0)
    return;
  r /= dy;
  if (dy < 0) {
    if (r > t1)
      return;
    if (r > t0)
      t0 = r;
  } else if (dy > 0) {
    if (r < t0)
      return;
    if (r < t1)
      t1 = r;
  }
  if (t0 > 0)
    a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
  if (t1 < 1)
    b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
  return true;
}
var clipMax = 1e9, clipMin = -clipMax;
function clipRectangle(x02, y02, x12, y12) {
  function visible(x, y) {
    return x02 <= x && x <= x12 && y02 <= y && y <= y12;
  }
  function interpolate(from, to, direction, stream) {
    var a = 0, a1 = 0;
    if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoint(from, to) < 0 ^ direction > 0) {
      do
        stream.point(a === 0 || a === 3 ? x02 : x12, a > 1 ? y12 : y02);
      while ((a = (a + direction + 4) % 4) !== a1);
    } else {
      stream.point(to[0], to[1]);
    }
  }
  function corner(p, direction) {
    return abs(p[0] - x02) < epsilon ? direction > 0 ? 0 : 3 : abs(p[0] - x12) < epsilon ? direction > 0 ? 2 : 1 : abs(p[1] - y02) < epsilon ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
  }
  function compareIntersection2(a, b) {
    return comparePoint(a.x, b.x);
  }
  function comparePoint(a, b) {
    var ca = corner(a, 1), cb = corner(b, 1);
    return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
  }
  return function(stream) {
    var activeStream = stream, bufferStream = clipBuffer(), segments, polygon, ring, x__, y__, v__, x_, y_, v_, first, clean;
    var clipStream = {
      point,
      lineStart,
      lineEnd,
      polygonStart,
      polygonEnd
    };
    function point(x, y) {
      if (visible(x, y))
        activeStream.point(x, y);
    }
    function polygonInside() {
      var winding = 0;
      for (var i = 0, n = polygon.length; i < n; ++i) {
        for (var ring2 = polygon[i], j = 1, m = ring2.length, point2 = ring2[0], a0, a1, b0 = point2[0], b1 = point2[1]; j < m; ++j) {
          a0 = b0, a1 = b1, point2 = ring2[j], b0 = point2[0], b1 = point2[1];
          if (a1 <= y12) {
            if (b1 > y12 && (b0 - a0) * (y12 - a1) > (b1 - a1) * (x02 - a0))
              ++winding;
          } else {
            if (b1 <= y12 && (b0 - a0) * (y12 - a1) < (b1 - a1) * (x02 - a0))
              --winding;
          }
        }
      }
      return winding;
    }
    function polygonStart() {
      activeStream = bufferStream, segments = [], polygon = [], clean = true;
    }
    function polygonEnd() {
      var startInside = polygonInside(), cleanInside = clean && startInside, visible2 = (segments = merge(segments)).length;
      if (cleanInside || visible2) {
        stream.polygonStart();
        if (cleanInside) {
          stream.lineStart();
          interpolate(null, null, 1, stream);
          stream.lineEnd();
        }
        if (visible2) {
          clipRejoin(segments, compareIntersection2, startInside, interpolate, stream);
        }
        stream.polygonEnd();
      }
      activeStream = stream, segments = polygon = ring = null;
    }
    function lineStart() {
      clipStream.point = linePoint;
      if (polygon)
        polygon.push(ring = []);
      first = true;
      v_ = false;
      x_ = y_ = NaN;
    }
    function lineEnd() {
      if (segments) {
        linePoint(x__, y__);
        if (v__ && v_)
          bufferStream.rejoin();
        segments.push(bufferStream.result());
      }
      clipStream.point = point;
      if (v_)
        activeStream.lineEnd();
    }
    function linePoint(x, y) {
      var v = visible(x, y);
      if (polygon)
        ring.push([x, y]);
      if (first) {
        x__ = x, y__ = y, v__ = v;
        first = false;
        if (v) {
          activeStream.lineStart();
          activeStream.point(x, y);
        }
      } else {
        if (v && v_)
          activeStream.point(x, y);
        else {
          var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))], b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
          if (clipLine(a, b, x02, y02, x12, y12)) {
            if (!v_) {
              activeStream.lineStart();
              activeStream.point(a[0], a[1]);
            }
            activeStream.point(b[0], b[1]);
            if (!v)
              activeStream.lineEnd();
            clean = false;
          } else if (v) {
            activeStream.lineStart();
            activeStream.point(x, y);
            clean = false;
          }
        }
      }
      x_ = x, y_ = y, v_ = v;
    }
    return clipStream;
  };
}
const identity = (x) => x;
var x0 = Infinity, y0 = x0, x1 = -x0, y1 = x1;
var boundsStream = {
  point: boundsPoint,
  lineStart: noop,
  lineEnd: noop,
  polygonStart: noop,
  polygonEnd: noop,
  result: function() {
    var bounds = [[x0, y0], [x1, y1]];
    x1 = y1 = -(y0 = x0 = Infinity);
    return bounds;
  }
};
function boundsPoint(x, y) {
  if (x < x0)
    x0 = x;
  if (x > x1)
    x1 = x;
  if (y < y0)
    y0 = y;
  if (y > y1)
    y1 = y;
}
const boundsStream$1 = boundsStream;
function transformer(methods) {
  return function(stream) {
    var s = new TransformStream();
    for (var key in methods)
      s[key] = methods[key];
    s.stream = stream;
    return s;
  };
}
function TransformStream() {
}
TransformStream.prototype = {
  constructor: TransformStream,
  point: function(x, y) {
    this.stream.point(x, y);
  },
  sphere: function() {
    this.stream.sphere();
  },
  lineStart: function() {
    this.stream.lineStart();
  },
  lineEnd: function() {
    this.stream.lineEnd();
  },
  polygonStart: function() {
    this.stream.polygonStart();
  },
  polygonEnd: function() {
    this.stream.polygonEnd();
  }
};
function fit(projection2, fitBounds, object) {
  var clip2 = projection2.clipExtent && projection2.clipExtent();
  projection2.scale(150).translate([0, 0]);
  if (clip2 != null)
    projection2.clipExtent(null);
  geoStream(object, projection2.stream(boundsStream$1));
  fitBounds(boundsStream$1.result());
  if (clip2 != null)
    projection2.clipExtent(clip2);
  return projection2;
}
function fitExtent(projection2, extent2, object) {
  return fit(projection2, function(b) {
    var w = extent2[1][0] - extent2[0][0], h = extent2[1][1] - extent2[0][1], k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])), x = +extent2[0][0] + (w - k * (b[1][0] + b[0][0])) / 2, y = +extent2[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;
    projection2.scale(150 * k).translate([x, y]);
  }, object);
}
function fitSize(projection2, size, object) {
  return fitExtent(projection2, [[0, 0], size], object);
}
function fitWidth(projection2, width, object) {
  return fit(projection2, function(b) {
    var w = +width, k = w / (b[1][0] - b[0][0]), x = (w - k * (b[1][0] + b[0][0])) / 2, y = -k * b[0][1];
    projection2.scale(150 * k).translate([x, y]);
  }, object);
}
function fitHeight(projection2, height, object) {
  return fit(projection2, function(b) {
    var h = +height, k = h / (b[1][1] - b[0][1]), x = -k * b[0][0], y = (h - k * (b[1][1] + b[0][1])) / 2;
    projection2.scale(150 * k).translate([x, y]);
  }, object);
}
var maxDepth = 16, cosMinDistance = cos(30 * radians);
function resample(project, delta2) {
  return +delta2 ? resample$1(project, delta2) : resampleNone(project);
}
function resampleNone(project) {
  return transformer({
    point: function(x, y) {
      x = project(x, y);
      this.stream.point(x[0], x[1]);
    }
  });
}
function resample$1(project, delta2) {
  function resampleLineTo(x02, y02, lambda0, a0, b0, c0, x12, y12, lambda1, a1, b1, c1, depth, stream) {
    var dx = x12 - x02, dy = y12 - y02, d2 = dx * dx + dy * dy;
    if (d2 > 4 * delta2 && depth--) {
      var a = a0 + a1, b = b0 + b1, c = c0 + c1, m = sqrt(a * a + b * b + c * c), phi2 = asin(c /= m), lambda2 = abs(abs(c) - 1) < epsilon || abs(lambda0 - lambda1) < epsilon ? (lambda0 + lambda1) / 2 : atan2(b, a), p = project(lambda2, phi2), x2 = p[0], y2 = p[1], dx2 = x2 - x02, dy2 = y2 - y02, dz = dy * dx2 - dx * dy2;
      if (dz * dz / d2 > delta2 || abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
        resampleLineTo(x02, y02, lambda0, a0, b0, c0, x2, y2, lambda2, a /= m, b /= m, c, depth, stream);
        stream.point(x2, y2);
        resampleLineTo(x2, y2, lambda2, a, b, c, x12, y12, lambda1, a1, b1, c1, depth, stream);
      }
    }
  }
  return function(stream) {
    var lambda00, x00, y00, a00, b00, c00, lambda0, x02, y02, a0, b0, c0;
    var resampleStream = {
      point,
      lineStart,
      lineEnd,
      polygonStart: function() {
        stream.polygonStart();
        resampleStream.lineStart = ringStart;
      },
      polygonEnd: function() {
        stream.polygonEnd();
        resampleStream.lineStart = lineStart;
      }
    };
    function point(x, y) {
      x = project(x, y);
      stream.point(x[0], x[1]);
    }
    function lineStart() {
      x02 = NaN;
      resampleStream.point = linePoint;
      stream.lineStart();
    }
    function linePoint(lambda, phi) {
      var c = cartesian([lambda, phi]), p = project(lambda, phi);
      resampleLineTo(x02, y02, lambda0, a0, b0, c0, x02 = p[0], y02 = p[1], lambda0 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
      stream.point(x02, y02);
    }
    function lineEnd() {
      resampleStream.point = point;
      stream.lineEnd();
    }
    function ringStart() {
      lineStart();
      resampleStream.point = ringPoint;
      resampleStream.lineEnd = ringEnd;
    }
    function ringPoint(lambda, phi) {
      linePoint(lambda00 = lambda, phi), x00 = x02, y00 = y02, a00 = a0, b00 = b0, c00 = c0;
      resampleStream.point = linePoint;
    }
    function ringEnd() {
      resampleLineTo(x02, y02, lambda0, a0, b0, c0, x00, y00, lambda00, a00, b00, c00, maxDepth, stream);
      resampleStream.lineEnd = lineEnd;
      lineEnd();
    }
    return resampleStream;
  };
}
var transformRadians = transformer({
  point: function(x, y) {
    this.stream.point(x * radians, y * radians);
  }
});
function transformRotate(rotate) {
  return transformer({
    point: function(x, y) {
      var r = rotate(x, y);
      return this.stream.point(r[0], r[1]);
    }
  });
}
function scaleTranslate(k, dx, dy, sx, sy) {
  function transform(x, y) {
    x *= sx;
    y *= sy;
    return [dx + k * x, dy - k * y];
  }
  transform.invert = function(x, y) {
    return [(x - dx) / k * sx, (dy - y) / k * sy];
  };
  return transform;
}
function scaleTranslateRotate(k, dx, dy, sx, sy, alpha) {
  if (!alpha)
    return scaleTranslate(k, dx, dy, sx, sy);
  var cosAlpha = cos(alpha), sinAlpha = sin(alpha), a = cosAlpha * k, b = sinAlpha * k, ai = cosAlpha / k, bi = sinAlpha / k, ci = (sinAlpha * dy - cosAlpha * dx) / k, fi = (sinAlpha * dx + cosAlpha * dy) / k;
  function transform(x, y) {
    x *= sx;
    y *= sy;
    return [a * x - b * y + dx, dy - b * x - a * y];
  }
  transform.invert = function(x, y) {
    return [sx * (ai * x - bi * y + ci), sy * (fi - bi * x - ai * y)];
  };
  return transform;
}
function projection(project) {
  return projectionMutator(function() {
    return project;
  })();
}
function projectionMutator(projectAt) {
  var project, k = 150, x = 480, y = 250, lambda = 0, phi = 0, deltaLambda = 0, deltaPhi = 0, deltaGamma = 0, rotate, alpha = 0, sx = 1, sy = 1, theta = null, preclip = clipAntimeridian, x02 = null, y02, x12, y12, postclip = identity, delta2 = 0.5, projectResample, projectTransform, projectRotateTransform, cache, cacheStream;
  function projection2(point) {
    return projectRotateTransform(point[0] * radians, point[1] * radians);
  }
  function invert(point) {
    point = projectRotateTransform.invert(point[0], point[1]);
    return point && [point[0] * degrees, point[1] * degrees];
  }
  projection2.stream = function(stream) {
    return cache && cacheStream === stream ? cache : cache = transformRadians(transformRotate(rotate)(preclip(projectResample(postclip(cacheStream = stream)))));
  };
  projection2.preclip = function(_) {
    return arguments.length ? (preclip = _, theta = void 0, reset()) : preclip;
  };
  projection2.postclip = function(_) {
    return arguments.length ? (postclip = _, x02 = y02 = x12 = y12 = null, reset()) : postclip;
  };
  projection2.clipAngle = function(_) {
    return arguments.length ? (preclip = +_ ? clipCircle(theta = _ * radians) : (theta = null, clipAntimeridian), reset()) : theta * degrees;
  };
  projection2.clipExtent = function(_) {
    return arguments.length ? (postclip = _ == null ? (x02 = y02 = x12 = y12 = null, identity) : clipRectangle(x02 = +_[0][0], y02 = +_[0][1], x12 = +_[1][0], y12 = +_[1][1]), reset()) : x02 == null ? null : [[x02, y02], [x12, y12]];
  };
  projection2.scale = function(_) {
    return arguments.length ? (k = +_, recenter()) : k;
  };
  projection2.translate = function(_) {
    return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
  };
  projection2.center = function(_) {
    return arguments.length ? (lambda = _[0] % 360 * radians, phi = _[1] % 360 * radians, recenter()) : [lambda * degrees, phi * degrees];
  };
  projection2.rotate = function(_) {
    return arguments.length ? (deltaLambda = _[0] % 360 * radians, deltaPhi = _[1] % 360 * radians, deltaGamma = _.length > 2 ? _[2] % 360 * radians : 0, recenter()) : [deltaLambda * degrees, deltaPhi * degrees, deltaGamma * degrees];
  };
  projection2.angle = function(_) {
    return arguments.length ? (alpha = _ % 360 * radians, recenter()) : alpha * degrees;
  };
  projection2.reflectX = function(_) {
    return arguments.length ? (sx = _ ? -1 : 1, recenter()) : sx < 0;
  };
  projection2.reflectY = function(_) {
    return arguments.length ? (sy = _ ? -1 : 1, recenter()) : sy < 0;
  };
  projection2.precision = function(_) {
    return arguments.length ? (projectResample = resample(projectTransform, delta2 = _ * _), reset()) : sqrt(delta2);
  };
  projection2.fitExtent = function(extent2, object) {
    return fitExtent(projection2, extent2, object);
  };
  projection2.fitSize = function(size, object) {
    return fitSize(projection2, size, object);
  };
  projection2.fitWidth = function(width, object) {
    return fitWidth(projection2, width, object);
  };
  projection2.fitHeight = function(height, object) {
    return fitHeight(projection2, height, object);
  };
  function recenter() {
    var center = scaleTranslateRotate(k, 0, 0, sx, sy, alpha).apply(null, project(lambda, phi)), transform = scaleTranslateRotate(k, x - center[0], y - center[1], sx, sy, alpha);
    rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma);
    projectTransform = compose(project, transform);
    projectRotateTransform = compose(rotate, projectTransform);
    projectResample = resample(projectTransform, delta2);
    return reset();
  }
  function reset() {
    cache = cacheStream = null;
    return projection2;
  }
  return function() {
    project = projectAt.apply(this, arguments);
    projection2.invert = project.invert && invert;
    return recenter();
  };
}
function mercatorRaw(lambda, phi) {
  return [lambda, log(tan((halfPi + phi) / 2))];
}
mercatorRaw.invert = function(x, y) {
  return [x, 2 * atan(exp(y)) - halfPi];
};
function geoMercator() {
  return mercatorProjection(mercatorRaw).scale(961 / tau);
}
function mercatorProjection(project) {
  var m = projection(project), center = m.center, scale = m.scale, translate = m.translate, clipExtent = m.clipExtent, x02 = null, y02, x12, y12;
  m.scale = function(_) {
    return arguments.length ? (scale(_), reclip()) : scale();
  };
  m.translate = function(_) {
    return arguments.length ? (translate(_), reclip()) : translate();
  };
  m.center = function(_) {
    return arguments.length ? (center(_), reclip()) : center();
  };
  m.clipExtent = function(_) {
    return arguments.length ? (_ == null ? x02 = y02 = x12 = y12 = null : (x02 = +_[0][0], y02 = +_[0][1], x12 = +_[1][0], y12 = +_[1][1]), reclip()) : x02 == null ? null : [[x02, y02], [x12, y12]];
  };
  function reclip() {
    var k = pi * scale(), t = m(rotation(m.rotate()).invert([0, 0]));
    return clipExtent(x02 == null ? [[t[0] - k, t[1] - k], [t[0] + k, t[1] + k]] : project === mercatorRaw ? [[Math.max(t[0] - k, x02), y02], [Math.min(t[0] + k, x12), y12]] : [[x02, Math.max(t[1] - k, y02)], [x12, Math.min(t[1] + k, y12)]]);
  }
  return reclip();
}
const geoContextKey = Symbol();
function setGeoContext(geo) {
  setContext(geoContextKey, geo);
}
const GeoContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let fitSizeRange;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $geo, $$unsubscribe_geo;
  const { width, height } = getContext("LayerCake");
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  let { projection: projection2 = geoMercator } = $$props;
  let { fitGeojson } = $$props;
  let { fixedAspectRatio = void 0 } = $$props;
  let { clipAngle = void 0 } = $$props;
  let { clipExtent = void 0 } = $$props;
  let { rotate = void 0 } = $$props;
  let { scale = void 0 } = $$props;
  let { translate = void 0 } = $$props;
  let { center = void 0 } = $$props;
  const geo = writable(projection2());
  $$unsubscribe_geo = subscribe(geo, (value) => $geo = value);
  setGeoContext(geo);
  if ($$props.projection === void 0 && $$bindings.projection && projection2 !== void 0)
    $$bindings.projection(projection2);
  if ($$props.fitGeojson === void 0 && $$bindings.fitGeojson && fitGeojson !== void 0)
    $$bindings.fitGeojson(fitGeojson);
  if ($$props.fixedAspectRatio === void 0 && $$bindings.fixedAspectRatio && fixedAspectRatio !== void 0)
    $$bindings.fixedAspectRatio(fixedAspectRatio);
  if ($$props.clipAngle === void 0 && $$bindings.clipAngle && clipAngle !== void 0)
    $$bindings.clipAngle(clipAngle);
  if ($$props.clipExtent === void 0 && $$bindings.clipExtent && clipExtent !== void 0)
    $$bindings.clipExtent(clipExtent);
  if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0)
    $$bindings.rotate(rotate);
  if ($$props.scale === void 0 && $$bindings.scale && scale !== void 0)
    $$bindings.scale(scale);
  if ($$props.translate === void 0 && $$bindings.translate && translate !== void 0)
    $$bindings.translate(translate);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0)
    $$bindings.center(center);
  fitSizeRange = fixedAspectRatio ? [100, 100 / fixedAspectRatio] : [$width, $height];
  {
    {
      const _projection = projection2();
      if (fitGeojson && "fitSize" in _projection) {
        _projection.fitSize(fitSizeRange, fitGeojson);
      }
      if (scale && "scale" in _projection) {
        _projection.scale(scale);
      }
      if (rotate && "rotate" in _projection) {
        _projection.rotate([rotate.yaw, rotate.pitch, rotate.roll]);
      }
      if (translate && "translate" in _projection) {
        _projection.translate(translate);
      }
      if (center && "center" in _projection) {
        _projection.center(center);
      }
      if (clipAngle && "clipAngle" in _projection) {
        _projection.clipAngle(clipAngle);
      }
      if (clipExtent && "clipExtent" in _projection) {
        _projection.clipExtent(clipExtent);
      }
      geo.set(_projection);
    }
  }
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_geo();
  return `${slots.default ? slots.default({ projection: $geo }) : ``}`;
});
const Svg = Svg$1;
const Html = Html$1;
const Chart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let yReverse;
  let $$restProps = compute_rest_props($$props, ["data", "x", "y", "yScale", "xBaseline", "yBaseline", "tooltip", "geo"]);
  function getValue(accessor, d) {
    if (Array.isArray(accessor)) {
      return accessor.map((a) => getValue(a, d));
    } else if (typeof accessor === "function") {
      return accessor(d) || 0;
    } else if (typeof accessor === "string") {
      return get(d, accessor);
    } else {
      throw new Error("Unexpected accessor: " + accessor);
    }
  }
  let { data = [] } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { yScale = void 0 } = $$props;
  let { xBaseline = null } = $$props;
  let xDomain = void 0;
  let { yBaseline = null } = $$props;
  let yDomain = void 0;
  let { tooltip = void 0 } = $$props;
  let { geo = void 0 } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.yScale === void 0 && $$bindings.yScale && yScale !== void 0)
    $$bindings.yScale(yScale);
  if ($$props.xBaseline === void 0 && $$bindings.xBaseline && xBaseline !== void 0)
    $$bindings.xBaseline(xBaseline);
  if ($$props.yBaseline === void 0 && $$bindings.yBaseline && yBaseline !== void 0)
    $$bindings.yBaseline(yBaseline);
  if ($$props.tooltip === void 0 && $$bindings.tooltip && tooltip !== void 0)
    $$bindings.tooltip(tooltip);
  if ($$props.geo === void 0 && $$bindings.geo && geo !== void 0)
    $$bindings.geo(geo);
  {
    if (xBaseline != null) {
      const xValues = data.flatMap((d) => getValue(x, d));
      xDomain = [min([xBaseline, ...xValues]), max([xBaseline, ...xValues])];
    }
  }
  {
    if (yBaseline != null) {
      const yValues = data.flatMap((d) => getValue(y, d));
      yDomain = [min([yBaseline, ...yValues]), max([yBaseline, ...yValues])];
    }
  }
  yReverse = yScale ? !isScaleBand(yScale) : true;
  return `${validate_component(LayerCake, "LayerCake").$$render($$result, Object.assign({}, { data }, { x }, { xDomain }, { y }, { yScale }, { yDomain }, { yReverse }, $$restProps), {}, {
    default: ({ aspectRatio, containerHeight, containerWidth, height, width, element, xScale, xGet, yScale: yScale2, yGet, zScale, zGet, rScale, rGet, padding, data: data2, flatData }) => {
      return `${validate_component(GeoContext, "GeoContext").$$render($$result, Object.assign({}, geo), {}, {
        default: ({ projection: projection2 }) => {
          return `${tooltip ? (() => {
            let tooltipProps = typeof tooltip === "object" ? tooltip : {};
            return ` ${validate_component(TooltipContext, "TooltipContext").$$render($$result, Object.assign({}, tooltipProps), {}, {
              default: ({ tooltip: tooltip2 }) => {
                return `${slots.default ? slots.default({
                  aspectRatio,
                  containerHeight,
                  containerWidth,
                  height,
                  width,
                  element,
                  projection: projection2,
                  tooltip: tooltip2,
                  xScale,
                  xGet,
                  yScale: yScale2,
                  yGet,
                  zScale,
                  zGet,
                  rScale,
                  rGet,
                  padding,
                  data: data2,
                  flatData
                }) : ``}`;
              }
            })}`;
          })() : `${slots.default ? slots.default({
            aspectRatio,
            containerHeight,
            containerWidth,
            height,
            width,
            element,
            projection: projection2,
            xScale,
            xGet,
            yScale: yScale2,
            yGet,
            zScale,
            zGet,
            rScale,
            rGet,
            padding,
            data: data2,
            flatData
          }) : ``}`}`;
        }
      })}`;
    }
  })}`;
});
export {
  Axis as A,
  Bars as B,
  Chart as C,
  Svg$1 as S,
  Text as T,
  max as a,
  createDimensionGetter as c,
  greatestAbs as g,
  isScaleBand as i,
  motionStore as m,
  spring as s
};
