/** Merge flat web locale keys (`browse.call`) under nested RN namespaces. RN keys win. */

export function unflattenDotted(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const next = cur[p];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        cur[p] = {};
      }
      cur = cur[p] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1];
    if (cur[last] === undefined) {
      cur[last] = value;
    }
  }
  return out;
}

export function deepMergePreferLeft(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {...left};
  for (const key of Object.keys(right)) {
    const r = right[key];
    const l = out[key];
    if (
      l &&
      r &&
      typeof l === 'object' &&
      typeof r === 'object' &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      out[key] = deepMergePreferLeft(
        l as Record<string, unknown>,
        r as Record<string, unknown>,
      );
    } else if (!(key in out)) {
      out[key] = r;
    }
  }
  return out;
}

export function mergeWebLocale(
  appNested: Record<string, unknown>,
  webFlat: Record<string, unknown>,
): Record<string, unknown> {
  return deepMergePreferLeft(appNested, unflattenDotted(webFlat));
}
