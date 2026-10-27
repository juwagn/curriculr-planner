import { useState, useRef, useLayoutEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore, type Density } from '@/stores/ui';
import { isHoliday } from '@/lib/schoolweeks';
import type { Category, PlanEvent, WeekAnnotation } from '@/types';
import type { Conflict } from '@/lib/conflicts';
import { useIsNarrow } from '@/hooks/useMediaQuery';
import { EventBlock } from './EventBlock';
import { NotePopover } from './NotePopover';
import { WeekAgenda } from './WeekAgenda';
import { useWeekData, dayIso, fmtDot } from './useWeekData';
import { annotationsForWeek } from '@/lib/annotations';
import { GripVertical, StickyNote } from 'lucide-react';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const HOLIDAY_ROW_HEIGHT = 56;
const ROW_MIN_HEIGHT_BY_DENSITY: Record<Density, number> = {
  auto: 84,
  compact: 70,
  standard: 110,
  roomy: 150
};

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
          <span className="block truncate text-[12px] font-semibold text-[var(--color-ink-900)]" title={feiertag}>
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
        <span className="absolute bottom-1 left-2 text-[12px] text-[var(--color-ink-500)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          + Termin
        </span>
      )}
    </td>
  );
}

interface WeekendCellProps {
  mondayIso: string;
  eventsByDate: Map<string, PlanEvent[]>;
  categoryById: Map<string, Category>;
  conflictMap: Map<string, Conflict[]>;
  rowHeight: number;
  ferien?: boolean;
}

/**
 * Narrow Sa/So column: weekend events (e.g. Tag der offenen Tür) stay visible
 * and editable. Each event appears once, under the first weekend day it
 * touches; clicks on empty space create an event on Saturday, drops move the
 * dragged event to Saturday.
 */
function WeekendCell({ mondayIso, eventsByDate, categoryById, conflictMap, rowHeight, ferien }: WeekendCellProps) {
  const sat = dayIso(mondayIso, 5);
  const sun = dayIso(mondayIso, 6);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const openEdit = useUiStore((s) => s.openEditEvent);
  const { isOver, setNodeRef } = useDroppable({
    id: `cell:${sat}`,
    data: { type: 'cell', iso: sat }
  });

  const seen = new Set<string>();
  const groups: { iso: string; events: PlanEvent[] }[] = [];
  for (const iso of [sat, sun]) {
    const events = (eventsByDate.get(iso) ?? []).filter((ev) => !seen.has(ev.id));
    events.forEach((ev) => seen.add(ev.id));
    if (events.length > 0) groups.push({ iso, events });
  }

  const handleCellClick = () => {
    const armed = useUiStore.getState().armedTemplateId;
    if (armed) {
      const newId = usePlannerStore.getState().createEventFromTemplate(armed, sat);
      if (newId) {
        openEdit(newId);
        useUiStore.getState().armTemplate(null);
      }
      return;
    }
    openCreate(sat);
  };

  return (
    <td
      ref={setNodeRef}
      onClick={handleCellClick}
      aria-label={`Termin am Wochenende ${fmtDot(sat)}–${fmtDot(sun)} anlegen`}
      className={`group align-top border-r border-b border-[var(--color-ink-200)] px-1.5 py-1.5 cursor-pointer relative transition-colors ${
        isOver ? 'bg-[var(--color-marine-100)]/60' : 'bg-[var(--color-paper-bg)]/70 hover:bg-[var(--color-paper-bg)]'
      }`}
      style={{
        minHeight: rowHeight,
        height: rowHeight,
        transitionDuration: 'var(--dur-state)',
        transitionTimingFunction: 'var(--ease-state)',
        ...(ferien && !isOver ? { backgroundColor: 'var(--color-ferien-b)' } : {})
      }}
    >
      <div className="flex flex-col gap-1">
        {groups.map(({ iso, events }) => (
          <div key={iso} className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold tabular-nums text-[var(--color-ink-500)]">
              {iso === sat ? 'Sa' : 'So'} {fmtDot(iso)}
            </span>
            {events.map((ev) => {
              const cat = categoryById.get(ev.categoryId);
              if (!cat) return null;
              const evConflicts = conflictMap.get(ev.id) ?? [];
              const severity = evConflicts.some((c) => c.severity === 'error')
                ? 'error'
                : evConflicts.length > 0
                  ? 'warning'
                  : undefined;
              const isStart = ev.start >= sat;
              const isEnd = ev.end <= sun;
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
        ))}
      </div>
      {groups.length === 0 && (
        <span className="absolute bottom-1 left-2 text-[12px] text-[var(--color-ink-500)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          + Sa/So
        </span>
      )}
    </td>
  );
}

interface AnnotationCardProps {
  annotation: WeekAnnotation;
  weekStart: string;
  onClick(id: string): void;
}

function AnnotationCard({ annotation, weekStart, onClick }: AnnotationCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `annotation:${annotation.id}`,
    data: { type: 'annotation', annotationId: annotation.id }
  });
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `annotation-card:${annotation.id}`,
    data: { type: 'annotation-card', annotationId: annotation.id, weekStart }
  });
  return (
    <div ref={setDropRef} className={isOver ? 'rounded-[var(--radius-block)] ring-2 ring-[var(--color-marine-800)]' : undefined}>
      <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.45 : undefined }}
        className="flex min-h-9 items-start rounded-[var(--radius-block)] border border-[var(--color-gelb-200)] bg-[var(--color-gelb-100)] text-[13px] text-[var(--color-ink-900)]">
      <button type="button" aria-label="Anmerkung ziehen" {...attributes} {...listeners}
        onClick={(event) => event.stopPropagation()}
        className="flex min-h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--color-ink-500)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-marine-800)] active:cursor-grabbing">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onClick(annotation.id); }}
        className="min-h-9 min-w-0 flex-1 whitespace-pre-line break-words hyphens-auto px-1.5 py-1 text-left leading-[1.35] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-marine-800)]">
        {annotation.text}
      </button>
      </div>
    </div>
  );
}

