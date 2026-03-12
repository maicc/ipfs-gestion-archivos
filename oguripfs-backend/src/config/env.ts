import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    PORT: parseInt(process.env.PORT || '3000', 10),
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://127.0.0.1:5500',

    // IPFS Kubo
    IPFS_HOST: process.env.IPFS_HOST || '127.0.0.1',
    IPFS_PORT: parseInt(process.env.IPFS_PORT || '5001', 10),
    IPFS_PROTOCOL: process.env.IPFS_PROTOCOL || 'http',
    IPFS_TIMEOUT: parseInt(process.env.IPFS_TIMEOUT || '60000', 10),

    // Crust Network
    CRUST_SEED: process.env.CRUST_SEED || '',
    CRUST_RPC: process.env.CRUST_RPC || 'wss://rpc.crust.network',
} as const;

// Validate required config
if (!config.CRUST_SEED) {
    console.warn('⚠️  CRUST_SEED no está definido en .env — las órdenes de almacenamiento fallarán');
}
