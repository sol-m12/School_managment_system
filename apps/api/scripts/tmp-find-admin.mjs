import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("dotenv").config();
const mysql = require("mysql2/promise");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME,
});

const [rows] = await connection.query(`
  SELECT u.user_id, u.username, u.role AS user_role,
         s.staff_id, s.first_name, s.last_name, s.role AS staff_role, s.job_title
  FROM users u
  LEFT JOIN staff s ON s.user_id = u.user_id AND s.tenant_id = u.tenant_id
  WHERE u.role = 'Admin'
     OR u.username LIKE '%abeba%'
     OR s.first_name LIKE '%Abeba%'
     OR s.job_title LIKE '%Principal%'
     OR s.job_title LIKE '%ርዕሰ%'
`);
console.log(JSON.stringify(rows, null, 2));
await connection.end();
