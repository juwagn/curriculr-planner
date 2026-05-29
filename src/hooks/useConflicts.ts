import { useMemo } from 'react';
import { usePlannerStore } from '@/stores/planner';
import { detectConflicts, type Conflict } from '@/lib/conflicts';

export function useConflicts(): Conflict[] {
  const doc = usePlannerStore((s) => s.doc);
  return useMemo(() => {
    if (!doc) return [];
    const ignored = new Set(doc.ignoredConflicts);
    return detectConflicts(doc).filter((c) => !ignored.has(c.key));
  }, [doc]);
}

/** Map eventId -> conflicts touching it, for inline badges. */
export function conflictsByEvent(conflicts: Conflict[]): Map<string, Conflict[]> {
  const m = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    for (const id of c.eventIds) {
      const arr = m.get(id) ?? [];
      arr.push(c);
      m.set(id, arr);
    }
  }
  return m;
}
