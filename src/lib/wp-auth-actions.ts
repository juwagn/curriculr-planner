type FetchLike = typeof fetch;

function apiBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '') + '/wp-json/curriculr/v1';
}

/** URL that starts the IServ SSO redirect dance. */
export function iservLoginUrl(baseUrl: string): string {
  return `${apiBase(baseUrl)}/auth/login`;
}

/** Navigates the browser to IServ login. Side-effecting wrapper around iservLoginUrl. */
export function startIservLogin(baseUrl: string): void {
  window.location.href = iservLoginUrl(baseUrl);
}

/** Best-effort server-side logout. Never throws. */
export async function iservLogout(
  baseUrl: string,
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  try {
    await fetchImpl(`${apiBase(baseUrl)}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* offline / ignore — local logout already happened */
  }
}
