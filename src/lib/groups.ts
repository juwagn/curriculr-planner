// Group names are compared trimmed and case-insensitively (matches the WP plugin filter).
const key = (g: string) => g.trim().toLocaleLowerCase('de');

/** Trim, drop empty entries, dedupe case-insensitively (first spelling wins). */
export function normalizeGroups(groups: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) {
    const k = key(g);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(g.trim());
  }
  return out;
}

export function hasGroup(groups: string[], name: string): boolean {
  const k = key(name);
  return groups.some((g) => key(g) === k);
}

export function addGroup(groups: string[], name: string): string[] {
  return normalizeGroups([...groups, name]);
}

export function removeGroup(groups: string[], name: string): string[] {
  const k = key(name);
  return groups.filter((g) => key(g) !== k);
}

/** Existing spelling from `available` if there is one, otherwise `fallback`. */
export function resolveGroupName(available: string[], fallback: string): string {
  return available.find((g) => key(g) === key(fallback))?.trim() ?? fallback;
}
