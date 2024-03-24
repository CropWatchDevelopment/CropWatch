import { b as browser } from "./theme.js";
const logLevels = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];
class Logger {
  name;
  constructor(name) {
    this.name = name;
  }
  trace(...message) {
    this.log("TRACE", ...message);
  }
  debug(...message) {
    this.log("DEBUG", ...message);
  }
  info(...message) {
    this.log("INFO", ...message);
  }
  warn(...message) {
    this.log("WARN", ...message);
  }
  error(...message) {
    this.log("ERROR", ...message);
  }
  log(level, ...message) {
    const enabledLoggers = browser ? localStorage.getItem("logger")?.split(",").map((x) => x.split(":")) ?? [] : [];
    const enabledLogger = enabledLoggers.find((x) => x[0] === this.name);
    const shouldLog = enabledLogger != null && logLevels.indexOf(level) >= logLevels.indexOf(enabledLogger[1] ?? "DEBUG");
    if (shouldLog) {
      switch (level) {
        case "TRACE":
          console.trace(`%c${this.name} %c${level}`, "color: hsl(200deg, 10%, 50%)", "color: hsl(200deg, 40%, 50%)", ...message);
          break;
        case "DEBUG":
          console.log(`%c${this.name} %c${level}`, "color: hsl(200deg, 10%, 50%)", "color: hsl(200deg, 40%, 50%)", ...message);
          break;
        case "INFO":
          console.log(`%c${this.name} %c${level}`, "color: hsl(200deg, 10%, 50%)", "color: hsl(60deg, 100%, 50%)", ...message);
          break;
        case "WARN":
          console.warn(`%c${this.name} %c${level}`, "color: hsl(200deg, 10%, 50%)", "color: hsl(30deg, 100%, 50%)", ...message);
          break;
        case "ERROR":
          console.warn(`%c${this.name} %c${level}`, "color: hsl(200deg, 10%, 50%)", "color: hsl(0deg, 100%, 50%)", ...message);
          break;
      }
    }
  }
}
export {
  Logger as L
};
