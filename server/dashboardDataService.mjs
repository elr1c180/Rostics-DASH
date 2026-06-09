import fs from "node:fs/promises";
import path from "node:path";
import { withDatabase } from "./dbConnection.mjs";

export const DASHBOARD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_QUERY_TIMEOUT_MS = 60 * 1000;
const DASHBOARD_CACHE_PATH = path.join(".cache", "dashboard-data-v3.json");
const QUESTIONNAIRE_ID = 278;
const BLOCKS = {
  cleanliness: { sectionId: 1129, subSectionIds: new Set([508, 509]) },
  personnel: { sectionId: 1130 },
  food: { sectionId: 1131 },
};
const COMPARISON_QUESTIONS = {
  48: "speed",
  49: "taste",
  50: "cleanliness",
  51: "friendliness",
  52: "choice",
};

let memoryCache = null;
let dashboardLoadPromise = null;

const MONTHS_RU = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];
const MONTHS_SHORT_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pct(score, maxScore) {
  if (!maxScore) return 0;
  return Number(((score / maxScore) * 100).toFixed(1));
}

function questionNumber(question = "") {
  const match = String(question).trim().match(/^(\d+)\./);
  return match ? Number(match[1]) : null;
}

function blockFor(row) {
  const sectionId = Number(row.section_id);
  const subSectionId = Number(row.sub_section_id);

  for (const [key, block] of Object.entries(BLOCKS)) {
    if (sectionId !== block.sectionId) continue;
    if (block.subSectionIds && !block.subSectionIds.has(subSectionId)) continue;
    return key;
  }

  return null;
}

function normalizeComparisonAnswer(answer = "") {
  const value = String(answer).toLowerCase();
  if (value.includes("ростик")) return "rostics";
  if (value.includes("вкусно") || value.includes("вит")) return "tasty";
  if (value.includes("бургер")) return "bk";
  if (value.includes("одинаково")) return "same";
  return null;
}

function splitMultiAnswer(answer = "") {
  return String(answer)
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
}

function classifyBrand(shopName = "") {
  const name = shopName.toLowerCase();
  if (name.includes("вит") || name.includes("вкусно")) return "tasty";
  if (name.includes("бургер кинг")) return "bk";
  return "rostics";
}

