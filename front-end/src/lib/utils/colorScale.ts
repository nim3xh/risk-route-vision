/**
 * Generate a perceptually uniform color scale for risk values 0-100
 * Based on professional risk matrix standards (Green → Yellow → Orange → Red)
 */

export function generateRiskColorScale(): { value: number; color: string }[] {
  const colors: { value: number; color: string }[] = [];
  
  for (let risk = 0; risk <= 100; risk++) {
    const color = getRiskColor(risk);
    colors.push({ value: risk, color });
  }
  
  return colors;
}

/**
 * Get precise color for a specific risk value (0-100)
 * Based on risk matrix color standards
 */
export function getRiskColor(risk: number): string {
  // Clamp risk between 0 and 100
  const clampedRisk = Math.max(0, Math.min(100, risk));
  
  let h: number; // Hue (0-360)
  let s: number; // Saturation (0-100)
  let l: number; // Lightness (0-100)
  
  if (clampedRisk <= 25) {
    // LOW RISK - Green zone (Insignificant to Minor)
    const t = clampedRisk / 25;
    h = 140 - (20 * t); // 140° (emerald green) to 120° (pure green)
    s = 50 + (15 * t); // 50% to 65%
    l = 45 + (5 * t); // 45% to 50%
  } else if (clampedRisk <= 50) {
    // MODERATE RISK - Yellow zone (Minor to Moderate)
    const t = (clampedRisk - 25) / 25;
    h = 120 - (65 * t); // 120° (green) to 55° (yellow-orange)
    s = 65 + (25 * t); // 65% to 90%
    l = 50 + (0 * t); // 50% constant
  } else if (clampedRisk <= 75) {
    // HIGH RISK - Orange zone (Moderate to High)
    const t = (clampedRisk - 50) / 25;
    h = 55 - (30 * t); // 55° (yellow-orange) to 25° (orange-red)
    s = 90 + (5 * t); // 90% to 95%
    l = 50 + (5 * t); // 50% to 55%
  } else {
    // CATASTROPHIC RISK - Red zone (High to Catastrophic)
    const t = (clampedRisk - 75) / 25;
    h = 25 - (25 * t); // 25° (orange-red) to 0° (pure red)
    s = 95 + (5 * t); // 95% to 100%
    l = 55 - (15 * t); // 55% to 40% (darker red)
  }
  
  // Add opacity based on risk level for shadow effect
  const alpha = 0.65 + (clampedRisk / 100 * 0.3); // 0.65 to 0.95
  
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${alpha.toFixed(2)})`;
}

/**
 * Generate MapLibre GL interpolate expression for smooth color transitions
 * Creates 101 distinct colors (one for each risk value 0-100)
 */
export function generateInterpolateExpression(): any[] {
  const expression: any[] = ["interpolate", ["linear"], ["get", "risk_0_100"]];
  
  // Add color stop for every single risk value
  for (let risk = 0; risk <= 100; risk++) {
    expression.push(risk);
    expression.push(getRiskColor(risk));
  }
  
  return expression;
}
