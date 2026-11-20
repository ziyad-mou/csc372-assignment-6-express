/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Exercise the full Express/router/controller/model/Postgres stack.
 */
let { test, before, after } = require('node:test');
let assert = require('node:assert/strict');
let { Pool } = require('pg');
let request = require('supertest');
let createApp = require('../app');
let { initializeDatabase } = require('../db/database');
let databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Set TEST_DATABASE_URL to a separate PostgreSQL database ending in _test.');
}
let pool = new Pool({ connectionString: databaseUrl });
let app = createApp(pool);
let uniqueTopic = `test-${Date.now()}`;
let marsId;

/** Prepare the real database and find a stable seeded question ID. */
before(async function prepareDatabase() {
  await initializeDatabase(pool);
  let result = await pool.query("SELECT id FROM questions WHERE question = 'What planet is known as the Red Planet?'");
  marsId = result.rows[0].id;
});

/** Release database connections after the suite. */
after(async function closeDatabase() { await pool.end(); });

/** Confirm all five seed records survive repeated initialization without duplicates. */
test('database initialization is repeatable', async function seedTwice() {
  await initializeDatabase(pool);
  let result = await pool.query('SELECT count(*)::int AS count FROM questions WHERE id = $1', [marsId]);
  assert.equal(result.rows[0].count, 1);
});

/** Verify the user-facing page and its static assets are served. */
test('serves the frontend', async function frontend() {
  await request(app).get('/').expect(200).expect('Content-Type', /html/);
  await request(app).get('/app.js').expect(200);
  await request(app).get('/styles.css').expect(200);
});

/** Verify topic discovery and canonical ordering. */
test('lists topics', async function topics() {
  let response = await request(app).get('/triviabook/topics').expect(200);
  assert.ok(response.body.includes('science'));
  assert.ok(response.body.includes('geography'));
  assert.deepEqual(response.body, [...response.body].sort());
});

/** Verify both filters together and case normalization for topic names. */
test('topic questions support difficulty and limit', async function filters() {
  let response = await request(app).get('/triviabook/topic/SCIENCE?difficulty=easy&limit=1').expect(200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].difficulty, 'easy');
  assert.equal(response.body[0].topic, 'science');
  assert.equal('answer' in response.body[0], false);
});

/** Verify all specified science seeds are present without a limit. */
test('topic questions are unbounded by default', async function allQuestions() {
  let response = await request(app).get('/triviabook/topic/science').expect(200);
  assert.ok(response.body.some(function isGold(question) { return question.question === 'What is the chemical symbol for gold?'; }));
  assert.ok(response.body.length >= 3);
});

/** An existing topic with no matching difficulty is a successful empty list. */
test('empty filter returns an empty array', async function emptyFilter() {
  let response = await request(app).get('/triviabook/topic/geography?difficulty=hard').expect(200);
  assert.deepEqual(response.body, []);
});

for (let suffix of ['limit=0', 'limit=-1', 'limit=1.5', 'limit=abc', 'limit=9007199254740992', 'limit=1&limit=2', 'difficulty=expert', 'difficulty=easy&difficulty=hard']) {
  /** Invalid filters return a client error rather than a database failure. */
  test(`rejects ${suffix}`, async function invalidFilter() {
    let response = await request(app).get(`/triviabook/topic/science?${suffix}`).expect(400);
    assert.equal(typeof response.body.error, 'string');
  });
}

/** Unknown topics must be distinguished from empty filtered results. */
test('unknown topic is 404', async function unknownTopic() {
  await request(app).get('/triviabook/topic/not-a-real-topic').expect(404);
});

/** A SQL fragment stays a literal topic value. */
test('topic SQL injection cannot change query semantics', async function injection() {
  await request(app).get('/triviabook/topic/' + encodeURIComponent("science' OR 1=1 --")).expect(404);
  await request(app).get('/triviabook/topics').expect(200);
});

/** Random responses reveal only the fields needed to play. */
test('random question does not reveal an answer', async function randomQuestion() {
  let response = await request(app).get('/triviabook/random').expect(200);
  assert.deepEqual(Object.keys(response.body).sort(), ['difficulty', 'id', 'question', 'topic']);
});

