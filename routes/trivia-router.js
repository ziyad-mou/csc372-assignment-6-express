/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Map the five assignment endpoints to their controller handlers.
 */
let express = require('express');
let createTriviaModel = require('../models/trivia-model');
let createTriviaController = require('../controllers/trivia-controller');

/**
 * Wire database-backed trivia routes.
 * @param {import('pg').Pool} pool - PostgreSQL pool.
 * @returns {import('express').Router} Configured trivia router.
 */
function createTriviaRouter(pool) {
  let router = express.Router();
  let controller = createTriviaController(createTriviaModel(pool));
  router.get('/topics', controller.topics);
  router.get('/topic/:topic', controller.topic);
  router.get('/random', controller.random);
  router.post('/answer', controller.answer);
  router.post('/question/add', controller.add);
  return router;
}

module.exports = createTriviaRouter;
