/**
 * Fails if any role would see the same path or same Amharic label twice.
 * Run: node apps/web/scripts/assert-no-menu-dupes.mjs
 */
import fs from "node:fs";

const menuText = fs.readFileSync(new URL("../src/navigation/menu.ts", import.meta.url), "utf8");
const labels = JSON.parse(fs.readFileSync(new URL("../src/locales/am/nav.json", import.meta.url), "utf8")).items;
const permText = fs.readFileSync(new URL("../../api/src/lib/permissions.ts", import.meta.url), "utf8");
const grants = {};
const grantRe = /"([^"]+)":\s*\[([^\]]*)\]/g;
let gm;
const grantsBlock = permText.slice(permText.indexOf("const GRANTS"));
while ((gm = grantRe.exec(grantsBlock))) {
  grants[gm[1]] = [...gm[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const roles = [
  "Principal", "V_Principal", "Teacher", "Technician", "Student",
  "Store_Keeper", "Registrar", "Librarian", "Procurement", "Secretary", "Counselor", "Parent",
];

const items = [];
const blockRe = /\{\s*key:\s*"([^"]+)",\s*path:\s*"([^"]+)"[\s\S]*?\},/g;
let m;
while ((m = blockRe.exec(menuText))) {
  const block = m[0];
  const permission = /permission:\s*"([^"]+)"/.exec(block)?.[1] ?? null;
  const rolesRaw = /roles:\s*\[([^\]]*)\]/.exec(block)?.[1] ?? null;
  const itemRoles = rolesRaw ? [...rolesRaw.matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null;
  const labelByRole = {};
  const lbr = /labelByRole:\s*\{([^}]*)\}/.exec(block)?.[1];
  if (lbr) for (const x of lbr.matchAll(/(\w+):\s*"([^"]+)"/g)) labelByRole[x[1]] = x[2];
  items.push({ key: m[1], path: m[2], permission, roles: itemRoles, labelByRole });
}

function visible(item, role) {
  if (item.roles && !item.roles.includes(role)) return false;
  if (!item.permission) return !item.roles || item.roles.includes(role);
  return (grants[item.permission] ?? []).includes(role);
}

function labelFor(item, role) {
  return labels[item.labelByRole[role] ?? item.key] ?? item.key;
}

const errors = [];
for (const role of roles) {
  const list = items.filter((i) => visible(i, role));
  const byPath = new Map();
  const byLabel = new Map();
  for (const i of list) {
    if (!byPath.has(i.path)) byPath.set(i.path, []);
    byPath.get(i.path).push(i.key);
    const lab = labelFor(i, role);
    if (!byLabel.has(lab)) byLabel.set(lab, []);
    byLabel.get(lab).push(i.key);
  }
  for (const [path, keys] of byPath) {
    if (keys.length > 1) errors.push(`${role} path ${path}: ${keys.join(", ")}`);
  }
  for (const [lab, keys] of byLabel) {
    if (keys.length > 1) errors.push(`${role} label "${lab}": ${keys.join(", ")}`);
  }
}

if (errors.length) {
  console.error("In-role menu duplicates:\n" + errors.map((e) => "  " + e).join("\n"));
  process.exit(1);
}
console.log("OK: no in-role path or Amharic-label duplicates.");
