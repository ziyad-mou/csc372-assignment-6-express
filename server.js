/**
 * Name: Ziyad Abdelhamid
 * Date: 11.19.2026
 * CSC 372: Start the trivia web server after PostgreSQL initialization.
 */
let createApp = require('./app');
let { createPool, initializeDatabase } = require('./db/database');

/** @returns {Promise<void>} Start the app or exit with a safe diagnostic. */
async function start() {
  let pool;
  try {
    pool = createPool();
    pool.on('error', handlePoolError);
    await initializeDatabase(pool);
    let port = Number(process.env.PORT) || 3000;
    let server = createApp(pool).listen(port, '0.0.0.0', function ready() {
      console.log(`Triviabook is running at http://localhost:${port}`);
    });
    server.on('error', handleServerError);
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    /** Close HTTP and database connections when the process stops. */
    function shutdown() {
      server.close(function closePool() { pool.end(); });
    }
    /** @param {Error} error - Listener error. */
    function handleServerError(error) {
      console.error('Could not start the HTTP server:', error.code);
      pool.end();
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Startup failed. Check DATABASE_URL and database access.', error.code || error.name);
    if (pool) await pool.end();
    process.exitCode = 1;
  }
}

/** @param {Error} error - Idle database connection error. */
function handlePoolError(error) {
  console.error('Database connection interrupted:', error.code || error.name);
}

start();
