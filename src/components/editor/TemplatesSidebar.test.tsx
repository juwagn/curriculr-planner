import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { TemplatesSidebar } from './TemplatesSidebar';
import { usePlannerStore, createEmptyDoc } from '@/stores/planner';

beforeEach(() => {
  const doc = createEmptyDoc('T', '2026/27', '2026-08-24', '2026-08-31', '2027-07-16');
  doc.templates.push({ id: 't1', name: 'Gesamtkonferenz', categoryId: doc.categories[0].id, allDay: true, defaultGroups: ['Kollegium'] });
  usePlannerStore.setState({ doc });
});

describe('TemplatesSidebar', () => {
  it('lists templates by name', () => {
    render(<DndContext><TemplatesSidebar /></DndContext>);
    expect(screen.getByText('Gesamtkonferenz')).toBeInTheDocument();
  });

  it('arms a template on click (click-to-place path)', async () => {
    render(<DndContext><TemplatesSidebar /></DndContext>);
    await userEvent.click(screen.getByText('Gesamtkonferenz'));
    expect(screen.getByText('Gesamtkonferenz').closest('[data-armed]')).toHaveAttribute('data-armed', 'true');
  });
});
