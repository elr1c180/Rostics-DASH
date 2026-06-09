import fs from "node:fs";
import path from "node:path";
import { withDatabase } from "./dbConnection.mjs";

const PROJECT_ID = 131;

function placeholders(values) {
  return values.map(() => "?").join(", ");
}

async function loadProjectWaves(db) {
  const [waves] = await db.execute(
    "SELECT id, year, name, current, active FROM efes.wave WHERE project_id = ? ORDER BY id",
    [PROJECT_ID],
  );
  return waves;
}

async function loadCurrentQuestionnaires(db) {
  const [questionnaires] = await db.execute(
    "SELECT id, name, `current` FROM efes.questionnaire WHERE project_id = ? AND `current` = 1 ORDER BY id",
    [PROJECT_ID],
  );
  return questionnaires;
}

export async function loadWavesSummary(root = process.cwd()) {
  return withDatabase(root, async (db) => {
    const waves = await loadProjectWaves(db);
    const waveIds = waves.map((wave) => Number(wave.id));
    const questionnaires = await loadCurrentQuestionnaires(db);
    const questionnaireIds = questionnaires.map((questionnaire) => Number(questionnaire.id));

    if (!waveIds.length || !questionnaireIds.length) {
      return {
        generatedAt: new Date().toISOString(),
        filters: {
          schema: "rostics",
          project_id: PROJECT_ID,
          wave_id: [],
          parent_questionnaire_id: questionnaireIds,
          status: [3],
        },
        waves,
        questionnaires,
        summary: [],
        shops: [],
      };
    }

    const [summary] = await db.execute(`
      SELECT
        ut.wave_id,
        ut.parent_questionnaire_id,
        q.name AS questionnaire_name,
        ut.status,
        uts.name AS status_name,
        COUNT(DISTINCT ut.id) AS tasks,
        COUNT(DISTINCT l.shop_id) AS shops
      FROM efes.user_task ut
      LEFT JOIN efes.questionnaire q ON q.id = ut.parent_questionnaire_id
      LEFT JOIN efes.user_task_status uts ON uts.id = ut.status
      LEFT JOIN efes.location l ON l.id = ut.location_id
      WHERE ut.wave_id IN (${placeholders(waveIds)})
        AND ut.parent_questionnaire_id IN (${placeholders(questionnaireIds)})
        AND ut.status = 3
      GROUP BY ut.wave_id, ut.parent_questionnaire_id, q.name, ut.status, uts.name
      ORDER BY ut.wave_id, ut.parent_questionnaire_id
    `, [...waveIds, ...questionnaireIds]);

    const [shops] = await db.execute(`
      SELECT
        ut.wave_id,
        rs.shop_id,
        rs.shop_n,
        COUNT(DISTINCT ut.id) AS tasks
      FROM efes.user_task ut
      LEFT JOIN efes.location l ON l.id = ut.location_id
      LEFT JOIN rostics.report_shops rs ON rs.shop_id = l.shop_id
      WHERE ut.wave_id IN (${placeholders(waveIds)})
        AND ut.parent_questionnaire_id IN (${placeholders(questionnaireIds)})
        AND ut.status = 3
      GROUP BY ut.wave_id, rs.shop_id, rs.shop_n
      ORDER BY ut.wave_id, rs.shop_id
    `, [...waveIds, ...questionnaireIds]);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        schema: "rostics",
        project_id: PROJECT_ID,
        wave_id: waveIds,
        parent_questionnaire_id: questionnaireIds,
        status: [3],
      },
      waves,
      questionnaires,
      summary,
      shops,
    };
  });
}

export async function writeWavesSummary(root = process.cwd()) {
  const data = await loadWavesSummary(root);
  const outputPath = path.join(root, "waves-check.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
  return { outputPath, data };
}
