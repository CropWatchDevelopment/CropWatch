import { M as MapCache, o as defaultsDeep, p as extendTailwindMerge, r as range$1, q as clsx, t as enablePatches, u as setAutoFreeze } from "./theme.js";
import { parseISO, formatISO, startOfQuarter, endOfQuarter, startOfWeek, endOfWeek, addDays, differenceInDays, format as format$1 } from "date-fns";
import { d as derived, w as writable, r as readable } from "./index2.js";
var FUNC_ERROR_TEXT = "Expected a function";
function memoize(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function") {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache)();
  return memoized;
}
memoize.Cache = MapCache;
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }
  return target;
}
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o)
    return;
  if (typeof o === "string")
    return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor)
    n = o.constructor.name;
  if (n === "Map" || n === "Set")
    return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length)
    len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++)
    arr2[i] = arr[i];
  return arr2;
}
function _createForOfIteratorHelper(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (!it) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it)
        o = it;
      var i = 0;
      var F = function() {
      };
      return {
        s: F,
        n: function() {
          if (i >= o.length)
            return {
              done: true
            };
          return {
            done: false,
            value: o[i++]
          };
        },
        e: function(e) {
          throw e;
        },
        f: F
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var normalCompletion = true, didErr = false, err;
  return {
    s: function() {
      it = it.call(o);
    },
    n: function() {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    },
    e: function(e) {
      didErr = true;
      err = e;
    },
    f: function() {
      try {
        if (!normalCompletion && it.return != null)
          it.return();
      } finally {
        if (didErr)
          throw err;
      }
    }
  };
}
function decasteljau(points, t) {
  var left = [];
  var right = [];
  function decasteljauRecurse(points2, t2) {
    if (points2.length === 1) {
      left.push(points2[0]);
      right.push(points2[0]);
    } else {
      var newPoints = Array(points2.length - 1);
      for (var i = 0; i < newPoints.length; i++) {
        if (i === 0) {
          left.push(points2[0]);
        }
        if (i === newPoints.length - 1) {
          right.push(points2[i + 1]);
        }
        newPoints[i] = [(1 - t2) * points2[i][0] + t2 * points2[i + 1][0], (1 - t2) * points2[i][1] + t2 * points2[i + 1][1]];
      }
      decasteljauRecurse(newPoints, t2);
    }
  }
  if (points.length) {
    decasteljauRecurse(points, t);
  }
  return {
    left,
    right: right.reverse()
  };
}
function pointsToCommand(points) {
  var command = {};
  if (points.length === 4) {
    command.x2 = points[2][0];
    command.y2 = points[2][1];
  }
  if (points.length >= 3) {
    command.x1 = points[1][0];
    command.y1 = points[1][1];
  }
  command.x = points[points.length - 1][0];
  command.y = points[points.length - 1][1];
  if (points.length === 4) {
    command.type = "C";
  } else if (points.length === 3) {
    command.type = "Q";
  } else {
    command.type = "L";
  }
  return command;
}
function splitCurveAsPoints(points, segmentCount) {
  segmentCount = segmentCount || 2;
  var segments = [];
  var remainingCurve = points;
  var tIncrement = 1 / segmentCount;
  for (var i = 0; i < segmentCount - 1; i++) {
    var tRelative = tIncrement / (1 - tIncrement * i);
    var split = decasteljau(remainingCurve, tRelative);
    segments.push(split.left);
    remainingCurve = split.right;
  }
  segments.push(remainingCurve);
  return segments;
}
function splitCurve(commandStart, commandEnd, segmentCount) {
  var points = [[commandStart.x, commandStart.y]];
  if (commandEnd.x1 != null) {
    points.push([commandEnd.x1, commandEnd.y1]);
  }
  if (commandEnd.x2 != null) {
    points.push([commandEnd.x2, commandEnd.y2]);
  }
  points.push([commandEnd.x, commandEnd.y]);
  return splitCurveAsPoints(points, segmentCount).map(pointsToCommand);
}
var commandTokenRegex = /[MLCSTQAHVZmlcstqahv]|-?[\d.e+-]+/g;
var typeMap = {
  M: ["x", "y"],
  L: ["x", "y"],
  H: ["x"],
  V: ["y"],
  C: ["x1", "y1", "x2", "y2", "x", "y"],
  S: ["x2", "y2", "x", "y"],
  Q: ["x1", "y1", "x", "y"],
  T: ["x", "y"],
  A: ["rx", "ry", "xAxisRotation", "largeArcFlag", "sweepFlag", "x", "y"],
  Z: []
};
Object.keys(typeMap).forEach(function(key) {
  typeMap[key.toLowerCase()] = typeMap[key];
});
function arrayOfLength(length, value) {
  var array = Array(length);
  for (var i = 0; i < length; i++) {
    array[i] = value;
  }
  return array;
}
function commandToString(command) {
  return "".concat(command.type).concat(typeMap[command.type].map(function(p) {
    return command[p];
  }).join(","));
}
function convertToSameType(aCommand, bCommand) {
  var conversionMap = {
    x1: "x",
    y1: "y",
    x2: "x",
    y2: "y"
  };
  var readFromBKeys = ["xAxisRotation", "largeArcFlag", "sweepFlag"];
  if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== "M") {
    var aConverted = {};
    Object.keys(bCommand).forEach(function(bKey) {
      var bValue = bCommand[bKey];
      var aValue = aCommand[bKey];
      if (aValue === void 0) {
        if (readFromBKeys.includes(bKey)) {
          aValue = bValue;
        } else {
          if (aValue === void 0 && conversionMap[bKey]) {
            aValue = aCommand[conversionMap[bKey]];
          }
          if (aValue === void 0) {
            aValue = 0;
          }
        }
      }
      aConverted[bKey] = aValue;
    });
    aConverted.type = bCommand.type;
    aCommand = aConverted;
  }
  return aCommand;
}
function splitSegment(commandStart, commandEnd, segmentCount) {
  var segments = [];
  if (commandEnd.type === "L" || commandEnd.type === "Q" || commandEnd.type === "C") {
    segments = segments.concat(splitCurve(commandStart, commandEnd, segmentCount));
  } else {
    var copyCommand = _extends({}, commandStart);
    if (copyCommand.type === "M") {
      copyCommand.type = "L";
    }
    segments = segments.concat(arrayOfLength(segmentCount - 1).map(function() {
      return copyCommand;
    }));
    segments.push(commandEnd);
  }
  return segments;
}
function extend(commandsToExtend, referenceCommands, excludeSegment) {
  var numSegmentsToExtend = commandsToExtend.length - 1;
  var numReferenceSegments = referenceCommands.length - 1;
  var segmentRatio = numSegmentsToExtend / numReferenceSegments;
  var countPointsPerSegment = arrayOfLength(numReferenceSegments).reduce(function(accum, d, i) {
    var insertIndex = Math.floor(segmentRatio * i);
    if (excludeSegment && insertIndex < commandsToExtend.length - 1 && excludeSegment(commandsToExtend[insertIndex], commandsToExtend[insertIndex + 1])) {
      var addToPriorSegment = segmentRatio * i % 1 < 0.5;
      if (accum[insertIndex]) {
        if (addToPriorSegment) {
          if (insertIndex > 0) {
            insertIndex -= 1;
          } else if (insertIndex < commandsToExtend.length - 1) {
            insertIndex += 1;
          }
        } else if (insertIndex < commandsToExtend.length - 1) {
          insertIndex += 1;
        } else if (insertIndex > 0) {
          insertIndex -= 1;
        }
      }
    }
    accum[insertIndex] = (accum[insertIndex] || 0) + 1;
    return accum;
  }, []);
  var extended = countPointsPerSegment.reduce(function(extended2, segmentCount, i) {
    if (i === commandsToExtend.length - 1) {
      var lastCommandCopies = arrayOfLength(segmentCount, _extends({}, commandsToExtend[commandsToExtend.length - 1]));
      if (lastCommandCopies[0].type === "M") {
        lastCommandCopies.forEach(function(d) {
          d.type = "L";
        });
      }
      return extended2.concat(lastCommandCopies);
    }
    return extended2.concat(splitSegment(commandsToExtend[i], commandsToExtend[i + 1], segmentCount));
  }, []);
  extended.unshift(commandsToExtend[0]);
  return extended;
}
function pathCommandsFromString(d) {
  var tokens = (d || "").match(commandTokenRegex) || [];
  var commands = [];
  var commandArgs;
  var command;
  for (var i = 0; i < tokens.length; ++i) {
    commandArgs = typeMap[tokens[i]];
    if (commandArgs) {
      command = {
        type: tokens[i]
      };
      for (var a = 0; a < commandArgs.length; ++a) {
        command[commandArgs[a]] = +tokens[i + a + 1];
      }
      i += commandArgs.length;
      commands.push(command);
    }
  }
  return commands;
}
function interpolatePathCommands(aCommandsInput, bCommandsInput, interpolateOptions) {
  var aCommands = aCommandsInput == null ? [] : aCommandsInput.slice();
  var bCommands = bCommandsInput == null ? [] : bCommandsInput.slice();
  var _ref = _typeof(interpolateOptions) === "object" ? interpolateOptions : {
    excludeSegment: interpolateOptions,
    snapEndsToInput: true
  }, excludeSegment = _ref.excludeSegment, snapEndsToInput = _ref.snapEndsToInput;
  if (!aCommands.length && !bCommands.length) {
    return function nullInterpolator() {
      return [];
    };
  }
  var addZ = (aCommands.length === 0 || aCommands[aCommands.length - 1].type === "Z") && (bCommands.length === 0 || bCommands[bCommands.length - 1].type === "Z");
  if (aCommands.length > 0 && aCommands[aCommands.length - 1].type === "Z") {
    aCommands.pop();
  }
  if (bCommands.length > 0 && bCommands[bCommands.length - 1].type === "Z") {
    bCommands.pop();
  }
  if (!aCommands.length) {
    aCommands.push(bCommands[0]);
  } else if (!bCommands.length) {
    bCommands.push(aCommands[0]);
  }
  var numPointsToExtend = Math.abs(bCommands.length - aCommands.length);
  if (numPointsToExtend !== 0) {
    if (bCommands.length > aCommands.length) {
      aCommands = extend(aCommands, bCommands, excludeSegment);
    } else if (bCommands.length < aCommands.length) {
      bCommands = extend(bCommands, aCommands, excludeSegment);
    }
  }
  aCommands = aCommands.map(function(aCommand, i) {
    return convertToSameType(aCommand, bCommands[i]);
  });
  var interpolatedCommands = aCommands.map(function(aCommand) {
    return _objectSpread2({}, aCommand);
  });
  if (addZ) {
    interpolatedCommands.push({
      type: "Z"
    });
    aCommands.push({
      type: "Z"
    });
  }
  return function pathCommandInterpolator(t) {
    if (t === 1 && snapEndsToInput) {
      return bCommandsInput == null ? [] : bCommandsInput;
    }
    if (t === 0) {
      return aCommands;
    }
    for (var i = 0; i < interpolatedCommands.length; ++i) {
      var aCommand = aCommands[i];
      var bCommand = bCommands[i];
      var interpolatedCommand = interpolatedCommands[i];
      var _iterator = _createForOfIteratorHelper(typeMap[interpolatedCommand.type]), _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done; ) {
          var arg = _step.value;
          interpolatedCommand[arg] = (1 - t) * aCommand[arg] + t * bCommand[arg];
          if (arg === "largeArcFlag" || arg === "sweepFlag") {
            interpolatedCommand[arg] = Math.round(interpolatedCommand[arg]);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
    return interpolatedCommands;
  };
}
function interpolatePath(a, b, interpolateOptions) {
  var aCommands = pathCommandsFromString(a);
  var bCommands = pathCommandsFromString(b);
  var _ref2 = _typeof(interpolateOptions) === "object" ? interpolateOptions : {
    excludeSegment: interpolateOptions,
    snapEndsToInput: true
  }, excludeSegment = _ref2.excludeSegment, snapEndsToInput = _ref2.snapEndsToInput;
  if (!aCommands.length && !bCommands.length) {
    return function nullInterpolator() {
      return "";
    };
  }
  var commandInterpolator = interpolatePathCommands(aCommands, bCommands, {
    excludeSegment,
    snapEndsToInput
  });
  return function pathStringInterpolator(t) {
    if (t === 1 && snapEndsToInput) {
      return b == null ? "" : b;
    }
    var interpolatedCommands = commandInterpolator(t);
    var interpolatedString = "";
    var _iterator2 = _createForOfIteratorHelper(interpolatedCommands), _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done; ) {
        var interpolatedCommand = _step2.value;
        interpolatedString += commandToString(interpolatedCommand);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    return interpolatedString;
  };
}
function assertNever(x) {
  throw new Error(`Unhandled enum case: ${x}`);
}
var PeriodType;
(function(PeriodType2) {
  PeriodType2[PeriodType2["Custom"] = 1] = "Custom";
  PeriodType2[PeriodType2["Day"] = 10] = "Day";
  PeriodType2[PeriodType2["DayTime"] = 11] = "DayTime";
  PeriodType2[PeriodType2["TimeOnly"] = 15] = "TimeOnly";
  PeriodType2[PeriodType2["Week"] = 20] = "Week";
  PeriodType2[PeriodType2["WeekSun"] = 21] = "WeekSun";
  PeriodType2[PeriodType2["WeekMon"] = 22] = "WeekMon";
  PeriodType2[PeriodType2["WeekTue"] = 23] = "WeekTue";
  PeriodType2[PeriodType2["WeekWed"] = 24] = "WeekWed";
  PeriodType2[PeriodType2["WeekThu"] = 25] = "WeekThu";
  PeriodType2[PeriodType2["WeekFri"] = 26] = "WeekFri";
  PeriodType2[PeriodType2["WeekSat"] = 27] = "WeekSat";
  PeriodType2[PeriodType2["Month"] = 30] = "Month";
  PeriodType2[PeriodType2["MonthYear"] = 31] = "MonthYear";
  PeriodType2[PeriodType2["Quarter"] = 40] = "Quarter";
  PeriodType2[PeriodType2["CalendarYear"] = 50] = "CalendarYear";
  PeriodType2[PeriodType2["FiscalYearOctober"] = 60] = "FiscalYearOctober";
  PeriodType2[PeriodType2["BiWeek1"] = 70] = "BiWeek1";
  PeriodType2[PeriodType2["BiWeek1Sun"] = 71] = "BiWeek1Sun";
  PeriodType2[PeriodType2["BiWeek1Mon"] = 72] = "BiWeek1Mon";
  PeriodType2[PeriodType2["BiWeek1Tue"] = 73] = "BiWeek1Tue";
  PeriodType2[PeriodType2["BiWeek1Wed"] = 74] = "BiWeek1Wed";
  PeriodType2[PeriodType2["BiWeek1Thu"] = 75] = "BiWeek1Thu";
  PeriodType2[PeriodType2["BiWeek1Fri"] = 76] = "BiWeek1Fri";
  PeriodType2[PeriodType2["BiWeek1Sat"] = 77] = "BiWeek1Sat";
  PeriodType2[PeriodType2["BiWeek2"] = 80] = "BiWeek2";
  PeriodType2[PeriodType2["BiWeek2Sun"] = 81] = "BiWeek2Sun";
  PeriodType2[PeriodType2["BiWeek2Mon"] = 82] = "BiWeek2Mon";
  PeriodType2[PeriodType2["BiWeek2Tue"] = 83] = "BiWeek2Tue";
  PeriodType2[PeriodType2["BiWeek2Wed"] = 84] = "BiWeek2Wed";
  PeriodType2[PeriodType2["BiWeek2Thu"] = 85] = "BiWeek2Thu";
  PeriodType2[PeriodType2["BiWeek2Fri"] = 86] = "BiWeek2Fri";
  PeriodType2[PeriodType2["BiWeek2Sat"] = 87] = "BiWeek2Sat";
})(PeriodType || (PeriodType = {}));
var DayOfWeek;
(function(DayOfWeek2) {
  DayOfWeek2[DayOfWeek2["Sunday"] = 0] = "Sunday";
  DayOfWeek2[DayOfWeek2["Monday"] = 1] = "Monday";
  DayOfWeek2[DayOfWeek2["Tuesday"] = 2] = "Tuesday";
  DayOfWeek2[DayOfWeek2["Wednesday"] = 3] = "Wednesday";
  DayOfWeek2[DayOfWeek2["Thursday"] = 4] = "Thursday";
  DayOfWeek2[DayOfWeek2["Friday"] = 5] = "Friday";
  DayOfWeek2[DayOfWeek2["Saturday"] = 6] = "Saturday";
})(DayOfWeek || (DayOfWeek = {}));
var DateToken;
(function(DateToken2) {
  DateToken2["Year_numeric"] = "yyy";
  DateToken2["Year_2Digit"] = "yy";
  DateToken2["Month_long"] = "MMMM";
  DateToken2["Month_short"] = "MMM";
  DateToken2["Month_2Digit"] = "MM";
  DateToken2["Month_numeric"] = "M";
  DateToken2["Hour_numeric"] = "h";
  DateToken2["Hour_2Digit"] = "hh";
  DateToken2["Hour_wAMPM"] = "a";
  DateToken2["Hour_woAMPM"] = "aaaaaa";
  DateToken2["Minute_numeric"] = "m";
  DateToken2["Minute_2Digit"] = "mm";
  DateToken2["Second_numeric"] = "s";
  DateToken2["Second_2Digit"] = "ss";
  DateToken2["MiliSecond_3"] = "SSS";
  DateToken2["DayOfMonth_numeric"] = "d";
  DateToken2["DayOfMonth_2Digit"] = "dd";
  DateToken2["DayOfMonth_withOrdinal"] = "do";
  DateToken2["DayOfWeek_narrow"] = "eeeee";
  DateToken2["DayOfWeek_long"] = "eeee";
  DateToken2["DayOfWeek_short"] = "eee";
})(DateToken || (DateToken = {}));
function getWeekStartsOnFromIntl(locales) {
  if (!locales) {
    return DayOfWeek.Sunday;
  }
  const locale = new Intl.Locale(locales);
  const weekInfo = locale.weekInfo ?? locale.getWeekInfo?.();
  return (weekInfo?.firstDay ?? 0) % 7;
}
function resolvedLocaleStore(forceLocales, fallbackLocale) {
  return derived(forceLocales, ($forceLocales) => {
    let result;
    if ($forceLocales?.length) {
      if (Array.isArray($forceLocales)) {
        result = $forceLocales[0];
      } else {
        result = $forceLocales;
      }
    }
    return result ?? fallbackLocale ?? "en";
  });
}
function localeStore(forceLocale, fallbackLocale) {
  let currentLocale = writable(forceLocale ?? null);
  let resolvedLocale = resolvedLocaleStore(currentLocale, fallbackLocale);
  return {
    ...resolvedLocale,
    set(value) {
      currentLocale.set(value);
    }
  };
}
const defaultLocaleSettings = {
  locale: "en",
  dictionary: {
    Ok: "Ok",
    Cancel: "Cancel",
    Date: {
      Start: "Start",
      End: "End",
      Empty: "Empty",
      Day: "Day",
      DayTime: "Day Time",
      Time: "Time",
      Week: "Week",
      BiWeek: "Bi-Week",
      Month: "Month",
      Quarter: "Quarter",
      CalendarYear: "Calendar Year",
      FiscalYearOct: "Fiscal Year (Oct)",
      PeriodDay: {
        Current: "Today",
        Last: "Yesterday",
        LastX: "Last {0} days"
      },
      PeriodWeek: {
        Current: "This week",
        Last: "Last week",
        LastX: "Last {0} weeks"
      },
      PeriodBiWeek: {
        Current: "This bi-week",
        Last: "Last bi-week",
        LastX: "Last {0} bi-weeks"
      },
      PeriodMonth: {
        Current: "This month",
        Last: "Last month",
        LastX: "Last {0} months"
      },
      PeriodQuarter: {
        Current: "This quarter",
        Last: "Last quarter",
        LastX: "Last {0} quarters"
      },
      PeriodQuarterSameLastyear: "Same quarter last year",
      PeriodYear: {
        Current: "This year",
        Last: "Last year",
        LastX: "Last {0} years"
      },
      PeriodFiscalYear: {
        Current: "This fiscal year",
        Last: "Last fiscal year",
        LastX: "Last {0} fiscal years"
      }
    }
  },
  formats: {
    numbers: {
      defaults: {
        currency: "USD",
        fractionDigits: 2,
        currencyDisplay: "symbol"
      }
    },
    dates: {
      baseParsing: "MM/dd/yyyy",
      weekStartsOn: DayOfWeek.Sunday,
      ordinalSuffixes: {
        one: "st",
        two: "nd",
        few: "rd",
        other: "th"
      },
      presets: {
        day: {
          short: [DateToken.DayOfMonth_numeric, DateToken.Month_numeric],
          default: [DateToken.DayOfMonth_numeric, DateToken.Month_numeric, DateToken.Year_numeric],
          long: [DateToken.DayOfMonth_numeric, DateToken.Month_short, DateToken.Year_numeric]
        },
        dayTime: {
          short: [
            DateToken.DayOfMonth_numeric,
            DateToken.Month_numeric,
            DateToken.Year_numeric,
            DateToken.Hour_numeric,
            DateToken.Minute_numeric
          ],
          default: [
            DateToken.DayOfMonth_numeric,
            DateToken.Month_numeric,
            DateToken.Year_numeric,
            DateToken.Hour_2Digit,
            DateToken.Minute_2Digit
          ],
          long: [
            DateToken.DayOfMonth_numeric,
            DateToken.Month_numeric,
            DateToken.Year_numeric,
            DateToken.Hour_2Digit,
            DateToken.Minute_2Digit,
            DateToken.Second_2Digit
          ]
        },
        timeOnly: {
          short: [DateToken.Hour_numeric, DateToken.Minute_numeric],
          default: [DateToken.Hour_2Digit, DateToken.Minute_2Digit, DateToken.Second_2Digit],
          long: [
            DateToken.Hour_2Digit,
            DateToken.Minute_2Digit,
            DateToken.Second_2Digit,
            DateToken.MiliSecond_3
          ]
        },
        week: {
          short: [DateToken.DayOfMonth_numeric, DateToken.Month_numeric],
          default: [DateToken.DayOfMonth_numeric, DateToken.Month_numeric, DateToken.Year_numeric],
          long: [DateToken.DayOfMonth_numeric, DateToken.Month_numeric, DateToken.Year_numeric]
        },
        month: {
          short: DateToken.Month_short,
          default: DateToken.Month_short,
          long: DateToken.Month_long
        },
        monthsYear: {
          short: [DateToken.Month_short, DateToken.Year_2Digit],
          default: [DateToken.Month_long, DateToken.Year_numeric],
          long: [DateToken.Month_long, DateToken.Year_numeric]
        },
        year: {
          short: DateToken.Year_2Digit,
          default: DateToken.Year_numeric,
          long: DateToken.Year_numeric
        }
      }
    }
  }
};
function createLocaleSettings(localeSettings, base = defaultLocaleSettings) {
  if (localeSettings.formats?.dates?.ordinalSuffixes) {
    localeSettings.formats.dates.ordinalSuffixes = {
      one: "",
      two: "",
      few: "",
      other: "",
      zero: "",
      many: "",
      ...localeSettings.formats.dates.ordinalSuffixes
    };
  }
  if (localeSettings.formats?.dates?.weekStartsOn === void 0) {
    localeSettings = defaultsDeep(localeSettings, {
      formats: { dates: { weekStartsOn: getWeekStartsOnFromIntl(localeSettings.locale) } }
    });
  }
  return defaultsDeep(localeSettings, base);
}
const defaultLocale = createLocaleSettings({ locale: "en" });
function getAllKnownLocales(additionalLocales) {
  const additional = additionalLocales ? Object.entries(additionalLocales).map(([key, value]) => [key, createLocaleSettings(value)]) : [];
  return { en: defaultLocale, ...Object.fromEntries(additional) };
}
function getDayOfWeekName(weekStartsOn, locales) {
  const date = new Date(2024, 0, 7 + weekStartsOn);
  const formatter = new Intl.DateTimeFormat(locales, { weekday: "short" });
  return formatter.format(date);
}
function getPeriodTypeNameWithLocale(settings, periodType) {
  const { locale, dictionary: { Date: dico } } = settings;
  switch (periodType) {
    case PeriodType.Custom:
      return "Custom";
    case PeriodType.Day:
      return dico.Day;
    case PeriodType.DayTime:
      return dico.DayTime;
    case PeriodType.TimeOnly:
      return dico.Time;
    case PeriodType.WeekSun:
      return `${dico.Week} (${getDayOfWeekName(DayOfWeek.Sunday, locale)})`;
    case PeriodType.WeekMon:
      return `${dico.Week} (${getDayOfWeekName(1, locale)})`;
    case PeriodType.WeekTue:
      return `${dico.Week} (${getDayOfWeekName(2, locale)})`;
    case PeriodType.WeekWed:
      return `${dico.Week} (${getDayOfWeekName(3, locale)})`;
    case PeriodType.WeekThu:
      return `${dico.Week} (${getDayOfWeekName(4, locale)})`;
    case PeriodType.WeekFri:
      return `${dico.Week} (${getDayOfWeekName(5, locale)})`;
    case PeriodType.WeekSat:
      return `${dico.Week} (${getDayOfWeekName(6, locale)})`;
    case PeriodType.Week:
      return dico.Week;
    case PeriodType.Month:
      return dico.Month;
    case PeriodType.MonthYear:
      return dico.Month;
    case PeriodType.Quarter:
      return dico.Quarter;
    case PeriodType.CalendarYear:
      return dico.CalendarYear;
    case PeriodType.FiscalYearOctober:
      return dico.FiscalYearOct;
    case PeriodType.BiWeek1Sun:
      return `${dico.BiWeek} (${getDayOfWeekName(0, locale)})`;
    case PeriodType.BiWeek1Mon:
      return `${dico.BiWeek} (${getDayOfWeekName(1, locale)})`;
    case PeriodType.BiWeek1Tue:
      return `${dico.BiWeek} (${getDayOfWeekName(2, locale)})`;
    case PeriodType.BiWeek1Wed:
      return `${dico.BiWeek} (${getDayOfWeekName(3, locale)})`;
    case PeriodType.BiWeek1Thu:
      return `${dico.BiWeek} (${getDayOfWeekName(4, locale)})`;
    case PeriodType.BiWeek1Fri:
      return `${dico.BiWeek} (${getDayOfWeekName(5, locale)})`;
    case PeriodType.BiWeek1Sat:
      return `${dico.BiWeek} (${getDayOfWeekName(6, locale)})`;
    case PeriodType.BiWeek1:
      return dico.BiWeek;
    case PeriodType.BiWeek2Sun:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(0, locale)})`;
    case PeriodType.BiWeek2Mon:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(1, locale)})`;
    case PeriodType.BiWeek2Tue:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(2, locale)})`;
    case PeriodType.BiWeek2Wed:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(3, locale)})`;
    case PeriodType.BiWeek2Thu:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(4, locale)})`;
    case PeriodType.BiWeek2Fri:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(5, locale)})`;
    case PeriodType.BiWeek2Sat:
      return `${dico.BiWeek} 2 (${getDayOfWeekName(6, locale)})`;
    case PeriodType.BiWeek2:
      return `${dico.BiWeek} 2`;
    default:
      assertNever(periodType);
  }
}
({
  [PeriodType.Custom]: "CUSTOM",
  [PeriodType.Day]: "DAY",
  [PeriodType.DayTime]: "DAY-TIME",
  [PeriodType.TimeOnly]: "TIME",
  [PeriodType.WeekSun]: "WEEK-SUN",
  [PeriodType.WeekMon]: "WEEK-MON",
  [PeriodType.WeekTue]: "WEEK-TUE",
  [PeriodType.WeekWed]: "WEEK-WED",
  [PeriodType.WeekThu]: "WEEK-THU",
  [PeriodType.WeekFri]: "WEEK-FRI",
  [PeriodType.WeekSat]: "WEEK-SAT",
  [PeriodType.Week]: "WEEK",
  [PeriodType.Month]: "MTH",
  [PeriodType.MonthYear]: "MTH-CY",
  [PeriodType.Quarter]: "QTR",
  [PeriodType.CalendarYear]: "CY",
  [PeriodType.FiscalYearOctober]: "FY-OCT",
  [PeriodType.BiWeek1Sun]: "BIWEEK1-SUN",
  [PeriodType.BiWeek1Mon]: "BIWEEK1-MON",
  [PeriodType.BiWeek1Tue]: "BIWEEK1-TUE",
  [PeriodType.BiWeek1Wed]: "BIWEEK1-WED",
  [PeriodType.BiWeek1Thu]: "BIWEEK1-THU",
  [PeriodType.BiWeek1Fri]: "BIWEEK1-FRI",
  [PeriodType.BiWeek1Sat]: "BIWEEK1-SAT",
  [PeriodType.BiWeek1]: "BIWEEK1",
  [PeriodType.BiWeek2Sun]: "BIWEEK2-SUN",
  [PeriodType.BiWeek2Mon]: "BIWEEK2-MON",
  [PeriodType.BiWeek2Tue]: "BIWEEK2-TUE",
  [PeriodType.BiWeek2Wed]: "BIWEEK2-WED",
  [PeriodType.BiWeek2Thu]: "BIWEEK2-THU",
  [PeriodType.BiWeek2Fri]: "BIWEEK2-FRI",
  [PeriodType.BiWeek2Sat]: "BIWEEK2-SAT",
  [PeriodType.BiWeek2]: "BIWEEK2"
});
function getFiscalYear(date = /* @__PURE__ */ new Date(), options) {
  if (date === null) {
    return NaN;
  }
  const startMonth = options && options.startMonth || 10;
  return date.getMonth() >= startMonth - 1 ? date.getFullYear() + 1 : date.getFullYear();
}
const biweekBaseDates = [/* @__PURE__ */ new Date("1799-12-22T00:00"), /* @__PURE__ */ new Date("1799-12-15T00:00")];
function startOfBiWeek(date, week, startOfWeek2) {
  var weekBaseDate = biweekBaseDates[week - 1];
  var baseDate = addDays(weekBaseDate, startOfWeek2);
  var periodsSince = Math.floor(differenceInDays(date, baseDate) / 14);
  return addDays(baseDate, periodsSince * 14);
}
function endOfBiWeek(date, week, startOfWeek2) {
  return addDays(startOfBiWeek(date, week, startOfWeek2), 13);
}
function formatIntl(settings, dt, tokens_or_intlOptions) {
  const { locale, formats: { dates: { ordinalSuffixes: suffixes } } } = settings;
  function formatIntlOrdinal(formatter2, with_ordinal = false) {
    if (with_ordinal) {
      const rules = new Intl.PluralRules(locale, { type: "ordinal" });
      const splited = formatter2.formatToParts(dt);
      return splited.map((c) => {
        if (c.type === "day") {
          const ordinal = rules.select(parseInt(c.value, 10));
          const suffix = suffixes[ordinal];
          return `${c.value}${suffix}`;
        }
        return c.value;
      }).join("");
    }
    return formatter2.format(dt);
  }
  if (typeof tokens_or_intlOptions !== "string" && !Array.isArray(tokens_or_intlOptions)) {
    return formatIntlOrdinal(new Intl.DateTimeFormat(locale, tokens_or_intlOptions), tokens_or_intlOptions.withOrdinal);
  }
  const tokens = Array.isArray(tokens_or_intlOptions) ? tokens_or_intlOptions.join("") : tokens_or_intlOptions;
  const formatter = new Intl.DateTimeFormat(locale, {
    year: tokens.includes(DateToken.Year_numeric) ? "numeric" : tokens.includes(DateToken.Year_2Digit) ? "2-digit" : void 0,
    month: tokens.includes(DateToken.Month_long) ? "long" : tokens.includes(DateToken.Month_short) ? "short" : tokens.includes(DateToken.Month_2Digit) ? "2-digit" : tokens.includes(DateToken.Month_numeric) ? "numeric" : void 0,
    day: tokens.includes(DateToken.DayOfMonth_2Digit) ? "2-digit" : tokens.includes(DateToken.DayOfMonth_numeric) ? "numeric" : void 0,
    hour: tokens.includes(DateToken.Hour_2Digit) ? "2-digit" : tokens.includes(DateToken.Hour_numeric) ? "numeric" : void 0,
    hour12: tokens.includes(DateToken.Hour_woAMPM) ? false : tokens.includes(DateToken.Hour_wAMPM) ? true : void 0,
    minute: tokens.includes(DateToken.Minute_2Digit) ? "2-digit" : tokens.includes(DateToken.Minute_numeric) ? "numeric" : void 0,
    second: tokens.includes(DateToken.Second_2Digit) ? "2-digit" : tokens.includes(DateToken.Second_numeric) ? "numeric" : void 0,
    fractionalSecondDigits: tokens.includes(DateToken.MiliSecond_3) ? 3 : void 0,
    weekday: tokens.includes(DateToken.DayOfWeek_narrow) ? "narrow" : tokens.includes(DateToken.DayOfWeek_long) ? "long" : tokens.includes(DateToken.DayOfWeek_short) ? "short" : void 0
  });
  return formatIntlOrdinal(formatter, tokens.includes(DateToken.DayOfMonth_withOrdinal));
}
function range(settings, date, weekStartsOn, formatToUse, biWeek = void 0) {
  const start = biWeek === void 0 ? startOfWeek(date, { weekStartsOn }) : startOfBiWeek(date, biWeek, weekStartsOn);
  const end = biWeek === void 0 ? endOfWeek(date, { weekStartsOn }) : endOfBiWeek(date, biWeek, weekStartsOn);
  return formatIntl(settings, start, formatToUse) + " - " + formatIntl(settings, end, formatToUse);
}
function formatDate(date, periodType, options = {}) {
  return formatDateWithLocale(defaultLocale, date, periodType, options);
}
function updatePeriodTypeWithWeekStartsOn(weekStartsOn, periodType) {
  if (periodType === PeriodType.Week) {
    periodType = [
      PeriodType.WeekSun,
      PeriodType.WeekMon,
      PeriodType.WeekTue,
      PeriodType.WeekWed,
      PeriodType.WeekThu,
      PeriodType.WeekFri,
      PeriodType.WeekSat
    ][weekStartsOn];
  } else if (periodType === PeriodType.BiWeek1) {
    periodType = [
      PeriodType.BiWeek1Sun,
      PeriodType.BiWeek1Mon,
      PeriodType.BiWeek1Tue,
      PeriodType.BiWeek1Wed,
      PeriodType.BiWeek1Thu,
      PeriodType.BiWeek1Fri,
      PeriodType.BiWeek1Sat
    ][weekStartsOn];
  } else if (periodType === PeriodType.BiWeek2) {
    periodType = [
      PeriodType.BiWeek2Sun,
      PeriodType.BiWeek2Mon,
      PeriodType.BiWeek2Tue,
      PeriodType.BiWeek2Wed,
      PeriodType.BiWeek2Thu,
      PeriodType.BiWeek2Fri,
      PeriodType.BiWeek2Sat
    ][weekStartsOn];
  }
  return periodType;
}
function formatDateWithLocale(settings, date, periodType, options = {}) {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  if (date == null || isNaN(date)) {
    return "";
  }
  const weekStartsOn = options.weekStartsOn ?? settings.formats.dates.weekStartsOn;
  const { day, dayTime, timeOnly, week, month, monthsYear, year } = settings.formats.dates.presets;
  periodType = updatePeriodTypeWithWeekStartsOn(weekStartsOn, periodType) ?? periodType;
  function rv(preset) {
    if (options.variant === "custom") {
      return options.custom ?? preset.default;
    } else if (options.custom && !options.variant) {
      return options.custom;
    }
    return preset[options.variant ?? "default"];
  }
  switch (periodType) {
    case PeriodType.Custom:
      return formatIntl(settings, date, options.custom);
    case PeriodType.Day:
      return formatIntl(settings, date, rv(day));
    case PeriodType.DayTime:
      return formatIntl(settings, date, rv(dayTime));
    case PeriodType.TimeOnly:
      return formatIntl(settings, date, rv(timeOnly));
    case PeriodType.Week:
    case PeriodType.WeekSun:
      return range(settings, date, 0, rv(week));
    case PeriodType.WeekMon:
      return range(settings, date, 1, rv(week));
    case PeriodType.WeekTue:
      return range(settings, date, 2, rv(week));
    case PeriodType.WeekWed:
      return range(settings, date, 3, rv(week));
    case PeriodType.WeekThu:
      return range(settings, date, 4, rv(week));
    case PeriodType.WeekFri:
      return range(settings, date, 5, rv(week));
    case PeriodType.WeekSat:
      return range(settings, date, 6, rv(week));
    case PeriodType.Month:
      return formatIntl(settings, date, rv(month));
    case PeriodType.MonthYear:
      return formatIntl(settings, date, rv(monthsYear));
    case PeriodType.Quarter:
      return [
        formatIntl(settings, startOfQuarter(date), rv(month)),
        formatIntl(settings, endOfQuarter(date), rv(monthsYear))
      ].join(" - ");
    case PeriodType.CalendarYear:
      return formatIntl(settings, date, rv(year));
    case PeriodType.FiscalYearOctober:
      const fDate = new Date(getFiscalYear(date), 0, 1);
      return formatIntl(settings, fDate, rv(year));
    case PeriodType.BiWeek1:
    case PeriodType.BiWeek1Sun:
      return range(settings, date, 0, rv(week), 1);
    case PeriodType.BiWeek1Mon:
      return range(settings, date, 1, rv(week), 1);
    case PeriodType.BiWeek1Tue:
      return range(settings, date, 2, rv(week), 1);
    case PeriodType.BiWeek1Wed:
      return range(settings, date, 3, rv(week), 1);
    case PeriodType.BiWeek1Thu:
      return range(settings, date, 4, rv(week), 1);
    case PeriodType.BiWeek1Fri:
      return range(settings, date, 5, rv(week), 1);
    case PeriodType.BiWeek1Sat:
      return range(settings, date, 6, rv(week), 1);
    case PeriodType.BiWeek2:
    case PeriodType.BiWeek2Sun:
      return range(settings, date, 0, rv(week), 2);
    case PeriodType.BiWeek2Mon:
      return range(settings, date, 1, rv(week), 2);
    case PeriodType.BiWeek2Tue:
      return range(settings, date, 2, rv(week), 2);
    case PeriodType.BiWeek2Wed:
      return range(settings, date, 3, rv(week), 2);
    case PeriodType.BiWeek2Thu:
      return range(settings, date, 4, rv(week), 2);
    case PeriodType.BiWeek2Fri:
      return range(settings, date, 5, rv(week), 2);
    case PeriodType.BiWeek2Sat:
      return range(settings, date, 6, rv(week), 2);
    default:
      return formatISO(date);
  }
}
function getFormatNumber(settings, style) {
  const { numbers } = settings.formats;
  const styleSettings = style ? numbers[style] : {};
  return {
    ...numbers.defaults,
    ...styleSettings
  };
}
function formatNumberWithLocale(settings, number, style, options = {}) {
  if (number == null) {
    return "";
  }
  if (style === "none") {
    return `${number}`;
  }
  const defaults = getFormatNumber(settings, style);
  const formatter = Intl.NumberFormat(settings.locale, {
    // Let's always starts with all defaults
    ...defaults,
    ...style !== "default" && {
      style
    },
    // If currency is specified, then style must be currency
    ...options.currency != null && {
      style: "currency"
    },
    // Let's shorten min / max with fractionDigits
    ...{
      minimumFractionDigits: options.fractionDigits ?? defaults.fractionDigits,
      maximumFractionDigits: options.fractionDigits ?? defaults.fractionDigits
    },
    // now we bring in user specified options
    ...options,
    // Let's overwrite for style=percentRound
    ...style === "percentRound" && {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    // Let's overwrite for style=metric
    ...style === "metric" && {
      style: "decimal",
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    // Let's overwrite for style=integer
    ...style === "integer" && {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  });
  const value = formatter.format(number);
  let suffix = options.suffix ?? "";
  if (suffix && Math.abs(number) >= 2 && options.suffixExtraIfMany !== "") {
    suffix += options.suffixExtraIfMany ?? "s";
  }
  return `${value}${suffix}`;
}
function format(value, format2, options) {
  return formatWithLocale(defaultLocale, value, format2, options);
}
function formatWithLocale(settings, value, format2, options) {
  let formattedValue;
  if (format2) {
    if (typeof format2 === "function") {
      formattedValue = format2(value);
    } else if (format2 in PeriodType) {
      formattedValue = formatDateWithLocale(settings, value, format2, options);
    } else if (typeof value === "number") {
      formattedValue = formatNumberWithLocale(settings, value, format2, options);
    }
  }
  return formattedValue ?? "";
}
function buildFormatters(settings) {
  const mainFormat = (value, style, options) => formatWithLocale(settings, value, style, options);
  mainFormat.settings = settings;
  mainFormat.getDayOfWeekName = (day) => getDayOfWeekName(day, settings.locale);
  mainFormat.getPeriodTypeName = (period) => getPeriodTypeNameWithLocale(settings, period);
  return mainFormat;
}
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [
        "shadow-border-l",
        "shadow-border-r",
        "shadow-border-t",
        "shadow-border-b",
        "elevation-none",
        ...range$1(1, 25).map((x) => `elevation-${x}`)
      ]
    }
  }
});
const cls = (...inputs) => twMerge(clsx(...inputs));
const browser = typeof window !== "undefined";
class CurrentTheme {
  /** The currently selected theme. If using the "system" theme this will be null. */
  theme;
  /** Whether the current theme is a light or dark theme */
  dark;
  constructor(theme, dark) {
    this.theme = theme;
    this.dark = dark;
  }
  /** The theme in use, either the selected theme or the theme chosen based on the "system" setting. */
  get resolvedTheme() {
    if (this.theme) {
      return this.theme;
    } else {
      return this.dark ? "dark" : "light";
    }
  }
}
function createThemeStore(options) {
  let store = writable(new CurrentTheme(null, false));
  if (!browser) {
    return {
      subscribe: store.subscribe,
      setTheme: (themeName) => {
        store.set(new CurrentTheme(themeName, options.dark.includes(themeName)));
      }
    };
  }
  let darkMatcher = window.matchMedia("(prefers-color-scheme: dark)");
  function resolveSystemTheme({ matches }) {
    if (matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    store.set(new CurrentTheme(null, matches));
  }
  function setTheme(themeName) {
    if (themeName === "system") {
      localStorage.removeItem("theme");
      delete document.documentElement.dataset.theme;
      resolveSystemTheme(darkMatcher);
      darkMatcher.addEventListener("change", resolveSystemTheme);
    } else {
      darkMatcher.removeEventListener("change", resolveSystemTheme);
      localStorage.theme = themeName;
      document.documentElement.dataset.theme = themeName;
      let dark = options.dark.includes(themeName);
      if (dark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      store.set(new CurrentTheme(themeName, dark));
    }
  }
  let savedTheme = localStorage.getItem("theme") || "system";
  setTheme(savedTheme);
  return {
    subscribe: store.subscribe,
    setTheme
  };
}
function createLocaleStores(settings) {
  if (settings.locale && settings.localeSettings && settings.format) {
    return {
      locale: settings.locale,
      localeSettings: settings.localeSettings,
      format: settings.format
    };
  }
  let allLocales = getAllKnownLocales(settings.localeFormats);
  let locale = localeStore(settings.forceLocale, settings.fallbackLocale);
  let localeSettings = derived(locale, ($locale) => {
    let settings2 = allLocales[$locale];
    if (settings2) {
      return settings2;
    }
    return {
      ...allLocales.en,
      locale: $locale
    };
  });
  return {
    locale,
    localeSettings,
    format: derived(localeSettings, buildFormatters)
  };
}
({
  currentTheme: createThemeStore({ light: ["light"], dark: ["dark"] }),
  componentSettingsCache: {},
  ...createLocaleStores({})
});
function matchMedia(queryString) {
  if (browser) {
    const query = window.matchMedia(queryString);
    return readable(query.matches, (set) => {
      const listener = (e) => set(e.matches);
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    });
  } else {
    return writable(true);
  }
}
const matchMediaWidth = (width) => matchMedia(`(min-width: ${width}px)`);
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536
};
matchMediaWidth(breakpoints.sm);
matchMediaWidth(breakpoints.md);
matchMediaWidth(breakpoints.lg);
matchMediaWidth(breakpoints.xl);
matchMediaWidth(breakpoints.xxl);
matchMedia(`screen`);
matchMedia(`print`);
matchMedia(`(prefers-color-scheme: dark)`);
matchMedia(`(prefers-color-scheme: light)`);
matchMedia(`(prefers-reduced-motion: reduce)`);
matchMedia(`(orientation: landscape)`);
matchMedia(`(orientation: portrait)`);
var DurationUnits;
(function(DurationUnits2) {
  DurationUnits2[DurationUnits2["Year"] = 0] = "Year";
  DurationUnits2[DurationUnits2["Day"] = 1] = "Day";
  DurationUnits2[DurationUnits2["Hour"] = 2] = "Hour";
  DurationUnits2[DurationUnits2["Minute"] = 3] = "Minute";
  DurationUnits2[DurationUnits2["Second"] = 4] = "Second";
  DurationUnits2[DurationUnits2["Millisecond"] = 5] = "Millisecond";
})(DurationUnits || (DurationUnits = {}));
enablePatches();
setAutoFreeze(false);
[50, ...range$1(100, 1e3, 100)];
const MEASUREMENT_ELEMENT_ID = "__text_measurement_id";
function _getStringWidth(str, style) {
  try {
    let textEl = document.getElementById(MEASUREMENT_ELEMENT_ID);
    if (!textEl) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.width = "0";
      svg.style.height = "0";
      svg.style.position = "absolute";
      svg.style.top = "-100%";
      svg.style.left = "-100%";
      textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.setAttribute("id", MEASUREMENT_ELEMENT_ID);
      svg.appendChild(textEl);
      document.body.appendChild(svg);
    }
    Object.assign(textEl.style, style);
    textEl.textContent = str;
    return textEl.getComputedTextLength();
  } catch (e) {
    return null;
  }
}
const getStringWidth = memoize(_getStringWidth, (str, style) => `${str}_${JSON.stringify(style)}`);
const t0 = /* @__PURE__ */ new Date(), t1 = /* @__PURE__ */ new Date();
function timeInterval(floori, offseti, count, field) {
  function interval(date) {
    return floori(date = arguments.length === 0 ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(+date)), date;
  }
  interval.floor = (date) => {
    return floori(date = /* @__PURE__ */ new Date(+date)), date;
  };
  interval.ceil = (date) => {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };
  interval.round = (date) => {
    const d0 = interval(date), d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };
  interval.offset = (date, step) => {
    return offseti(date = /* @__PURE__ */ new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };
  interval.range = (start, stop, step) => {
    const range2 = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0))
      return range2;
    let previous;
    do
      range2.push(previous = /* @__PURE__ */ new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range2;
  };
  interval.filter = (test) => {
    return timeInterval((date) => {
      if (date >= date)
        while (floori(date), !test(date))
          date.setTime(date - 1);
    }, (date, step) => {
      if (date >= date) {
        if (step < 0)
          while (++step <= 0) {
            while (offseti(date, -1), !test(date)) {
            }
          }
        else
          while (--step >= 0) {
            while (offseti(date, 1), !test(date)) {
            }
          }
      }
    });
  };
  if (count) {
    interval.count = (start, end) => {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };
    interval.every = (step) => {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null : !(step > 1) ? interval : interval.filter(field ? (d) => field(d) % step === 0 : (d) => interval.count(0, d) % step === 0);
    };
  }
  return interval;
}
const millisecond = timeInterval(() => {
}, (date, step) => {
  date.setTime(+date + step);
}, (start, end) => {
  return end - start;
});
millisecond.every = (k) => {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0))
    return null;
  if (!(k > 1))
    return millisecond;
  return timeInterval((date) => {
    date.setTime(Math.floor(date / k) * k);
  }, (date, step) => {
    date.setTime(+date + step * k);
  }, (start, end) => {
    return (end - start) / k;
  });
};
millisecond.range;
const durationSecond = 1e3;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;
const second = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds());
}, (date, step) => {
  date.setTime(+date + step * durationSecond);
}, (start, end) => {
  return (end - start) / durationSecond;
}, (date) => {
  return date.getUTCSeconds();
});
second.range;
const timeMinute = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
}, (date, step) => {
  date.setTime(+date + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date) => {
  return date.getMinutes();
});
timeMinute.range;
const utcMinute = timeInterval((date) => {
  date.setUTCSeconds(0, 0);
}, (date, step) => {
  date.setTime(+date + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date) => {
  return date.getUTCMinutes();
});
utcMinute.range;
const timeHour = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
}, (date, step) => {
  date.setTime(+date + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date) => {
  return date.getHours();
});
timeHour.range;
const utcHour = timeInterval((date) => {
  date.setUTCMinutes(0, 0, 0);
}, (date, step) => {
  date.setTime(+date + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date) => {
  return date.getUTCHours();
});
utcHour.range;
const timeDay = timeInterval(
  (date) => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
  (date) => date.getDate() - 1
);
timeDay.range;
const utcDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return date.getUTCDate() - 1;
});
utcDay.range;
const unixDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return Math.floor(date / durationDay);
});
unixDay.range;
function timeWeekday(i) {
  return timeInterval((date) => {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setDate(date.getDate() + step * 7);
  }, (start, end) => {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}
const timeSunday = timeWeekday(0);
const timeMonday = timeWeekday(1);
const timeTuesday = timeWeekday(2);
const timeWednesday = timeWeekday(3);
const timeThursday = timeWeekday(4);
const timeFriday = timeWeekday(5);
const timeSaturday = timeWeekday(6);
timeSunday.range;
timeMonday.range;
timeTuesday.range;
timeWednesday.range;
timeThursday.range;
timeFriday.range;
timeSaturday.range;
function utcWeekday(i) {
  return timeInterval((date) => {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, (start, end) => {
    return (end - start) / durationWeek;
  });
}
const utcSunday = utcWeekday(0);
const utcMonday = utcWeekday(1);
const utcTuesday = utcWeekday(2);
const utcWednesday = utcWeekday(3);
const utcThursday = utcWeekday(4);
const utcFriday = utcWeekday(5);
const utcSaturday = utcWeekday(6);
utcSunday.range;
utcMonday.range;
utcTuesday.range;
utcWednesday.range;
utcThursday.range;
utcFriday.range;
utcSaturday.range;
const timeMonth = timeInterval((date) => {
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setMonth(date.getMonth() + step);
}, (start, end) => {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, (date) => {
  return date.getMonth();
});
timeMonth.range;
const utcMonth = timeInterval((date) => {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCMonth(date.getUTCMonth() + step);
}, (start, end) => {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, (date) => {
  return date.getUTCMonth();
});
utcMonth.range;
const timeYear = timeInterval((date) => {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setFullYear(date.getFullYear() + step);
}, (start, end) => {
  return end.getFullYear() - start.getFullYear();
}, (date) => {
  return date.getFullYear();
});
timeYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setFullYear(date.getFullYear() + step * k);
  });
};
timeYear.range;
const utcYear = timeInterval((date) => {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, (start, end) => {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, (date) => {
  return date.getUTCFullYear();
});
utcYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};
utcYear.range;
[
  {
    predicate: (duration) => duration == null,
    // Unknown
    interval: timeYear.every(1),
    // Better than rendering a lot of items
    format: (date) => date.toString()
  },
  {
    predicate: (duration) => duration.years > 1,
    interval: timeYear.every(1),
    format: (date) => formatDate(date, PeriodType.CalendarYear, { variant: "short" })
  },
  {
    predicate: (duration) => duration.years,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 30,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days,
    interval: timeDay.every(1),
    format: (date) => formatDate(date, PeriodType.Day, { variant: "short" })
  },
  {
    predicate: (duration) => duration.hours,
    interval: timeHour.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes > 10,
    interval: timeMinute.every(10),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes,
    interval: timeMinute.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.seconds > 10,
    interval: second.every(10),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => duration.seconds,
    interval: second.every(1),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => true,
    // 0 or more milliseconds
    interval: millisecond.every(100),
    format: (date) => format$1(date, "h:mm:ss.SSS")
  }
];
[
  {
    predicate: (duration) => duration == null,
    // Unknown
    interval: timeYear.every(1),
    // Better than rendering a lot of items
    format: (date) => date.toString()
  },
  {
    predicate: (duration) => duration.years,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 90,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 30,
    interval: timeSunday.every(1),
    format: (date) => formatDate(date, PeriodType.WeekSun, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 7,
    interval: timeDay.every(1),
    format: (date) => formatDate(date, PeriodType.Day, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 3,
    interval: timeHour.every(8),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.days,
    interval: timeHour.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.hours,
    interval: timeMinute.every(15),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes > 10,
    interval: timeMinute.every(10),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes > 2,
    interval: timeMinute.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes,
    interval: second.every(10),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => duration.seconds,
    interval: second.every(1),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => true,
    // 0 or more milliseconds
    interval: millisecond.every(10),
    format: (date) => format$1(date, "h:mm:ss.SSS")
  }
];
export {
  cls as c,
  format as f,
  getStringWidth as g,
  interpolatePath as i,
  memoize as m
};
