import { CATEGORY_PALETTE } from '@/lib/colors';

interface Props {
  value: string;
  onChange(color: string): void;
  palette?: readonly string[];
  'aria-label'?: string;
}

/**
 * Swatch palette + native custom-color trigger. Dumb, controlled. The active
 * swatch carries a ring; any non-palette value still shows in the custom input.
 */
export function ColorPicker({ value, onChange, palette = CATEGORY_PALETTE, 'aria-label': ariaLabel }: Props) {
  const normalized = value.toUpperCase();
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={ariaLabel ?? 'Farbe wählen'}>
      {palette.map((c) => {
        const active = c.toUpperCase() === normalized;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            aria-pressed={active}
            title={c}
            className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-marine-800)] ${
              active
                ? 'ring-2 ring-offset-1 ring-[var(--color-marine-800)] border-transparent'
                : 'border-[var(--color-ink-200)]'
            }`}
            style={{ background: c, transitionDuration: 'var(--dur-state)' }}
          />
        );
      })}
      <label
        className="relative w-6 h-6 shrink-0 cursor-pointer rounded-full border border-dashed border-[var(--color-ink-200)] grid place-items-center text-[var(--color-ink-500)] text-[13px] leading-none hover:border-[var(--color-marine-700)]"
        title="Eigene Farbe"
      >
        +
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Eigene Farbe"
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}
