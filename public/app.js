/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Connect the trivia interface to the Express JSON API.
 */
let currentQuestion = null;
let quizVersion = 0;
let searchVersion = 0;
let randomButton = document.querySelector('#random-button');
let answerForm = document.querySelector('#answer-form');
let guessInput = document.querySelector('#guess');
let checkButton = document.querySelector('#check-button');
let searchForm = document.querySelector('#search-form');
let addForm = document.querySelector('#add-form');

randomButton.addEventListener('click', loadRandom);
answerForm.addEventListener('submit', checkAnswer);
searchForm.addEventListener('submit', searchQuestions);
addForm.addEventListener('submit', addQuestion);
loadTopics();
loadRandom();

/**
 * Fetch JSON and convert HTTP errors to messages for the user.
 * @param {string} path - API path relative to the same origin.
 * @param {object} options - Fetch options.
 * @returns {Promise<*>} Parsed JSON response.
 */
async function request(path, options = {}) {
  let response = await fetch(`/triviabook${path}`, options);
  let data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
  return data;
}

/**
 * Display accessible feedback safely as plain text.
 * @param {string} selector - Status element selector.
 * @param {string} message - Message to display.
 * @param {string} kind - Optional success or error class.
 */
function setStatus(selector, message, kind = '') {
  let element = document.querySelector(selector);
  element.textContent = message;
  element.className = kind;
}

/** @returns {Promise<void>} Load topic buttons and form suggestions. */
async function loadTopics() {
  try {
    let topics = await request('/topics');
    let list = document.querySelector('#topic-list');
    let options = document.querySelector('#topic-options');
    list.replaceChildren();
    options.replaceChildren();
    for (let topic of topics) {
      let button = document.createElement('button');
      button.type = 'button';
      button.className = 'topic-button';
      button.textContent = topic;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function selectTopic() {
        document.querySelector('#search-topic').value = topic;
        searchForm.requestSubmit();
      });
      list.appendChild(button);
      let option = document.createElement('option');
      option.value = topic;
      options.appendChild(option);
    }
    document.querySelector('#topic-count').textContent = `${topics.length} topics to explore`;
  } catch (error) {
    setStatus('#search-status', 'Topics could not load. Search again to retry.', 'error');
    document.querySelector('#topic-count').textContent = 'Topics unavailable';
  }
}

/**
 * Show a selected question and clear feedback from the previous question.
 * @param {object} question - Question returned by the API, without its answer.
 */
function showQuestion(question) {
  quizVersion += 1;
  currentQuestion = question;
  document.querySelector('#question-topic').textContent = question.topic;
  document.querySelector('#question-difficulty').textContent = question.difficulty;
  document.querySelector('#question-text').textContent = question.question;
  answerForm.reset();
  guessInput.disabled = false;
  checkButton.disabled = false;
  document.querySelector('#quiz-card').setAttribute('aria-busy', 'false');
  setStatus('#answer-feedback', 'No timers. Just curiosity.');
}

/** @returns {Promise<void>} Request a random question and handle loading failures. */
async function loadRandom() {
  let version = ++quizVersion;
  currentQuestion = null;
  randomButton.disabled = true;
  guessInput.disabled = true;
  checkButton.disabled = true;
  document.querySelector('#quiz-card').setAttribute('aria-busy', 'true');
  setStatus('#answer-feedback', 'Finding a question…');
  try {
    let question = await request('/random');
    if (version === quizVersion) showQuestion(question);
  } catch (error) {
    if (version === quizVersion) {
      document.querySelector('#question-text').textContent = 'Let’s try that again.';
      setStatus('#answer-feedback', 'Could not load a question. Use Shuffle question to retry.', 'error');
    }
  } finally {
    randomButton.disabled = false;
    document.querySelector('#quiz-card').setAttribute('aria-busy', 'false');
  }
}

/**
 * Submit a guess to the server without comparing answers in the browser.
 * @param {SubmitEvent} event - Answer form submission.
 * @returns {Promise<void>} Resolves after feedback is displayed.
 */
