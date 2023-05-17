import { Project } from "ts-morph";
import { processFile } from "./processFile.js";
import { type Logger } from "pino";
import { ProjectContext } from "./Context.js";

export async function processProject(
  project: Project,
  { dryRun = false, logger }: { dryRun?: boolean; logger: Logger }
) {
  const context = new ProjectContext(project, logger);

  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath().endsWith(".d.ts")) {
      project.removeSourceFile(sf);
    }
  }

  for (const sf of project.getSourceFiles()) {
    processFile(sf, context);
  }

  for (let [filePath, replacements] of context.getReplacements()) {
    replacements = [...replacements].sort((a, b) => a.start - b.start);

    const fs = project.getFileSystem();
    const original = fs.readFileSync(filePath);

    const parts = [];
    let q = 0;
    for (const replacement of replacements) {
      parts.push(original.slice(q, replacement.start));
      parts.push(replacement.newValue);
      q = replacement.end;
    }
    parts.push(original.slice(q));

    // This probably isnt fast
    project.getSourceFileOrThrow(filePath).replaceWithText(parts.join(""));
  }

  logger.debug("Organizing imports");
  for (const sf of project.getSourceFiles()) {
    sf.organizeImports();
  }

  if (dryRun) {
    logger.info("DRY RUN");
  } else {
    logger.info("Saving");
    await project.save();
  }
}
