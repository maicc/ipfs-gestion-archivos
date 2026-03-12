import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config/env.js';
import type { IpfsUploadResult } from '../types/index.js';

/**
 * Sube un archivo al nodo IPFS Kubo local mediante HTTP directo (Stream real)
 * @param filePath - Ruta absoluta al archivo a subir
 * @returns CID, tamaño y URL del gateway
 */
export async function uploadKubo(filePath: string): Promise<IpfsUploadResult> {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    // Obtener tamaño real del archivo
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    console.log(`📤 Subiendo a IPFS mediante Stream Directo: ${filePath} (${fileSize} bytes)`);

    // 1. Creamos el Stream de lectura (Casi 0 consumo de RAM)
    const stream = fs.createReadStream(filePath);

    // 2. Lo conectamos directamente a un Formulario de datos nativo
    const form = new FormData();
    form.append('file', stream);

    try {
        // 3. Hacemos el bypass de la librería y enviamos POST directo al puerto 5001
        // pin=true hace que se guarde permanentemente sin comandos extra
        const response = await axios.post(
            `http://${config.IPFS_HOST}:5001/api/v0/add?pin=true&cid-version=1`,
            form,
            {
                headers: form.getHeaders(),
                // Le decimos a axios que no limite el tamaño del archivo
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        // La API de Kubo responde con un objeto JSON que contiene el Hash
        const cid = response.data.Hash;
        console.log(`📌 Archivo pineado en IPFS — CID: ${cid}`);

        return {
            cid,
            size: fileSize.toString(),
            gatewayUrl: `https://gateway.ipfs.io/ipfs/${cid}`
        };

    } catch (error: any) {
        console.error("❌ Error en el bypass de IPFS:", error.response?.data || error.message);
        throw error;
    }
}