/** Guess comparison ignores surrounding whitespace and capitalization. */
test('correct and incorrect guesses return the canonical answer', async function answers() {
  let correct = await request(app).post('/triviabook/answer').send({ id: marsId, guess: '  mArS  ' }).expect(200);
  assert.deepEqual(correct.body, { correct: true, answer: 'Mars' });
  let wrong = await request(app).post('/triviabook/answer').send({ id: String(marsId), guess: 'Venus' }).expect(200);
  assert.deepEqual(wrong.body, { correct: false, answer: 'Mars' });
});

for (let body of [{}, { id: 1 }, { guess: 'Mars' }, { id: true, guess: 'Mars' }, { id: 1, guess: '   ' }, { id: 1, guess: 42 }, { id: '2147483648', guess: 'Mars' }]) {
  /** Missing, empty, and incorrectly typed fields are rejected. */
  test(`rejects invalid answer ${JSON.stringify(body)}`, async function invalidAnswer() {
    await request(app).post('/triviabook/answer').send(body).expect(400);
  });
}

/** A well-formed ID that does not exist must return 404. */
test('unknown question ID is 404', async function unknownQuestion() {
  await request(app).post('/triviabook/answer').send({ id: 2147483647, guess: 'Mars' }).expect(404);
});

/** Adding to a new topic creates it; subsequent additions reuse the same topic. */
test('adds questions, returns updated topic list, and persists answers', async function addQuestions() {
  let data = { topic: ` ${uniqueTopic.toUpperCase()} `, question: 'Which language runs in browsers?', answer: 'JavaScript', difficulty: 'easy' };
  let first = await request(app).post('/triviabook/question/add').send(data).expect(201);
  assert.equal(first.body.length, 1);
  assert.equal(first.body[0].topic, uniqueTopic);
  assert.equal('answer' in first.body[0], false);
  let check = await request(app).post('/triviabook/answer').send({ id: first.body[0].id, guess: ' javascript ' }).expect(200);
  assert.equal(check.body.correct, true);
  let second = await request(app).post('/triviabook/question/add').send({ ...data, question: 'Which protocol serves web pages?', answer: 'HTTP', difficulty: 'medium' }).expect(201);
  assert.equal(second.body.length, 2);
  let topics = await request(app).get('/triviabook/topics').expect(200);
  assert.equal(topics.body.filter(function matches(topic) { return topic === uniqueTopic; }).length, 1);
  await request(app).post('/triviabook/question/add').send(data).expect(409);
});

for (let field of ['topic', 'question', 'answer', 'difficulty']) {
  /** Every required add-question field is checked. */
  test(`requires ${field} when adding`, async function missingField() {
    let data = { topic: 'science', question: 'Example?', answer: 'Example', difficulty: 'easy' };
    delete data[field];
    await request(app).post('/triviabook/question/add').send(data).expect(400);
  });
}

/** Invalid difficulty cannot create an orphan topic. */
test('rejects invalid difficulty before writing', async function invalidDifficulty() {
  await request(app).post('/triviabook/question/add').send({ topic: 'should-not-be-created', question: 'Example?', answer: 'Example', difficulty: 'expert' }).expect(400);
  await request(app).get('/triviabook/topic/should-not-be-created').expect(404);
});

/** Length and type checks protect database constraints and prevent server errors. */
test('rejects empty, oversized, and nonstring question fields', async function invalidText() {
  for (let value of ['   ', 17, {}, 'x'.repeat(1001)]) {
    await request(app).post('/triviabook/question/add').send({ topic: 'science', question: value, answer: 'Example', difficulty: 'easy' }).expect(400);
  }
});

/** Malformed and oversized request bodies receive readable JSON errors. */
test('body parser errors are JSON', async function invalidJson() {
  let response = await request(app).post('/triviabook/answer').set('Content-Type', 'application/json').send('{bad').expect(400);
  assert.equal(typeof response.body.error, 'string');
  await request(app).post('/triviabook/answer').send({ guess: 'x'.repeat(17000) }).expect(413);
});

/** Unknown endpoints return the same JSON error format. */
test('unknown endpoint is JSON 404', async function unknownEndpoint() {
  let response = await request(app).get('/triviabook/missing').expect(404);
  assert.equal(response.body.error, 'Endpoint not found.');
});
