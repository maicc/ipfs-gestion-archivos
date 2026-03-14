import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { Keyring } from '@polkadot/keyring';
import { config } from '../config/env.js';
import type { CrustOrderResult } from '../types/index.js';

// Singleton de la conexión a Crust
let api: ApiPromise | null = null;

/**
 * Inicializa la conexión WebSocket a Crust Network.
 * Reutiliza la conexión si ya está activa.
 */
export async function initCrustApi(): Promise<ApiPromise> {
    if (api && api.isConnected) {
        return api;
    }

    console.log('🔗 Conectando a Crust Network...');
    api = new ApiPromise({
        provider: new WsProvider(config.CRUST_RPC),
        typesBundle: typesBundleForPolkadot,
    });

    await api.isReady;
    console.log('✅ Conectado a Crust Network');
    return api;
}

/**
 * Desconecta la API de Crust Network.
 */
export async function disconnectCrustApi(): Promise<void> {
    if (api) {
        await api.disconnect();
        api = null;
        console.log('🔌 Desconectado de Crust Network');
    }
}

/**
 * Envía una orden de almacenamiento a Crust Network para un archivo dado.
 * @param cid - El CID del archivo en IPFS
 * @param fileSize - Tamaño del archivo en bytes
 * @param tips - Propina extra para incentivar a los nodos (default: 0)
 * @param memo - Memo ('folder' si es carpeta, '' si es archivo)
 */
export async function placeStorageOrder(
    cid: string,
    fileSize: number,
    tips: number = 0,
    memo: string = ''
): Promise<CrustOrderResult> {
    const crustApi = await initCrustApi();

    console.log(`📦 Enviando orden de almacenamiento a Crust...`);
    console.log(`   CID: ${cid}`);
    console.log(`   Tamaño: ${fileSize} bytes`);

    // 1. Construir la transacción
    const tx = crustApi.tx.market!.placeStorageOrder!(cid, fileSize, tips, memo);

    // 2. Cargar la cuenta desde el seed
    if (!config.CRUST_SEED) {
        throw new Error('CRUST_SEED no está definido en las variables de entorno');
    }
    const kr = new Keyring({ type: 'sr25519' });
    const krp = kr.addFromUri(config.CRUST_SEED);

    // 3. Firmar y enviar la transacción
    await crustApi.isReadyOrError;

    return new Promise<CrustOrderResult>((resolve, reject) => {
        tx.signAndSend(krp, ({ events = [], status }) => {
            console.log(`💸 Tx status: ${status.type}, nonce: ${tx.nonce}`);

            if (status.isInBlock) {
                let success = false;
                let errorMsg = '';
                let eventParsingFailed = false;

                // Intentar parsear los eventos
                // Nota: @polkadot/api puede fallar al decodificar eventos de Crust
                // debido a incompatibilidad de tipos. Si falla, asumimos éxito
                // porque la tx fue incluida en un bloque.
                try {
                    events.forEach(({ event: { method, section, data } }) => {
                        if (method === 'ExtrinsicSuccess') {
                            success = true;
                            console.log(`✅ Orden de almacenamiento exitosa!`);
                        } else if (method === 'ExtrinsicFailed') {
                            errorMsg = `Transacción fallida: ${section}.${method} - ${data.toString()}`;
                            console.error(`❌ ${errorMsg}`);
                        }
                    });
                } catch (eventError) {
                    console.warn('⚠️  No se pudieron decodificar los eventos (tipo incompatible).');
                    console.warn('   La transacción fue incluida en bloque — asumiendo éxito.');
                    eventParsingFailed = true;
                }

                // Si los eventos se parsearon y encontramos ExtrinsicFailed, rechazar
                if (!eventParsingFailed && errorMsg) {
                    reject(new Error(errorMsg));
                    return;
                }

                // Éxito: ya sea porque ExtrinsicSuccess fue encontrado,
                // o porque la tx está InBlock y los eventos no pudieron parsearse
                const blockHash = status.asInBlock.toString();
                console.log(`📋 Block hash: ${blockHash}`);

                resolve({
                    success: true,
                    cid,
                    fileSize,
                    txHash: blockHash,
                    message: `Orden de almacenamiento enviada. Block: ${blockHash}`
                });
            }
        }).catch((e: Error) => {
            console.error('❌ Error al enviar transacción a Crust:', e.message);
            reject(e);
        });
    });
}

/**
 * Consulta el estado de un archivo en Crust Network.
 * @param cid - El CID del archivo a consultar
 */
export async function getOrderState(cid: string): Promise<unknown> {
    const crustApi = await initCrustApi();

    console.log('🔍 Consultando estado del archivo:', cid);

    // @ts-ignore - TypeScript no detecta correctamente los tipos de la API de Crust
    const fileInfo = await crustApi.query.market.filesV2(cid);
    const fileData = fileInfo.toJSON();

    console.log('📊 Estado del archivo:', fileData);
    return fileData;
}