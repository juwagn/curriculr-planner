import { createPortal } from 'react-dom';
import type { PrintModel, PrintWeekRow, PrintHolidayRow } from '@/lib/print-model';

const DAY_COLS = 5;
const TABLE_COLS = 2 + DAY_COLS + 1; // #, Datum, 5 days, Anmerkungen

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
            <div
              style={{
                background: '#00345C',
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
                  background: '#FFC857',
                  color: '#00345C',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: '8pt'
                }}
              >
                {section.quarterLabel}
              </span>
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                fontSize: '8pt'
              }}
            >
              <colgroup>
                <col style={{ width: 24 }} />
                <col style={{ width: 58 }} />
                <col /><col /><col /><col /><col />
                <col style={{ width: 100 }} />
              </colgroup>
              <thead>
                <tr
                  style={{
                    background: '#00345C',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '7pt',
                    letterSpacing: '0.05em'
                  }}
                >
                  <th style={{ padding: '4px 3px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>Datum</th>
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((d) => (
                    <th key={d} style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>{d}</th>
                  ))}
                  <th style={{ padding: '4px 4px', border: '0.5px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>Anmerkungen</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => {
                  if (row.type === 'holiday') {
                    return <HolidayTableRow key={`holiday-${row.dateRange}`} row={row} />;
                  }
                  return <WeekTableRow key={`week-${row.swIndex}`} row={row} />;
                })}
              </tbody>
            </table>

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
              <span>Stand: {model.printedAt} · {section.quarterLabel}</span>
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
    verticalAlign: 'top'
  };
  return (
    <tr style={{ borderBottom: '0.5px solid #e3e7eb' }}>
      <td style={{ ...cellStyle, background: '#f7f9fb', fontWeight: 700, color: '#00345C', textAlign: 'center' }}>
        {row.swIndex}
      </td>
      <td style={{ ...cellStyle, background: '#f7f9fb', color: '#647488', whiteSpace: 'nowrap', fontSize: '7.5pt' }}>
        {row.dateRange}
      </td>
      {row.cells.map((cell, ci) => (
        <td key={ci} style={cellStyle}>
          {cell.events.length > 0
            ? cell.events.map((ev, ei) => (
                <span
                  key={`${ei}-${ev.title}`}
                  style={{
                    display: 'block',
                    border: '0.5px solid #555',
                    borderRadius: 2,
                    padding: '2px 5px',
                    marginBottom: 2,
                    fontSize: '7.5pt',
                    lineHeight: 1.3
                  }}
                >
                  {ev.time && (
                    <span style={{ fontSize: '6.5pt', opacity: 0.75, marginRight: 3 }}>{ev.time}</span>
                  )}
                  {ev.title}
                </span>
              ))
            : [0, 1].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    borderBottom: '0.5px dashed #ccc',
                    height: 12,
                    marginBottom: 2
                  }}
                />
              ))}
        </td>
      ))}
      <td
        style={{
          ...cellStyle,
          fontSize: '7.5pt',
          color: '#647488',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          width: 100
        }}
      >
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
