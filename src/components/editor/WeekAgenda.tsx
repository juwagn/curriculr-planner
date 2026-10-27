import { useState } from 'react';
import { Plus, StickyNote, TriangleAlert } from 'lucide-react';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { annotationsForWeek } from '@/lib/annotations';
import { isHoliday } from '@/lib/schoolweeks';
import { pastelize } from '@/lib/colors';
import type { Category, PlanEvent } from '@/types';
import type { Conflict } from '@/lib/conflicts';
import { NotePopover } from './NotePopover';
import { useWeekData, dayIso, fmtDot } from './useWeekData';

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// taste-skill-ignore: Ferien-Schraffur ist eine Datenmarkierung
const FERIEN_HATCH =
  'repeating-linear-gradient(45deg, var(--color-ferien-a) 0 8px, var(--color-ferien-b) 8px 16px)';

function fmtTime(t?: string): string {
  return t ? t.replace(':', '.') : '';
}

function timeLabel(ev: PlanEvent): string {
  if (ev.allDay || !ev.startTime) return '';
  return ev.endTime ? `${fmtTime(ev.startTime)}–${fmtTime(ev.endTime)}` : fmtTime(ev.startTime);
}

interface AgendaEventProps {
  event: PlanEvent;
  category: Category;
  conflicts: Conflict[];
  dayIso: string;
  onOpen(id: string): void;
}

function AgendaEvent({ event, category, conflicts, dayIso: iso, onOpen }: AgendaEventProps) {
  const time = timeLabel(event);
  const hasConflict = conflicts.length > 0;
  const isError = conflicts.some((c) => c.severity === 'error');
  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="flex min-h-11 w-full min-w-0 flex-col items-start gap-0.5 rounded-[var(--radius-input)] px-3 py-2 text-left text-[15px] leading-[1.35] focus-visible:shadow-[var(--cl-focus-ring)] focus-visible:outline-none"
      style={{
        backgroundColor: pastelize(category.color),
        borderLeft: `4px solid ${category.color}`,
        color: 'var(--cl-on-gold)',
        overflowWrap: 'anywhere'
      }}
    >
      <span className="font-medium">
        {hasConflict && (
          <TriangleAlert
            role="img"
            aria-label={isError ? 'Konflikt' : 'Warnung'}
            className="mr-1 inline h-4 w-4 align-text-bottom"
            style={{ color: isError ? 'var(--color-danger)' : 'var(--color-warning)' }}
          />
        )}
        {time && <span className="mr-1.5 font-bold tabular-nums">{time}</span>}
        {event.title}
      </span>
      <span className="text-[12px] leading-[16px]">
        {category.label}
        {event.end > iso && <> · bis {fmtDot(event.end)}</>}
      </span>
    </button>
  );
}

/**
 * Agenda list for viewports below 1024 px: one card per school week, the
 * Schulwochen column stays as the recognition mark on the left. Each event is
 * listed once per week, on its first day in that week.
 */
