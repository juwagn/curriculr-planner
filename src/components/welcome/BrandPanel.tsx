import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <div className="flex flex-col p-7 text-white" style={{ background: 'linear-gradient(160deg, var(--color-marine-800) 0%, #012740 100%)' }}>
      <div
        className="font-extrabold text-2xl flex items-center justify-center"
        style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-gelb-500)', color: 'var(--color-marine-800)' }}
      >
        C
      </div>
      <div className="text-[23px] font-extrabold tracking-[-0.4px] mt-4">
        Curri<span style={{ color: 'var(--color-gelb-500)' }}>culr</span>
      </div>
      <p className="text-[13px] mt-2 leading-[1.55]" style={{ color: 'rgba(255,255,255,0.65)' }}>
        Jahresterminplan für Ihre Schule
      </p>

      <div className="flex-1" />

      <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        {authed && userName ? (
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="font-extrabold text-[14px] flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-gelb-500)', color: 'var(--color-marine-800)' }}
              >
                {initials(userName)}
              </div>
              <div>
                <div className="text-[13px] font-bold">{userName}</div>
                <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{groups.join(', ')}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-[11px] underline mt-3"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              Abmelden
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>Nicht angemeldet</div>
            {!baseUrl && (
              <Input
                value={baseUrl}
                placeholder="WP-Adresse deiner Schule (https://…)"
                onChange={(e) => onBaseUrlChange(e.target.value)}
                className="text-white placeholder:text-white/50"
                style={{ background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.25)' }}
              />
            )}
            <Button
              onClick={onLogin}
              disabled={!baseUrl}
              className="w-full font-bold"
              style={{ background: 'var(--color-gelb-500)', color: 'var(--color-marine-800)' }}
            >
              Mit IServ anmelden
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
