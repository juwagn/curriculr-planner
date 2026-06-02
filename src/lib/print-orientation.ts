const STYLE_ID = 'curriculr-print-page';

export function applyPrintOrientation(orientation: 'portrait' | 'landscape'): void {
  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `@page { size: A4 ${orientation}; margin: 14mm; }`;
  document.head.appendChild(style);
}
