import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';

interface Props {
  authed: boolean;
  userName: string | null;
  groups: string[];
  baseUrl: string;
  onBaseUrlChange(url: string): void;
  onLogin(): void;
  onLogout(): void;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '–';
}

export function BrandPanel({ authed, userName, groups, baseUrl, onBaseUrlChange, onLogin, onLogout }: Props) {
  return (
    <div className="flex flex-col gap-6 border-b border-[var(--cl-line)] bg-[var(--cl-bg)] p-7 md:border-b-0 md:border-r">
      <div>
        <Logo className="h-9 w-auto" />
        <p className="mt-3 text-[13px] leading-[1.55] text-[var(--cl-ink-500)]">
          Jahresterminplan für Ihre Schule
        </p>
      </div>

      <div className="flex-1" />

      <div className="border-t border-[var(--cl-line)] pt-4">
        {authed && userName ? (
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-9 items-center justify-center rounded-full bg-[var(--cl-marine-100)] text-[14px] font-bold text-[var(--cl-marine-800)]"
                aria-hidden="true"
              >
                {initials(userName)}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--cl-ink-900)]">{userName}</div>
                <div className="text-[12px] text-[var(--cl-ink-500)]">{groups.join(', ')}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} className="mt-3 min-h-[var(--cl-hit-touch)] px-2 text-[13px] text-[var(--cl-ink-500)] underline lg:min-h-9">
              Abmelden
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="wp-base-url" className="block text-[13px] font-medium text-[var(--cl-ink-900)]">
              WordPress-Adresse
            </label>
            <Input
              id="wp-base-url"
              value={baseUrl}
              placeholder="Adresse Ihrer Schule (https://…)"
              onChange={(e) => onBaseUrlChange(e.target.value)}
              className="h-11 bg-[var(--cl-surface)] lg:h-9"
            />
            <Button onClick={onLogin} disabled={!baseUrl} className="h-11 w-full font-semibold lg:h-9">
              Mit IServ anmelden
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
