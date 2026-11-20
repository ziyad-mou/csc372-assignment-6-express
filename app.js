/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Configure Express static assets, API routing, and JSON errors.
 */
let express = require('express');
let path = require('node:path');
let createTriviaRouter = require('./routes/trivia-router');

/**
 * Create the app independently from its network listener for integration tests.
 * @param {import('pg').Pool} pool - Database connection pool.
 * @returns {import('express').Express} Configured application.
 */
function createApp(pool) {
  let app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/triviabook', createTriviaRouter(pool));
  app.use(notFound);
  app.use(handleError);
  return app;
}

/** @param {object} req - Request. @param {object} res - Response. */
function notFound(req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}

/**
 * Return safe error messages without exposing connection strings or SQL.
 * @param {Error} error - Express or database error.
 * @param {object} req - Request.
 * @param {object} res - Response.
 * @param {Function} next - Express error continuation.
 */
function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (error.code === '23505') {
    return res.status(409).json({ error: 'That question already exists in this topic.' });
  }
  if (error.status === 400) return res.status(400).json({ error: 'Invalid request.' });
  console.error('Request failed:', error.code || error.name);
  res.status(500).json({ error: 'Something went wrong. Please try again shortly.' });
}

module.exports = createApp;
