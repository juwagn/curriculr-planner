export type WpStage = 'entwurf' | 'genehmigt' | 'oeffentlich';

export const STAGE_LABELS: Record<WpStage, string> = {
  entwurf: 'Entwurf',
  genehmigt: 'Genehmigt',
  oeffentlich: 'Öffentlich',
};

export type StageAction = 'freigeben' | 'oeffentlich-schalten';

export const STAGE_ACTION_LABELS: Record<StageAction, string> = {
  'freigeben': 'Freigeben',
  'oeffentlich-schalten': 'Öffentlich schalten',
};

/** Target stage for an action, or null if the action is invalid for this stage. */
export function nextStage(stage: WpStage, action: StageAction): WpStage | null {
  if (action === 'freigeben' && stage === 'entwurf') return 'genehmigt';
  if (action === 'oeffentlich-schalten' && stage === 'genehmigt') return 'oeffentlich';
  return null;
}

/** Stage-advancing actions offered for the current stage (no backward moves — YAGNI). */
export function availableActions(stage: WpStage): StageAction[] {
  if (stage === 'entwurf') return ['freigeben'];
  if (stage === 'genehmigt') return ['oeffentlich-schalten'];
  return [];
}
