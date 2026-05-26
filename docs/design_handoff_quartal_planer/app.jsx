// Curriculr Planner — Hauptkomponente
// Quartal-Planungs-Editor: zeilenweise Schulwochen-Übersicht (Mo–Fr)

const { useState, useMemo, useRef, useEffect } = React;
const { CATEGORIES, SCHOOLWEEKS_HJ1, QUARTERS, EVENTS, ANNOTATIONS } = window.PLANNER_DATA;

// ---------- Tweak-Defaults (persistent) ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "stripes": "diagonal",
  "categoryColor": "left-border",
  "headerStyle": "solid-primary",
  "weekendCol": false,
  "showCategoryLegend": true
}/*EDITMODE-END*/;

// ---------- Utilities ----------
const fmtRange = (start, end) => {
  // 'YYYY-MM-DD' -> 'DD.MM.–DD.MM.'
  const f = (s) => {
    const [, m, d] = s.split('-');
    return `${d}.${m}.`;
  };
  return `${f(start)}–${f(end)}`;
};

const DAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const DAY_SHORT  = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

// Group events by week and day
const groupEvents = (events) => {
  const map = {};
  for (const e of events) {
    if (!map[e.sw]) map[e.sw] = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    map[e.sw][e.day].push(e);
  }
  return map;
};

// ---------- EventBlock ----------
function EventBlock({ event, tweaks, onClick }) {
  const cat = CATEGORIES[event.cat] || CATEGORIES.unterricht;
  const isHighlight = event.highlight;
  const colorMode = tweaks.categoryColor;

  // Build style based on colorMode
  let style = {};
  let extraClass = '';
  if (isHighlight) {
    style = {
      background: '#FFE9A8',
      borderLeft: `3px solid ${cat.color}`,
    };
    if (colorMode === 'pill') {
      style = { background: '#FFE9A8' };
    }
  } else if (colorMode === 'left-border') {
    style = {
      borderLeft: `3px solid ${cat.color}`,
      background: hexToBgTint(cat.color),
    };
  } else if (colorMode === 'dot') {
    style = { background: '#F8FAFC' };
  } else if (colorMode === 'pill') {
    style = { background: hexToBgTint(cat.color, 0.18) };
  } else if (colorMode === 'solid') {
    style = { background: cat.color, color: getContrast(cat.color) };
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick && onClick(event); }}
      className={`group/event w-full text-left px-2 py-1 rounded-[3px] text-[12px] leading-[1.35] transition-all hover:shadow-sm hover:-translate-y-[0.5px] cursor-pointer ${extraClass}`}
      style={style}
      draggable
    >
      <div className="flex items-start gap-1.5">
        {colorMode === 'dot' && !isHighlight && (
          <span
            className="mt-[5px] inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: cat.color }}
          />
        )}
        <div className="min-w-0 flex-1">
          {event.time && (
            <span className="font-bold tabular-nums" style={{ color: colorMode === 'solid' ? 'inherit' : '#0F1B2E' }}>
              {event.time}
              {event.endTime ? `-${event.endTime}` : ''}
              {' '}
            </span>
          )}
          <span className={event.bold ? 'font-semibold' : ''} style={{ wordBreak: 'break-word' }}>
            {event.title}
          </span>
        </div>
      </div>
    </button>
  );
}

const hexToBgTint = (hex, alpha = 0.10) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};
const getContrast = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#0F1B2E' : '#FFFFFF';
};

// ---------- DayCell ----------
function DayCell({ events, onAdd, onEventClick, tweaks, isWeekend }) {
  const padY = tweaks.density === 'compact' ? 'py-1' : tweaks.density === 'spacious' ? 'py-2.5' : 'py-1.5';
  return (
    <td
      className={`border-r border-b border-slate-200 align-top ${padY} px-1.5 group hover:bg-slate-50/60 cursor-cell relative`}
      onClick={() => onAdd && onAdd()}
    >
      <div className="flex flex-col gap-1">
        {events.map((e) => (
          <EventBlock key={e.id} event={e} tweaks={tweaks} onClick={onEventClick} />
        ))}
        {events.length === 0 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-slate-400 flex items-center gap-1 px-0.5 py-1">
            <span className="text-[14px] leading-none">+</span> Termin
          </div>
        )}
      </div>
    </td>
  );
}

