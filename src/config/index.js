import prisma, { dbConfig } from './database.js';
import corsOptions from './cors.js';
import { getSessionConfig } from './session.js';
import appConfig from './app.js';

export {
    prisma,
    dbConfig,
    corsOptions,
    getSessionConfig,
    appConfig
};

export default prisma;
