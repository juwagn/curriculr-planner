import { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { addDays, format, parseISO } from 'date-fns';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore, type Density } from '@/stores/ui';
import { computeWeekRows, getQuarterRange, type WeekRow } from '@/lib/schoolweeks';
import type { Category, PlanEvent } from '@/types';
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
  rowHeight: number;
}

function DayCell({ mondayIso, dayIdx, events, categoryById, rowHeight }: DayCellProps) {
  const iso = dayIso(mondayIso, dayIdx);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const openEdit = useUiStore((s) => s.openEditEvent);
  const { isOver, setNodeRef } = useDroppable({
    id: `cell:${iso}`,
    data: { type: 'cell', iso }
  });

  return (
    <td
      ref={setNodeRef}
      onClick={() => openCreate(iso)}
      className={`group align-top border-r border-b border-slate-200 px-1.5 py-1.5 cursor-pointer relative ${
        isOver ? 'bg-[var(--color-primary-100)]/60' : 'hover:bg-slate-50/60'
      }`}
      style={{ minHeight: rowHeight, height: rowHeight }}
    >
      <div className="flex flex-col gap-1">
        {events.map((ev) => {
          const cat = categoryById.get(ev.categoryId);
          if (!cat) return null;
          return (
            <EventBlock
              key={ev.id}
              event={ev}
              category={cat}
              onClick={() => openEdit(ev.id)}
            />
          );
        })}
      </div>
      {events.length === 0 && (
        <span className="absolute bottom-1 left-2 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
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
      className={`group align-top border-b border-slate-200 px-2 py-1.5 cursor-pointer text-[12px] leading-[1.4] text-slate-800 ${
        hasNote ? 'bg-[#FFF8E1]' : 'bg-white hover:bg-slate-50/60'
      }`}
      style={{ width: 180, minHeight: rowHeight, height: rowHeight }}
    >
      {hasNote ? (
        <div className="whitespace-pre-line">{text}</div>
      ) : (
        <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          📝 Notiz hinzufügen
        </span>
      )}
    </td>
  );
}

export function WeekTable() {
  const doc = usePlannerStore((s) => s.doc);
  const updateEvent = usePlannerStore((s) => s.updateEvent);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const density = useUiStore((s) => s.density);
  const [notePopoverSw, setNotePopoverSw] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoHeight, setAutoHeight] = useState<number>(110);

  const rows = useMemo(() => (doc ? computeWeekRows(doc.schoolyear) : []), [doc?.schoolyear]);
  const qRange = useMemo(
    () => (doc ? getQuarterRange(currentQuarter, doc.schoolyear) : null),
    [doc?.schoolyear, currentQuarter]
  );

  const filteredRows = useMemo(() => {
    if (!qRange) return [] as WeekRow[];
    return rows.filter((r) => r.startDate <= qRange.endDate && r.endDate >= qRange.startDate);
  }, [rows, qRange]);

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    if (doc) for (const c of doc.categories) m.set(c.id, c);
    return m;
  }, [doc?.categories]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, PlanEvent[]>();
    if (!doc) return m;
    for (const ev of doc.events) {
      const arr = m.get(ev.start) ?? [];
      arr.push(ev);
      m.set(ev.start, arr);
    }
    return m;
  }, [doc?.events]);

  const holidayCount = filteredRows.filter((r) => r.kind === 'holiday').length;
  const schoolweekCount = filteredRows.length - holidayCount;

  useLayoutEffect(() => {
    if (density !== 'auto') return;
    const update = () => {
      const el = containerRef.current;
      if (!el || schoolweekCount === 0) return;
      const headerH = 40;
      const available = el.clientHeight - headerH - holidayCount * HOLIDAY_ROW_HEIGHT;
      const perRow = Math.floor(available / schoolweekCount);
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
  }, [density, schoolweekCount, holidayCount]);

  if (!doc) return null;
  const rowHeight = density === 'auto' ? autoHeight : ROW_MIN_HEIGHT_BY_DENSITY[density];

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeData = active.data.current as { type?: string; eventId?: string } | undefined;
    const overData = over.data.current as { type?: string; iso?: string } | undefined;
    if (activeData?.type !== 'event' || overData?.type !== 'cell') return;
    const id = activeData.eventId;
    const newIso = overData.iso;
    if (!id || !newIso) return;
    const ev = doc.events.find((x) => x.id === id);
    if (!ev || ev.start === newIso) return;
    updateEvent(id, { start: newIso, end: newIso });
  };

  const popoverWeek =
    notePopoverSw !== null
      ? rows.find((r) => r.kind === 'schoolweek' && r.index === notePopoverSw)
      : null;

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-auto"
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
            <tr className="bg-[var(--color-primary-900)] text-white text-[12.5px]">
              <th className="py-2.5 text-center text-[12px] font-semibold uppercase tracking-wider border-r border-white/15">
                #
              </th>
              <th className="py-2.5 pl-2 text-left text-[12px] font-semibold uppercase tracking-wider border-r border-white/15">
                Schulwoche
              </th>
              {DAY_LABELS.map((d) => (
                <th
                  key={d}
                  className="py-2.5 pl-2 text-left font-semibold border-r border-white/15"
                >
                  {d}
                </th>
              ))}
              <th className="py-2.5 pl-2 text-left text-[12px] font-semibold uppercase tracking-wider">
                Anmerkungen
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              if (row.kind === 'holiday') {
                return (
                  <tr key={`h-${i}-${row.startDate}`} style={{ height: HOLIDAY_ROW_HEIGHT }}>
                    <td className="bg-slate-50 border-r border-b border-slate-200" />
                    <td
                      className="bg-slate-50 border-r border-b border-slate-200 px-2 text-[12.5px] tabular-nums whitespace-nowrap text-slate-600"
                      style={{ width: 120 }}
                    >
                      {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                    </td>
                    <td
                      colSpan={5}
                      className="border-b border-slate-200 text-center italic font-semibold text-[14px] tracking-wide text-slate-700"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #E2E8F0 0 8px, #EDF2F8 8px 16px)'
                      }}
                    >
                      {row.label}
                    </td>
                    <td className="bg-slate-50 border-b border-slate-200" style={{ width: 180 }} />
                  </tr>
                );
              }
              const annotation = doc.annotations.find((a) => a.schoolweek === row.index);
              return (
                <tr key={`sw-${row.index}`} className="hover:bg-slate-50/30" style={{ height: rowHeight }}>
                  <td className="bg-slate-50/60 border-r border-b border-slate-200 text-center align-middle text-[15px] font-bold tabular-nums text-slate-700">
                    {row.index.toString().padStart(2, '0')}
                  </td>
                  <td className="bg-slate-50/60 border-r border-b border-slate-200 px-2 align-middle text-[12.5px] tabular-nums whitespace-nowrap text-slate-700">
                    {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                  </td>
                  {DAY_LABELS.map((_d, dayIdx) => {
                    const iso = dayIso(row.startDate, dayIdx);
                    const events = eventsByDate.get(iso) ?? [];
                    return (
                      <DayCell
                        key={dayIdx}
                        mondayIso={row.startDate}
                        dayIdx={dayIdx}
                        events={events}
                        categoryById={categoryById}
                        rowHeight={rowHeight}
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
      <NotePopover
        schoolweek={notePopoverSw}
        week={
          popoverWeek && popoverWeek.kind === 'schoolweek'
            ? { index: popoverWeek.index, startDate: popoverWeek.startDate, endDate: popoverWeek.endDate }
            : null
        }
        onClose={() => setNotePopoverSw(null)}
      />
    </DndContext>
  );
}
