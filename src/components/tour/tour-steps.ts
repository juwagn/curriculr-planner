import type { DriveStep } from 'driver.js';

export const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Willkommen im Curriculr Planner',
      description: 'Wir zeigen dir die wichtigsten Funktionen in ca. 2 Minuten.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="plan-name"]',
    popover: {
      title: 'Dein Jahresplan',
      description: 'Klick öffnet die Planübersicht — du kannst mehrere Pläne gleichzeitig verwalten.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="view-toggle"]',
    popover: {
      title: 'Ansicht wechseln',
      description: 'Wechsle zwischen Wochen-Tabelle (Quartalsansicht) und Jahresübersicht.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="quarter-tabs"]',
    popover: {
      title: 'Quartals-Navigation',
      description: 'Wechsle zwischen Q1–Q4. Jedes Quartal zeigt die zugehörigen Schulwochen.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-event-btn"]',
    popover: {
      title: 'Termin anlegen',
      description: 'Öffnet das Formular: Titel, Kategorie, Datum und betroffene Gruppen eingeben.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="templates-btn"]',
    popover: {
      title: 'Termin-Vorlagen',
      description: 'Vorlagen für wiederkehrende Termine — per Drag & Drop in den Plan ziehen.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="overflow-menu"]',
    popover: {
      title: 'Weitere Optionen',
      description: 'Export (ICS, Excel, JSON-Backup, PDF), Hilfe und Einstellungen findest du hier gebündelt.',
      side: 'bottom',
      align: 'end',
    },
  },
];
