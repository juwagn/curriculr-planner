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
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.addEventListener('afterprint', () => win.close());
}

export function generatePrintHtml(
  model: PrintModel,
  orientation: 'portrait' | 'landscape'
): string {
  const css = `
    @page { size: A4 ${orientation}; margin: 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body { font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; line-height: 1.3; }
    .print-section + .print-section { break-before: page; }
    .page-header { background: #00345C; color: #fff; padding: 6pt 10pt; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5pt; }
    .school-name { font-weight: 700; font-size: 11pt; }
    .school-year { font-size: 9pt; opacity: 0.85; }
    .doc-name { font-size: 7.5pt; opacity: 0.7; margin-top: 1pt; }
    .quarter-badge { background: #FFC857; color: #00345C; font-weight: 700; padding: 2pt 8pt; border-radius: 10pt; font-size: 8pt; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8pt; }
    col.col-num { width: 9mm; }
    col.col-date { width: 22mm; }
    col.col-ann { width: 40mm; }
    th { background: #00345C; color: #fff; font-weight: 600; font-size: 7pt; letter-spacing: 0.04em; padding: 3pt 4pt; border: 0.5pt solid rgba(255,255,255,0.2); text-align: left; }
    th.th-num { text-align: center; }
    td { border: 0.5pt solid #ccc; padding: 3pt 4pt; vertical-align: top; overflow: hidden; }
    td.td-num { background: #f5f5f5; font-weight: 700; font-size: 10pt; text-align: center; vertical-align: middle; color: #00345C; }
    td.td-date { background: #f5f5f5; white-space: nowrap; font-size: 7.5pt; color: #555; vertical-align: middle; }
    td.td-ann { word-break: break-word; white-space: normal; font-size: 7.5pt; color: #444; }
    .event { border: 0.75pt solid #333; border-radius: 1.5pt; padding: 1.5pt 3pt; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 1.5pt; font-size: 7.5pt; line-height: 1.3; }
    .event-time { font-size: 6.5pt; opacity: 0.7; margin-right: 2pt; }
    .writeline { border-bottom: 0.5pt dashed #ccc; height: 10pt; margin-bottom: 2pt; display: block; }
    .holiday-row td { background-image: repeating-linear-gradient(45deg, #e8e8e8 0 4pt, #f0f0f0 4pt 8pt); text-align: center; font-style: italic; font-weight: 600; font-size: 8pt; color: #555; padding: 5pt; }
    .page-footer { margin-top: 4pt; border-top: 0.5pt solid #ccc; padding-top: 3pt; display: flex; justify-content: space-between; font-size: 7pt; color: #999; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
  `;

  const sections = model.sections.map((section) => {
    const rows = section.rows.map((row) =>
      row.type === 'holiday' ? renderHolidayRow(row) : renderWeekRow(row)
    ).join('');

    const schoolInfoPart = model.schoolInfo ? ` · ${escHtml(model.schoolInfo)}` : '';

    return `
<div class="print-section">
  <div class="page-header">
    <div>
      <span class="school-name">${escHtml(model.schoolName)}</span>
      <span> · </span>
      <span class="school-year">${escHtml(model.schoolyearLabel)}</span>
      <div class="doc-name">${escHtml(model.docName)}</div>
    </div>
    <span class="quarter-badge">${escHtml(section.quarterLabel)}</span>
  </div>
  <table>
    <colgroup>
      <col class="col-num" /><col class="col-date" />
      <col class="col-day" /><col class="col-day" /><col class="col-day" /><col class="col-day" /><col class="col-day" />
      <col class="col-ann" />
    </colgroup>
    <thead>
      <tr>
        <th class="th-num">#</th><th>Datum</th>
        <th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th>
        <th>Anmerkungen</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="page-footer">
    <span>Curriculr · Schulplaner${schoolInfoPart}</span>
    <span>Stand: ${escHtml(model.printedAt)} · ${escHtml(section.quarterLabel)}</span>
  </div>
</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(model.schoolName)} · ${escHtml(model.schoolyearLabel)}</title>
  <style>${css}</style>
</head>
<body>${sections}</body>
</html>`;
}

function renderWeekRow(row: PrintWeekRow): string {
  const dayCells = row.cells.map((cell) => {
    if (cell.events.length > 0) {
      const events = cell.events.map((ev) => {
        const time = ev.time ? `<span class="event-time">${escHtml(ev.time)}</span>` : '';
        return `<div class="event">${time}${escHtml(ev.title)}</div>`;
      }).join('');
      return `<td>${events}</td>`;
    }
    return `<td><span class="writeline"></span><span class="writeline"></span></td>`;
  }).join('');

  return `<tr>
  <td class="td-num">${escHtml(row.swIndex)}</td>
  <td class="td-date">${escHtml(row.dateRange)}</td>
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
