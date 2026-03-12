import express from 'express';
import cors from 'cors';
import uploadFormRouter from './routes/uploadForm.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { config } from './config/env.js';
import { initCrustApi, disconnectCrustApi } from './services/crustPinning.service.js';

const app = express();

app.use(express.json());

/* 
app.use((req, res, next) => {
    console.log(`\n📡 [REQUEST ENTRANTE]`);
    console.log(`Método: ${req.method}`);
    console.log(`URL Exacta: ${req.url}`);
    console.log(`URL Original: ${req.originalUrl}`);
    console.log(`Body:`, req.body);
    console.log(`-----------------------\n`);
    next();
});
*/
app.use(cors({
    origin: config.CORS_ORIGIN,
    methods: 'GET,HEAD,PUT,POST,DELETE'
}));

// Rutas
app.use('/api/file', uploadFormRouter);

// Ruta de health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware de errores (debe ir después de las rutas)
app.use(errorHandler);

// Iniciar servidor
async function startServer() {
    try {
        // Pre-conectar a Crust Network al iniciar
        console.log('🚀 Inicializando servidor...');
        await initCrustApi();

        app.listen(config.PORT, () => {
            console.log(`✅ Servidor corriendo en http://localhost:${config.PORT}`);
            console.log(`   CORS: ${config.CORS_ORIGIN}`);
            console.log(`   IPFS: ${config.IPFS_PROTOCOL}://${config.IPFS_HOST}:${config.IPFS_PORT}`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Cerrar conexiones al terminar
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await disconnectCrustApi();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectCrustApi();
    process.exit(0);
});

startServer();