export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesQuery(haystacks: (string | null | undefined)[], query: string): boolean {
  const q = normalizeText(query);
  if (!q) return false;
  return haystacks.some((h) => h != null && normalizeText(h).includes(q));
}
