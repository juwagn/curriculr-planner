import { describe, it, expect } from 'vitest';
import { createDemoDoc } from './demo';
import { PlannerDocumentSchema } from './schemas';
import { detectConflicts } from './conflicts';

describe('createDemoDoc', () => {
  it('produces a schema-valid v4 document', () => {
    const doc = createDemoDoc();
    expect(PlannerDocumentSchema.safeParse(doc).success).toBe(true);
    expect(doc.version).toBe(4);
  });

  it('is populated and contains demonstrable conflicts', () => {
    const doc = createDemoDoc();
    expect(doc.events.length).toBeGreaterThanOrEqual(10);
    expect(detectConflicts(doc).length).toBeGreaterThanOrEqual(2);
  });
});