function parseDate(value) {
  if (!value) return null;
  const normalized = String(value).trim().slice(0, 10);
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonth(date) {
  if (!date) return "Без даты";
  return `${MONTHS_RU[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonthShort(month) {
  const index = MONTHS_RU.findIndex((name) => month.startsWith(name));
  return index >= 0 ? MONTHS_SHORT_RU[index] : month;
}

function weekOfMonth(date) {
  if (!date) return "Без недели";
  return `${Math.min(4, Math.floor((date.getDate() - 1) / 7) + 1)} нед`;
}

function periodFrom(date, answer = "") {
  const normalized = String(answer).toLowerCase();
  if (["сб", "суб", "вс", "воск"].some((day) => normalized.includes(day))) return "Выходные";
  if (date && [0, 6].includes(date.getDay())) return "Выходные";
  return "Будни";
}

function slotFrom(timeAnswer = "") {
  const hour = hourFrom(timeAnswer);
  if (hour === null) return "Все слоты";
  if (hour < 12) return "Утро";
  if (hour < 17) return "Час-пик";
  return "Вечер";
}

function hourFrom(timeAnswer = "") {
  const match = String(timeAnswer).match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return Number((hour + minute / 60).toFixed(2));
}

function applyAnswerFact(target, row) {
  const question = String(row["Вопрос"] || "").toLowerCase();
  const answer = String(row["Ответ"] || "").trim();

  if (question.includes("дата визита")) target.date = answer;
  if (question.includes("время визита")) target.time = answer;
  if (question.includes("день недели")) target.day = answer;
  if (question.includes("адрес ресторана")) target.address = answer;
}

function deriveCity(row, answers) {
  const explicit = row.city || row.reg;
  if (explicit) return explicit;

  const text = `${row.shop_n || ""} ${answers.address || ""}`.toLowerCase();
  for (const city of ["Москва", "Иваново", "Смоленск", "Сургут"]) {
    if (text.includes(city.toLowerCase())) return city;
  }

  return "Не указан";
}

function sortByDateMonth(a, b) {
  if (a === "Без даты") return 1;
  if (b === "Без даты") return -1;
  const [aMonth, aYear] = a.split(" ");
  const [bMonth, bYear] = b.split(" ");
  return Number(aYear) - Number(bYear) || MONTHS_RU.indexOf(aMonth) - MONTHS_RU.indexOf(bMonth);
}

function buildDashboardData(rows) {
  const byTask = new Map();

  for (const row of rows) {
    const taskId = Number(row["ID анкеты"]);
    if (!byTask.has(taskId)) {
      byTask.set(taskId, {
        checkNumber: taskId,
        restaurantId: Number(row.shop_id),
        restaurantName: row.shop_n || `Ресторан ${row.shop_id}`,
        brand: classifyBrand(row.shop_n || ""),
        rawRow: row,
        answers: {},
        questionAnswers: new Map(),
        blocks: {
          cleanliness: { score: 0, maxScore: 0 },
          personnel: { score: 0, maxScore: 0 },
          food: { score: 0, maxScore: 0 },
        },
      });
    }

    const task = byTask.get(taskId);
    applyAnswerFact(task.answers, row);
    const number = questionNumber(row["Вопрос"]);
    if (number && row["Ответ"]) task.questionAnswers.set(number, String(row["Ответ"]).trim());

    const score = numberOrNull(row["Оценка"]);
    const multiScore = numberOrNull(row["Оценка вопр.с мн.выбором"]);
    const maxScore = numberOrNull(row["Максимальная оценка"]);
    const effectiveScore = score ?? multiScore;

    if (effectiveScore !== null && maxScore !== null && maxScore > 0) {
      const block = blockFor(row);
      if (block) {
        task.blocks[block].score += effectiveScore;
        task.blocks[block].maxScore += maxScore;
      }
    }
  }

  let records = Array.from(byTask.values()).map((task) => {
    const date = parseDate(task.answers.date) || parseDate(task.rawRow.create_time);
    const month = formatMonth(date);
    const rawRow = task.rawRow;
    const blockValues = Object.fromEntries(
      Object.entries(task.blocks).map(([key, value]) => [
        key,
        value.maxScore > 0 ? pct(value.score, value.maxScore) : null,
      ]),
    );
    const comparison = Object.fromEntries(
      Object.entries(COMPARISON_QUESTIONS).map(([number, key]) => [
        key,
        normalizeComparisonAnswer(task.questionAnswers.get(Number(number))),
      ]),
    );
    const npsScore = numberOrNull(task.questionAnswers.get(42));

    return {
      checkNumber: task.checkNumber,
      restaurantId: task.restaurantId,
      restaurantName: task.restaurantName,
      brand: task.brand,
      city: deriveCity(rawRow, task.answers),
      type: rawRow.format || rawRow.subformat || "Ресторан",
      month,
      monthShort: formatMonthShort(month),
      week: weekOfMonth(date),
      period: periodFrom(date, task.answers.day),
      slot: slotFrom(task.answers.time),
      visitHour: hourFrom(task.answers.time),
      cleanliness: blockValues.cleanliness,
      personnel: blockValues.personnel,
      food: blockValues.food,
      checks: 1,
      wait: task.questionAnswers.get(8) || "",
      mood: task.questionAnswers.get(41) || "",
      npsScore,
      criticalIssues: splitMultiAnswer(task.questionAnswers.get(44)),
      comparison,
      isPaired: Object.values(comparison).some(Boolean),
    };
  });

  const availableMonths = Array.from(new Set(records.map((record) => record.month)))
    .sort(sortByDateMonth);
  const latestMonths = availableMonths.filter((month) => month !== "Без даты").slice(-3);
  records = records.filter((record) => latestMonths.includes(record.month));
  records.sort((a, b) => a.checkNumber - b.checkNumber);

  const restaurantMap = new Map();
  for (const record of records) {
    if (!restaurantMap.has(record.restaurantId)) {
      restaurantMap.set(record.restaurantId, {
        id: record.restaurantId,
        name: record.restaurantName,
        brand: record.brand,
        city: record.city,
        type: record.type,
      });
    }
  }

  const restaurants = Array.from(restaurantMap.values()).sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name, "ru"));
  const months = Array.from(new Set(records.map((record) => record.month))).sort(sortByDateMonth);

  return {
    restaurants,
    records,
    months,
    monthShort: months.map(formatMonthShort),
    weeks: Array.from(new Set(records.map((record) => record.week))).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
    meta: {
      sourceRows: rows.length,
      questionnaireId: QUESTIONNAIRE_ID,
      period: months,
      generatedAt: new Date().toISOString(),
    },
  };
}

const PROJECT_ID = 131;

function placeholders(values) {
  return values.map(() => "?").join(", ");
}

async function loadProjectWaveIds(db) {
  const [rows] = await db.execute(
    "SELECT id FROM efes.wave WHERE project_id = ? ORDER BY id",
    [PROJECT_ID],
  );
  return rows.map((row) => Number(row.id));
}

function createDashboardQuery(waveIds) {
  return `
SELECT /*+ MAX_EXECUTION_TIME(${DASHBOARD_QUERY_TIMEOUT_MS}) */
    ua.task_id AS 'ID анкеты',
rs.shop_id,rs.shop_n,rs.fio_sv,rs.fio_tu,rs.format,rs.subformat,rs.division,rs.odof,rs.cluster,rs.reg,rs.city,rs.adr,
    ut.create_time,
    q.name,
    ut.\`status\`,
    uts.\`name\` AS 'Статус',
    ua.user_id AS 'ID пользователя',
    uqs.parent_question_id,
    uqs.section_id,
    uqs.sub_section_id,
    uqs.question_text AS 'Вопрос',
    CONCAT_WS(' | ',
        NULLIF(uas.text, ''),
        NULLIF(ua.comment_text, ''),
        CASE
            WHEN ua.digit_result IS NOT NULL AND ua.digit_result NOT LIKE '%|-|%'
            THEN ua.digit_result
            ELSE NULL
        END,
        NULLIF(GROUP_CONCAT(DISTINCT uas2.text SEPARATOR ' | '), '')
    ) AS 'Ответ',
   uas.score AS 'Оценка',
                        uqs.max_score AS 'Максимальная оценка',
                        am.score as 'Оценка вопр.с мн.выбором',
                        ROUND((uas.score/uqs.max_score*100),2) as 'Итог'
FROM efes.user_answer ua
LEFT JOIN user_task ut ON ut.id = ua.task_id
LEFT JOIN location l on ut.location_id=l.id
LEFT JOIN user_answer_set uas ON uas.id = ua.answer_set_id
LEFT JOIN rostics.\`report_shops\` rs on l.shop_id=rs.shop_id
LEFT JOIN user_question_set uqs ON uqs.id = ua.question_set_id
LEFT JOIN user_task_status uts ON uts.id = ut.\`status\`
LEFT JOIN questionnaire q ON q.id = ut.parent_questionnaire_id
LEFT JOIN  rostics.answers_multi am ON am.q_id = uqs.parent_question_id and am.max_score is not null
LEFT JOIN (
    SELECT
        ua_inner.id AS user_answer_id,
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(ua_inner.digit_result, '|-|', n.n), '|-|', -1) AS UNSIGNED) AS answer_set_id
    FROM efes.user_answer ua_inner
    JOIN (
        SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
        UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    ) AS n
    WHERE ua_inner.digit_result IS NOT NULL AND ua_inner.digit_result LIKE '%|-|%'
) AS dr ON dr.user_answer_id = ua.id
LEFT JOIN user_answer_set uas2 ON uas2.id = dr.answer_set_id
WHERE ut.wave_id in (${placeholders(waveIds)}) and
ut.parent_questionnaire_id = ? and
ut.\`status\` in (3)
GROUP BY ua.id
ORDER BY ua.task_id, uqs.sorting
`;
}

function isFresh(cache) {
  return cache
    && Number.isFinite(cache.cachedAt)
    && Date.now() - cache.cachedAt < DASHBOARD_CACHE_TTL_MS;
}

async function readDiskCache(root) {
  try {
    const cache = JSON.parse(
      await fs.readFile(path.join(root, DASHBOARD_CACHE_PATH), "utf8"),
    );
    return cache?.data && Number.isFinite(cache.cachedAt) ? cache : null;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function writeDiskCache(root, cache) {
  const cachePath = path.join(root, DASHBOARD_CACHE_PATH);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(cache)}\n`, "utf8");
}

async function fetchDashboardData(root) {
  return withDatabase(root, async (db) => {
    await db.execute("SET @p_answers_schema = ?", ["rostics"]);
    await db.execute("SET @p_answers_schema = NULLIF(TRIM(@p_answers_schema), '')");
    const waveIds = await loadProjectWaveIds(db);

    if (!waveIds.length) {
      return buildDashboardData([]);
    }

    const [rows] = await db.execute({
      sql: createDashboardQuery(waveIds),
      timeout: DASHBOARD_QUERY_TIMEOUT_MS,
      values: [...waveIds, QUESTIONNAIRE_ID],
    });

    return buildDashboardData(rows);
  });
}

export async function loadDashboardData({ root = process.cwd() } = {}) {
  if (isFresh(memoryCache)) return memoryCache.data;
  if (dashboardLoadPromise) return dashboardLoadPromise;

  dashboardLoadPromise = (async () => {
    const diskCache = await readDiskCache(root);
    if (isFresh(diskCache)) {
      memoryCache = diskCache;
      return diskCache.data;
    }

    try {
      const data = await fetchDashboardData(root);
      const cache = { cachedAt: Date.now(), data };
      memoryCache = cache;
      await writeDiskCache(root, cache);
      return data;
    } catch (error) {
      const staleCache = memoryCache || diskCache;
      if (staleCache?.data) {
        console.error("Dashboard refresh failed, serving stale cache:", error);
        const fallbackCache = { cachedAt: Date.now(), data: staleCache.data };
        memoryCache = fallbackCache;
        await writeDiskCache(root, fallbackCache).catch((cacheError) => {
          console.error("Failed to persist stale dashboard cache:", cacheError);
        });
        return fallbackCache.data;
      }
      throw error;
    }
  })();

  try {
    return await dashboardLoadPromise;
  } finally {
    dashboardLoadPromise = null;
  }
}
