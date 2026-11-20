<!--
  Name: Ziyad Abdelhamid
  Date: 11.19.2026
  CSC 372: Assignment setup, database schema, endpoints, deployment, and testing.
-->
# Triviabook — Assignment 6

A full-stack trivia app built with Node.js, Express, and Neon PostgreSQL. Play random questions, browse topics with difficulty/limit filters, check answers, and contribute new questions.

## Run locally

1. Install Node.js 24, then clone this repository and open its folder in VS Code.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Replace `DATABASE_URL` with your Neon connection string, including its SSL settings. Never commit `.env`.
4. Run `npm start`, then open [http://localhost:3000](http://localhost:3000).

The server creates the tables and inserts the five assignment seed questions on startup. Repeated starts preserve added questions and do not duplicate seeds. `PORT` defaults to 3000; Render supplies its own port. `npm run dev` restarts the server when source files change.

## Database schema

| Table | Columns |
| --- | --- |
| `topics` | `id` integer identity primary key; `name` varchar(100), unique, required |
| `questions` | `id` integer identity primary key; `topic_id` integer foreign key to `topics.id`; `question` varchar(1000); `answer` varchar(500); `difficulty` varchar(6) |

All question columns are required. Difficulty is constrained to `easy`, `medium`, or `hard`. `(topic_id, question)` is unique. Topic names are trimmed and lowercase. Adding a topic and its question is one transaction. SQL lives in `models/`; HTTP validation in `controllers/`; endpoint mapping in `routes/`.

## API endpoints

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/triviabook/topics` | Array of topic names |
| GET | `/triviabook/topic/:topic` | Array of questions; optional `?limit=2&difficulty=easy` |
| GET | `/triviabook/random` | One random question, without its answer |
| POST | `/triviabook/answer` | JSON body `{ "id": 1, "guess": "Mars" }`; returns `{ "correct": true, "answer": "Mars" }` |
| POST | `/triviabook/question/add` | JSON body containing `topic`, `question`, `answer`, `difficulty`; returns the updated topic question array with status 201 |

Question objects contain `id`, `topic`, `question`, and `difficulty`. Answers are returned only by the answer-check endpoint. Guess comparison ignores case and surrounding whitespace. Unknown topics/IDs return 404; missing or invalid fields/filters return 400; duplicate questions return 409. Errors use `{ "error": "message" }`. An existing topic with no matches returns `[]`. `limit` must be a positive whole number. POST requests use `Content-Type: application/json`.

## Test

- Import `tests/triviabook.postman-collection.json` into Postman or EchoAPI. Set `baseUrl` to localhost or the Render origin and run all requests. The add test creates a real question in `newTopic` (default: `technology`); use a new topic value when rerunning to avoid duplicate-question conflicts.
- Optional command-line collection run: `npx newman run tests/triviabook.postman-collection.json --env-var baseUrl=http://localhost:3000`.
- For the integration suite, create a separate PostgreSQL database with a name ending in `_test`, then run `TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost/triviabook_test npm test`. Tests initialize their own seed data and add test records to that database only.
- Run `npm run lint:html` to validate the HTML.

JSON configuration and collection files cannot contain comments; their descriptions/metadata identify their purpose. Source files include author/date headers and JavaScript function documentation.

## Deploy to Render

Create a **Web Service** from this public repository on the free plan. Use `npm install` as the build command and `npm start` as the start command. Set `DATABASE_URL` to the Neon connection string and `NODE_ENV` to `production`. The included `render.yaml` records the same configuration. After deployment, test the root page and all API endpoints with the live origin.

`node_modules/` and `.env` are excluded by `.gitignore`; `.env.example` contains placeholders only. No GitHub Pages deployment is used.
