/**
 * Prisma database client — single shared instance.
 *
 * Centralised here so the log level, connection settings, and
 * shutdown hook are configured in one place.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient({
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
