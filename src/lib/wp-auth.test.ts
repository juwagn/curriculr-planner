import { describe, it, expect } from 'vitest';
import { exchangeToken } from './wp-auth';
import type { AppTokenClaims } from './wp-auth';

function makeJwt(claims: AppTokenClaims): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(claims)}.fakesig`;
}

const fakeClaims: AppTokenClaims = {
  sub: 'u1',
  name: 'Frau Test',
  groups: ['Schulleitung'],
  exp: 9999999999,
  iat: 1000000000,
  iss: 'https://wp.test/wp-json/curriculr/v1',
  aud: 'https://juwagn.github.io/curriculr-planner/',
};

const fakeRes = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('exchangeToken', () => {
  it('returns token + decoded claims on 200', async () => {
    const jwt = makeJwt(fakeClaims);
    const f = (async () => fakeRes(200, { token: jwt })) as unknown as typeof fetch;
    const result = await exchangeToken('https://wp.test/', 'CODE', f);
    expect(result).not.toBeNull();
    expect(result!.token).toBe(jwt);
    expect(result!.claims.sub).toBe('u1');
    expect(result!.claims.name).toBe('Frau Test');
    expect(result!.claims.groups).toEqual(['Schulleitung']);
  });

  it('sends POST to correct URL with exchange body', async () => {
    const jwt = makeJwt(fakeClaims);
    const f = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://wp.test/wp-json/curriculr/v1/auth/token');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init!.body as string)).toEqual({ exchange: 'CODE123' });
      return fakeRes(200, { token: jwt });
    }) as unknown as typeof fetch;
    await exchangeToken('https://wp.test', 'CODE123', f);
  });

  it('strips trailing slashes from baseUrl', async () => {
    const jwt = makeJwt(fakeClaims);
    const f = (async (url: string) => {
      expect(url).toBe('https://wp.test/wp-json/curriculr/v1/auth/token');
      return fakeRes(200, { token: jwt });
    }) as unknown as typeof fetch;
    await exchangeToken('https://wp.test///', 'CODE', f);
  });

  it('returns null on 401 (stale exchange code)', async () => {
    const f = (async () => fakeRes(401, {})) as unknown as typeof fetch;
    expect(await exchangeToken('https://wp.test', 'STALE', f)).toBeNull();
  });

  it('returns null on network error', async () => {
    const f = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
    expect(await exchangeToken('https://wp.test', 'CODE', f)).toBeNull();
  });

  it('returns null when token field missing in response', async () => {
    const f = (async () => fakeRes(200, { other: 'data' })) as unknown as typeof fetch;
    expect(await exchangeToken('https://wp.test', 'CODE', f)).toBeNull();
  });

  it('returns null when JWT payload is malformed', async () => {
    const f = (async () => fakeRes(200, { token: 'not.a.jwt' })) as unknown as typeof fetch;
    expect(await exchangeToken('https://wp.test', 'CODE', f)).toBeNull();
  });

  it('returns null when JWT payload is valid JSON but missing required claims', async () => {
    const partialPayload = btoa(JSON.stringify({ sub: 'u1' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const badJwt = `eyJhbGciOiJIUzI1NiJ9.${partialPayload}.fakesig`;
    const f = (async () => fakeRes(200, { token: badJwt })) as unknown as typeof fetch;
    expect(await exchangeToken('https://wp.test', 'CODE', f)).toBeNull();
  });
});
