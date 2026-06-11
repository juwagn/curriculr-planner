export interface AppTokenClaims {
  sub: string;
  name: string;
  groups: string[];
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

export type FetchLike = typeof fetch;

function isAppTokenClaims(v: unknown): v is AppTokenClaims {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.sub === 'string' &&
    typeof c.name === 'string' &&
    Array.isArray(c.groups) &&
    (c.groups as unknown[]).every((g) => typeof g === 'string') &&
    typeof c.exp === 'number' &&
    typeof c.iat === 'number' &&
    typeof c.iss === 'string' &&
    typeof c.aud === 'string'
  );
}

function decodeJwtClaims(jwt: string): AppTokenClaims | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const parsed: unknown = JSON.parse(atob(padded));
    return isAppTokenClaims(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function exchangeToken(
  baseUrl: string,
  exchangeCode: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ token: string; claims: AppTokenClaims } | null> {
  const base = baseUrl.replace(/\/+$/, '');
  try {
    const res = await fetchImpl(`${base}/wp-json/curriculr/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange: exchangeCode }),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const token = typeof data.token === 'string' ? data.token : null;
    if (!token) return null;
    const claims = decodeJwtClaims(token);
    if (!claims) return null;
    return { token, claims };
  } catch {
    return null;
  }
}
