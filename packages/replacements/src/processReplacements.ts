import type { Project } from "ts-morph";
import type { Replacement } from "./Replacement.js";

export function processReplacements(project: Project, replacementsMap: Map<string, Replacement[]>) {
  for (const [filePath, unsortedReplacements] of replacementsMap) {
    const sortedReplacements = [...unsortedReplacements].sort((a, b) => a.start - b.start);

    const fs = project.getFileSystem();
    const original = fs.readFileSync(filePath);

    const parts = [];
    let q = 0;
    for (const replacement of sortedReplacements) {
      parts.push(original.slice(q, replacement.start));
      parts.push(replacement.newValue);
      q = replacement.end;
    }
    parts.push(original.slice(q));

    // This probably isnt fast
    project.getSourceFileOrThrow(filePath).replaceWithText(parts.join(""));
  }

  return replacementsMap.keys();
}