// ---------- AnnotationCell ----------
function AnnotationCell({ note, onClick }) {
  const hasNote = note && (typeof note === 'string' ? note.trim() : true);
  return (
    <td
      onClick={onClick}
      className={`border-b border-slate-200 align-top px-2 py-1.5 cursor-pointer group hover:bg-amber-50/80 transition-colors text-[12px] leading-[1.4]`}
      style={hasNote ? { background: '#FFF8E1' } : {}}
    >
      {hasNote ? (
        <div className="space-y-1">
          {typeof note === 'string' ? (
            note.split('\n').map((l, i) => (
              <div key={i} className="text-slate-800" style={{ wordBreak: 'break-word' }}>{l}</div>
            ))
          ) : (
            <>
              {note.bold && (
                <div className="font-semibold text-slate-900 whitespace-pre-line">{note.bold}</div>
              )}
              {note.text && (
                <div className="text-slate-800 whitespace-pre-line">{note.text}</div>
              )}
              {note.highlight && (
                <div className="px-1 rounded-[2px] inline-block" style={{ background: '#FFE9A8' }}>
                  <span className="text-slate-900">{note.highlight}</span>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-slate-400 flex items-center gap-1">
          <span>📝</span> Notiz hinzufügen
        </div>
      )}
    </td>
  );
}

// ---------- HolidayRow ----------
function HolidayRow({ row, tweaks }) {
  const stripeBg = tweaks.stripes === 'diagonal'
    ? `repeating-linear-gradient(45deg, #E2E8F0 0 8px, #EDF2F8 8px 16px)`
    : tweaks.stripes === 'dotted'
    ? `radial-gradient(#CBD5E1 1px, transparent 1.2px) 0 0 / 8px 8px, #F1F5F9`
    : `#E2E8F0`;
  return (
    <tr className="h-12">
      <td className="border-r border-b border-slate-200 text-center text-slate-400 text-sm bg-slate-50"></td>
      <td className="border-r border-b border-slate-200 px-2 text-[12px] text-slate-600 tabular-nums bg-slate-50">
        {fmtRange(row.startDate, row.endDate)}
      </td>
      <td colSpan={5} className="border-b border-slate-200 text-center" style={{ background: stripeBg }}>
        <span className="italic font-semibold text-slate-700 text-[14px] tracking-wide drop-shadow-sm">
          {row.holiday}
        </span>
      </td>
      <td className="border-b border-slate-200 bg-slate-50"></td>
    </tr>
  );
}

// ---------- WeekRow ----------
function WeekRow({ week, eventsByDay, annotation, tweaks, onAddEvent, onEventClick, onAnnotationClick }) {
  const minH = tweaks.density === 'compact' ? 60 : tweaks.density === 'spacious' ? 110 : 84;
  return (
    <tr style={{ minHeight: minH + 'px' }} className="hover:bg-slate-50/30 transition-colors">
      <td className="border-r border-b border-slate-200 text-center font-bold tabular-nums text-[15px] text-slate-700 bg-slate-50/60">
        {week.label}
      </td>
      <td className="border-r border-b border-slate-200 px-2 text-[12.5px] text-slate-700 tabular-nums whitespace-nowrap bg-slate-50/60">
        {fmtRange(week.startDate, week.endDate)}
      </td>
      {[1, 2, 3, 4, 5].map((day) => (
        <DayCell
          key={day}
          events={eventsByDay[day] || []}
          tweaks={tweaks}
          onAdd={() => onAddEvent(week, day)}
          onEventClick={onEventClick}
        />
      ))}
      <AnnotationCell note={annotation} onClick={() => onAnnotationClick(week)} />
    </tr>
  );
}

// ---------- Modal: Termin erstellen/bearbeiten ----------
function EventModal({ open, mode, initial, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(initial || {});
  useEffect(() => { setForm(initial || {}); }, [initial]);
  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const cat = CATEGORIES[form.cat] || CATEGORIES.unterricht;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              {mode === 'edit' ? 'Termin bearbeiten' : 'Neuer Termin'}
            </div>
            <div className="text-[15px] font-semibold text-slate-900 mt-0.5">
              {form.dateLabel || 'Termin'}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 w-7 h-7 grid place-items-center rounded hover:bg-slate-100">✕</button>
        </div>

        <div className="p-5 space-y-3">
          {/* Titel */}
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1 block">Titel</label>
            <input
              autoFocus
              value={form.title || ''}
              onChange={(e) => set('title', e.target.value)}
              placeholder="z.B. Zeugniskonferenz Sek I"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00345C]/30 focus:border-[#00345C]"
            />
          </div>

          {/* Zeit */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] font-medium text-slate-700 mb-1 block">Beginn</label>
              <input
                value={form.time || ''}
                onChange={(e) => set('time', e.target.value)}
                placeholder="14:15"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#00345C]/30 focus:border-[#00345C]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-700 mb-1 block">Ende</label>
              <input
                value={form.endTime || ''}
                onChange={(e) => set('endTime', e.target.value)}
                placeholder="optional"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#00345C]/30 focus:border-[#00345C]"
              />
            </div>
          </div>

          {/* Kategorie */}
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1.5 block">Kategorie</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(CATEGORIES).map((c) => {
                const active = form.cat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => set('cat', c.id)}
                    className={`text-[12px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gruppen */}
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1 block">Gruppen / Beteiligte</label>
            <input
              value={form.groups || ''}
              onChange={(e) => set('groups', e.target.value)}
              placeholder="z.B. KL 8, WW-FLuL"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00345C]/30 focus:border-[#00345C]"
            />
          </div>

          {/* Notizen */}
          <div>
            <label className="text-[12px] font-medium text-slate-700 mb-1 block">Notiz</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="optional"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00345C]/30 focus:border-[#00345C]"
            />
          </div>

          {/* Highlight */}
          <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.highlight}
              onChange={(e) => set('highlight', e.target.checked)}
              className="accent-[#FFC857] w-4 h-4"
            />
            Als Highlight markieren (gelb)
          </label>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {mode === 'edit' && (
              <button
                onClick={onDelete}
                className="text-[13px] text-red-600 hover:text-red-700 font-medium px-2 py-1.5 rounded hover:bg-red-50"
              >
                Löschen
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[13px] text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded hover:bg-slate-200">
              Abbrechen
            </button>
            <button
              onClick={() => onSave(form)}
              className="text-[13px] text-white px-4 py-1.5 rounded-md font-medium shadow-sm hover:shadow-md transition-shadow"
              style={{ background: '#00345C' }}
            >
              {mode === 'edit' ? 'Speichern' : 'Termin anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Notiz-Popover ----------
function NotePopover({ open, anchor, initial, onClose, onSave }) {
  const [text, setText] = useState(typeof initial === 'string' ? initial : (initial?.text || ''));
  useEffect(() => { setText(typeof initial === 'string' ? initial : (initial?.text || '')); }, [initial]);
  if (!open || !anchor) return null;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute bg-white rounded-lg shadow-2xl border border-slate-200 w-80"
        style={{ top: anchor.y, left: Math.max(8, anchor.x - 280) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-slate-900 flex items-center gap-1.5">
            <span>📝</span> Anmerkung für die Woche
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-sm w-6 h-6 grid place-items-center rounded hover:bg-slate-100">✕</button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Hinweise, Erinnerungen, Feiertage…"
          className="w-full px-3 py-2.5 text-[13px] focus:outline-none resize-none"
          style={{ background: '#FFF8E1' }}
        />
        <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[12.5px] text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded">
            Abbrechen
          </button>
          <button
            onClick={() => onSave(text)}
            className="text-[12.5px] text-white px-3 py-1 rounded font-medium"
            style={{ background: '#00345C' }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Category legend ----------
function CategoryLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-[11.5px] text-slate-600">
      {Object.values(CATEGORIES).map((c) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Main app ----------
function PlannerApp() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [events, setEvents] = useState(EVENTS);
  const [annotations, setAnnotations] = useState(ANNOTATIONS);
  const [modal, setModal] = useState(null); // { mode, initial }
  const [notePopover, setNotePopover] = useState(null);

  const eventsBySw = useMemo(() => groupEvents(events), [events]);

  const visibleRows = useMemo(() => {
    const q = QUARTERS.find((q) => q.id === activeQuarter);
    const [from, to] = q.weekRange;
    return SCHOOLWEEKS_HJ1.filter((row) => {
      if (row.holiday) {
        // Holiday rows fall within a quarter by date
        const startMonth = parseInt(row.startDate.slice(5, 7));
        if (activeQuarter === 'Q1') return startMonth >= 10 && startMonth <= 10;
        if (activeQuarter === 'Q2') return startMonth === 12 || startMonth === 1;
        return false;
      }
      return row.index >= from && row.index <= to;
    });
  }, [activeQuarter]);

  // ---------- Handlers ----------
  const openCreate = (week, day) => {
    if (!week) return;
    const dayDate = computeDayDate(week.startDate, day);
    setModal({
      mode: 'create',
      initial: {
        sw: week.index,
        day,
        cat: 'konferenz',
        dateLabel: `${DAY_LABELS[day - 1]}, ${formatGerman(dayDate)}`,
      },
    });
  };
  const openEdit = (event) => {
    const week = SCHOOLWEEKS_HJ1.find((w) => w.index === event.sw);
    const dayDate = week ? computeDayDate(week.startDate, event.day) : '';
    setModal({
      mode: 'edit',
      initial: { ...event, dateLabel: `${DAY_LABELS[event.day - 1]}, ${formatGerman(dayDate)}` },
    });
  };
  const saveEvent = (form) => {
    if (modal.mode === 'create') {
      const e = { id: 'new' + Date.now(), ...form };
      setEvents((es) => [...es, e]);
    } else {
      setEvents((es) => es.map((x) => (x.id === form.id ? { ...x, ...form } : x)));
    }
    setModal(null);
  };
  const deleteEvent = () => {
    setEvents((es) => es.filter((x) => x.id !== modal.initial.id));
    setModal(null);
  };
  const openNote = (week) => (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setNotePopover({
      sw: week.index,
      initial: annotations[week.index] || '',
      anchor: { x: rect.right, y: rect.top },
    });
  };
  const saveNote = (text) => {
    setAnnotations((a) => ({ ...a, [notePopover.sw]: text }));
    setNotePopover(null);
  };

  return (
    <div className="min-h-screen" style={{ background: '#F4F6F8' }}>
      <ChromeHeader />
      <main className="max-w-[1400px] mx-auto px-6 pb-20 pt-5">
        <TopBar activeQuarter={activeQuarter} setActiveQuarter={setActiveQuarter} />

        {/* Table card */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '120px' }} />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col style={{ width: '180px' }} />
            </colgroup>
            <thead>
              <tr style={{
                background: t.headerStyle === 'solid-primary' ? '#00345C'
                  : t.headerStyle === 'gradient' ? 'linear-gradient(180deg, #003B68 0%, #002A4A 100%)'
                  : '#0F1B2E'
              }}>
                <th className="text-white text-[12px] font-semibold uppercase tracking-wider py-2.5 border-r border-white/15">#</th>
                <th className="text-white text-[12px] font-semibold uppercase tracking-wider py-2.5 border-r border-white/15 text-left pl-2">Schulwoche</th>
                {DAY_LABELS.map((d, i) => (
                  <th key={d} className="text-white text-[12.5px] font-semibold py-2.5 border-r border-white/15 text-left pl-2">
                    {d}
                  </th>
                ))}
                <th className="text-white text-[12px] font-semibold uppercase tracking-wider py-2.5 pl-2 text-left">Anmerkungen</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => {
                if (row.holiday) {
                  return <HolidayRow key={'h' + idx} row={row} tweaks={t} />;
                }
                return (
                  <WeekRow
                    key={'w' + row.index}
                    week={row}
                    eventsByDay={eventsBySw[row.index] || {}}
                    annotation={annotations[row.index]}
                    tweaks={t}
                    onAddEvent={openCreate}
                    onEventClick={openEdit}
                    onAnnotationClick={openNote(row)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / legend */}
        {t.showCategoryLegend && (
          <div className="mt-4 px-2 flex items-center justify-between gap-4 flex-wrap">
            <CategoryLegend />
            <div className="text-[11px] text-slate-500">
              Klick auf Zelle = neuer Termin · Klick auf Termin = bearbeiten · Klick auf Anmerkungen = Notiz
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <EventModal
        open={!!modal}
        mode={modal?.mode}
        initial={modal?.initial}
        onClose={() => setModal(null)}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />
      <NotePopover
        open={!!notePopover}
        anchor={notePopover?.anchor}
        initial={notePopover?.initial}
        onClose={() => setNotePopover(null)}
        onSave={saveNote}
      />

      {/* Tweaks panel */}
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Dichte">
          <window.TweakRadio
            label="Zeilenhöhe"
            value={t.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'compact', label: 'Kompakt' },
              { value: 'comfortable', label: 'Standard' },
              { value: 'spacious', label: 'Geräumig' },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection label="Termin-Stil">
          <window.TweakSelect
            label="Kategorie-Markierung"
            value={t.categoryColor}
            onChange={(v) => setTweak('categoryColor', v)}
            options={[
              { value: 'left-border', label: 'Linke Border + Pastell' },
              { value: 'dot', label: 'Farb-Punkt vor Titel' },
              { value: 'pill', label: 'Pastell-Pille (ohne Border)' },
              { value: 'solid', label: 'Solider Farbblock' },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection label="Ferien-Zeilen">
          <window.TweakRadio
            label="Schraffur"
            value={t.stripes}
            onChange={(v) => setTweak('stripes', v)}
            options={[
              { value: 'diagonal', label: 'Diagonal' },
              { value: 'dotted', label: 'Punkte' },
              { value: 'solid', label: 'Einfarbig' },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection label="Tabellen-Header">
          <window.TweakSelect
            label="Stil"
            value={t.headerStyle}
            onChange={(v) => setTweak('headerStyle', v)}
            options={[
              { value: 'solid-primary', label: 'Curriculr-Primary 900' },
              { value: 'gradient', label: 'Dunkler Verlauf' },
              { value: 'midnight', label: 'Fast schwarz' },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection label="Anzeige">
          <window.TweakToggle
            label="Kategorie-Legende"
            value={t.showCategoryLegend}
            onChange={(v) => setTweak('showCategoryLegend', v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

// ---------- Chrome / TopBar ----------
function ChromeHeader() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md grid place-items-center text-white font-bold text-[14px]" style={{ background: '#00345C' }}>
            <span style={{ letterSpacing: '-0.5px' }}>C</span>
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-slate-900 leading-none">Curriculr</div>
            <div className="text-[10.5px] text-slate-500 leading-none mt-[2px]">Planner</div>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-[13px]">
          <a className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100">Dashboard</a>
          <a className="px-3 py-1.5 rounded font-medium text-slate-900 bg-slate-100">Jahresplan</a>
          <a className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100">Vorlagen</a>
          <a className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100">Kategorien</a>
          <a className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100">Einstellungen</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="text-[12px] text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded hover:bg-slate-100 flex items-center gap-1.5">
            <span>📥</span> Export
          </button>
          <button className="text-[12px] text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded hover:bg-slate-100 flex items-center gap-1.5">
            <span>🖨️</span> Drucken
          </button>
          <div className="w-7 h-7 rounded-full bg-slate-200 grid place-items-center text-[11px] font-semibold text-slate-700">RH</div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ activeQuarter, setActiveQuarter }) {
  return (
    <div>
      {/* Quartal Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
          {QUARTERS.map((q) => {
            const active = q.id === activeQuarter;
            return (
              <button
                key={q.id}
                onClick={() => setActiveQuarter(q.id)}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${active ? 'text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                style={active ? { background: '#00345C' } : {}}
              >
                <span className="font-semibold">{q.label}</span>
                <span className={`ml-2 text-[11px] ${active ? 'text-white/75' : 'text-slate-400'}`}>{q.subtitle}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-[12.5px] text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:border-slate-300 flex items-center gap-1.5">
            <span>🔍</span> Filter
          </button>
          <button className="px-3 py-1.5 text-[12.5px] text-white rounded-md font-medium shadow-sm hover:shadow flex items-center gap-1.5" style={{ background: '#00345C' }}>
            <span className="text-[14px] leading-none">+</span> Neuer Termin
          </button>
        </div>
      </div>

      {/* Title bar (above the table, like the screenshot) */}
      <div className="mt-4 px-1 grid grid-cols-3 items-baseline gap-4">
        <div className="text-[15px] font-semibold text-slate-900">Gesamtschule Horst</div>
        <div className="text-center">
          <div className="text-[20px] font-bold text-slate-900 tracking-tight" style={{ color: '#00345C' }}>
            Termine 2026/27
          </div>
        </div>
        <div className="text-right text-[15px] font-semibold text-slate-900">
          1. Halbjahr
          <span className="text-[11.5px] text-slate-500 font-normal ml-2">(KW 35 – KW 04)</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Date helpers ----------
const computeDayDate = (startMo, day) => {
  const d = new Date(startMo + 'T00:00:00');
  d.setDate(d.getDate() + (day - 1));
  return d.toISOString().slice(0, 10);
};
const formatGerman = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

// Expose
window.PlannerApp = PlannerApp;
