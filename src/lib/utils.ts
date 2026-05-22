import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "Unknown";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(date);
}

export function absoluteMinistryUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/&amp;/g, "&");
  }

  return new URL(
    value.replace(/&amp;/g, "&"),
    "https://drh.sante.gov.ma",
  ).toString();
}
