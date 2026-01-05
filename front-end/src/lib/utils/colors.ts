import { RiskBand } from "@/types";

export function riskToBand(risk: number): RiskBand {
  if (risk < 40) return "safe";
  if (risk < 70) return "warning";
  return "danger";
}

/**
 * Get smooth gradient color for weather-style heatmap
 * Returns smooth transitions between green -> yellow -> orange -> red
 */
export function riskToHeatmapColor(risk: number): string {
  // Smooth gradient from green (0) to red (100)
  if (risk <= 25) {
    // Green to Light Green
    const t = risk / 25;
    return `rgba(34, 197, 94, ${0.4 + t * 0.2})`; // Green with varying opacity
  } else if (risk <= 50) {
    // Light Green to Yellow
    const t = (risk - 25) / 25;
    const r = Math.round(34 + (234 - 34) * t);
    const g = Math.round(197 + (179 - 197) * t);
    const b = Math.round(94 + (0 - 94) * t);
    return `rgba(${r}, ${g}, ${b}, ${0.6 + t * 0.1})`;
  } else if (risk <= 75) {
    // Yellow to Orange
    const t = (risk - 50) / 25;
    const r = Math.round(234 + (251 - 234) * t);
    const g = Math.round(179 + (146 - 179) * t);
    const b = Math.round(0 + (0 - 0) * t);
    return `rgba(${r}, ${g}, ${b}, ${0.7 + t * 0.1})`;
  } else {
    // Orange to Red
    const t = (risk - 75) / 25;
    const r = Math.round(251 + (239 - 251) * t);
    const g = Math.round(146 + (68 - 146) * t);
    const b = Math.round(0 + (68 - 0) * t);
    return `rgba(${r}, ${g}, ${b}, ${0.8 + t * 0.2})`;
  }
}

export function riskToColor(risk: number): string {
  const band = riskToBand(risk);
  switch (band) {
    case "safe":
      return "hsl(142, 76%, 36%)"; // --risk-safe
    case "warning":
      return "hsl(38, 92%, 50%)"; // --risk-warning
    case "danger":
      return "hsl(0, 84%, 60%)"; // --risk-danger
  }
}

export function riskToBackgroundColor(risk: number): string {
  const band = riskToBand(risk);
  switch (band) {
    case "safe":
      return "hsl(142, 76%, 94%)"; // --risk-safe-light
    case "warning":
      return "hsl(38, 92%, 95%)"; // --risk-warning-light
    case "danger":
      return "hsl(0, 84%, 95%)"; // --risk-danger-light
  }
}

export function getBandLabel(band: RiskBand): string {
  switch (band) {
    case "safe":
      return "Low Risk";
    case "warning":
      return "Medium Risk";
    case "danger":
      return "High Risk";
  }
}
