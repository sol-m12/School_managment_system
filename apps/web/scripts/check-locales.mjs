// Fails when the am and en locale files do not have identical keys.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/locales/", import.meta.url));
const languages = ["am", "en"];

function flatten(value, prefix = "") {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

const files = new Set(languages.flatMap((lang) => readdirSync(join(root, lang))));
let problems = 0;

for (const file of files) {
  const keySets = languages.map((lang) => {
    try {
      return new Set(flatten(JSON.parse(readFileSync(join(root, lang, file), "utf8"))));
    } catch {
      console.error(`Missing or invalid locale file: ${lang}/${file}`);
      problems += 1;
      return new Set();
    }
  });
  languages.forEach((lang, index) => {
    const other = keySets[1 - index];
    for (const key of keySets[index]) {
      if (!other.has(key)) {
        console.error(`${file}: "${key}" exists in ${lang} but not in ${languages[1 - index]}`);
        problems += 1;
      }
    }
  });
}

if (problems > 0) {
  console.error(`Locale check failed with ${problems} problem(s).`);
  process.exit(1);
}
console.log(`Locale check passed (${files.size} files, ${languages.join(" + ")}).`);
