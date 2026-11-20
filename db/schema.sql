-- Name: Ziyad Abdelhamid
-- Date: 11.19.2026
-- CSC 372: Relational tables for trivia topics and questions.

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  question VARCHAR(1000) NOT NULL CHECK (length(trim(question)) > 0),
  answer VARCHAR(500) NOT NULL CHECK (length(trim(answer)) > 0),
  difficulty VARCHAR(6) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  UNIQUE (topic_id, question)
);
