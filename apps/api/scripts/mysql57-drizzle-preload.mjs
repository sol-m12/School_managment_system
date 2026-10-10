/**
 * MySQL 5.7 lacks information_schema.check_constraints (added in 8.0.16).
 * drizzle-kit pull queries that view and exits 1 with no schema written.
 * This preload wraps mysql2 so that specific failure returns an empty result.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mysqlPromise = require("mysql2/promise");

function isMissingCheckConstraintsView(sqlOrOpts, error) {
  const sql =
    typeof sqlOrOpts === "string" ? sqlOrOpts : (sqlOrOpts?.sql ?? "");
  if (!sql.toLowerCase().includes("check_constraints")) {
    return false;
  }
  return (
    error?.errno === 1109 ||
    error?.code === "ER_UNKNOWN_TABLE" ||
    /Unknown table ['`]?check_constraints['`]?/i.test(
      String(error?.message ?? ""),
    )
  );
}

function wrapConnection(connection) {
  for (const method of ["execute", "query"]) {
    const original = connection[method].bind(connection);
    connection[method] = async function patched(sqlOrOpts, ...rest) {
      try {
        return await original(sqlOrOpts, ...rest);
      } catch (error) {
        if (isMissingCheckConstraintsView(sqlOrOpts, error)) {
          return [[], []];
        }
        throw error;
      }
    };
  }
  return connection;
}

const originalCreateConnection = mysqlPromise.createConnection.bind(mysqlPromise);
mysqlPromise.createConnection = async function patchedCreateConnection(
  ...args
) {
  const connection = await originalCreateConnection(...args);
  return wrapConnection(connection);
};
