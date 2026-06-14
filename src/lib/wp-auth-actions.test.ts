import { describe, it, expect, vi } from 'vitest';
import { iservLoginUrl, iservLogout } from './wp-auth-actions';

describe('iservLoginUrl', () => {
  it('builds the login URL and strips trailing slashes', () => {
    expect(iservLoginUrl('https://schule.example/')).toBe(
      'https://schule.example/wp-json/curriculr/v1/auth/login',
    );
  });
});

describe('iservLogout', () => {
  it('POSTs to the logout endpoint with a bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await iservLogout('https://schule.example', 'tok', fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://schule.example/wp-json/curriculr/v1/auth/logout',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('never throws on network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(iservLogout('https://schule.example', 'tok', fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined();
  });
});
