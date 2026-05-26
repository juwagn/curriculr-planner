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
