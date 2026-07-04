type Vars = Record<string, string | number>;

function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match
  );
}

/** Looks up a dot-separated key in a dictionary and interpolates {vars}. */
export function translate(dict: unknown, path: string, vars?: Vars): string {
  const value = resolvePath(dict, path);
  if (typeof value !== "string") return path;
  return interpolate(value, vars);
}
