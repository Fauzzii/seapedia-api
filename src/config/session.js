import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import prisma from './database.js';

export const getSessionConfig = () => {
    const store = new PrismaSessionStore(
        prisma,
        {
            checkPeriod: 2 * 60 * 1000,
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }
    );

    return {
        secret: process.env.SESS_SECRET,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        store: store,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000
        }
    };
};
