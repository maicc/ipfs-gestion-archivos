import prisma from "../prisma.js";

export const getFileStatusService = async (cid: string, userId: string) => {
  const file = await prisma.fileMetadata.findFirst({
    where: {
      userId,
      isDeleted: false,
      ipfsObject: { cid },
    },
    include: {
      ipfsObject: {
        include: { storageContract: true },
      },
    },
  });

  if (!file) throw new Error("Archivo no encontrado");

  return {
    cid,
    name: file.name,
    status: file.ipfsObject.storageContract?.crustStatus ?? "processing",
    replicas: file.ipfsObject.storageContract?.replicaCount ?? 0,
    pinnedUntil: file.ipfsObject.storageContract?.pinnedUntil ?? null,
    gatewayUrl: `https://gw.hachikuji.com/ipfs/${cid}`,
  };
};