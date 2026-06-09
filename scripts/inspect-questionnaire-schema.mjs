import { withDatabase } from "../server/dbConnection.mjs";

const QUESTIONNAIRE_ID = 278;

const result = await withDatabase(process.cwd(), async (db) => {
  const [sections] = await db.execute(`
    SELECT
      section_id,
      MIN(sorting) AS sorting,
      MIN(question_text) AS section_name
    FROM efes.user_question_set
    WHERE questionnaire_id = ?
      AND is_section_name = 1
    GROUP BY section_id
    ORDER BY sorting
  `, [QUESTIONNAIRE_ID]);

  const [questions] = await db.execute(`
    SELECT
      ABS(parent_question_id) AS question_id,
      MIN(sorting) AS sorting,
      MIN(question_text) AS question_text,
      section_id,
      sub_section_id,
      MAX(max_score) AS max_score,
      MAX(is_answer_digit) AS is_answer_digit,
      MAX(is_answer_float_digit) AS is_answer_float_digit,
      MAX(is_answer_multiple_select) AS is_answer_multiple_select
    FROM efes.user_question_set
    WHERE questionnaire_id = ?
      AND is_section_name = 0
      AND (
        question_text REGEXP '^(8|41|42|44|47|48|49|50|51|52)[.]'
        OR section_id IN (
          SELECT section_id
          FROM efes.user_question_set
          WHERE questionnaire_id = ?
            AND is_section_name = 1
            AND (
              LOWER(question_text) LIKE '%зал%'
              OR LOWER(question_text) LIKE '%туалет%'
              OR LOWER(question_text) LIKE '%гостеприим%'
              OR LOWER(question_text) LIKE '%блюд%'
              OR LOWER(question_text) LIKE '%сравнитель%'
            )
        )
      )
    GROUP BY ABS(parent_question_id), section_id, sub_section_id
    ORDER BY sorting, question_id
  `, [QUESTIONNAIRE_ID, QUESTIONNAIRE_ID]);

  const [targetAnswers] = await db.execute(`
    SELECT
      SUBSTRING_INDEX(uqs.question_text, '.', 1) AS question_number,
      uqs.question_text,
      COALESCE(
        NULLIF(uas.text, ''),
        NULLIF(ua.comment_text, ''),
        CASE
          WHEN ua.digit_result NOT LIKE '%|-|%' THEN NULLIF(ua.digit_result, '')
          ELSE NULL
        END,
        NULLIF(GROUP_CONCAT(DISTINCT uas2.text ORDER BY uas2.text SEPARATOR ' | '), '')
      ) AS answer,
      COUNT(DISTINCT ua.id) AS responses
    FROM efes.user_answer ua
    JOIN efes.user_task ut ON ut.id = ua.task_id AND ut.status = 3
    JOIN efes.user_question_set uqs ON uqs.id = ua.question_set_id
    LEFT JOIN efes.user_answer_set uas ON uas.id = ua.answer_set_id
    LEFT JOIN (
      SELECT
        ua_inner.id AS user_answer_id,
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(ua_inner.digit_result, '|-|', n.n), '|-|', -1) AS UNSIGNED) AS answer_set_id
      FROM efes.user_answer ua_inner
      JOIN (
        SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
      ) n
      WHERE ua_inner.digit_result LIKE '%|-|%'
    ) dr ON dr.user_answer_id = ua.id
    LEFT JOIN efes.user_answer_set uas2 ON uas2.id = dr.answer_set_id
    WHERE uqs.questionnaire_id = ?
      AND uqs.question_text REGEXP '^(8|41|42|44|47|48|49|50|51|52)[.]'
    GROUP BY question_number, uqs.question_text, ua.id, uas.text, ua.comment_text, ua.digit_result
  `, [QUESTIONNAIRE_ID]);

  const answerSummary = new Map();
  for (const row of targetAnswers) {
    const key = `${row.question_number}. ${row.question_text}`;
    if (!answerSummary.has(key)) answerSummary.set(key, new Map());
    const answers = answerSummary.get(key);
    const answer = row.answer || "Без ответа";
    answers.set(answer, (answers.get(answer) || 0) + Number(row.responses));
  }

  const [dateRange] = await db.execute(`
    SELECT
      MIN(ut.create_time) AS first_task,
      MAX(ut.create_time) AS last_task,
      COUNT(DISTINCT ut.id) AS tasks
    FROM efes.user_task ut
    WHERE ut.parent_questionnaire_id = ?
      AND ut.status = 3
  `, [QUESTIONNAIRE_ID]);

  return {
    sections,
    questions,
    answerSummary: Object.fromEntries(
      Array.from(answerSummary, ([question, answers]) => [
        question,
        Array.from(answers, ([answer, responses]) => ({ answer, responses }))
          .sort((a, b) => b.responses - a.responses),
      ]),
    ),
    dateRange: dateRange[0],
  };
});

console.log(JSON.stringify(result, null, 2));