async function checkAnswer(event) {
  event.preventDefault();
  if (!currentQuestion) return;
  let version = quizVersion;
  checkButton.disabled = true;
  setStatus('#answer-feedback', 'Checking your answer…');
  try {
    let result = await request('/answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentQuestion.id, guess: guessInput.value })
    });
    if (version !== quizVersion) return;
    let message = result.correct ? `You got it! ${result.answer} is correct.` : `Not quite. The correct answer is ${result.answer}.`;
    setStatus('#answer-feedback', message, result.correct ? 'success' : '');
  } catch (error) {
    if (version === quizVersion) setStatus('#answer-feedback', error.message, 'error');
  } finally {
    if (version === quizVersion) checkButton.disabled = false;
  }
}

/**
 * Search for questions using the selected topic, difficulty, and limit.
 * @param {SubmitEvent} event - Search form submission.
 * @returns {Promise<void>} Resolves after rendering the results.
 */
async function searchQuestions(event) {
  event.preventDefault();
  let version = ++searchVersion;
  let topic = document.querySelector('#search-topic').value.trim().toLowerCase();
  let parameters = new URLSearchParams();
  let difficulty = document.querySelector('#filter-difficulty').value;
  let limit = document.querySelector('#filter-limit').value;
  if (difficulty) parameters.set('difficulty', difficulty);
  if (limit) parameters.set('limit', limit);
  setStatus('#search-status', 'Finding questions…');
  document.querySelector('#question-list').replaceChildren();
  for (let button of document.querySelectorAll('.topic-button')) {
    button.setAttribute('aria-pressed', String(button.textContent === topic));
  }
  try {
    let questions = await request(`/topic/${encodeURIComponent(topic)}?${parameters}`);
    if (version !== searchVersion) return;
    renderQuestions(questions);
    setStatus('#search-status', questions.length ? `${questions.length} question${questions.length === 1 ? '' : 's'} in ${topic}. Pick one to play.` : 'No questions match these filters. Try a different difficulty.');
  } catch (error) {
    if (version === searchVersion) setStatus('#search-status', error.message, 'error');
  }
}

/**
 * Build question cards using DOM methods rather than HTML string insertion.
 * @param {object[]} questions - Filtered questions from the API.
 */
function renderQuestions(questions) {
  let list = document.querySelector('#question-list');
  list.replaceChildren();
  for (let question of questions) {
    let card = document.createElement('article');
    card.className = 'question-card';
    let badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = question.difficulty;
    let heading = document.createElement('h3');
    heading.textContent = question.question;
    let button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button';
    button.textContent = 'Play this question';
    button.addEventListener('click', function playQuestion() {
      showQuestion(question);
      document.querySelector('#play').scrollIntoView();
      guessInput.focus({ preventScroll: true });
    });
    card.append(badge, heading, button);
    list.appendChild(card);
  }
}

/**
 * Add a question and refresh topic and question lists after it is saved.
 * @param {SubmitEvent} event - Add-question form submission.
 * @returns {Promise<void>} Resolves when saving and refreshing finish.
 */
async function addQuestion(event) {
  event.preventDefault();
  let button = document.querySelector('#add-button');
  let data = Object.fromEntries(new FormData(addForm));
  button.disabled = true;
  setStatus('#add-status', 'Adding your question…');
  try {
    let questions = await request('/question/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    searchVersion += 1;
    addForm.reset();
    document.querySelector('#search-topic').value = data.topic.trim().toLowerCase();
    document.querySelector('#filter-difficulty').value = '';
    document.querySelector('#filter-limit').value = '';
    renderQuestions(questions);
    setStatus('#search-status', `${questions.length} question${questions.length === 1 ? '' : 's'} in ${data.topic.trim().toLowerCase()}.`);
    setStatus('#add-status', 'Question added! You can now find and play it in Explore.', 'success');
    await loadTopics();
  } catch (error) {
    setStatus('#add-status', error.message, 'error');
  } finally {
    button.disabled = false;
  }
}
