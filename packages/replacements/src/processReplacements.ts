import type { Project } from "ts-morph";
import type { Replacement } from "./Replacement.js";

export function processReplacements(project: Project, replacementsMap: Map<string, Replacement[]>) {
  for (const [filePath, unsortedReplacements] of replacementsMap) {
    const sortedReplacements = [...unsortedReplacements].sort((a, b) => {
      if (a.start === b.start) return a.end - b.end;
      return a.start - b.start;
    });

    const original = project.getSourceFileOrThrow(filePath).getFullText(); // .readFileSync(filePath); // We need to save this contents earlier

    const parts = [];
    let prevEnd = 0;
    for (const replacement of sortedReplacements) {
      if (prevEnd > replacement.start) {
        throw new Error(
          `invairant violated. overlapping replacements arent allowed. check: ${JSON.stringify(
            sortedReplacements,
          )}`,
        );
      }
      parts.push(original.slice(prevEnd, replacement.start));
      parts.push(replacement.newValue);
      prevEnd = replacement.end;
    }
    parts.push(original.slice(prevEnd));

    // This probably isnt fast
    // TODO
    project.getSourceFileOrThrow(filePath).replaceWithText(parts.join(""));
  }

  return replacementsMap.keys();
}
