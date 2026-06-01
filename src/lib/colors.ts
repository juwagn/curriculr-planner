/**
 * Saturated base colors offered in the category color picker. Muted mid-tones
 * (~Tailwind 400/500) aligned with the marine/gelb brand language. Event blocks
 * render these through `pastelize()` for the background and use the raw color as
 * the 3px left accent — so presets stay saturated, never pre-pastelled.
 */
export const CATEGORY_PALETTE = [
  '#0058A0', // Marine (Brand)
  '#3E8EA8', // Sky/Petrol
  '#2F9E8F', // Teal
  '#4FA373', // Salbeigrün
  '#D9A23B', // Bernstein/Gelb
  '#D98B5F', // Terrakotta/Apricot
  '#D46A6A', // Dusty Coral
  '#B66A9E', // Mauve/Beere
  '#7C72C4', // Gedämpftes Violett
  '#647488'  // Schiefer-Grau
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function contrastColor(bgHex: string): '#000000' | '#FFFFFF' {
  const [r, g, b] = hexToRgb(bgHex);
  const norm = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

export function pastelize(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * 0.12 + 255 * 0.88);
  return rgbToHex(mix(r), mix(g), mix(b));
}
