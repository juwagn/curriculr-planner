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

function decodeJwtClaims(jwt: string): AppTokenClaims | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded)) as AppTokenClaims;
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