interface AnnotationCellProps {
  weekStart: string;
  annotations: WeekAnnotation[];
  onClick(): void;
  onEdit(id: string): void;
  rowHeight: number;
}

function AnnotationCell({ weekStart, annotations, onClick, onEdit, rowHeight }: AnnotationCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `annotation-cell:${weekStart}`, data: { type: 'annotation-cell', weekStart } });
  const hasNote = annotations.some((annotation) => annotation.text.trim().length > 0);
  return (
    <td
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group align-top border-b border-[var(--color-ink-200)] px-2 py-1.5 cursor-pointer text-[13px] leading-[1.5] text-[var(--color-ink-900)] transition-colors ${
        hasNote ? 'bg-[var(--color-gelb-100)]' : 'bg-[var(--color-paper-card)] hover:bg-[var(--color-paper-bg)]/60'
      }`}
      style={{ minHeight: rowHeight, height: rowHeight, transitionDuration: 'var(--dur-state)', transitionTimingFunction: 'var(--ease-state)', ...(isOver ? { boxShadow: 'inset 0 0 0 2px var(--color-marine-800)' } : {}) }}
    >
      {hasNote ? (
        <div className="flex flex-col gap-1">{annotations.filter((annotation) => annotation.text.trim().length > 0).map((annotation) => <AnnotationCard key={annotation.id} annotation={annotation} weekStart={weekStart} onClick={onEdit} />)}</div>
      ) : (
        <span className="text-[12px] text-[var(--color-ink-500)] opacity-0 group-hover:opacity-100 transition-opacity">
          <StickyNote className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />Notiz hinzufügen
        </span>
      )}
    </td>
  );
}

function WeekGrid() {
  const { doc, rows, filteredRows, categoryById, eventsByDate, conflictMap, rowHasEvents } = useWeekData();
  const density = useUiStore((s) => s.density);
  const [notePopoverSw, setNotePopoverSw] = useState<number | null>(null);
  const [notePopoverId, setNotePopoverId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoHeight, setAutoHeight] = useState<number>(110);

  // Only EMPTY holiday weeks render as the compact banner; holiday weeks with
  // events use a full-height day-cell row, so they count toward the tall rows.
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
        <div className="flex items-center gap-2 rounded-[var(--radius-default)] border border-[var(--cl-gold-500)] bg-[var(--cl-gold-100)] px-4 py-2.5 text-[13px] text-[var(--color-ink-900)]">
          <StickyNote className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            In eine Tageszelle klicken, um einen Termin anzulegen, oder
            {' '}<span className="font-semibold">Termin anlegen</span> oben rechts verwenden.
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 bg-[var(--color-paper-card)] rounded-[var(--radius-default)] border border-[var(--color-ink-200)] overflow-auto"
      >
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 50 }} />
            <col className="w-[100px] xl:w-[120px]" />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col className="w-[110px] xl:w-[130px]" />
            <col className="w-[156px] xl:w-[180px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--cl-surface)]">
            <tr className="bg-[var(--cl-surface)] text-[var(--cl-ink-500)] border-b border-[var(--cl-line)]" style={{ fontSize: '13px', fontWeight: 600 }}>
              <th className="py-2.5 text-center border-r border-white/15">
                #
              </th>
              <th className="py-2.5 pl-2 text-left border-r border-white/15">
                Schulwoche
              </th>
              {DAY_LABELS.map((d) => (
                <th
                  key={d}
                  className="py-2.5 pl-2 text-left border-r border-white/15"
                >
                  {d}
                </th>
              ))}
              <th className="py-2.5 pl-2 text-left border-r border-white/15">
                Sa/So
              </th>
              <th className="py-2.5 pl-2 text-left">
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
                const hasEvents = rowHasEvents(row);
                if (hasEvents) {
                  return (
                    <tr key={`h-${i}-${row.startDate}`} className="transition-colors" style={{ height: rowHeight }}>
                      <td
                        className="border-r border-b border-[var(--color-ink-200)]"
                        style={{
                          // taste-skill-ignore: Ferien-Schraffur ist eine Datenmarkierung
                          backgroundImage:
                            'repeating-linear-gradient(45deg, var(--color-ferien-a) 0 8px, var(--color-ferien-b) 8px 16px)'
                        }}
                      />
                      <td
                        className="border-r border-b border-[var(--color-ink-200)] px-2 align-middle text-[12.5px] tabular-nums whitespace-nowrap text-[var(--color-ink-900)]"
                        style={{ backgroundColor: 'var(--color-ferien-b)' }}
                      >
                        <span className="block font-semibold italic">{row.label}</span>
                        <span className="block text-[12px] text-[var(--color-ink-500)]">
                          {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                        </span>
                      </td>
                      {DAY_LABELS.map((_d, dayIdx) => {
                        const iso = dayIso(row.startDate, dayIdx);
                        const events = eventsByDate.get(iso) ?? [];
                        const h = isHoliday(iso, doc.schoolyear.holidays);
                        const feiertag = h && h.type === 'feiertag' ? h.label : null;
                        const ferien = h?.type === 'ferien';
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
                            ferien={ferien}
                          />
                        );
                      })}
                      <WeekendCell
                        mondayIso={row.startDate}
                        eventsByDate={eventsByDate}
                        categoryById={categoryById}
                        conflictMap={conflictMap}
                        rowHeight={rowHeight}
                        ferien={isHoliday(dayIso(row.startDate, 5), doc.schoolyear.holidays)?.type === 'ferien'}
                      />
                      <td
                        className="border-b border-[var(--color-ink-200)]"
                        style={{ backgroundColor: 'var(--color-ferien-b)' }}
                      />
                    </tr>
                  );
                }
                return (
                  <tr key={`h-${i}-${row.startDate}`} style={{ height: HOLIDAY_ROW_HEIGHT }}>
                    <td className="bg-[var(--color-paper-bg)] border-r border-b border-[var(--color-ink-200)]" />
                    <td
                      className="bg-[var(--color-paper-bg)] border-r border-b border-[var(--color-ink-200)] px-2 text-[12.5px] tabular-nums whitespace-nowrap text-[var(--color-ink-500)]"
                      
                    >
                      {fmtDot(row.startDate)}–{fmtDot(row.endDate)}
                    </td>
                    <td
                      colSpan={6}
                      className="border-b border-[var(--color-ink-200)] text-center italic font-semibold text-[13px] text-[var(--color-ink-900)]"
                      style={{
                        // taste-skill-ignore: Ferien-Schraffur ist eine Datenmarkierung
                        backgroundImage:
                          'repeating-linear-gradient(45deg, var(--color-ferien-a) 0 8px, var(--color-ferien-b) 8px 16px)'
                      }}
                    >
                      {row.label}
                    </td>
                    <td className="bg-[var(--color-paper-bg)] border-b border-[var(--color-ink-200)]"  />
                  </tr>
                );
              }
              const annotations = annotationsForWeek(doc.annotations, row.startDate);
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
                    const ferien = h?.type === 'ferien';
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
                        ferien={ferien}
                      />
                    );
                  })}
                  <WeekendCell
                    mondayIso={row.startDate}
                    eventsByDate={eventsByDate}
                    categoryById={categoryById}
                    conflictMap={conflictMap}
                    rowHeight={rowHeight}
                    ferien={isHoliday(dayIso(row.startDate, 5), doc.schoolyear.holidays)?.type === 'ferien'}
                  />
                  <AnnotationCell
                    weekStart={row.startDate}
                    annotations={annotations}
                    onClick={() => { setNotePopoverId(null); setNotePopoverSw(row.index); }}
                    onEdit={(id) => { setNotePopoverId(id); setNotePopoverSw(row.index); }}
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
        week={
          popoverWeek && popoverWeek.kind === 'schoolweek'
            ? { index: popoverWeek.index, startDate: popoverWeek.startDate, endDate: popoverWeek.endDate }
            : null
        }
        annotationId={notePopoverId}
        onClose={() => { setNotePopoverSw(null); setNotePopoverId(null); }}
      />
    </>
  );
}


export function WeekTable() {
  const narrow = useIsNarrow();
  return narrow ? <WeekAgenda /> : <WeekGrid />;
}
