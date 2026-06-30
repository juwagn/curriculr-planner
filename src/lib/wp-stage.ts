export type WpStage = 'entwurf' | 'genehmigt' | 'oeffentlich';

export const STAGE_LABELS: Record<WpStage, string> = {
  entwurf: 'Entwurf',
  genehmigt: 'Intern',
  oeffentlich: 'Öffentlich',
};

export type StageAction = 'freigeben' | 'oeffentlich-schalten';

export const STAGE_ACTION_LABELS: Record<StageAction, string> = {
  'freigeben': 'Intern freigeben',
  'oeffentlich-schalten': 'Öffentlich schalten',
};

// Single source of truth for the stage machine — both nextStage and
// availableActions derive from this table.
const TRANSITIONS: Partial<Record<WpStage, Partial<Record<StageAction, WpStage>>>> = {
  entwurf:   { 'freigeben': 'genehmigt' },
  genehmigt: { 'oeffentlich-schalten': 'oeffentlich' },
};

/** Target stage for an action, or null if the action is invalid for this stage. */
export function nextStage(stage: WpStage, action: StageAction): WpStage | null {
  return TRANSITIONS[stage]?.[action] ?? null;
}

/** Stage-advancing actions offered for the current stage (no backward moves — YAGNI). */
export function availableActions(stage: WpStage): StageAction[] {
  return Object.keys(TRANSITIONS[stage] ?? {}) as StageAction[];
}
