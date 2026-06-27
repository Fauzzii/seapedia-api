import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Terlalu banyak permintaan dari IP ini, coba lagi setelah 15 menit.' }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Terlalu banyak percobaan login. Coba lagi setelah 15 menit.' }
});
