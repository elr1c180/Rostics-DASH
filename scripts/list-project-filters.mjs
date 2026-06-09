import { withDatabase } from "../server/dbConnection.mjs";

const PROJECT_ID = 131;

try {
  const result = await withDatabase(process.cwd(), async (db) => {
    const [waves] = await db.execute(
      "SELECT id, year, name, `current`, active FROM efes.wave WHERE project_id = ? ORDER BY id",
      [PROJECT_ID],
    );

    const [questionnaires] = await db.execute(
      "SELECT id, name, `current` FROM efes.questionnaire WHERE project_id = ? AND `current` = 1 ORDER BY id",
      [PROJECT_ID],
    );

    return {
      project_id: PROJECT_ID,
      wave_ids: waves.map((wave) => Number(wave.id)),
      questionnaire_ids: questionnaires.map((questionnaire) => Number(questionnaire.id)),
      waves,
      questionnaires,
    };
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    connected: false,
    code: error.code,
    level: error.level,
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
}