export function WeekAgenda() {
  const { doc, rows, filteredRows, categoryById, eventsByDate, conflictMap, rowHasEvents } = useWeekData();
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const openEdit = useUiStore((s) => s.openEditEvent);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const [notePopoverSw, setNotePopoverSw] = useState<number | null>(null);
  const [notePopoverId, setNotePopoverId] = useState<string | null>(null);

  if (!doc) return null;

  const createInWeek = (iso: string) => {
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

  const popoverWeek =
    notePopoverSw !== null ? rows.find((r) => r.kind === 'schoolweek' && r.index === notePopoverSw) : null;

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="sr-only">Wochenübersicht Quartal {currentQuarter}</h2>
        {doc.events.length === 0 && (
          <div className="flex items-start gap-2 rounded-[var(--radius-default)] border border-[var(--cl-gold-500)] bg-[var(--cl-gold-100)] px-4 py-2.5 text-[13px] text-[var(--color-ink-900)]">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Mit <span className="font-semibold">Termin anlegen</span> in einer Schulwoche oder oben den ersten Termin erfassen.
            </span>
          </div>
        )}
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {filteredRows.map((row) => {
            const dates = `${fmtDot(row.startDate)}–${fmtDot(row.endDate)}`;
            const hasEvents = rowHasEvents(row);

            if (row.kind === 'holiday' && !hasEvents) {
              return (
                <li
                  key={`h-${row.startDate}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-default)] border border-[var(--cl-line)] px-3 py-2 text-[13px]"
                  style={{ backgroundImage: FERIEN_HATCH }}
                >
                  <span className="font-semibold italic text-[var(--cl-ink-900)]">{row.label}</span>
                  <span className="tabular-nums text-[var(--cl-ink-500)]">{dates}</span>
                </li>
              );
            }

            const isSchoolweek = row.kind === 'schoolweek';
            const swLabel = isSchoolweek ? row.index.toString().padStart(2, '0') : null;
            const annotations = isSchoolweek
              ? annotationsForWeek(doc.annotations, row.startDate).filter((a) => a.text.trim().length > 0)
              : [];

            const days = DAY_NAMES.map((name, dayIdx) => {
              const iso = dayIso(row.startDate, dayIdx);
              const events = (eventsByDate.get(iso) ?? []).filter(
                (ev) => ev.start === iso || (dayIdx === 0 && ev.start < iso)
              );
              const h = isHoliday(iso, doc.schoolyear.holidays);
              const feiertag = h && h.type === 'feiertag' ? h.label : null;
              return { name, iso, events, feiertag };
            }).filter((d) => d.events.length > 0 || d.feiertag);

            return (
              <li
                key={isSchoolweek ? `sw-${row.index}` : `h-${row.startDate}`}
                aria-label={isSchoolweek ? `Schulwoche ${swLabel}, ${dates}` : `${row.label}, ${dates}`}
                className="flex overflow-hidden rounded-[var(--radius-default)] border border-[var(--cl-line)] bg-[var(--cl-surface)]"
              >
                <div
                  className="flex w-14 shrink-0 flex-col items-center gap-0.5 border-r border-[var(--cl-line)] bg-[var(--cl-bg)] px-1 py-3 text-center sm:w-16"
                  style={isSchoolweek ? undefined : { backgroundImage: FERIEN_HATCH }}
                  aria-hidden="true"
                >
                  {isSchoolweek && (
                    <>
                      <span className="text-[20px] font-bold leading-none tabular-nums text-[var(--cl-ink-900)]">{swLabel}</span>
                      <span className="text-[12px] leading-4 text-[var(--cl-ink-500)]">SW</span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1 p-3">
                  <h3 className="m-0 flex flex-wrap items-baseline justify-between gap-x-3 text-[15px] font-semibold text-[var(--cl-ink-900)]">
                    <span className={isSchoolweek ? 'tabular-nums' : 'italic'}>
                      {isSchoolweek ? <><span className="sr-only">Schulwoche {swLabel}, </span>{dates}</> : row.label}
                    </span>
                    {!isSchoolweek && <span className="text-[13px] font-normal tabular-nums text-[var(--cl-ink-500)]">{dates}</span>}
                  </h3>

                  {days.length === 0 && (
                    <p className="my-2 text-[13px] text-[var(--cl-ink-500)]">Keine Termine in dieser Woche.</p>
                  )}

                  <div className="mt-1 flex flex-col">
                    {days.map((d) => (
                      <div key={d.iso} className="flex gap-3 border-t border-[var(--cl-line)] py-2 first:border-t-0">
                        <div className="w-12 shrink-0 pt-2.5 text-[13px] font-medium leading-[18px] text-[var(--cl-ink-500)] tabular-nums">
                          <span className="block text-[var(--cl-ink-900)]">{d.name}</span>
                          {fmtDot(d.iso)}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          {d.feiertag && (
                            <span className="rounded-[var(--radius-input)] px-2 py-1 text-[13px] font-medium text-[var(--cl-ink-900)]" style={{ backgroundColor: 'var(--color-feiertag-bg)' }}>
                              {d.feiertag}
                            </span>
                          )}
                          {d.events.map((ev) => {
                            const cat = categoryById.get(ev.categoryId);
                            if (!cat) return null;
                            return (
                              <AgendaEvent
                                key={ev.id}
                                event={ev}
                                category={cat}
                                conflicts={conflictMap.get(ev.id) ?? []}
                                dayIso={d.iso}
                                onOpen={openEdit}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {annotations.length > 0 && (
                    <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                      {annotations.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (row.kind !== 'schoolweek') return;
                              setNotePopoverId(a.id);
                              setNotePopoverSw(row.index);
                            }}
                            className="flex min-h-11 w-full items-start gap-2 rounded-[var(--radius-input)] border border-[var(--cl-gold-500)] bg-[var(--cl-gold-100)] px-3 py-2 text-left text-[13px] leading-[1.4] text-[var(--cl-ink-900)] focus-visible:shadow-[var(--cl-focus-ring)] focus-visible:outline-none"
                          >
                            <StickyNote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{a.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-1 gap-y-0 border-t border-[var(--cl-line)] pt-1">
                    <button
                      type="button"
                      onClick={() => createInWeek(row.startDate)}
                      className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-input)] px-2 text-[13px] font-medium text-[var(--cl-marine-800)] hover:bg-[var(--cl-bg)] focus-visible:shadow-[var(--cl-focus-ring)] focus-visible:outline-none"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Termin anlegen
                      <span className="sr-only"> in dieser Woche</span>
                    </button>
                    {isSchoolweek && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotePopoverId(null);
                          setNotePopoverSw(row.index);
                        }}
                        className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-input)] px-2 text-[13px] font-medium text-[var(--cl-ink-500)] hover:bg-[var(--cl-bg)] hover:text-[var(--cl-ink-900)] focus-visible:shadow-[var(--cl-focus-ring)] focus-visible:outline-none"
                      >
                        <StickyNote className="h-4 w-4" aria-hidden="true" />
                        Notiz hinzufügen
                        <span className="sr-only"> in dieser Woche</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <NotePopover
        week={
          popoverWeek && popoverWeek.kind === 'schoolweek'
            ? { index: popoverWeek.index, startDate: popoverWeek.startDate, endDate: popoverWeek.endDate }
            : null
        }
        annotationId={notePopoverId}
        onClose={() => {
          setNotePopoverSw(null);
          setNotePopoverId(null);
        }}
      />
    </>
  );
}
