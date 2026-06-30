export const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
        if (allowed.includes(origin) || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

export default corsOptions;
