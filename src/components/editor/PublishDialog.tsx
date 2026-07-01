import { useState } from 'react';
import { usePlannerStore } from '@/stores/planner';
import { useWpSyncStore } from '@/stores/wpSync';
import {
  STAGE_LABELS, availableActions, type WpStage, type StageAction,
} from '@/lib/wp-stage';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose(): void;
}

const STAGE_DESCRIPTION: Record<WpStage, string> = {
  entwurf:     'Nur für dich sichtbar',
  genehmigt:   'Kollegium sieht die Entwurf-Vorschau',
  oeffentlich: 'Erscheint auf der Schulwebsite',
};

// Which action transitions INTO each stage
const ACTION_FOR_TARGET: Partial<Record<WpStage, StageAction>> = {
  genehmigt:   'freigeben',
  oeffentlich: 'oeffentlich-schalten',
};

export function PublishDialog({ open, onClose }: Props) {
  const doc       = usePlannerStore((s) => s.doc);
  const send      = useWpSyncStore((s) => s.send);
  const syncState = useWpSyncStore((s) => s.syncState);
  const config    = useWpSyncStore((s) => s.config);

  const link    = doc ? config.links[doc.schoolyear.id] : undefined;
  const stage   = (link?.stage ?? 'entwurf') as WpStage;
  const actions = availableActions(stage);

  const [selectedAction, setSelectedAction] = useState<StageAction | null>(null);

  const isSending = syncState === 'sending';

  async function onPublish() {
    if (!doc) return;
    const result = await send(doc, selectedAction ?? undefined);
    if (result === 'synced') {
      toast.success(selectedAction ? 'Plan veröffentlicht.' : 'Plan an WordPress gesendet.');
      onClose();
    } else if (result === 'conflict') {
      onClose(); // Conflict handled by StatusBar dialogs
    } else {
      toast.error(useWpSyncStore.getState().message || 'Senden fehlgeschlagen.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan veröffentlichen</DialogTitle>
          <DialogDescription>
            Sendet den aktuellen Plan an WordPress. Optional: Sichtbarkeit ändern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-[13px]">
            Aktuelle Sichtbarkeit:{' '}
            <strong className="font-semibold text-[var(--color-ink-900)]">{STAGE_LABELS[stage]}</strong>
            <span className="text-[var(--color-ink-500)] ml-2">— {STAGE_DESCRIPTION[stage]}</span>
          </p>

          {actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--color-ink-500)]">
                Sichtbarkeit nach dem Veröffentlichen:
              </p>
              {/* Keep current stage */}
              <label className="flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60">
                <input
                  type="radio" name="publish-action"
                  checked={selectedAction === null}
                  onChange={() => setSelectedAction(null)}
                  className="mt-0.5 accent-[var(--color-marine-800)]"
                />
                <div>
                  <div className="text-[13px] font-semibold">{STAGE_LABELS[stage]}</div>
                  <div className="text-[12px] text-[var(--color-ink-500)]">
                    {STAGE_DESCRIPTION[stage]} (unverändert)
                  </div>
                </div>
              </label>
              {/* Available next stages */}
              {actions.map((action) => {
                const targetStage = (Object.entries(ACTION_FOR_TARGET) as [WpStage, StageAction][])
                  .find(([, a]) => a === action)?.[0];
                if (!targetStage) return null;
                return (
                  <label key={action}
                    className="flex items-start gap-3 p-3 rounded-[var(--radius-default)] border cursor-pointer border-[var(--color-ink-200)] hover:bg-[var(--color-paper-bg)]/60"
                  >
                    <input
                      type="radio" name="publish-action"
                      checked={selectedAction === action}
                      onChange={() => setSelectedAction(action)}
                      className="mt-0.5 accent-[var(--color-marine-800)]"
                    />
                    <div>
                      <div className="text-[13px] font-semibold">{STAGE_LABELS[targetStage]}</div>
                      <div className="text-[12px] text-[var(--color-ink-500)]">
                        {STAGE_DESCRIPTION[targetStage]}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <p className="text-[12px] text-[var(--color-ink-400)]">
            IServ synchronisiert sich nach dem Veröffentlichen automatisch (innerhalb 1 Stunde).
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>Abbrechen</Button>
          <Button onClick={() => void onPublish()} disabled={isSending || !doc}>
            {isSending ? 'Sende…' : 'Jetzt veröffentlichen →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
