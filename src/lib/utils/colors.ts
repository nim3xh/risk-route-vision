import { RiskBand } from "@/types";

export function riskToBand(risk: number): RiskBand {
  if (risk < 40) return "safe";
  if (risk < 70) return "warning";
  return "danger";
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
