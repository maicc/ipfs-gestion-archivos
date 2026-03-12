import fsPromises from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { uploadKubo } from './ipfsKubo.service.js';
import { placeStorageOrder } from './crustPinning.service.js';
import type { ChunkInfo, FileUploadPayload, UploadResponse } from '../types/index.js';

/**
 * Procesa la subida de chunks de un archivo.
 * Cuando todos los chunks han llegado, ensambla el archivo, lo sube a IPFS,
 * y envía la orden de almacenamiento a Crust Network.
 */
export async function uploadFormService(file: FileUploadPayload): Promise<UploadResponse> {
    const archivos = file.files;

    if (!archivos || archivos.length === 0) {
        return {
            success: false,
            message: 'No ha llegado ningún chunk',
            isLastChunk: false,
            chunkIndex: -1,
            totalChunks: 0
        };
    }

    for (const archivo of archivos) {
        console.log(`📥 Procesando chunk: ${archivo.originalName}`);
        console.log(`   Tamaño: ${archivo.size} bytes | Tipo: ${archivo.mimeType}`);

        const chunkIndex = Number(archivo.chunkIndex);

        const totalChunks = Number(archivo.totalChunks);

        const originalFileName = archivo.originalFileName;

  
        const tempDir = path.join('temp', `chunks_${originalFileName}`);
        await fsPromises.mkdir(tempDir, { recursive: true });
  
        const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);

        await moveFile(archivo.path, chunkPath);
        console.log(`   Guardado: chunk_${chunkIndex} en ${tempDir}`);


        const isLastChunk = (chunkIndex === totalChunks - 1);

        if (!isLastChunk) {
            // Chunk intermedio — confirmar recepción
            return {
                success: true,
                message: `Chunk ${chunkIndex + 1}/${totalChunks} recibido`,
                isLastChunk: false,
                chunkIndex,
                totalChunks
            };
        }
        // === Último chunk recibido — ensamblar y subir ===
        console.log('🔧 Último chunk recibido. Ensamblando...');

        //acá le mandamos los paramentros a la función assembleFile para que arme el archivo y lo mande a la carpeta final
        const finalFilePath = await assembleFile(tempDir, originalFileName, totalChunks);

        // 1. Subir a IPFS
        console.log('🌍 Subiendo a IPFS...');
        const ipfsResult = await uploadKubo(finalFilePath);
        console.log(`✅ Archivo en IPFS — CID: ${ipfsResult.cid}`);

        // 2. Enviar orden de almacenamiento a Crust Network
        console.log('⛓️  Enviando orden a Crust Network...');
        let crustResult;
        try {
            crustResult = await placeStorageOrder(
                ipfsResult.cid,
                parseInt(ipfsResult.size, 10)
            );
            console.log(`✅ Orden de almacenamiento en Crust exitosa!`);
        } catch (crustError) {
            console.error('⚠️  Error al enviar orden a Crust (archivo sigue en IPFS):', crustError);
            crustResult = {
                success: false,
                cid: ipfsResult.cid,
                fileSize: parseInt(ipfsResult.size, 10),
                message: `Error en Crust: ${crustError instanceof Error ? crustError.message : 'Error desconocido'}`
            };
        }

        // 3. Limpiar archivo local (ya está en IPFS)
        try {
            await fsPromises.unlink(finalFilePath);
            console.log(`🗑️  Archivo local eliminado: ${finalFilePath}`);
        } catch (cleanupError) {
            console.warn('⚠️  No se pudo eliminar archivo local:', cleanupError);
        }

        return {
            success: true,
            message: 'Archivo subido a IPFS y orden enviada a Crust',
            isLastChunk: true,
            chunkIndex,
            totalChunks,
            ipfs: ipfsResult,
            crust: crustResult
        };
    }

    // Fallback — no debería llegar aquí
    return {
        success: false,
        message: 'No se procesaron archivos',
        isLastChunk: false,
        chunkIndex: -1,
        totalChunks: 0
    };
}

/**
 * Ensambla todos los chunks en un archivo final usando streams.
 * Elimina la carpeta temporal después de ensamblar.
 */
async function assembleFile(
    tempDir: string,
    filename: string,
    totalChunks: number
): Promise<string> {
    // Asegurar que la carpeta uploads existe
    await fsPromises.mkdir('uploads', { recursive: true });

    //Crea la ruta para la carpeta final
    const finalFilePath = path.join('uploads', filename);
    

    //Abre un stream de escritura con el nombre del archivo original y que se va a guardar en la ruta de uploads
    const writeStream = fs.createWriteStream(finalFilePath);

    //Repite el proceso hasta que se hayan completado la cantidad de chunks
    for (let i = 0; i < totalChunks; i++) {
        //Almacena la carpeta con los chunks 
        const chunkPath = path.join(tempDir, `chunk_${i}`);
        //Abre un stream de lectura pero no entiendo porque lo abren así(?)
        const readStream = fs.createReadStream(chunkPath);

        //Devuelve los resultados pero no entiendo bien el pipe y bueno
        await new Promise<void>((resolve, reject) => {
            readStream.pipe(writeStream, { end: false });
            readStream.on('end', () => resolve());
            readStream.on('error', (err) => reject(err));
        });
    }
    //Termina el stream de escritura
    writeStream.end();

    // Esperar a que el writeStream termine
    await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
    });

    // Eliminar carpeta temporal de chunks
    await fsPromises.rm(tempDir, { recursive: true });
    console.log(`🗑️  Carpeta temporal eliminada: ${tempDir}`);

    console.log(`✅ Archivo ensamblado: ${finalFilePath}`);
    return finalFilePath;
}

/**
 * Mueve un archivo de src a dest con retry para Windows EBUSY.
 * Intenta rename primero, si falla por EBUSY usa copyFile + unlink.
 */
async function moveFile(src: string, dest: string, maxRetries = 3): Promise<void> {
    //Oh un sistema de intentos que esta controlado por la cantidad de retries maxRetries
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        //Un try para controlar los errores
        try {
            // Intentar rename (más eficiente, mismo filesystem)
            //El rename me explicaste que era optimizado pero por qué? 
            await fsPromises.rename(src, dest);
            return;
        } catch (err: any) {
            //Acá maneja los errores por si salen alguno de esos
            if (err.code === 'EBUSY' || err.code === 'EPERM') {
                console.warn(`⏳ Archivo bloqueado (intento ${attempt}/${maxRetries}), esperando...`);

                if (attempt === maxRetries) {
                    // Último intento: fallback a copy + unlink
                    console.log('   Usando copy + unlink como fallback...'); 
                    //Okay que hace el copyFile? Fui al copyFile pero no logre entenderlo     function copyFile(src: PathLike, dest: PathLike, mode?: number): Promise<void>;
                    await fsPromises.copyFile(src, dest);
                    // Intentar eliminar el original con un delay
                    await delay(500);
                    try {
                        await fsPromises.unlink(src);
                    } catch {
                        console.warn(`⚠️  No se pudo eliminar ${src}, se limpiará después`);
                    }
                    return;
                }

                // Esperar antes de reintentar (backoff exponencial)
                await delay(500 * attempt);
            } else {
                throw err; // Error diferente a EBUSY, propagar
            }
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}