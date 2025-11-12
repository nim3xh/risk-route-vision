import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { config } from "@/lib/config";

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatHourLabel(hour: number): string {
  return dayjs().tz(config.timezone).hour(hour).minute(0).format("HH:mm");
}

export function getCurrentHour(): number {
  return dayjs().tz(config.timezone).hour();
}

export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return dayjs().tz(config.timezone).format("YYYY-MM-DD HH:mm:ss");
  return dayjs(timestamp).tz(config.timezone).format("YYYY-MM-DD HH:mm:ss");
}

export function getTodayDate(): string {
  return dayjs().tz(config.timezone).format("YYYY-MM-DD");
}
