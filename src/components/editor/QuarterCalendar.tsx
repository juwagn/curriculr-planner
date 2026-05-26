import { useMemo, useRef, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { usePlannerStore } from '@/stores/planner';
import { useUiStore } from '@/stores/ui';
import { isHoliday, isWeekend, computeSchoolweeks } from '@/lib/schoolweeks';
import { pastelize } from '@/lib/colors';
import { toast } from 'sonner';
import { parseISO, format, differenceInCalendarMonths } from 'date-fns';
import { DayCellContent } from './DayCellContent';
import { NotePopover } from './NotePopover';

export function QuarterCalendar() {
  const doc = usePlannerStore((s) => s.doc);
  const updateEvent = usePlannerStore((s) => s.updateEvent);
  const currentQuarter = useUiStore((s) => s.currentQuarter);
  const openEdit = useUiStore((s) => s.openEditEvent);
  const openCreate = useUiStore((s) => s.openCreateEvent);
  const calRef = useRef<FullCalendar | null>(null);
  const [notePopoverSw, setNotePopoverSw] = useState<number | null>(null);

  const fcEvents = useMemo(() => {
    if (!doc) return [];
    return doc.events.map((e) => {
      const cat = doc.categories.find((c) => c.id === e.categoryId);
      const color = cat?.color ?? '#0058A0';
      const bg = pastelize(color);
      return {
        id: e.id,
        title: e.title,
        start: e.allDay ? e.start : `${e.start}T${e.startTime ?? '00:00'}`,
        end: e.allDay ? e.end : `${e.end}T${e.endTime ?? '23:59'}`,
        allDay: e.allDay,
        backgroundColor: bg,
        borderColor: color,
        textColor: '#111827'
      };
    });
  }, [doc]);

  const quarterRange = useMemo(() => {
    if (!doc) return { startIso: '', monthCount: 3 };
    const sy = doc.schoolyear;
    const starts = [sy.firstSchoolDay, sy.quarterBoundaries[0], sy.quarterBoundaries[1], sy.quarterBoundaries[2]];
    const ends = [sy.quarterBoundaries[0], sy.quarterBoundaries[1], sy.quarterBoundaries[2], sy.lastSchoolDay];
    const s = starts[currentQuarter - 1];
    const e = ends[currentQuarter - 1];
    if (!s || !e) return { startIso: '', monthCount: 3 };
    const monthCount = Math.max(1, differenceInCalendarMonths(parseISO(e), parseISO(s)) + 1);
    return { startIso: s, monthCount };
  }, [doc?.schoolyear, currentQuarter]);

  const weeks = useMemo(() => (doc ? computeSchoolweeks(doc.schoolyear) : []), [doc?.schoolyear]);

  useEffect(() => {
    if (!calRef.current || !quarterRange.startIso) return;
    calRef.current.getApi().gotoDate(parseISO(quarterRange.startIso));
  }, [quarterRange.startIso, quarterRange.monthCount]);

  if (!doc) return null;

  return (
    <div className="bg-white">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
        initialView="quarterView"
        initialDate={quarterRange.startIso ? parseISO(quarterRange.startIso) : new Date()}
        firstDay={1}
        locale="de"
        headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
        height="auto"
        dayMaxEvents={3}
        editable
        events={fcEvents}
        views={{
          quarterView: {
            type: 'multiMonth',
            duration: { months: quarterRange.monthCount },
            multiMonthMaxColumns: 1,
            multiMonthMinWidth: 600,
            buttonText: 'Quartal'
          }
        }}
        eventClick={(info) => openEdit(info.event.id)}
        dateClick={(info) => openCreate(format(info.date, 'yyyy-MM-dd'))}
        eventDrop={(info) => {
          const id = info.event.id;
          const newStart = info.event.startStr.slice(0, 10);
          const newEnd = info.event.endStr ? info.event.endStr.slice(0, 10) : newStart;
          if (isHoliday(newStart, doc.schoolyear.holidays)) {
            toast.warning('Termin in Ferien — bewusst gewollt?');
          } else if (isWeekend(newStart)) {
            toast.warning('Termin auf Wochenende — bewusst gewollt?');
          }
          updateEvent(id, { start: newStart, end: newEnd });
        }}
        dayCellClassNames={(arg) => {
          const iso = format(arg.date, 'yyyy-MM-dd');
          const cls: string[] = [];
          if (isWeekend(iso)) cls.push('bg-slate-50');
          if (isHoliday(iso, doc.schoolyear.holidays)) cls.push('gtp-holiday-cell');
          return cls;
        }}
        dayCellContent={(arg) => (
          <DayCellContent
            date={arg.date}
            weeks={weeks}
            annotations={doc.annotations}
            onNoteClick={setNotePopoverSw}
          />
        )}
      />
      <NotePopover
        schoolweek={notePopoverSw}
        week={notePopoverSw !== null ? weeks.find((w) => w.index === notePopoverSw) ?? null : null}
        onClose={() => setNotePopoverSw(null)}
      />
      <style>{`
        .gtp-holiday-cell {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(0,0,0,0.04),
            rgba(0,0,0,0.04) 6px,
            transparent 6px,
            transparent 12px
          );
        }
        .fc-multimonth-month { padding: 0 0 24px 0 !important; }
        .fc-multimonth-title {
          font-size: 1rem !important;
          color: var(--color-primary-900) !important;
          padding: 12px 0 8px 0 !important;
        }
        .fc-multimonth-daygrid-table { width: 100% !important; }
        .fc-multimonth-daygrid-table td,
        .fc-multimonth-daygrid-table th {
          font-size: 0.875rem;
        }
        .fc-daygrid-day,
        .fc-multimonth-daygrid-table td {
          min-height: 80px;
          height: 80px;
        }
        .fc .fc-toolbar-title { font-size: 1rem; color: var(--color-primary-900); }
        .fc-button-primary {
          background: var(--color-primary-100) !important;
          border-color: var(--color-primary-100) !important;
          color: var(--color-primary-900) !important;
        }
        .fc-button-primary:hover { background: #c7e2ff !important; }
      `}</style>
    </div>
  );
}
