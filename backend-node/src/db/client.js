/**
 * Prisma database client — single shared instance.
 *
 * Centralised here so the log level, connection settings, and
 * shutdown hook are configured in one place.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');
const { Pool }         = require('pg');
const config           = require('../config');

// Use the pg driver adapter so Prisma runs entirely inside Node.js
// without spawning a separate Rust binary process.
// This is required for shared hosting environments (e.g. Hostinger)
// where forking child processes is restricted.
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: config.isDev ? ['warn', 'error'] : ['error'],
});

/**
 * Disconnect cleanly during graceful shutdown.
 * Call from the process exit handler in index.js.
 */
async function disconnect() {
  await prisma.$disconnect();
}

module.exports = prisma;
module.exports.disconnect = disconnect;
