import { withDatabase } from "../server/dbConnection.mjs";

try {
  const result = await withDatabase(process.cwd(), async (db) => {
    const [rows] = await db.execute("SELECT 1 AS ok, DATABASE() AS db, CURRENT_USER() AS currentUser");
    return rows[0];
  });

  console.log(JSON.stringify({ connected: true, ...result }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    connected: false,
    code: error.code,
    level: error.level,
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
}
