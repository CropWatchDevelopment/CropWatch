import moment from "moment";

export function isDayTime(): boolean {
    var currentHour = +moment().format("HH");
    if (currentHour >= 6 && currentHour < 18) return true;
    return false;
}