/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Query trivia data with parameterized PostgreSQL statements.
 */

/**
 * Build the database operations used by the trivia controller.
 * @param {import('pg').Pool} pool - Database connection pool.
 * @returns {object} Trivia database operations.
 */
function createTriviaModel(pool) {
  return {
    /** @returns {Promise<string[]>} All topic names in alphabetical order. */
    async getTopics() {
      let result = await pool.query('SELECT name FROM topics ORDER BY name');
      return result.rows.map(function getName(row) { return row.name; });
    },

    /**
     * Find a topic by its normalized name.
     * @param {string} topic - Topic name.
     * @returns {Promise<object|undefined>} Matching topic, if any.
     */
    async getTopic(topic) {
      let result = await pool.query('SELECT id, name FROM topics WHERE name = $1', [topic]);
      return result.rows[0];
    },

    /**
     * Retrieve a topic's questions, optionally filtering and limiting results.
     * @param {number} topicId - Topic primary key.
     * @param {number|null} limit - Maximum results or no cap.
     * @param {string|null} difficulty - Optional difficulty filter.
     * @returns {Promise<object[]>} Questions without their answers.
     */
    async getQuestions(topicId, limit = null, difficulty = null) {
      let result = await pool.query(
        `SELECT questions.id, topics.name AS topic, question, difficulty
         FROM questions JOIN topics ON topics.id = questions.topic_id
         WHERE topic_id = $1 AND ($2::text IS NULL OR difficulty = $2)
         ORDER BY questions.id LIMIT $3`, [topicId, difficulty, limit]
      );
      return result.rows;
    },

    /** @returns {Promise<object|undefined>} A random question with no answer field. */
    async getRandom() {
      let result = await pool.query(
        `SELECT questions.id, topics.name AS topic, question, difficulty
         FROM questions JOIN topics ON topics.id = questions.topic_id
         ORDER BY RANDOM() LIMIT 1`
      );
      return result.rows[0];
    },

    /**
     * Fetch the answer used to evaluate a guess.
     * @param {number} id - Question primary key.
     * @returns {Promise<object|undefined>} Answer or no matching record.
     */
    async getAnswer(id) {
      let result = await pool.query('SELECT answer FROM questions WHERE id = $1', [id]);
      return result.rows[0];
    },

    /**
     * Atomically add a topic if needed and its question.
     * @param {object} data - Validated topic, question, answer, and difficulty.
     * @returns {Promise<number>} Topic ID for the updated question list.
     */
    async addQuestion(data) {
      let client = await pool.connect();
      try {
        await client.query('BEGIN');
        let topic = await client.query(
          `INSERT INTO topics (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [data.topic]
        );
        let topicId = topic.rows[0].id;
        await client.query(
          `INSERT INTO questions (topic_id, question, answer, difficulty)
           VALUES ($1, $2, $3, $4)`,
          [topicId, data.question, data.answer, data.difficulty]
        );
        await client.query('COMMIT');
        return topicId;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

module.exports = createTriviaModel;
