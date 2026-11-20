/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Validate HTTP requests and return trivia results or helpful errors.
 */
let difficulties = ['easy', 'medium', 'hard'];

/**
 * Determine whether a value is nonempty text within the field limit.
 * @param {*} value - Incoming request value.
 * @param {number} maximum - Maximum trimmed length.
 * @returns {boolean} Whether the text is valid.
 */
function validText(value, maximum) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum;
}

/**
 * Create route handlers using a trivia model.
 * @param {object} model - Trivia database operations.
 * @returns {object} Express request handlers.
 */
function createTriviaController(model) {
  return {
    /** @param {object} req - Request. @param {object} res - Response. */
    async topics(req, res) {
      res.json(await model.getTopics());
    },

    /** @param {object} req - Request. @param {object} res - Response. */
    async topic(req, res) {
      let { limit, difficulty } = req.query;
      if (limit !== undefined && (typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) ||
          !Number.isSafeInteger(Number(limit)))) {
        return res.status(400).json({ error: 'limit must be a positive whole number.' });
      }
      if (difficulty !== undefined && !difficulties.includes(difficulty)) {
        return res.status(400).json({ error: 'difficulty must be easy, medium, or hard.' });
      }
      let topic = await model.getTopic(req.params.topic.trim().toLowerCase());
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found.' });
      }
      res.json(await model.getQuestions(topic.id, limit === undefined ? null : Number(limit), difficulty || null));
    },

    /** @param {object} req - Request. @param {object} res - Response. */
    async random(req, res) {
      let question = await model.getRandom();
      if (!question) {
        return res.status(404).json({ error: 'No questions are available yet.' });
      }
      res.json(question);
    },

    /** @param {object} req - Request. @param {object} res - Response. */
    async answer(req, res) {
      let { id, guess } = req.body || {};
      let validId = (typeof id === 'number' || typeof id === 'string') &&
        /^[1-9]\d*$/.test(String(id)) && Number(id) <= 2147483647;
      if (!validId || !validText(guess, 500)) {
        return res.status(400).json({ error: 'Provide a positive integer id and a nonempty guess (up to 500 characters).' });
      }
      let record = await model.getAnswer(Number(id));
      if (!record) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      res.json({ correct: guess.trim().toLowerCase() === record.answer.trim().toLowerCase(), answer: record.answer });
    },

    /** @param {object} req - Request. @param {object} res - Response. */
    async add(req, res) {
      let { topic, question, answer, difficulty } = req.body || {};
      if (!validText(topic, 100) || !validText(question, 1000) || !validText(answer, 500)) {
        return res.status(400).json({ error: 'Provide nonempty topic (up to 100), question (up to 1000), and answer (up to 500 characters).' });
      }
      if (!difficulties.includes(difficulty)) {
        return res.status(400).json({ error: 'difficulty must be easy, medium, or hard.' });
      }
      let topicId = await model.addQuestion({ topic: topic.trim().toLowerCase(), question: question.trim(), answer: answer.trim(), difficulty });
      res.status(201).json(await model.getQuestions(topicId));
    }
  };
}

module.exports = createTriviaController;
