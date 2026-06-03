import { buildPrintModel } from './print-model';
import type { PrintModel, PrintWeekRow, PrintHolidayRow, PrintScope } from './print-model';
import type { PlannerDocument } from '@/types';

export function openPrintWindow(
  doc: PlannerDocument,
  scope: PrintScope,
  currentQuarter: 1 | 2 | 3 | 4,
  orientation: 'portrait' | 'landscape'
): void {
  const model = buildPrintModel(doc, scope, currentQuarter);
  const html = generatePrintHtml(model, orientation);

  let frame = document.getElementById('curriculr-print-frame') as HTMLIFrameElement | null;
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'curriculr-print-frame';
    frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:none';
    document.body.appendChild(frame);
  }

  const frameDoc = frame.contentDocument ?? frame.contentWindow?.document;
  if (!frameDoc) return;
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frame!.contentWindow?.focus();
      frame!.contentWindow?.print();
    } catch {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
  };
  frame.onload = doPrint;
  setTimeout(doPrint, 500);
}

export function generatePrintHtml(
  model: PrintModel,
  orientation: 'portrait' | 'landscape'
): string {
  const css = `
    @page { size: A4 ${orientation}; margin: 8mm 10mm 16mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 9pt; color: #1a1a2e; line-height: 1.3; }
    .print-section + .print-section { break-before: page; }

    /* ── Kopfzeile ── */
    .hdr { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5pt; padding-bottom: 4pt; border-bottom: 0.5pt solid #999; }
    .hdr-left { display: flex; align-items: center; gap: 5pt; }
    .hdr-logo { font-size: 15pt; font-weight: 900; color: #00345C; letter-spacing: -0.03em; line-height: 1; }
    .hdr-sep { width: 0.5pt; height: 18pt; background: #ccc; flex-shrink: 0; }
    .hdr-school { font-size: 8pt; color: #555; font-weight: 600; line-height: 1.4; }
    .hdr-right { text-align: right; }
    .hdr-main { font-size: 10.5pt; font-weight: 700; color: #1a1a2e; letter-spacing: -0.01em; line-height: 1.2; }
    .hdr-sub { font-size: 6pt; color: #999; margin-top: 2pt; }
    .qt { font-size: 7pt; font-weight: 700; color: #666; margin: 4pt 0 3pt; text-transform: uppercase; letter-spacing: 0.08em; }

    /* ── Tabelle ── */
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
    col.col-num { width: 24pt; }
    col.col-date { width: 22mm; }
    col.col-ann { width: 90pt; }
    thead th { background: #00345C; color: #fff; padding: 3pt; font-size: 6.5pt; border: 0.1pt solid #002a4a; text-align: center; font-weight: 600; letter-spacing: 0.05em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody td { border: 0.1pt solid #ddd; padding: 2pt 3pt; vertical-align: top; overflow: hidden; }
    td.td-num { background: #dce8f2; text-align: center; vertical-align: middle; font-size: 7pt; font-weight: 700; color: #00345C; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td.td-date { background: #dce8f2; vertical-align: middle; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .date-label { display: block; font-size: 8pt; font-weight: 700; color: #222; margin-bottom: 1pt; }
    .date-range { font-size: 7pt; color: #555; }
    td.td-ann { background: #fafafa; word-break: break-word; white-space: normal; font-size: 7.5pt; color: #555; }

    /* ── Events: linker Farbbalken ── */
    .event { font-size: 8.5pt; padding: 1.5pt 2pt 1.5pt 5pt; margin: 0.5pt 0; line-height: 1.3; color: #1a1a2e; background: transparent; border-left: 2.5pt solid #ccc; display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .event-time { font-size: 6.5pt; color: #666; margin-right: 2pt; }
    .writeline { border-bottom: 0.5pt dashed #ccc; height: 10pt; margin-bottom: 2pt; display: block; }

    /* ── Ferien ── */
    .holiday-row td { background-image: repeating-linear-gradient(45deg, #f0f0f0 0 4pt, #f9f9f9 4pt 8pt); text-align: center; font-style: italic; font-weight: 600; font-size: 8pt; color: #666; padding: 5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* ── Fußzeile (jede Seite) ── */
    .pdf-ft { position: fixed; bottom: 0; left: 0; right: 0; border-top: 0.1pt solid #ddd; padding: 1.5pt 10mm; font-size: 5.5pt; color: #aaa; text-align: center; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    tr { break-inside: avoid; }
    thead { display: table-header-group; }
    @media print { body { padding: 0; } }
  `;

  const schoolInfoPart = model.schoolInfo ? ` · ${escHtml(model.schoolInfo)}` : '';
  const footer = `<div class="pdf-ft">Stand: ${escHtml(model.printedAt)} | Curriculr · Schulplaner${schoolInfoPart}</div>`;

  const sections = model.sections.map((section) => {
    const rows = section.rows.map((row) =>
      row.type === 'holiday' ? renderHolidayRow(row) : renderWeekRow(row)
    ).join('');

    return `
<div class="print-section">
  <div class="hdr">
    <div class="hdr-left">
      <span class="hdr-logo">Curriculr</span>
      <span class="hdr-sep"></span>
      <span class="hdr-school">${escHtml(model.schoolName)}</span>
    </div>
    <div class="hdr-right">
      <div class="hdr-main">${escHtml(model.schoolyearLabel)}</div>
      <div class="hdr-sub">${escHtml(model.docName)}</div>
    </div>
  </div>
  <div class="qt">${escHtml(section.quarterLabel)}</div>
  <table>
    <colgroup>
      <col class="col-num" /><col class="col-date" />
      <col class="col-day" /><col class="col-day" /><col class="col-day" /><col class="col-day" /><col class="col-day" />
      <col class="col-ann" />
    </colgroup>
    <thead>
      <tr>
        <th>SW</th><th>Datum</th>
        <th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th>
        <th>Anmerkungen</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(model.schoolName)} · ${escHtml(model.schoolyearLabel)}</title>
  <style>${css}</style>
</head>
<body>
${footer}
${sections}
</body>
</html>`;
}

function renderWeekRow(row: PrintWeekRow): string {
  const dayCells = row.cells.map((cell) => {
    if (cell.events.length > 0) {
      const events = cell.events.map((ev) => {
        const time = ev.time ? `<span class="event-time">${escHtml(ev.time)}</span>` : '';
        return `<div class="event" style="border-left-color:${escHtml(ev.color)}">${time}${escHtml(ev.title)}</div>`;
      }).join('');
      return `<td>${events}</td>`;
    }
    return `<td><span class="writeline"></span><span class="writeline"></span></td>`;
  }).join('');

  return `<tr>
  <td class="td-num">${escHtml(row.swIndex)}</td>
  <td class="td-date"><span class="date-label">${escHtml(row.dateRange)}</span></td>
  ${dayCells}
  <td class="td-ann">${row.annotation ? escHtml(row.annotation) : ''}</td>
</tr>`;
}

function renderHolidayRow(row: PrintHolidayRow): string {
  return `<tr class="holiday-row"><td colspan="8">${escHtml(row.label)} · ${escHtml(row.dateRange)}</td></tr>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
