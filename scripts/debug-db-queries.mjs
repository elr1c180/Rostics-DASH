import { withDatabase } from "../server/dbConnection.mjs";

const PROJECT_ID = 131;
const STATUS = 3;

function placeholders(values) {
  return values.map(() => "?").join(", ");
}

try {
  const result = await withDatabase(process.cwd(), async (db) => {
    const [connectionRows] = await db.execute("SELECT 1 AS ok, DATABASE() AS db, CURRENT_USER() AS currentUser");

    const [waves] = await db.execute(
      "SELECT id, year, name, `current`, active FROM efes.wave WHERE project_id = ? ORDER BY id",
      [PROJECT_ID],
    );

    const [questionnaires] = await db.execute(
      "SELECT id, name, `current` FROM efes.questionnaire WHERE project_id = ? AND `current` = 1 ORDER BY id",
      [PROJECT_ID],
    );

    const waveIds = waves.map((wave) => Number(wave.id));
    const questionnaireIds = questionnaires.map((questionnaire) => Number(questionnaire.id));
    const filters = {
      project_id: PROJECT_ID,
      wave_id: waveIds,
      parent_questionnaire_id: questionnaireIds,
      status: [STATUS],
    };

    if (!waveIds.length || !questionnaireIds.length) {
      return {
        connection: connectionRows[0],
        filters,
        waves,
        questionnaires,
        taskCounts: [],
        shopCounts: [],
      };
    }

    const waveSql = placeholders(waveIds);
    const questionnaireSql = placeholders(questionnaireIds);
    const params = [...waveIds, ...questionnaireIds, STATUS];

    const [taskCounts] = await db.execute(
      `SELECT
        ut.wave_id,
        ut.parent_questionnaire_id,
        q.name AS questionnaire_name,
        ut.status,
        COUNT(DISTINCT ut.id) AS tasks,
        COUNT(DISTINCT ua.id) AS answers
      FROM efes.user_task ut
      LEFT JOIN efes.questionnaire q ON q.id = ut.parent_questionnaire_id
      LEFT JOIN efes.user_answer ua ON ua.task_id = ut.id
      WHERE ut.wave_id IN (${waveSql})
        AND ut.parent_questionnaire_id IN (${questionnaireSql})
        AND ut.status = ?
      GROUP BY ut.wave_id, ut.parent_questionnaire_id, q.name, ut.status
      ORDER BY ut.wave_id, ut.parent_questionnaire_id`,
      params,
    );

    const [shopCounts] = await db.execute(
      `SELECT
        ut.wave_id,
        rs.shop_id,
        rs.shop_n,
        COUNT(DISTINCT ut.id) AS tasks
      FROM efes.user_task ut
      LEFT JOIN efes.location l ON l.id = ut.location_id
      LEFT JOIN rostics.report_shops rs ON rs.shop_id = l.shop_id
      WHERE ut.wave_id IN (${waveSql})
        AND ut.parent_questionnaire_id IN (${questionnaireSql})
        AND ut.status = ?
      GROUP BY ut.wave_id, rs.shop_id, rs.shop_n
      ORDER BY ut.wave_id, rs.shop_id`,
      params,
    );

    return {
      connection: connectionRows[0],
      filters,
      waves,
      questionnaires,
      taskCounts,
      shopCounts,
    };
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
