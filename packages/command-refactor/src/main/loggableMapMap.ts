export function loggableMapMap(rootExportsPerRelativeFilePath: Map<string, Map<string, unknown>>): {
  [k: string]: [string, unknown][];
} {
  return Object.fromEntries(
    [...rootExportsPerRelativeFilePath.entries()].map(([k, v]) => [k, [...v.entries()]]),
  );
}
