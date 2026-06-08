import { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore, type Density } from '@/stores/ui';
import { computeWeekRows, getQuarterForDate, isHoliday, type WeekRow } from '@/lib/schoolweeks';
import type { Category, PlanEvent } from '@/types';
import { useConflicts, conflictsByEvent } from '@/hooks/useConflicts';
import type { Conflict } from '@/lib/conflicts';
import { EventBlock } from './EventBlock';
import { NotePopover } from './NotePopover';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const HOLIDAY_ROW_HEIGHT = 56;
const ROW_MIN_HEIGHT_BY_DENSITY: Record<Density, number> = {
  auto: 84,
  compact: 70,
  standard: 110,
  roomy: 150
};

function fmtDot(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

function dayIso(mondayIso: string, dayIdx: number): string {
  return format(addDays(parseISO(mondayIso), dayIdx), 'yyyy-MM-dd');
}

interface DayCellProps {
  mondayIso: string;
  dayIdx: number;
  events: PlanEvent[];
  categoryById: Map<string, Category>;
  conflictMap: Map<string, Conflict[]>;
  rowHeight: number;
  feiertag?: string | null;
  ferien?: boolean;
}

function DayCell({ mondayIso, dayIdx, events, categoryById, conflictMap, rowHeight, feiertag, ferien }: DayCellProps) {
  const iso = dayIso(mondayIso, dayIdx);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const openEdit = useUiStore((s) => s.openEditEvent);
  const { isOver, setNodeRef } = useDroppable({
    id: `cell:${iso}`,
    data: { type: 'cell', iso }
  });

  const handleCellClick = () => {
    const armed = useUiStore.getState().armedTemplateId;
    if (armed) {
      const newId = usePlannerStore.getState().createEventFromTemplate(armed, iso);
      if (newId) {
        openEdit(newId);
        useUiStore.getState().armTemplate(null);
      }
      return;
    }
    openCreate(iso);
  };

  return (
    <td
      ref={setNodeRef}
      onClick={handleCellClick}
      className={`group align-top border-r border-b border-[var(--color-ink-200)] px-1.5 py-1.5 cursor-pointer relative transition-colors ${
        isOver ? 'bg-[var(--color-marine-100)]/60' : 'hover:bg-[var(--color-paper-bg)]/60'
      }`}
      style={{
        minHeight: rowHeight,
        height: rowHeight,
        transitionDuration: 'var(--dur-state)',
        transitionTimingFunction: 'var(--ease-state)',
        ...(feiertag
          ? { backgroundColor: 'var(--color-feiertag-bg)' }
          : ferien
            ? { backgroundColor: 'var(--color-ferien-b)' }
            : {})
      }}
    >
      <div className="flex flex-col gap-1">
        {feiertag && (
          <span className="block truncate text-[11px] font-semibold text-[var(--color-ink-900)]" title={feiertag}>
            {feiertag}
          </span>
        )}
        {events.map((ev) => {
          const cat = categoryById.get(ev.categoryId);
          if (!cat) return null;
          const evConflicts = conflictMap.get(ev.id) ?? [];
          const severity = evConflicts.some((c) => c.severity === 'error')
            ? 'error'
            : evConflicts.length > 0
              ? 'warning'
              : undefined;
          const isStart = ev.start === iso;
          const isEnd = ev.end === iso;
          const pos = isStart && isEnd ? 'single' : isStart ? 'start' : isEnd ? 'end' : 'middle';
          return (
            <EventBlock
              key={ev.id}
              event={ev}
              category={cat}
              onClick={() => openEdit(ev.id)}
              conflictSeverity={severity}
              segmentPosition={pos}
            />
          );
        })}
      </div>
      {events.length === 0 && (
        <span className="absolute bottom-1 left-2 text-[11px] text-[var(--color-ink-500)] opacity-30 group-hover:opacity-100 pointer-events-none transition-opacity">
          + Termin
        </span>
      )}
    </td>
  );
}

interface AnnotationCellProps {
  text: string;
  onClick(): void;
  rowHeight: number;
}

function AnnotationCell({ text, onClick, rowHeight }: AnnotationCellProps) {
  const hasNote = text.trim().length > 0;
  return (
    <td
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group align-top border-b border-[var(--color-ink-200)] px-2 py-1.5 cursor-pointer text-[13px] leading-[1.5] text-[var(--color-ink-900)] transition-colors ${
        hasNote ? 'bg-[var(--color-gelb-100)]' : 'bg-[var(--color-paper-card)] hover:bg-[var(--color-paper-bg)]/60'
      }`}
      style={{ width: 180, minHeight: rowHeight, height: rowHeight, transitionDuration: 'var(--dur-state)', transitionTimingFunction: 'var(--ease-state)' }}
    >
      {hasNote ? (
        <div className="whitespace-pre-line">{text}</div>
      ) : (
        <span className="text-[11px] text-[var(--color-ink-500)] opacity-0 group-hover:opacity-100 transition-opacity">
          📝 Notiz hinzufügen
        </span>
      )}
    </td>
  );
}

export function WeekTable() {
  const doc = usePlannerStore((s) => s.doc);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const density = useUiStore((s) => s.density);
  const [notePopoverSw, setNotePopoverSw] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoHeight, setAutoHeight] = useState<number>(110);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when the schoolyear slice changes, not the whole doc
  const rows = useMemo(() => (doc ? computeWeekRows(doc.schoolyear) : []), [doc?.schoolyear]);
  const filteredRows = useMemo(() => {
    if (!doc) return [] as WeekRow[];
    return rows.filter((r) => getQuarterForDate(r.startDate, doc.schoolyear) === currentQuarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when schoolyear / quarter changes
  }, [rows, doc?.schoolyear, currentQuarter]);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    if (doc) for (const c of doc.categories) m.set(c.id, c);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when categories change
  }, [doc?.categories]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, PlanEvent[]>();
    if (!doc) return m;
    for (const ev of doc.events) {
      const span = Math.max(0, differenceInCalendarDays(parseISO(ev.end), parseISO(ev.start)));
      for (let i = 0; i <= span; i++) {
        const iso = format(addDays(parseISO(ev.start), i), 'yyyy-MM-dd');
        const arr = m.get(iso) ?? [];
        arr.push(ev);
        m.set(iso, arr);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-memo only when events change
  }, [doc?.events]);

  const conflicts = useConflicts();
  const conflictMap = useMemo(() => conflictsByEvent(conflicts), [conflicts]);

  // Only EMPTY holiday weeks render as the compact banner; holiday weeks with
  // events use a full-height day-cell row, so they count toward the tall rows.
  const rowHasEvents = (row: WeekRow) =>
    DAY_LABELS.some((_d, dayIdx) => (eventsByDate.get(dayIso(row.startDate, dayIdx)) ?? []).length > 0);
  const bannerCount = filteredRows.filter((r) => r.kind === 'holiday' && !rowHasEvents(r)).length;
  const tallRowCount = filteredRows.length - bannerCount;

  useLayoutEffect(() => {
    if (density !== 'auto') return;
    const update = () => {
      const el = containerRef.current;
      if (!el || tallRowCount === 0) return;
      const headerH = 40;
      const available = el.clientHeight - headerH - bannerCount * HOLIDAY_ROW_HEIGHT;
      const perRow = Math.floor(available / tallRowCount);
      setAutoHeight(Math.max(80, Math.min(220, perRow)));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [density, tallRowCount, bannerCount]);

  if (!doc) return null;
  const rowHeight = density === 'auto' ? autoHeight : ROW_MIN_HEIGHT_BY_DENSITY[density];

  const popoverWeek =
    notePopoverSw !== null
      ? rows.find((r) => r.kind === 'schoolweek' && r.index === notePopoverSw)
      : null;

  return (
    <>
      <div className="flex h-full flex-col gap-3">
      {doc.events.length === 0 && (
        <div className="flex items-center gap-2 rounded-[var(--radius-default)] border border-[var(--color-ink-200)] bg-[var(--color-gelb-100)] px-4 py-2.5 text-[13px] text-[var(--color-ink-900)]">
          <span aria-hidden="true">📝</span>
          <span>
            Klicken Sie in eine Tageszelle, um einen Termin anzulegen, oder nutzen Sie
            {' '}<span className="font-semibold">+ Termin</span> oben rechts.
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 bg-[var(--color-paper-card)] rounded-[var(--radius-default)] border border-[var(--color-ink-200)] overflow-auto"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 50 }} />
            <col style={{ width: 120 }} />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col style={{ width: 180 }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-marine-800)] text-[var(--color-paper-card)]" style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
              <th className="py-2.5 text-center uppercase border-r border-white/15">
                #
              </th>
              <th className="py-2.5 pl-2 text-left uppercase border-r border-white/15">
                Schulwoche
              </th>
              {DAY_LABELS.map((d) => (
                <th
                  key={d}
                  className="py-2.5 pl-2 text-left uppercase border-r border-white/15"
                >
                  {d}
                </th>
              ))}
              <th className="py-2.5 pl-2 text-left uppercase">
                Anmerkungen
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              if (row.kind === 'holiday') {
                // A holiday week that contains events (e.g. Schulleitung/Lehrkräfte
                // in den Ferien) is rendered with normal day cells + Ferien tint so
                // those events stay visible and editable. Empty holiday weeks stay
                // collapsed as the compact striped banner.
                const hasEvents = DAY_LABELS.some(
                  (_d, dayIdx) => (eventsByDate.get(dayIso(row.startDate, dayIdx)) ?? []).length > 0
                );
                if (hasEvents) {
                  return (
                    <tr key={`h-${i}-${row.startDate}`} className="transition-colors" style={{ height: rowHeight }}>
                      <td
                        className="border-r border-b border-[var(--color-ink-200)]"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, var(--color-ferien-a) 0 8px, var(--color-ferien-b) 8px 16px)'
                        }}
                      />
                      <td
                        className="border-r border-b border-[var(--color-ink-200)] px-2 align-middle text-[12.5px] tabular-nums whitespace-nowrap text-[var(--color-ink-900)]"
                        style={{ width: 120, backgroundColor: 'var(--color-ferien-b)' }}
                      >
                        <span className="block font-semibold italic">{row.label}</span>
                        <span className="block text-[11px] text-[var(--color-ink-500)]">
                          {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                        </span>
                      </td>
                      {DAY_LABELS.map((_d, dayIdx) => {
                        const iso = dayIso(row.startDate, dayIdx);
                        const events = eventsByDate.get(iso) ?? [];
                        const h = isHoliday(iso, doc.schoolyear.holidays);
                        const feiertag = h && h.type === 'feiertag' ? h.label : null;
                        return (
                          <DayCell
                            key={dayIdx}
                            mondayIso={row.startDate}
                            dayIdx={dayIdx}
                            events={events}
                            categoryById={categoryById}
                            conflictMap={conflictMap}
                            rowHeight={rowHeight}
                            feiertag={feiertag}
                            ferien
                          />
                        );
                      })}
                      <td
                        className="border-b border-[var(--color-ink-200)]"
                        style={{ width: 180, backgroundColor: 'var(--color-ferien-b)' }}
                      />
                    </tr>
                  );
                }
                return (
                  <tr key={`h-${i}-${row.startDate}`} style={{ height: HOLIDAY_ROW_HEIGHT }}>
                    <td className="bg-[var(--color-paper-bg)] border-r border-b border-[var(--color-ink-200)]" />
                    <td
                      className="bg-[var(--color-paper-bg)] border-r border-b border-[var(--color-ink-200)] px-2 text-[12.5px] tabular-nums whitespace-nowrap text-[var(--color-ink-500)]"
                      style={{ width: 120 }}
                    >
                      {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                    </td>
                    <td
                      colSpan={5}
                      className="border-b border-[var(--color-ink-200)] text-center italic font-semibold text-[13px] tracking-wide text-[var(--color-ink-900)]"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, var(--color-ferien-a) 0 8px, var(--color-ferien-b) 8px 16px)'
                      }}
                    >
                      {row.label}
                    </td>
                    <td className="bg-[var(--color-paper-bg)] border-b border-[var(--color-ink-200)]" style={{ width: 180 }} />
                  </tr>
                );
              }
              const annotation = doc.annotations.find((a) => a.schoolweek === row.index);
              return (
                <tr key={`sw-${row.index}`} className="hover:bg-[var(--color-paper-bg)]/40 transition-colors" style={{ height: rowHeight, transitionDuration: 'var(--dur-state)' }}>
                  <td className="bg-[var(--color-paper-bg)]/60 border-r border-b border-[var(--color-ink-200)] text-center align-middle text-[15px] font-bold tabular-nums text-[var(--color-ink-900)]">
                    {row.index.toString().padStart(2, '0')}
                  </td>
                  <td className="bg-[var(--color-paper-bg)]/60 border-r border-b border-[var(--color-ink-200)] px-2 align-middle text-[12.5px] tabular-nums whitespace-nowrap text-[var(--color-ink-500)]">
                    {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                  </td>
                  {DAY_LABELS.map((_d, dayIdx) => {
                    const iso = dayIso(row.startDate, dayIdx);
                    const events = eventsByDate.get(iso) ?? [];
                    const h = isHoliday(iso, doc.schoolyear.holidays);
                    const feiertag = h && h.type === 'feiertag' ? h.label : null;
                    return (
                      <DayCell
                        key={dayIdx}
                        mondayIso={row.startDate}
                        dayIdx={dayIdx}
                        events={events}
                        categoryById={categoryById}
                        conflictMap={conflictMap}
                        rowHeight={rowHeight}
                        feiertag={feiertag}
                      />
                    );
                  })}
                  <AnnotationCell
                    text={annotation?.text ?? ''}
                    onClick={() => setNotePopoverSw(row.index)}
                    rowHeight={rowHeight}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
      <NotePopover
        schoolweek={notePopoverSw}
        week={
          popoverWeek && popoverWeek.kind === 'schoolweek'
            ? { index: popoverWeek.index, startDate: popoverWeek.startDate, endDate: popoverWeek.endDate }
            : null
        }
        onClose={() => setNotePopoverSw(null)}
      />
    </>
  );
}
