import { createPortal } from 'react-dom';
import type { PrintModel, PrintWeekRow, PrintHolidayRow } from '@/lib/print-model';

const DAY_COLS = 5; // matches PrintWeekRow cells 5-tuple
const TABLE_COLS = 2 + DAY_COLS + 1; // #, Datum, [5 days], Anmerkungen

interface Props {
  model: PrintModel | null;
}

export function PrintDocument({ model }: Props) {
  if (!model) return null;

  return createPortal(
    <div className="print-root">
      <div className="print-document">
        {model.sections.map((section) => (
          <div key={section.quarterIndex} className="print-section">
            {/* Page header inside section — appears at top of each page due to break-before: page */}
            <div
              style={{
                background: 'var(--color-marine-800)',
                color: '#fff',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: '11pt' }}>{model.schoolName}</span>
                <span style={{ opacity: 0.7 }}> · </span>
                <span style={{ fontSize: '9pt', opacity: 0.85 }}>{model.schoolyearLabel}</span>
                <div style={{ fontSize: '8pt', opacity: 0.75, marginTop: 1 }}>{model.docName}</div>
              </div>
              <span
                style={{
                  background: 'var(--color-gelb-500)',
                  color: 'var(--color-marine-800)',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: '8pt'
                }}
              >
                {section.quarterLabel}
              </span>
            </div>

            {/* Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                fontSize: '8pt'
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--color-marine-800)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '7pt',
                    letterSpacing: '0.05em'
                  }}
                >
                  <th style={{ width: 28, padding: '4px 3px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>#</th>
                  <th style={{ width: 54, padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>Datum</th>
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((d) => (
                    <th key={d} style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>{d}</th>
                  ))}
                  <th style={{ width: 90, padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>Anmerkungen</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, i) => {
                  if (row.type === 'holiday') {
                    return <HolidayTableRow key={i} row={row} />;
                  }
                  return <WeekTableRow key={i} row={row} />;
                })}
              </tbody>
            </table>

            {/* Legend */}
            {model.legend.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: '7.5pt' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-ink-500)', marginRight: 4 }}>Legende</span>
                {model.legend.map((item) => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span
                      style={{ width: 9, height: 9, borderRadius: 2, background: item.color, display: 'inline-block' }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                marginTop: 4,
                borderTop: '0.5px solid #dce1e6',
                paddingTop: 3,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '7pt',
                color: '#9aa6b1'
              }}
            >
              <span>Curriculr · Schulplaner{model.schoolInfo ? ` · ${model.schoolInfo}` : ''}</span>
              <span>Stand: {model.printedAt} · Seite <span className="print-page-number" /></span>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

function WeekTableRow({ row }: { row: PrintWeekRow }) {
  const cellStyle: React.CSSProperties = {
    border: '0.5px solid #e3e7eb',
    padding: '3px 4px',
    verticalAlign: 'top',
    minHeight: 32
  };
  return (
    <tr style={{ borderBottom: '0.5px solid #e3e7eb' }}>
      <td style={{ ...cellStyle, background: '#f7f9fb', fontWeight: 700, color: 'var(--color-marine-800)', textAlign: 'center' }}>
        {row.swIndex}
      </td>
      <td style={{ ...cellStyle, background: '#f7f9fb', color: 'var(--color-ink-500)', whiteSpace: 'nowrap', fontSize: '7.5pt' }}>
        {row.dateRange}
      </td>
      {row.cells.map((cell, ci) => (
        <td key={ci} style={cellStyle}>
          {cell.events.map((ev, ei) => (
            <span
              key={ei}
              style={{
                display: 'block',
                background: ev.bgColor,
                color: ev.color,
                borderRadius: 3,
                padding: '1px 3px',
                marginBottom: 2,
                fontSize: '7pt',
                fontWeight: 600,
                lineHeight: 1.3,
                borderLeft: `2.5px solid ${ev.color}`
              }}
            >
              {ev.time && (
                <span style={{ fontSize: '6.5pt', opacity: 0.8, marginRight: 2 }}>{ev.time}</span>
              )}
              {ev.title}
            </span>
          ))}
        </td>
      ))}
      <td style={{ ...cellStyle, fontSize: '7.5pt', color: 'var(--color-ink-500)' }}>
        {row.annotation}
      </td>
    </tr>
  );
}

function HolidayTableRow({ row }: { row: PrintHolidayRow }) {
  return (
    <tr>
      <td
        colSpan={TABLE_COLS}
        style={{
          border: '0.5px solid #e3e7eb',
          padding: '5px 8px',
          textAlign: 'center',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: '8pt',
          color: '#647488',
          backgroundImage: 'repeating-linear-gradient(45deg, #f3f5f7 0 6px, #e9edf0 6px 12px)'
        }}
      >
        {row.label} · {row.dateRange}
      </td>
    </tr>
  );
}
