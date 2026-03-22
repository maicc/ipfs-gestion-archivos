import prisma from "../prisma.js";
import { getOrderState } from "../services/crustPinning.service.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3.js";
import { getOrderStateCLI } from "../utils/crustCLI.js";

export const crustWorker = async () => {
    console.log("🔄 Worker Crust: iniciando ciclo de verificación...");

    // 1. Buscar contratos pendientes
    const contratosPendientes = await prisma.storageContract.findMany({
        where: { crustStatus: "pending" },
        include: { ipfsObject: true },
    });

    if (contratosPendientes.length === 0) {
        console.log("✅ Worker Crust: no hay contratos pendientes.");
        return;
    }

    console.log(`📋 Worker Crust: verificando ${contratosPendientes.length} contratos...`);

    for (const contrato of contratosPendientes) {
        const cid = contrato.ipfsObject.cid;

        // Ignorar CIDs temporales que aún no tienen CID real
        if (cid.startsWith("pending_")) {
            console.log(`⏳ CID aún pendiente de IPFS: ${cid}`);
            continue;
        }

        try {
            const estado = await getOrderStateCLI(cid);

            if (!estado) {
                console.log(`⚠️  Sin datos para CID: ${cid}`);
                continue;
            }

            const replicaCount = estado.reported_replica_count ?? 0;
            const expiredAt = estado.expired_at ?? 0;

            console.log(`📦 CID: ${cid} | Réplicas: ${replicaCount} | Expired at: ${expiredAt}`);

            if (replicaCount > 0) {
                // Crust confirmó el pin — actualizar DB
                await prisma.storageContract.update({
                    where: { id: contrato.id },
                    data: {
                        crustStatus: "active",
                        replicaCount,
                        pinnedUntil: expiredAt > 0 ? new Date(expiredAt * 1000) : null,
                        renewalAt: expiredAt > 0 ? new Date((expiredAt - 172800) * 1000) : null, // 2 días antes
                    },
                });

                // Actualizar storage usado del usuario
                const fileMetadata = await prisma.fileMetadata.findFirst({
                    where: { ipfsObjectId: contrato.ipfsObjectId },
                    select: { userId: true },
                });

                if (fileMetadata) {
                    await prisma.user.update({
                        where: { id: fileMetadata.userId },
                        data: {
                            usedStorageBytes: {
                                increment: contrato.ipfsObject.sizeBytes,
                            },
                        },
                    });
                }


                await prisma.ipfsObject.update({
                    where: { id: contrato.ipfsObjectId },
                    data: {
                        replicasCount: replicaCount,
                        nodePins: { set: ["germany"] },
                    },
                });

                // Eliminar de R2
                if (contrato.ipfsObject.r2Key) {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Key: contrato.ipfsObject.r2Key,
                    }));

                    await prisma.ipfsObject.update({
                        where: { id: contrato.ipfsObjectId },
                        data: { r2Key: null, r2StoredAt: null },
                    });

                    console.log(`🗑️  R2 eliminado para CID: ${cid}`);
                }

                console.log(`✅ Contrato actualizado a active para CID: ${cid}`);
            } else {
                console.log(`⏳ Crust aún procesando CID: ${cid}`);
            }
        } catch (error) {
            console.error(`❌ Error verificando CID ${cid}:`, error);
        }
    }

    console.log("✅ Worker Crust: ciclo finalizado.");
};