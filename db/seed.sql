-- Name: Ziyad Abdelhamid
-- Date: 11.19.2026
-- CSC 372: Insert the assignment's five questions without duplicating them on restart.

INSERT INTO topics (name) VALUES ('science'), ('geography') ON CONFLICT DO NOTHING;

INSERT INTO questions (topic_id, question, answer, difficulty)
SELECT topics.id, seed.question, seed.answer, seed.difficulty
FROM (VALUES
  ('science', 'What planet is known as the Red Planet?', 'Mars', 'easy'),
  ('science', 'What is the chemical symbol for gold?', 'Au', 'medium'),
  ('science', 'What is the powerhouse of the cell?', 'Mitochondria', 'easy'),
  ('geography', 'What is the capital of Australia?', 'Canberra', 'medium'),
  ('geography', 'Which river flows through Cairo?', 'The Nile', 'easy')
) AS seed(topic, question, answer, difficulty)
JOIN topics ON topics.name = seed.topic
ON CONFLICT (topic_id, question) DO NOTHING;
