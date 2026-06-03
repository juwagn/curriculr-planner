import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrintDocument } from './PrintDocument';
import type { PrintModel } from '@/lib/print-model';

const MODEL: PrintModel = {
  schoolName: 'Grundschule Muster',
  schoolInfo: 'Musterstr. 1',
  docName: 'Testplan 2025/26',
  schoolyearLabel: '2025/26',
  sections: [
    {
      quarterIndex: 1,
      quarterLabel: '1. Quartal · Sep 2025 – Okt 2025',
      rows: [
        {
          type: 'week',
          swIndex: '00',
          dateRange: '01.09.–05.09.',
          cells: [
            { events: [{ title: 'Einschulung', time: undefined }] },
            { events: [] },
            { events: [] },
            { events: [] },
            { events: [] }
          ],
          annotation: 'Begrüßungswoche'
        },
        {
          type: 'holiday',
          label: 'Herbstferien',
          dateRange: '06.10.–17.10.'
        }
      ]
    }
  ],
  printedAt: '2026-06-02'
};

describe('PrintDocument', () => {
  it('renders school name in header', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('Grundschule Muster')).toBeInTheDocument();
  });

  it('renders quarter label', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getAllByText(/1\. Quartal/).length).toBeGreaterThan(0);
  });

  it('renders school week row with SW index', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('00')).toBeInTheDocument();
  });

  it('renders event title', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('Einschulung')).toBeInTheDocument();
  });

  it('renders holiday row label', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText(/Herbstferien/)).toBeInTheDocument();
  });

  it('renders annotation text', () => {
    render(<PrintDocument model={MODEL} />);
    expect(screen.getByText('Begrüßungswoche')).toBeInTheDocument();
  });

  it('renders nothing when model is null', () => {
    const { container } = render(<PrintDocument model={null} />);
    expect(container.firstChild).toBeNull();
  });
});
