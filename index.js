import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from "express-session";
import morgan from "morgan";
import cors from 'cors';
import helmet from 'helmet';
import prisma from './src/config/index.js';
import { initTimeCache } from './src/helpers/time.js';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { generalLimiter } from './src/middleware/rateLimiter.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import storeRoutes from './src/routes/storeRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import cartRoutes from './src/routes/cartRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import deliveryRoutes from './src/routes/deliveryRoutes.js';
import addressRoutes from './src/routes/addressRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import reviewRoutes from './src/routes/reviewRoutes.js';

BigInt.prototype.toJSON = function () {
    return this.toString();
};

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const store = new PrismaSessionStore(
    prisma,
    {
        checkPeriod: 2 * 60 * 1000,
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
    }
);

(async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('Database Connected (Prisma)...');
        await initTimeCache();
    } catch (error) {
        console.error('Connection error:', error);
        process.exit(1);
    }
})();

const corsOptions = {
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

app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));
app.use(generalLimiter);
app.use(session({
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
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/buyer/cart', cartRoutes);
app.use('/api/buyer/addresses', addressRoutes);
app.use('/api/buyer', walletRoutes);
app.use('/api/driver', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api', storeRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let openapiContent = '';
try {
    openapiContent = fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8');
} catch (err) {
    console.error('openapi.yaml error:', err.message);
}

app.get('/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(openapiContent);
});

app.get('/api-docs', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>SEAPEDIA API Documentation</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css" />
        </head>
        <body>
            <div id="swagger-ui"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js" crossorigin></script>
            <script>
                window.onload = () => {
                    window.ui = SwaggerUIBundle({
                        url: '/openapi.yaml',
                        dom_id: '#swagger-ui',
                        deepLinking: true
                    });
                };
            </script>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.status(200).json({
        status: "healthy",
        message: "Seapedia API Server is running and connected successfully.",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        documentation: "/api-docs"
    });
});

app.use((req, res) => {
    res.status(404).json({ msg: `Endpoint '${req.method} ${req.path}' tidak ditemukan` });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: "Terjadi kesalahan internal server" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));