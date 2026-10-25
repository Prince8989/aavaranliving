export const CM_PER_INCH = 2.54;
export const CM_PER_FOOT = 30.48;

/** Imperial label from centimetres, e.g. 152 → "5′ 0″". */
export function cmToFeetInches(cm: number): string {
  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}′ ${inches}″`;
}

export function feetToCm(feet: number, inches = 0): number {
  return Math.round(feet * CM_PER_FOOT + inches * CM_PER_INCH);
}

export function formatDimensions(lengthCm: number, widthCm: number): string {
  return `${cmToFeetInches(widthCm)} × ${cmToFeetInches(lengthCm)} (${widthCm} × ${lengthCm} cm)`;
}

export function formatWeight(grams: number | null | undefined): string | null {
  if (!grams) return null;
  const kg = grams / 1000;
  const lb = grams / 453.59237;
  return `${kg.toFixed(1)} kg (${lb.toFixed(1)} lb)`;
}

/** Size buckets used by the size filter, by area in square metres. */
export const SIZE_BUCKETS = [
  { id: "small", label: "Small (under 3 m²)", min: 0, max: 3 },
  { id: "medium", label: "Medium (3–5 m²)", min: 3, max: 5 },
  { id: "large", label: "Large (5–8 m²)", min: 5, max: 8 },
  { id: "xl", label: "Extra large (8 m² +)", min: 8, max: Infinity },
] as const;

export function areaM2(lengthCm: number, widthCm: number) {
  return (lengthCm * widthCm) / 10000;
}
