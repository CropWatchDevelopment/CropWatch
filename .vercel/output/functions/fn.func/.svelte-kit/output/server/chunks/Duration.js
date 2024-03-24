import { c as create_ssr_component, a as subscribe, f as add_attribute, e as escape } from "./ssr.js";
import { D as DurationUnits, g as getComponentClasses, B as humanizeDuration, c as cls, C as getDuration } from "./theme.js";
import { w as writable } from "./index2.js";
function timerStore(options = {}) {
  let initial = options.initial ?? null;
  let intervalId = null;
  let delay = options.delay ?? 1e3;
  const isRunning = writable(false);
  const state = writable(initial, () => {
    if (!options.disabled) {
      start();
    }
    return () => stop();
  });
  function start() {
    stop();
    intervalId = setInterval(() => {
      state.update((current) => options.onTick?.(current) ?? /* @__PURE__ */ new Date());
    }, delay);
    isRunning.set(true);
  }
  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = null;
    isRunning.set(false);
  }
  function reset() {
    return state.set(initial);
  }
  function getDelay() {
    return delay;
  }
  function setDelay(value) {
    stop();
    delay = value;
    start();
  }
  return {
    ...state,
    start,
    stop,
    reset,
    isRunning,
    getDelay,
    setDelay
  };
}
const Duration = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let displayDuration;
  let $timer, $$unsubscribe_timer;
  let { start = void 0 } = $$props;
  let { end = void 0 } = $$props;
  let { duration = void 0 } = $$props;
  let { minUnits = DurationUnits.Millisecond } = $$props;
  let { totalUnits = 99 } = $$props;
  let { variant = "short" } = $$props;
  const settingsClasses = getComponentClasses("Duration");
  function getDelay() {
    const newDuration = getDuration(start, end ?? $timer, duration);
    const unitsMoreThanSeconds = [newDuration.years, newDuration.days, newDuration.hours, newDuration.minutes].filter((x) => x).length;
    if (minUnits < DurationUnits.Second) {
      return 60 * 1e3;
    } else if (unitsMoreThanSeconds >= totalUnits) {
      return 60 * 1e3;
    } else {
      return 1e3;
    }
  }
  const timer = timerStore({
    delay: getDelay(),
    disabled: end != null,
    onTick: () => {
      const newDelay = getDelay();
      if (newDelay != timer.getDelay()) {
        timer.setDelay(newDelay);
      }
    }
  });
  $$unsubscribe_timer = subscribe(timer, (value) => $timer = value);
  if ($$props.start === void 0 && $$bindings.start && start !== void 0)
    $$bindings.start(start);
  if ($$props.end === void 0 && $$bindings.end && end !== void 0)
    $$bindings.end(end);
  if ($$props.duration === void 0 && $$bindings.duration && duration !== void 0)
    $$bindings.duration(duration);
  if ($$props.minUnits === void 0 && $$bindings.minUnits && minUnits !== void 0)
    $$bindings.minUnits(minUnits);
  if ($$props.totalUnits === void 0 && $$bindings.totalUnits && totalUnits !== void 0)
    $$bindings.totalUnits(totalUnits);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  displayDuration = humanizeDuration({
    start,
    end: end ?? $timer,
    duration,
    minUnits,
    totalUnits,
    variant
  });
  $$unsubscribe_timer();
  return `<span${add_attribute("class", cls("Duration", settingsClasses.root, $$props.class), 0)}>${escape(displayDuration)}</span>`;
});
export {
  Duration as D
};
