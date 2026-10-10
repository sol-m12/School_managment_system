import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = path.join(apiRoot, "src", "db", "schema", "generated");
const preload = path.join(apiRoot, "scripts", "mysql57-drizzle-preload.mjs");
const kitBin = path.join(apiRoot, "node_modules", "drizzle-kit", "bin.cjs");

const pull = spawnSync(
  process.execPath,
  [
    "--import",
    pathToFileURL(preload).href,
    kitBin,
    "pull",
    "--config=drizzle.pull.config.ts",
  ],
  { cwd: apiRoot, stdio: "inherit", shell: false },
);

if (pull.status !== 0) {
  process.exit(pull.status ?? 1);
}

fixGeneratedSchema(path.join(generatedDir, "schema.ts"));
fixGeneratedRelations(path.join(generatedDir, "relations.ts"));

function fixGeneratedSchema(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error("Expected generated schema at " + filePath);
    process.exit(1);
  }

  let source = fs.readFileSync(filePath, "utf8");
  const importRe = new RegExp(
    "import\\s*\\{([^}]+)\\}\\s*from\\s*[\"']drizzle-orm\\/mysql-core[\"']",
  );
  const importMatch = source.match(importRe);
  if (!importMatch) {
    return;
  }

  const imported = new Set(
    importMatch[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );

  const needed = ["tinyint", "bigint", "boolean", "json"].filter((name) => {
    return new RegExp("\\b" + name + "\\s*\\(").test(source) && !imported.has(name);
  });

  if (needed.length === 0) {
    return;
  }

  const nextImports = [...imported, ...needed].join(", ");
  source = source.replace(
    importMatch[0],
    "import { " + nextImports + ' } from "drizzle-orm/mysql-core"',
  );
  fs.writeFileSync(filePath, source, "utf8");
  console.log(
    "Patched missing drizzle-orm imports in schema.ts: " + needed.join(", "),
  );
}

function fixGeneratedRelations(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let source = fs.readFileSync(filePath, "utf8");
  const relationImportRe = new RegExp("from\\s+[\"']\\.\\/schema[\"']", "g");
  const next = source.replace(relationImportRe, 'from "./schema.js"');
  if (next !== source) {
    fs.writeFileSync(filePath, next, "utf8");
    console.log('Patched relations.ts import to use "./schema.js"');
  }
}
